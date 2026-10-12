// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BaseServicesService } from './base-services.service';
import { CreateBaseServiceDto, UpdateBaseServiceDto } from './base-service.dto';
import { JwtAuthGuard, RolesGuard, Roles, UserRole, ReadRoles, WriteRoles } from '@ss-node/ss-core';

@ApiTags('基础服务管理')
@Controller('base-services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BaseServicesController {
  constructor(private readonly baseServicesService: BaseServicesService) {}

  // ==================== CRUD 端点 ====================

  @Get()
  @ReadRoles()
  @ApiOperation({ summary: '获取所有基础服务状态' })
  async list() {
    return this.baseServicesService.getAllStatus();
  }

  @Get('config/list')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有基础服务配置列表' })
  async listConfig() {
    return this.baseServicesService.findAll();
  }

  @Get(':name')
  @ReadRoles()
  @ApiOperation({ summary: '获取单个服务状态（快捷方式，等同于 :name/status）' })
  async getOne(@Param('name') name: string) {
    return this.baseServicesService.getStatus(name);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '新增第三方服务' })
  async create(@Body() dto: CreateBaseServiceDto) {
    return this.baseServicesService.create(dto);
  }

  @Put(':name')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新服务配置' })
  async update(@Param('name') name: string, @Body() dto: UpdateBaseServiceDto) {
    return this.baseServicesService.update(name, dto);
  }

  @Delete(':name')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除服务' })
  async remove(@Param('name') name: string) {
    await this.baseServicesService.remove(name);
    return { success: true };
  }

  // ==================== 运行状态 ====================

  @Get(':name/status')
  @ReadRoles()
  @ApiOperation({ summary: '获取单个服务状态' })
  async status(@Param('name') name: string) {
    return this.baseServicesService.getStatus(name);
  }

  @Post(':name/start')
  @WriteRoles()
  @ApiOperation({ summary: '启动指定服务' })
  async start(@Param('name') name: string) {
    return this.baseServicesService.start(name);
  }

  @Post(':name/stop')
  @WriteRoles()
  @ApiOperation({ summary: '停止指定服务' })
  async stop(@Param('name') name: string) {
    return this.baseServicesService.stop(name);
  }

  @Post(':name/restart')
  @WriteRoles()
  @ApiOperation({ summary: '重启指定服务' })
  async restart(@Param('name') name: string) {
    return this.baseServicesService.restart(name);
  }

  // ==================== 配置文件 ====================

  @Get(':name/config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '读取服务配置文件' })
  async getConfig(@Param('name') name: string) {
    return this.baseServicesService.getConfig(name);
  }

  @Put(':name/config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '保存服务配置文件' })
  async saveConfig(@Param('name') name: string, @Body() body: { content: string }) {
    return this.baseServicesService.saveConfig(name, body.content);
  }

  // ==================== 日志 ====================

  @Get(':name/logs')
  @ReadRoles()
  @ApiOperation({ summary: '获取服务日志' })
  async getLogs(@Param('name') name: string, @Query('limit') limit?: number) {
    return this.baseServicesService.getLogs(name, limit ? Number(limit) : 200);
  }

  @Delete(':name/logs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '清理服务日志' })
  async clearLogs(@Param('name') name: string) {
    return this.baseServicesService.clearLogs(name);
  }

  // ==================== InfluxDB 初始化 ====================

  @Get('influxdb/setup/status')
  @ReadRoles()
  @ApiOperation({ summary: '检测 InfluxDB 初始化状态' })
  async checkInfluxSetup() {
    return this.baseServicesService.checkInfluxSetupStatus();
  }

  @Get('influxdb/health')
  @ReadRoles()
  @ApiOperation({ summary: '检测 InfluxDB 运行健康状态' })
  async checkInfluxHealth() {
    return this.baseServicesService.checkInfluxHealth();
  }

  @Get('influxdb/config')
  @ReadRoles()
  @ApiOperation({ summary: '获取 InfluxDB 环境配置信息' })
  async getInfluxConfig() {
    return this.baseServicesService.getInfluxConfig();
  }

  @Get('influxdb/buckets')
  @ReadRoles()
  @ApiOperation({ summary: '获取 InfluxDB Bucket 列表' })
  async listInfluxBuckets() {
    return this.baseServicesService.listInfluxBuckets();
  }

  @Get('influxdb/buckets/:bucketName/export')
  @ReadRoles()
  @ApiOperation({ summary: '导出 InfluxDB Bucket 数据为 CSV' })
  async exportBucketData(
    @Param('bucketName') bucketName: string,
    @Query('start') start?: string,
    @Query('stop') stop?: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const csv = await this.baseServicesService.exportBucketData(bucketName, start, stop);
    const filename = `${bucketName}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  @Post('influxdb/setup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '一键初始化 InfluxDB（创建 org/bucket/token）' })
  async setupInfluxDB(
    @Body() body?: { username?: string; password?: string; org?: string; bucket?: string },
  ) {
    return this.baseServicesService.setupInfluxDB(body);
  }

  // ==================== NanoMQ 健康检测 ====================

  @Get('nanomq/health')
  @ReadRoles()
  @ApiOperation({ summary: '检测 NanoMQ MQTT Broker 健康状态' })
  async checkNanomqHealth() {
    return this.baseServicesService.checkNanomqHealth();
  }
}
