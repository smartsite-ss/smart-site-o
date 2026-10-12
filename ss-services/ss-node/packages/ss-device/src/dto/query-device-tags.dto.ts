// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@ss-node/ss-sdk';

/**
 * 按设备查询数据标签列表的查询参数（GET /projects/:projectId/devices/:deviceId/tags）。
 * 管理端与移动端共用的唯一权威入口，详见架构设计 07-接口设计规范 §3.3。
 */
export class QueryDeviceTagsDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按标签名称模糊匹配' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '按数据类型过滤（如 int32 / float32 / bool）' })
  @IsString()
  @IsOptional()
  dataType?: string;

  @ApiPropertyOptional({ description: '按启用状态过滤（true / false）' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
