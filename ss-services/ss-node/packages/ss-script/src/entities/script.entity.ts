// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ProjectScopedEntity } from '@ss-node/ss-core';

export enum ScriptTriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  PIPELINE = 'pipeline',
}

export enum ScriptStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
}

@Entity('prj_scripts')
export class Script extends ProjectScopedEntity {
  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'varchar', length: 20, default: ScriptStatus.DRAFT })
  status: ScriptStatus;

  @Column({ type: 'varchar', length: 20 })
  triggerType: ScriptTriggerType;

  @Column({ nullable: true, type: 'text' })
  triggerConfig: string;

  @Column({ default: false })
  allowNetwork: boolean;

  @Column({ default: false })
  allowFileSystem: boolean;

  @Column({ default: 5000 })
  timeoutMs: number;

  @Column({ default: 128 })
  memoryLimitMb: number;
}

@Entity('prj_script_executions')
export class ScriptExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'script_id' })
  scriptId: string;

  @Column({ type: 'varchar', length: 20 })
  trigger: ScriptTriggerType;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  result: string;

  @Column({ nullable: true, type: 'text' })
  error: string;

  @Column({ default: 0 })
  durationMs: number;

  @Column({ default: 0 })
  memoryUsedMb: number;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
