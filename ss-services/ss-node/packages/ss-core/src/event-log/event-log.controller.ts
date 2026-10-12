// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { EventLogService } from './event-log.service';
import { EventLogQueryDto } from './event-log-query.dto';

/**
 * 事件日志 REST API Controller — 提供配置变更类事件日志的查询接口
 *
 * 参考 OperationLogController 模式：
 * - 路由前缀：/system/event-logs
 * - 权限：所有登录用户可访问（事件日志用于运维诊断，不限于 ADMIN）
 * - 3 个端点：分页查询 / 失败列表 / 详情
 *
 * 数据来源：全局 ss-node.db 的 evt_event_log 表
 * 由 EventLogService 在 EventBus emit 时自动写入。
 */
@ApiTags('事件日志')
@Controller('system/event-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  /**
   * 分页查询事件日志
   * 支持 projectId / eventType / status / emittedBy / 时间范围筛选
   */
  @Get()
  @ApiOperation({ summary: '查询事件日志（分页，支持多维筛选）' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID' })
  @ApiQuery({ name: 'eventType', required: false, description: '事件类型（如 device.created）' })
  @ApiQuery({ name: 'status', required: false, description: '事件状态（emitted/processing/processed/partial/failed）' })
  @ApiQuery({ name: 'emittedBy', required: false, description: '操作者（用户 ID / 系统服务名）' })
  @ApiQuery({ name: 'startTime', required: false, description: '起始时间（ISO 8601）' })
  @ApiQuery({ name: 'endTime', required: false, description: '结束时间（ISO 8601）' })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认 1）' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（默认 20，最大 100）' })
  @ApiQuery({ name: 'hasSubscribers', required: false, description: '仅看有订阅者追踪记录的事件（true/false）' })
  async findByFilter(@Query() query: EventLogQueryDto) {
    const filter: Parameters<EventLogService['findByFilter']>[0] = {
      projectId: query.projectId,
      eventType: query.eventType,
      status: query.status,
      emittedBy: query.emittedBy,
      page: query.page,
      pageSize: query.pageSize,
      hasSubscribers: query.hasSubscribers,
    };

    // ISO 日期字符串 → Date 对象
    if (query.startTime) {
      filter.startTime = new Date(query.startTime);
    }
    if (query.endTime) {
      filter.endTime = new Date(query.endTime);
    }

    return this.eventLogService.findByFilter(filter);
  }

  /**
   * 查询失败/部分失败的事件（运维快速定位）
   * 不分页，返回全部失败事件（按时间倒序）
   */
  @Get('failed')
  @ApiOperation({ summary: '查询失败/部分失败的事件（运维诊断）' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目 ID（可选筛选）' })
  @ApiQuery({ name: 'startTime', required: false, description: '起始时间（ISO 8601）' })
  @ApiQuery({ name: 'endTime', required: false, description: '结束时间（ISO 8601）' })
  async findFailed(
    @Query('projectId') projectId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const filter: Parameters<EventLogService['findFailed']>[0] = {};
    if (projectId) filter.projectId = projectId;
    if (startTime) filter.startTime = new Date(startTime);
    if (endTime) filter.endTime = new Date(endTime);

    return this.eventLogService.findFailed(filter);
  }

  /**
   * 查询单个事件日志详情（含 subscribers 完整记录）
   */
  @Get(':id')
  @ApiOperation({ summary: '事件日志详情（含订阅者追踪记录和业务效果）' })
  async findOne(@Param('id') id: string) {
    return this.eventLogService.findOne(id);
  }

  /**
   * 清空所有事件日志（运维操作，谨慎使用）
   */
  @Delete()
  @ApiOperation({ summary: '清空所有事件日志（运维操作，不可恢复）' })
  async clearAll() {
    return this.eventLogService.clearAll();
  }
}
