// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsOptional, IsString, IsDefined } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WriteTagDto {
  @ApiProperty({ description: '写入值' })
  @IsDefined()
  value: any;

  @ApiPropertyOptional({ description: '操作原因' })
  @IsString()
  @IsOptional()
  reason?: string;
}
