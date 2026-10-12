// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateDataTagDto } from './create-datatag.dto';

export class BatchCreateDataTagDto {
  @ApiProperty({ description: '标签列表', type: [CreateDataTagDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDataTagDto)
  tags: CreateDataTagDto[];
}
