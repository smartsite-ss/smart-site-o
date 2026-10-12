// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagDataType, DeadbandMode, ConversionType, TagDirection } from '../enums/tag.enums';

export class ConversionConfigDto {
  @ApiPropertyOptional({ description: '转换类型' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '线性缩放系数' })
  @IsNumber()
  @IsOptional()
  scale?: number;

  @ApiPropertyOptional({ description: '线性偏移量' })
  @IsNumber()
  @IsOptional()
  offset?: number;

  @ApiPropertyOptional({ description: '多项式系数数组 [a, b, c] => a*x²+b*x+c' })
  @IsArray()
  @IsOptional()
  coefficients?: number[];

  @ApiPropertyOptional({ description: '查表插值点 [{raw, eng}]' })
  @IsArray()
  @IsOptional()
  points?: Array<{ raw: number; eng: number }>;

  @ApiPropertyOptional({ description: '脚本表达式' })
  @IsString()
  @IsOptional()
  script?: string;
}

export class CreateDataTagDto {
  @ApiProperty({ description: '标签名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '寄存器地址' })
  @IsString()
  address: string;

  @ApiProperty({ enum: TagDataType, description: '数据类型', default: TagDataType.FLOAT32 })
  @IsEnum(TagDataType)
  dataType: TagDataType;

  @ApiPropertyOptional({ description: '设备ID' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ description: '项目ID' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: '标签描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '工程单位' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: '显示格式 (%.2f)', default: '%.2f' })
  @IsString()
  @IsOptional()
  displayFormat?: string;

  @ApiPropertyOptional({ description: '小数位数' })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  decimalPlaces?: number;

  @ApiPropertyOptional({ description: '量程下限' })
  @IsNumber()
  @IsOptional()
  minValue?: number;

  @ApiPropertyOptional({ description: '量程上限' })
  @IsNumber()
  @IsOptional()
  maxValue?: number;

  @ApiPropertyOptional({ description: '工程值下限' })
  @IsNumber()
  @IsOptional()
  engMinValue?: number;

  @ApiPropertyOptional({ description: '工程值上限' })
  @IsNumber()
  @IsOptional()
  engMaxValue?: number;

  @ApiPropertyOptional({ description: '缩放系数', default: 1.0 })
  @IsNumber()
  @IsOptional()
  scale?: number;

  @ApiPropertyOptional({ description: '偏移量', default: 0.0 })
  @IsNumber()
  @IsOptional()
  offset?: number;

  @ApiPropertyOptional({ description: '扫描周期(ms)', default: 1000 })
  @IsNumber()
  @Min(100)
  @IsOptional()
  scanRate?: number;

  @ApiPropertyOptional({ description: '超时(ms)', default: 5000 })
  @IsNumber()
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ description: '重试次数', default: 3 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  retryCount?: number;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '采集优先级: low/normal/high/critical', default: 'normal' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ enum: DeadbandMode, description: '死区模式', default: DeadbandMode.NONE })
  @IsEnum(DeadbandMode)
  @IsOptional()
  deadbandMode?: DeadbandMode;

  @ApiPropertyOptional({ description: '绝对死区值' })
  @IsNumber()
  @IsOptional()
  deadbandValue?: number;

  @ApiPropertyOptional({ description: '百分比死区' })
  @IsNumber()
  @IsOptional()
  deadbandPercent?: number;

  @ApiPropertyOptional({ description: '时间死区(ms)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  deadbandTime?: number;

  @ApiPropertyOptional({
    enum: ConversionType,
    description: '数据转换类型',
    default: ConversionType.NONE,
  })
  @IsEnum(ConversionType)
  @IsOptional()
  conversionType?: ConversionType;

  @ApiPropertyOptional({ description: '数据转换配置' })
  @ValidateNested()
  @Type(() => ConversionConfigDto)
  @IsOptional()
  conversionConfig?: ConversionConfigDto;

  @ApiPropertyOptional({ description: '高-高报警限值' })
  @IsNumber()
  @IsOptional()
  alarmHighHigh?: number;

  @ApiPropertyOptional({ description: '高报警限值' })
  @IsNumber()
  @IsOptional()
  alarmHigh?: number;

  @ApiPropertyOptional({ description: '低报警限值' })
  @IsNumber()
  @IsOptional()
  alarmLow?: number;

  @ApiPropertyOptional({ description: '低-低报警限值' })
  @IsNumber()
  @IsOptional()
  alarmLowLow?: number;

  @ApiPropertyOptional({ description: '报警偏差限值' })
  @IsNumber()
  @IsOptional()
  alarmDeviation?: number;

  @ApiPropertyOptional({ description: '报警开关', default: true })
  @IsBoolean()
  @IsOptional()
  alarmEnabled?: boolean;

  @ApiPropertyOptional({ description: '质量检查开关', default: true })
  @IsBoolean()
  @IsOptional()
  qualityCheckEnabled?: boolean;

  @ApiPropertyOptional({ description: '数据最大有效期(ms)', default: 10000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAge?: number;

  @ApiPropertyOptional({ description: '归档开关', default: true })
  @IsBoolean()
  @IsOptional()
  archiveEnabled?: boolean;

  @ApiPropertyOptional({ description: '归档间隔(ms), 0=每次', default: 60000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  archiveInterval?: number;

  @ApiPropertyOptional({ description: '归档死区值' })
  @IsNumber()
  @IsOptional()
  archiveDeadband?: number;

  @ApiPropertyOptional({ description: '保留天数', default: 90 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  retentionDays?: number;

  @ApiPropertyOptional({ description: '分组ID' })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: '标签分类' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: '自定义标签数组' })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: '仿真开关', default: false })
  @IsBoolean()
  @IsOptional()
  simulationEnabled?: boolean;

  @ApiPropertyOptional({ description: '仿真配置' })
  @IsObject()
  @IsOptional()
  simulationConfig?: Record<string, any>;

  @ApiPropertyOptional({ enum: TagDirection, description: '读写方向', default: TagDirection.READ })
  @IsEnum(TagDirection)
  @IsOptional()
  direction?: TagDirection;
}
