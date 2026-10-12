// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TagDataType } from '../enums/tag.enums';
import { PaginationDto } from '@ss-node/ss-sdk';

export class TagQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '搜索关键字 (名称/地址)' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: '分组ID' })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: '设备ID' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ enum: TagDataType, description: '数据类型筛选' })
  @IsEnum(TagDataType)
  @IsOptional()
  dataType?: TagDataType;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  enabled?: boolean;
}
