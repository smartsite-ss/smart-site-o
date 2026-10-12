// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column } from 'typeorm';
import { TagDataType, DeadbandMode, ConversionType } from '../enums/tag.enums';
import { ProjectScopedEntity } from '@ss-node/ss-core';

export { TagDataType, DeadbandMode, ConversionType };

@Entity('dev_data_tags')
export class DataTag extends ProjectScopedEntity {
  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ type: 'varchar', length: 20, default: TagDataType.FLOAT32 })
  dataType: TagDataType;

  @Column({ type: 'text', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'decimal', nullable: true, precision: 10, scale: 2 })
  scale: number;

  @Column({ type: 'decimal', nullable: true, precision: 10, scale: 2 })
  offset: number;

  @Column({ type: 'int', default: 1000 })
  scanRate: number;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string;

  @Column({ type: 'int', nullable: true })
  decimalPlaces: number;

  @Column({ type: 'double', nullable: true })
  minValue: number;

  @Column({ type: 'double', nullable: true })
  maxValue: number;

  @Column({ type: 'varchar', length: 20, nullable: true, default: '%.2f' })
  displayFormat: string;

  @Column({ type: 'double', nullable: true })
  engMinValue: number;

  @Column({ type: 'double', nullable: true })
  engMaxValue: number;

  @Column({ type: 'int', nullable: true, default: 5000 })
  timeout: number;

  @Column({ type: 'int', nullable: true, default: 3 })
  retryCount: number;

  @Column({ type: 'varchar', length: 20, default: DeadbandMode.NONE })
  deadbandMode: DeadbandMode;

  @Column({ type: 'double', nullable: true })
  deadbandValue: number;

  @Column({ type: 'double', nullable: true })
  deadbandPercent: number;

  @Column({ type: 'int', nullable: true })
  deadbandTime: number;

  @Column({ type: 'varchar', length: 20, default: ConversionType.NONE })
  conversionType: ConversionType;

  @Column({ type: 'simple-json', nullable: true })
  conversionConfig: Record<string, any>;

  @Column({ type: 'double', nullable: true })
  alarmHighHigh: number;

  @Column({ type: 'double', nullable: true })
  alarmHigh: number;

  @Column({ type: 'double', nullable: true })
  alarmLow: number;

  @Column({ type: 'double', nullable: true })
  alarmLowLow: number;

  @Column({ type: 'double', nullable: true })
  alarmDeviation: number;

  @Column({ default: true })
  alarmEnabled: boolean;

  @Column({ default: false })
  qualityCheckEnabled: boolean;

  @Column({ type: 'int', nullable: true })
  maxAge: number;

  @Column({ default: false })
  archiveEnabled: boolean;

  @Column({ type: 'int', nullable: true })
  archiveInterval: number;

  @Column({ type: 'double', nullable: true })
  archiveDeadband: number;

  @Column({ type: 'int', nullable: true })
  retentionDays: number;

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', length: 20, default: 'read' })
  direction: string = 'read';

  @Column({ name: 'simulation_enabled', default: false })
  simulationEnabled: boolean;

  @Column({ name: 'simulation_config', type: 'simple-json', nullable: true })
  simulationConfig: Record<string, any>;

  @Column({ name: 'deviceId' })
  deviceId: string;

  /** 关联的模板变量 GUID（null 表示手动创建的标签，不参与模板同步） */
  @Column({ name: 'template_variable_guid', type: 'varchar', length: 36, nullable: true })
  templateVariableGuid?: string | null;
}
