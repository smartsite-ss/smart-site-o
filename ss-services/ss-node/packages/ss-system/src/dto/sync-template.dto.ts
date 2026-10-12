// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsOptional, IsArray, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncTemplateDto {
  @ApiPropertyOptional({ description: '项目ID（指定设备时必填，用于定位项目数据库）' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: '指定要同步的设备ID列表' })
  @IsArray()
  @IsOptional()
  deviceIds?: string[];

  @ApiPropertyOptional({ description: '是否强制覆盖已修改的标签' })
  @IsBoolean()
  @IsOptional()
  forceOverwrite?: boolean;
}
