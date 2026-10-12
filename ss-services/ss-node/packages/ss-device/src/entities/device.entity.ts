// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, Index, Unique } from 'typeorm';
import { DeviceType, DeviceStatus } from '@ss-node/ss-sdk';
import { ProjectScopedEntity } from '@ss-node/ss-core';

@Entity('dev_devices')
@Unique(['projectId', 'deviceCode'])
export class Device extends ProjectScopedEntity {
  // DB 列名 'device_code'（策略 B，与 TS 属性 deviceCode 语义对齐）
  @Column({ name: 'device_code', type: 'varchar', length: 64, nullable: true })
  @Index()
  deviceCode: string;

  // DB 列名 'device_name'（策略 B，与 TS 属性 deviceName 语义对齐）
  @Column({ name: 'device_name' })
  deviceName: string;

  @Column({ nullable: true, type: 'varchar', length: 128 })
  nameAlias: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 30 })
  type: DeviceType;

  @Column({ type: 'text', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: DeviceStatus.OFFLINE })
  status: DeviceStatus;

  @Column({ name: 'last_online_at', nullable: true })
  lastOnlineAt: Date;

  @Column({ name: 'last_offline_at', nullable: true })
  lastOfflineAt: Date;

  @Column({ name: 'error_count', default: 0 })
  errorCount: number;

  @Column({ name: 'last_error_at', nullable: true })
  lastErrorAt: Date;

  @Column({ name: 'last_error_msg', nullable: true, type: 'text' })
  lastErrorMsg: string;

  @Column({ name: 'template_id', nullable: true, type: 'varchar', length: 36 })
  templateId: string;

  @Column({ name: 'template_version', nullable: true, type: 'varchar', length: 20 })
  templateVersion: string;

  @Column({ name: 'template_applied_at', nullable: true })
  templateAppliedAt: Date;

  @Column({ name: 'connection', type: 'text', nullable: true })
  connection: Record<string, any>;

  @Column({ name: 'group_id', nullable: true, type: 'varchar', length: 36 })
  @Index()
  groupId: string;

  @Column({ name: 'driver', type: 'varchar', length: 30, nullable: true })
  driver: string;

  @Column({ name: 'scan_rate', type: 'integer', nullable: true, default: 1000 })
  scanRate?: number;

  @Column({ name: 'offline_period', type: 'integer', nullable: true, default: 30000 })
  offlinePeriod?: number;

  @Column({ name: 'last_data_at', nullable: true })
  lastDataAt?: Date;

  @Column({ name: 'updated_by', nullable: true, type: 'varchar', length: 64 })
  updatedBy?: string;
}
