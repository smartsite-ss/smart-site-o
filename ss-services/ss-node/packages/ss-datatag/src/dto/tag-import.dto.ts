// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsOptional, IsObject, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagImportResultDto {
  @ApiProperty({ description: '是否全部成功' })
  valid: boolean;

  @ApiProperty({ description: '成功导入数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failureCount: number;

  @ApiProperty({ description: '错误列表' })
  errors: Array<{ row: number; column: string; message: string }>;

  @ApiProperty({ description: '警告列表' })
  warnings: Array<{ row: number; column: string; message: string }>;
}

export class TagImportDto {
  @ApiProperty({ description: '导入数据 (JSON格式)' })
  tags: any[];

  @ApiProperty({ description: '目标设备ID（必填，必须为真实设备 UUID，禁止使用 default-device 占位）' })
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: '导入选项' })
  @IsOptional()
  @IsObject()
  options?: {
    overwrite?: boolean;
    skipErrors?: boolean;
  };
}
