// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, Index } from 'typeorm';
import { ProjectScopedEntity } from '@ss-node/ss-core';

@Entity('dev_device_status_log')
export class DeviceStatusLog extends ProjectScopedEntity {
  @Column({ name: 'device_id', type: 'varchar', length: 36 })
  @Index()
  deviceId: string;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: string;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;
}
