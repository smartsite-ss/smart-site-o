// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_data_point_cache')
export class DataPointCache {
  @PrimaryColumn()
  tagId: string;

  @Column()
  deviceId: string;

  @Column()
  projectId: string;

  @Column({ type: 'decimal', nullable: true })
  value: number;

  @Column({ default: 'unknown' })
  quality: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
