// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { SystemService } from './system.service';
import { ErrorLog, SystemConfig, OperationLog } from './entities/system.entity';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('系统管理')
@Controller('system')
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    @Inject(getRepositoryToken(ErrorLog))
    private readonly errorLogRepo: Repository<ErrorLog>,
    @Inject(getRepositoryToken(SystemConfig))
    private readonly configRepo: Repository<SystemConfig>,
    @Inject(getRepositoryToken(OperationLog))
    private readonly operationLogRepo: Repository<OperationLog>,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '简单健康检查（公开）' })
  health() {
    return this.systemService.getSimpleHealth();
  }

  @Get('health/details')
  @ApiOperation({ summary: '详细健康检查' })
  detailedHealth() {
    return this.systemService.getDetailedHealth();
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'K8s Liveness 探针（公开）' })
  liveness() {
    return { status: 'ok' };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'K8s Readiness 探针（公开）' })
  readiness() {
    return { status: 'ok', checks: ['database', 'memory'] };
  }

  @Get('info')
  @ApiOperation({ summary: '系统信息' })
  info() {
    return this.systemService.getInfo();
  }

  // ──────────── 错误日志管理 ────────────

  @Get('errors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询错误日志' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getErrorLogs(@Query('level') level?: string, @Query('limit') limit?: string) {
    const where: any = {};
    if (level) where.level = level;
    return this.errorLogRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Delete('errors/:errorLogId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除错误日志' })
  async deleteErrorLog(@Param('errorLogId') errorLogId: string) {
    await this.errorLogRepo.delete(errorLogId);
    return { ok: true };
  }

  // ──────────── 系统配置管理 ────────────

  @Get('configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有系统配置' })
  getConfigs() {
    return this.configRepo.find();
  }

  @Get('configs/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取指定配置' })
  async getConfig(@Param('key') key: string) {
    const config = await this.configRepo.findOne({ where: { key } });
    return config || null;
  }

  @Post('configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建或更新系统配置' })
  async setConfig(
    @Body() body: { key: string; value: string; description?: string; type?: string },
  ) {
    let config = await this.configRepo.findOne({ where: { key: body.key } });
    if (config) {
      config.value = body.value;
      if (body.description) config.description = body.description;
      if (body.type) config.type = body.type;
      config.updatedAt = new Date();
    } else {
      config = this.configRepo.create(body);
    }
    return this.configRepo.save(config);
  }

  @Delete('configs/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除系统配置' })
  async deleteConfig(@Param('key') key: string) {
    await this.configRepo.delete({ key });
    return { ok: true };
  }

  // ──────────── 操作日志 ────────────

  @Get('operation-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询操作日志（分页）' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'username', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getOperationLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('username') username?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const size = pageSize ? Math.min(100, Math.max(1, parseInt(pageSize, 10))) : 20;

    const where: any = {};
    // action 字段格式为 "METHOD /path"（如 "GET /api/v1/projects"），
    // 筛选方法时传 "GET" 等前缀，用 Like 匹配所有该方法请求
    if (action) where.action = Like(`${action} %`);
    if (userId) where.userId = userId;
    if (username) where.username = username;
    if (status) where.status = status;

    // 时间范围筛选（startDate 为当天 00:00:00，endDate 为当天 23:59:59）
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate + 'T00:00:00'), new Date(endDate + 'T23:59:59'));
    } else if (startDate) {
      where.createdAt = Between(
        new Date(startDate + 'T00:00:00'),
        new Date(startDate + 'T23:59:59'),
      );
    }

    const [items, total] = await this.operationLogRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * size,
      take: size,
    });

    return { items, total, page: pageNum, pageSize: size };
  }

  @Delete('operation-logs/expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '清理过期操作日志' })
  @ApiQuery({ name: 'days', required: true })
  async cleanExpiredOperationLogs(@Query('days') days: string) {
    const daysNum = Math.max(1, parseInt(days, 10) || 30);
    const deleted = await this.systemService.cleanExpiredOperationLogs(daysNum);
    return { deleted };
  }

  @Delete('operation-logs/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '清空全部操作日志' })
  async cleanAllOperationLogs() {
    const deleted = await this.systemService.cleanAllOperationLogs();
    return { deleted };
  }
}
