// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ErrorLogService, ErrorLogQuery } from './error-log.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('错误日志')
@Controller('system/error-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ErrorLogController {
  constructor(private readonly errorLogService: ErrorLogService) {}

  @Get()
  @ApiOperation({ summary: '查询错误日志' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async query(@Query() query: ErrorLogQuery) {
    return this.errorLogService.query(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '错误统计' })
  async getStats() {
    return this.errorLogService.getStats();
  }

  @Post()
  @ApiOperation({ summary: '手动记录错误日志' })
  async capture(@Body() body: any) {
    return this.errorLogService.capture(body);
  }

  @Delete(':errorLogId')
  @ApiOperation({ summary: '删除错误日志' })
  async delete(@Param('errorLogId') errorLogId: string) {
    await this.errorLogService.delete(errorLogId);
    return { ok: true };
  }

  @Delete('cleanup/:days')
  @ApiOperation({ summary: '清理过期错误日志' })
  async cleanup(@Param('days') days: string) {
    const count = await this.errorLogService.cleanupExpired(parseInt(days, 10) || 90);
    return { ok: true, deleted: count };
  }
}
