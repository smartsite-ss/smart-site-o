// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { EventLogStatus } from './entities/event-log.entity';

/**
 * 事件日志查询 DTO — 支持 REST API 分页查询 + 多维筛选
 *
 * 参考 PaginationDto 模式，使用 class-validator 装饰器。
 * 所有字段均为可选，支持灵活组合筛选。
 */
export class EventLogQueryDto {
  @ApiPropertyOptional({ description: '项目 ID（系统级事件为 null）', example: 'demo-project' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: '事件类型',
    example: 'device.created',
    enum: [
      'device.created',
      'device.updated',
      'device.deleted',
      'device.tagsChanged',
      'device.enabled',
      'device.disabled',
      'project.created',
      'project.imported',
      'project:enabled',
      'project:disabled',
      'project.beforeDelete',
      'alarm.triggered',
      'alarm_acknowledged',
      'alarm.cleared',
      'alarm.rule_resolved',
      'config_changed',
      'protocol.config.updated',
      'timer:configChanged',
      'plugin.activated',
      'plugin.deactivated',
      'plugin.updated',
    ],
  })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({
    description: '事件状态',
    enum: ['emitted', 'processing', 'processed', 'partial', 'failed', 'no_subscribers'],
  })
  @IsIn(['emitted', 'processing', 'processed', 'partial', 'failed', 'no_subscribers'])
  @IsOptional()
  status?: EventLogStatus;

  @ApiPropertyOptional({ description: '操作者（用户 ID / 系统服务名）', example: 'user-001' })
  @IsString()
  @IsOptional()
  emittedBy?: string;

  @ApiPropertyOptional({ description: '起始时间（ISO 8601 日期字符串）', example: '2026-08-04' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间（ISO 8601 日期字符串）', example: '2026-08-05' })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '仅看有订阅者追踪记录的事件（true=有追踪，false=无追踪，不传=全部）' })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1';
  })
  @IsBoolean()
  @IsOptional()
  hasSubscribers?: boolean;
}
