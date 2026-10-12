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

@Entity('sys_device_authorizations')
@Index('idx_da_role_device', ['roleId', 'projectId', 'deviceId'], { unique: true })
export class DeviceAuthorization {
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

  /** 设备 ID */
  @Column({ name: 'device_id' })
  deviceId: string;

  /** 权限级别：read | write */
  @Column({ default: 'read' })
  permission: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
