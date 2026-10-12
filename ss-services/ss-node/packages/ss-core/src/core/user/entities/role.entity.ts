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

@Entity('sys_roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ default: '' })
  description: string;

  @Column({ type: 'simple-json', default: '[]' })
  permissions: string[];

  /** 该角色可见的菜单 ID 列表，用于菜单可见性分配 */
  @Column({ name: 'menu_ids', type: 'simple-json', default: '[]' })
  menuIds: string[];

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
