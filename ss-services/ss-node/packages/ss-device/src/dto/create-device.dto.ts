// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsString, IsOptional, IsObject, Matches, IsIn, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 支持的采集驱动插件 */
export const COLLECTOR_DRIVERS = [
  'modbus_tcp',
  'modbus_rtu',
  'opc_ua',
  'mqtt',
  'siemens_s7',
  'virtual',
] as const;
export type CollectorDriver = (typeof COLLECTOR_DRIVERS)[number];

export class CreateDeviceDto {
  @ApiProperty({ description: '设备编码，全英文小写+数字，项目内唯一', example: 'temp-hum-001' })
  @IsString()
  @Matches(/^[a-z][a-z0-9\-]{0,62}$/, {
    message: 'deviceCode 必须为全英文小写+数字+连字符，以字母开头',
  })
  deviceCode: string;

  @ApiProperty({ description: '设备实例名称', example: '温湿度001' })
  @IsString()
  deviceName: string;

  @ApiPropertyOptional({ description: '设备别名', example: '一楼大厅温湿度' })
  @IsString()
  @IsOptional()
  nameAlias?: string;

  @ApiPropertyOptional({ description: '设备类型（从模板推导）' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '设备描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '设备模板ID（必填，设备从模板实例化，设备类型从模板推导）',
    example: 'tpl-temp-hum',
  })
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ description: '模板版本号，默认使用最新版本', example: '1.0.0' })
  @IsString()
  @IsOptional()
  templateVersion?: string;

  @ApiProperty({
    description: '采集驱动插件（对应 ss-collector 下的采集插件）',
    example: 'modbus',
    enum: COLLECTOR_DRIVERS,
  })
  @IsString()
  @IsIn(COLLECTOR_DRIVERS, { message: 'driver 必须是有效的采集插件: modbus|opcua|mqtt|s7|virtual' })
  driver: CollectorDriver;

  @ApiProperty({ description: '通道连接配置（设备实例化后的差异化连接信息）' })
  @IsObject()
  connection: Record<string, any>;

  @ApiPropertyOptional({ description: '采集周期(ms)', example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  scanRate?: number;

  @ApiPropertyOptional({ description: '离线周期(ms)，超过此周期无数据视为离线', example: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  offlinePeriod?: number;

  @ApiPropertyOptional({ description: '心跳间隔(ms)', example: 30000 })
  @IsOptional()
  heartbeatInterval?: number;

  @ApiPropertyOptional({ description: '所属分组ID' })
  @IsString()
  @IsOptional()
  groupId?: string;
}
