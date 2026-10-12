// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Column } from 'typeorm';
import { Entity } from 'typeorm';
import { ProjectScopedEntity } from '@ss-node/ss-core';

@Entity('control_operation_logs')
export class ControlOperationLog extends ProjectScopedEntity {
  @Column()
  deviceId: string;

  @Column()
  deviceName: string;

  @Column()
  tagId: string;

  @Column()
  tagName: string;

  @Column({ type: 'text', nullable: true })
  previousValue: string;

  @Column({ type: 'text' })
  writtenValue: string;

  @Column()
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column()
  operatorId: string;

  @Column()
  operatorName: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column()
  latencyMs: number;
}
