// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyTemplateDto {
  @ApiProperty({ description: '项目ID（用于定位项目数据库）' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: '目标设备ID' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ description: '是否替换已有标签' })
  @IsBoolean()
  @IsOptional()
  replaceExisting?: boolean;
}
