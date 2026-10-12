// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_trend_query_schemes')
export class TrendQueryScheme {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'project_id', type: 'text' })
  projectId: string;

  @Column({ name: 'device_id', type: 'text' })
  deviceId: string;

  @Column({ name: 'tag_ids', type: 'text', default: '[]' })
  tagIds: string;

  @Column({ name: 'start_time', type: 'text', nullable: true })
  startTime: string;

  @Column({ name: 'end_time', type: 'text', nullable: true })
  endTime: string;

  @Column({ name: 'interpolation_mode', type: 'text', default: 'raw' })
  interpolationMode: string;

  @Column({ name: 'interpolation_interval', type: 'integer', default: 1000 })
  interpolationInterval: number;

  @Column({ name: 'preset_range', type: 'text', nullable: true })
  presetRange: string;

  @Column({ type: 'text', nullable: true })
  scene: string;

  @Column({ name: 'time_range_minutes', type: 'integer', default: 60 })
  timeRangeMinutes: number;

  @Column({ name: 'refresh_interval_sec', type: 'integer', default: 5 })
  refreshIntervalSec: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'text' })
  updatedAt: string;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy: string;
}