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
 * 标签级授权表 — v7.0 新增（3.6 实现）
 *
 * 控制角色对具体数据标签的访问权限。
 * 当角色无显式标签授权时，回退到所属设备的授权（fallback to device-level）。
 *
 * @see docs/ss-data/02-详细设计/03-设备管理/00-设计-设备管理.md §11
 */
@Entity('sys_tag_authorizations')
@Index('idx_ta_role_tag', ['roleId', 'projectId', 'tagId'], { unique: true })
export class TagAuthorization {
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

  /** 数据标签 ID */
  @Column({ name: 'tag_id' })
  tagId: string;

  /** 权限级别：read | write */
  @Column({ default: 'read' })
  permission: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
