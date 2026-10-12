// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsObject, IsIn, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { COLLECTOR_DRIVERS, CollectorDriver } from './create-device.dto';

export class UpdateDeviceDto {
  @ApiPropertyOptional({ description: '设备编码', example: 'temp-hum-001' })
  @IsString()
  @IsOptional()
  deviceCode?: string;

  @ApiPropertyOptional({ description: '设备名称' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ description: '设备别名' })
  @IsString()
  @IsOptional()
  nameAlias?: string;

  @ApiPropertyOptional({ description: '设备类型' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '设备描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '设备配置' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '采集驱动插件' })
  @IsString()
  @IsOptional()
  @IsIn(COLLECTOR_DRIVERS, { message: 'driver 必须是有效的采集插件' })
  driver?: CollectorDriver;

  @ApiPropertyOptional({ description: '设备模板ID' })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({ description: '通道连接配置' })
  @IsObject()
  @IsOptional()
  connection?: Record<string, any>;

  @ApiPropertyOptional({ description: '分组ID' })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: '采集周期(ms)', example: 1000 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  scanRate?: number;

  @ApiPropertyOptional({ description: '离线周期(ms)，超过此周期无数据视为离线', example: 30000 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  offlinePeriod?: number;
}
