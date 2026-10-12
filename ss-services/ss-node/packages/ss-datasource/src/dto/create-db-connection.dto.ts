// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DbType } from '../entities/db-connection.entity';

export class CreateDbConnectionDto {
  @ApiProperty({ description: '连接名称' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '数据库类型',
    enum: ['mysql', 'sqlite', 'oracle', 'postgresql', 'mssql'],
  })
  @IsEnum(['mysql', 'sqlite', 'oracle', 'postgresql', 'mssql'] as const)
  dbType: DbType;

  @ApiPropertyOptional({ description: '主机地址' })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ description: '端口' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: '数据库名/文件路径' })
  @IsOptional()
  @IsString()
  database?: string;

  @ApiPropertyOptional({ description: '用户名' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '密码' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '额外选项 JSON' })
  @IsOptional()
  @IsString()
  options?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
