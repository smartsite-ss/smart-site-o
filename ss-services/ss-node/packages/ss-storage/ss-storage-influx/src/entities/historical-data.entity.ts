// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DataTag } from '@ss-node/ss-device';

@Entity('data_historical_data')
@Index(['tagId', 'timestamp'])
export class HistoricalData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DataTag)
  @JoinColumn({ name: 'tagId' })
  tag: DataTag;

  @Column({ name: 'tagId' })
  tagId: string;

  @Column({ type: 'decimal', precision: 20, scale: 6, nullable: true })
  numericValue: number;

  @Column({ type: 'text', nullable: true })
  stringValue: string;

  @Column({ type: 'boolean', nullable: true })
  booleanValue: boolean;

  @Column({ type: 'text', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
