// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 权限变更审计日志表 — v7.0 新增
 * 记录角色权限修改、授权变更等操作
 */
@Entity('sys_permission_audit_logs')
export class PermissionAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 操作人 ID */
  @Column({ name: 'operator_id' })
  @Index('idx_pal_operator')
  operatorId: string;

  /** 操作人用户名 */
  @Column({ name: 'operator_name' })
  operatorName: string;

  /**
   * 操作类型：
   *   grant_role     — 授予角色
   *   revoke_role    — 撤销角色
   *   update_permissions — 更新权限码
   *   update_auth    — 更新数据授权
   */
  @Column()
  @Index('idx_pal_action')
  action: string;

  /**
   * 目标类型：
   *   role / user / project_auth / group_auth / device_auth
   */
  @Column({ name: 'target_type' })
  targetType: string;

  /** 目标 ID */
  @Column({ name: 'target_id' })
  @Index('idx_pal_target')
  targetId: string;

  /** 变更详情 (JSON)，如 { before: [...], after: [...] } */
  @Column({ type: 'simple-json', nullable: true })
  changes: Record<string, unknown> | null;

  /** 操作 IP */
  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
