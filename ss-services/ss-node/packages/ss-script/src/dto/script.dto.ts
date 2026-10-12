// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptStatus, ScriptTriggerType } from '../entities/script.entity';

export class CreateScriptDto {
  @ApiProperty({ description: '脚本名称' })
  name: string;

  @ApiPropertyOptional({ description: '脚本描述' })
  description?: string;

  @ApiProperty({ description: '脚本代码' })
  code: string;

  @ApiPropertyOptional({ enum: ScriptStatus, default: ScriptStatus.DRAFT })
  status?: ScriptStatus;

  @ApiProperty({ enum: ScriptTriggerType, description: '触发类型' })
  triggerType: ScriptTriggerType;

  @ApiPropertyOptional({ description: '触发器配置 (JSON string)' })
  triggerConfig?: string;

  @ApiPropertyOptional({ default: false, description: '是否允许网络访问' })
  allowNetwork?: boolean;

  @ApiPropertyOptional({ default: false, description: '是否允许文件系统访问' })
  allowFileSystem?: boolean;

  @ApiPropertyOptional({ default: 5000, description: '超时时间(ms)' })
  timeoutMs?: number;

  @ApiPropertyOptional({ default: 128, description: '内存限制(MB)' })
  memoryLimitMb?: number;
}

export class UpdateScriptDto {
  @ApiPropertyOptional({ description: '脚本名称' })
  name?: string;

  @ApiPropertyOptional({ description: '脚本描述' })
  description?: string;

  @ApiPropertyOptional({ description: '脚本代码' })
  code?: string;

  @ApiPropertyOptional({ enum: ScriptStatus })
  status?: ScriptStatus;

  @ApiPropertyOptional({ enum: ScriptTriggerType })
  triggerType?: ScriptTriggerType;

  @ApiPropertyOptional({ description: '触发器配置 (JSON string)' })
  triggerConfig?: string;

  @ApiPropertyOptional({ description: '是否允许网络访问' })
  allowNetwork?: boolean;

  @ApiPropertyOptional({ description: '是否允许文件系统访问' })
  allowFileSystem?: boolean;

  @ApiPropertyOptional({ description: '超时时间(ms)' })
  timeoutMs?: number;

  @ApiPropertyOptional({ description: '内存限制(MB)' })
  memoryLimitMb?: number;
}

export class ExecuteScriptDto {
  @ApiPropertyOptional({ description: '执行上下文参数' })
  params?: Record<string, any>;

  @ApiPropertyOptional({ default: false, description: '是否干运行模式（不写入DB）' })
  dryRun?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: '是否异步执行（true：入队后立即返回 executionId；false：同步等待结果）',
  })
  async?: boolean;

  @ApiPropertyOptional({
    enum: ['critical', 'high', 'normal', 'low'],
    default: 'normal',
    description: '执行优先级（不传则按触发类型映射：manual→normal, scheduled→low, event→high）',
  })
  priority?: 'critical' | 'high' | 'normal' | 'low';

  @ApiPropertyOptional({ default: 'system', description: '触发执行的用户 ID（用于审计）' })
  userId?: string;
}

/** 异步执行响应 */
export class AsyncExecutionResponse {
  executionId: string;
  status: string;
}

export class ValidateScriptDto {
  @ApiProperty({ description: '脚本代码' })
  code: string;

  @ApiPropertyOptional({ default: false, description: '是否允许网络访问' })
  allowNetwork?: boolean;

  @ApiPropertyOptional({ default: false, description: '是否允许文件系统访问' })
  allowFileSystem?: boolean;
}

export class ValidateResultDto {
  valid: boolean;
  errors: Array<{ line: number; column: number; message: string }>;
}

export class DryRunResultDto {
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
  memoryUsedMb: number;
  logs: string[];
}
