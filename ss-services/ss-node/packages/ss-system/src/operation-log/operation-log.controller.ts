// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OperationLogService, OperationLogQuery } from './operation-log.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('操作日志')
@Controller('system/operation-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class OperationLogController {
  constructor(private readonly operationLogService: OperationLogService) {}

  @Get()
  @ApiOperation({ summary: '查询操作日志' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'username', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resource', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async query(@Query() query: OperationLogQuery) {
    return this.operationLogService.query(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '操作统计' })
  async getStats() {
    return this.operationLogService.getStats();
  }

  @Get(':logId')
  @ApiOperation({ summary: '获取操作日志详情' })
  async findById(@Param('logId') logId: string) {
    return this.operationLogService.findById(logId);
  }

  @Post()
  @ApiOperation({ summary: '手动记录操作日志' })
  async record(@Body() body: any) {
    return this.operationLogService.record(body);
  }

  @Delete('cleanup')
  @ApiOperation({ summary: '清理过期操作日志' })
  async cleanupExpired() {
    const count = await this.operationLogService.cleanupExpired();
    return { ok: true, deleted: count };
  }

  @Delete('expired')
  @ApiOperation({ summary: '清理超过指定天数的操作日志' })
  @ApiQuery({ name: 'days', required: false })
  async cleanExpired(@Query('days') days?: string) {
    const retentionDays = days ? parseInt(days, 10) : undefined;
    const count = await this.operationLogService.cleanupExpired(retentionDays);
    return { ok: true, deleted: count };
  }

  @Delete('all')
  @ApiOperation({ summary: '清空全部操作日志' })
  async cleanAll() {
    const count = await this.operationLogService.cleanAll();
    return { ok: true, deleted: count };
  }
}
