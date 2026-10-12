// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsObject, IsBoolean, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: '项目名称' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '项目版本号' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: '项目配置' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '项目地址' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: '经度（十进制）' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^-?\d+(\.\d+)?$/, { message: '经度须为数字（如 116.404）' })
  longitude?: string;

  @ApiPropertyOptional({ description: '纬度（十进制）' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^-?\d+(\.\d+)?$/, { message: '纬度须为数字（如 39.915）' })
  latitude?: string;

  @ApiPropertyOptional({ description: '负责人' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  owner?: string;

  @ApiPropertyOptional({ description: '项目封面图片相对路径' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  image?: string;

  @ApiPropertyOptional({ description: '项目启用状态（true=启用，false=停用）。切换会动态启停采集' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
