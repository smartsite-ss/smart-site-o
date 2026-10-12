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
import { ScriptTriggerType } from './script.entity';

export enum TemplateCategory {
  DATA_TRANSFORM = 'data_transform',
  ALARM_CONDITION = 'alarm_condition',
  DEVICE_CONTROL = 'device_control',
  REPORT = 'report',
  CUSTOM = 'custom',
}

@Entity('prj_script_templates')
export class ScriptTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 30 })
  category: TemplateCategory;

  @Column({ type: 'varchar', length: 20 })
  triggerType: ScriptTriggerType;

  @Column({ nullable: true, type: 'text' })
  triggerConfig: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  author: string;

  @Column({ default: '1.0.0' })
  version: string;

  @Column({ default: false })
  isBuiltin: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
