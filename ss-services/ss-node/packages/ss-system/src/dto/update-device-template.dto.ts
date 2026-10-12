// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsArray, IsEnum, IsBoolean, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateStatus } from '../enums/template-status.enum';
import { DeviceType } from '@ss-node/ss-sdk';

export class UpdateDeviceTemplateDto {
  @ApiPropertyOptional({ description: '模板名称' })
  @IsString()
  @IsOptional()
  @Length(1, 128)
  name?: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '适用的设备类型', enum: DeviceType })
  @IsEnum(DeviceType)
  @IsOptional()
  deviceType?: DeviceType;

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

  @ApiPropertyOptional({ enum: TemplateStatus, description: '状态' })
  @IsEnum(TemplateStatus)
  @IsOptional()
  status?: TemplateStatus;

  @ApiPropertyOptional({ description: '是否设为默认模板' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '自定义标签' })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
