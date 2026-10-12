// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ReportType, ReportStatus, ExportFormat } from './report.entity';
import { PaginationDto } from '@ss-node/ss-sdk';

export class GenerateDailyReportDto {
  @ApiProperty({ description: '报表日期', example: '2026-06-15' })
  @IsDateString()
  date: string;
}

export class GenerateMonthlyReportDto {
  @ApiProperty({ description: '报表月份', example: '2026-06' })
  @IsString()
  month: string;
}

export class GenerateCustomReportDto {
  @ApiProperty({ description: '开始日期', example: '2026-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期', example: '2026-06-30' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: '统计指标', example: ['avg', 'max', 'min'] })
  @IsArray()
  @IsOptional()
  metrics?: string[];

  @ApiPropertyOptional({ description: '标签ID列表' })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({ description: '设备ID列表' })
  @IsArray()
  @IsOptional()
  deviceIds?: string[];

  @ApiPropertyOptional({ description: '粒度', enum: ['hour', 'day', 'month'] })
  @IsOptional()
  granularity?: 'hour' | 'day' | 'month';
}

export class ExportReportDto {
  @ApiProperty({ description: '导出格式（pdf 与 html 均输出 HTML 文件，生产环境待接入真 PDF 生成）', enum: ['pdf', 'excel', 'html'] })
  @IsEnum(['pdf', 'excel', 'html'])
  format: 'pdf' | 'excel' | 'html';
}

export class AlarmReportDto {
  @ApiProperty({ description: '开始日期', example: '2026-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期', example: '2026-06-30' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: '告警级别过滤' })
  @IsArray()
  @IsOptional()
  levels?: string[];

  @ApiPropertyOptional({ description: '设备ID过滤' })
  @IsArray()
  @IsOptional()
  deviceIds?: string[];
}

export class TrendReportDto {
  @ApiProperty({ description: '开始日期', example: '2026-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期', example: '2026-06-30' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: '标签ID列表' })
  @IsArray()
  tagIds: string[];

  @ApiPropertyOptional({ description: '粒度', enum: ['hour', 'day', 'month'] })
  @IsOptional()
  granularity?: 'hour' | 'day' | 'month';
}

export class ReportQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '报表类型', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ description: '报表状态', enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class SaveReportConfigDto {
  @ApiProperty({ description: '报表名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '报表描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '报表配置' })
  @IsObject()
  config: Record<string, unknown>;
}

// ==================== 报表模板 DTO ====================

export class CreateReportTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '报表类型', enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ description: '模板配置（指标/标签/时间范围等）' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateReportTemplateDto {
  @ApiPropertyOptional({ description: '模板名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '报表类型', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ description: '模板配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class ReportTemplateQueryDto {
  @ApiPropertyOptional({ description: '报表类型过滤', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;
}

// ==================== 定时导出 DTO ====================

export class CreateScheduleDto {
  @ApiPropertyOptional({ description: '关联模板ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({
    description: 'Cron 表达式（5 字段：分 时 日 月 周）',
    example: '0 0 * * *',
  })
  @IsString()
  cronExpression: string;

  @ApiProperty({ description: '导出格式', enum: ExportFormat })
  @IsEnum(ExportFormat)
  exportFormat: ExportFormat;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
