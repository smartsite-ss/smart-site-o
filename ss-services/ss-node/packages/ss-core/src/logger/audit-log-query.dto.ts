// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AuditSeverity } from './audit-logger.types';

/**
 * 审计日志查询 DTO — 支持 REST API 分页查询 + 多维筛选
 *
 * 参考 EventLogQueryDto 模式，使用 class-validator 装饰器。
 * 所有字段均为可选，支持灵活组合筛选。
 */
export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: '日期（YYYY-MM-DD），默认今天', example: '2026-08-05' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: '开始时间（YYYY-MM-DD 或 ISO 8601）', example: '2026-08-01' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间（YYYY-MM-DD 或 ISO 8601）', example: '2026-08-05' })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    description: '事件类型',
    example: 'auth.login.success',
    enum: [
      'auth.login.success',
      'auth.login.failed',
      'auth.login.locked',
      'auth.refresh.success',
      'auth.refresh.failed',
      'auth.logout',
      'auth.password.changed',
      'auth.password.failed',
      'user.created',
      'user.deleted',
      'user.role_changed',
      'permission.denied',
      'permission.granted',
      'system.config_changed',
      'system.data_exported',
    ],
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: '严重级别',
    enum: ['info', 'warning', 'critical'],
  })
  @IsIn(['info', 'warning', 'critical'])
  @IsOptional()
  severity?: AuditSeverity;

  @ApiPropertyOptional({ description: '用户 ID', example: 'user-001' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '用户名', example: 'admin' })
  @IsString()
  @IsOptional()
  username?: string;

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
}
