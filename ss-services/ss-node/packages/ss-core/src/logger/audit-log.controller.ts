// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { AuditLoggerService } from './audit-logger.service';
import { AuditLogQueryDto } from './audit-log-query.dto';

/**
 * 安全审计日志 REST API Controller — 提供安全审计日志的查询与哈希链验证接口
 *
 * 参考 EventLogController 模式：
 * - 路由前缀：/system/audit-logs
 * - 权限：所有登录用户可访问（审计日志用于安全合规审查）
 * - 3 个端点：分页查询 / 哈希链验证 / 统计概览
 *
 * 数据来源：{logDir}/audit/audit-%DATE%.log 文件
 * 由 AuditLoggerService 在安全事件发生时自动写入（哈希链防篡改）。
 */
@ApiTags('安全审计日志')
@Controller('system/audit-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLoggerService: AuditLoggerService) {}

  /**
   * 分页查询安全审计日志
   * 支持 date / type / severity / userId / username 筛选
   */
  @Get()
  @ApiOperation({ summary: '查询安全审计日志（分页，支持多维筛选）' })
  @ApiQuery({ name: 'date', required: false, description: '日期（YYYY-MM-DD，默认今天）' })
  @ApiQuery({ name: 'startTime', required: false, description: '开始时间（YYYY-MM-DD，与 date 互斥）' })
  @ApiQuery({ name: 'endTime', required: false, description: '结束时间（YYYY-MM-DD）' })
  @ApiQuery({ name: 'type', required: false, description: '事件类型（如 auth.login.success）' })
  @ApiQuery({ name: 'severity', required: false, description: '严重级别（info/warning/critical）' })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID' })
  @ApiQuery({ name: 'username', required: false, description: '用户名' })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认 1）' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（默认 20，最大 100）' })
  async findEntries(@Query() query: AuditLogQueryDto) {
    return this.auditLoggerService.findEntries({
      date: query.date,
      startTime: query.startTime,
      endTime: query.endTime,
      type: query.type,
      severity: query.severity,
      userId: query.userId,
      username: query.username,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * 验证指定日期审计日志的哈希链完整性
   * 用于安全审查时检测日志是否被篡改
   */
  @Get('verify')
  @ApiOperation({ summary: '验证审计日志哈希链完整性（防篡改检测）' })
  @ApiQuery({ name: 'date', required: false, description: '日期（YYYY-MM-DD，默认今天）' })
  async verifyChain(@Query('date') date?: string) {
    return this.auditLoggerService.verifyChain(date);
  }

  /**
   * 获取审计日志统计概览
   * 包含总数、按类型/严重级别分布、哈希链完整性状态
   */
  @Get('stats')
  @ApiOperation({ summary: '审计日志统计概览（含哈希链完整性状态）' })
  @ApiQuery({ name: 'date', required: false, description: '日期（YYYY-MM-DD，默认今天）' })
  async getStats(@Query('date') date?: string) {
    return this.auditLoggerService.getStats(date);
  }
}
