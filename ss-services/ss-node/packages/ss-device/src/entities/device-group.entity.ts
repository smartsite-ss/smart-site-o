// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProjectScopedEntity } from '@ss-node/ss-core';

@Entity('dev_device_groups')
export class DeviceGroup extends ProjectScopedEntity {
  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => DeviceGroup, { nullable: true, onDelete: 'SET NULL' })
  parent: DeviceGroup;

  @OneToMany(() => DeviceGroup, (group) => group.parent)
  children: DeviceGroup[];

  @Column({ default: 0 })
  sortOrder: number;
}
