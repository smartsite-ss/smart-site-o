// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeviceType } from '@ss-node/ss-sdk';
import { TemplateStatus } from '../enums/template-status.enum';

export interface TemplateVariable {
  /** 不可变唯一标识（UUID v4），首次创建时生成，永不改变 */
  guid: string;
  order: number;
  name: string;
  description?: string;
  address: string;
  dataType: string;
  direction?: 'read' | 'write' | 'read-write';
  byteOrder?: 'big-endian' | 'little-endian';
  registerCount?: number;
  scanRate?: number;
  timeout?: number;
  retryCount?: number;
  priority?: string;
  enabled?: boolean;
  scale?: number;
  offset?: number;
  conversionType?: string;
  conversionConfig?: Record<string, any> | null;
  unit?: string;
  displayFormat?: string;
  minValue?: number | null;
  maxValue?: number | null;
  engMinValue?: number | null;
  engMaxValue?: number | null;
  deadbandMode?: string;
  deadbandValue?: number;
  deadbandPercent?: number;
  deadbandTime?: number;
  alarmEnabled?: boolean;
  alarmHighHigh?: number | null;
  alarmHigh?: number | null;
  alarmLow?: number | null;
  alarmLowLow?: number | null;
  alarmDeviation?: number | null;
  qualityCheckEnabled?: boolean;
  maxAge?: number;
  archiveEnabled?: boolean;
  archiveInterval?: number;
  retentionDays?: number;
  category?: string;
  tags?: string[];
}

@Entity('dev_device_tag_templates')
export class DeviceTagTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 30, name: 'device_type' })
  deviceType: DeviceType;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @Column({ type: 'varchar', length: 20, default: TemplateStatus.DRAFT })
  status: TemplateStatus;

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ type: 'text', default: '[]' })
  variables: TemplateVariable[];

  @Column({ type: 'varchar', length: 36, name: 'author_id' })
  authorId: string;

  @Column({ type: 'text', default: '[]' })
  tags: string[];

  @Column({ type: 'integer', default: 0, name: 'linked_devices' })
  linkedDevices: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
