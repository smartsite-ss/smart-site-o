// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsEnum, IsArray, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '@ss-node/ss-sdk';

export class CreateDeviceTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @Length(1, 128)
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DeviceType, description: '适用的设备类型' })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiPropertyOptional({ description: '设备行业分类' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: '设备类别' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: '版本号' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: '变量定义数组' })
  @IsArray()
  @IsOptional()
  @Type(() => Object)
  variables?: Record<string, any>[];

  @ApiPropertyOptional({ description: '自定义标签' })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
