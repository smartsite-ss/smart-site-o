// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsObject, IsBoolean, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  projectName: string;

  @ApiPropertyOptional({
    description: 'tenantId 多租户预留字段（当前 = projectId），不传则自动等于 projectId',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'tenantId 只能包含小写字母、数字和连字符(-)，且不能以连字符开头或结尾',
  })
  tenantId?: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      '项目唯一标识符（拼音全拼 kebab-case，用作目录名/DB 隔离/InfluxDB bucket/Redis key），不传则按名称拼音全拼自动生成',
    example: 'ce-shi-gong-cheng',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'projectId 只能包含小写字母、数字和连字符(-)，且不能以连字符开头或结尾',
  })
  projectId?: string;

  @ApiPropertyOptional({
    description: '项目版本号，不传默认 1.0.0。建议使用语义化版本（如 1.0.0）',
    example: '1.0.0',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9.\-+]*$/, {
    message: '版本号只能包含字母、数字、点(.)、连字符(-)和加号(+)，且不能以特殊字符开头',
  })
  version?: string;

  @ApiPropertyOptional({ description: '项目配置' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '项目地址', example: '北京市朝阳区望京SOHO' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: '经度（十进制）', example: '116.404' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^-?\d+(\.\d+)?$/, { message: '经度须为数字（如 116.404）' })
  longitude?: string;

  @ApiPropertyOptional({ description: '纬度（十进制）', example: '39.915' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^-?\d+(\.\d+)?$/, { message: '纬度须为数字（如 39.915）' })
  latitude?: string;

  @ApiPropertyOptional({ description: '负责人', example: '张三' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  owner?: string;

  @ApiPropertyOptional({
    description: '项目封面图片相对路径（如 images/cover-1234567890.png）',
    example: 'images/cover-1234567890.png',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  image?: string;

  @ApiPropertyOptional({
    description: '项目启用状态（true=启用，false=停用）。不传默认 false（停用），启用后才开始数据采集',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
