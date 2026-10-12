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
import { Role } from './role.entity';

/**
 * 设备分组授权表 — v7.0 新增
 * 控制角色对设备分组的访问权限
 */
@Entity('sys_device_group_authorizations')
@Index('idx_dga_role_group', ['roleId', 'projectId', 'groupId'], { unique: true })
export class DeviceGroupAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 授权给哪个角色 */
  @Column({ name: 'role_id' })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  /** 所属项目 */
  @Column({ name: 'project_id' })
  projectId: string;

  /** 设备分组 ID */
  @Column({ name: 'group_id' })
  groupId: string;

  /** 权限级别：read | write */
  @Column({ default: 'read' })
  permission: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
