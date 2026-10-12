// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { AlarmLevel, AlarmStatus } from '@ss-node/ss-sdk';

/**
 * 系统事件清除原因
 */
export enum SystemEventClearReason {
  /** 自动恢复（系统自行恢复，如数据库重连成功） */
  AUTO = 'auto',
  /** 人工清除 */
  MANUAL = 'manual',
  /** 系统重启恢复 */
  SYSTEM_RESTART = 'system_restart',
}

/**
 * 系统事件处置类型（生命周期动作）
 */
export enum SystemEventDispositionType {
  TRIGGERED = 'event.triggered',
  ACKNOWLEDGED = 'event.acknowledged',
  CLEARED = 'event.cleared',
}

/**
 * 全局系统事件实体
 *
 * 存储在全局 ss-node.db 的 sys_events 表中，记录系统级事件。
 * 生命周期与项目级 AlarmRecord 完全一致：
 *   ACTIVE → ACKNOWLEDGED → CLEARED
 *   ACTIVE → CLEARED（自动恢复）
 *
 * 与项目级 AlarmRecord（system.db）的对比：
 * ┌──────────────┬─────────────────────────────┬─────────────────────────────┐
 * │ 字段         │ AlarmRecord (项目级)         │ SystemEvent (全局)           │
 * ├──────────────┼─────────────────────────────┼─────────────────────────────┤
 * │ 数据库       │ system.db（每项目）           │ ss-node.db（全局）           │
 * │ 主体         │ 有规则/设备/标签关联          │ 无业务关联，独立事件          │
 * │ 事件类型     │ alarmType（device/system等）  │ eventType + subType          │
 * │ 级别         │ AlarmLevel                   │ AlarmLevel（共用）           │
 * │ 状态         │ AlarmStatus                  │ AlarmStatus（共用）           │
 * │ 生命周期     │ ACTIVE → ACK → CLEARED       │ ACTIVE → ACK → CLEARED      │
 * │ 清除原因     │ clearReason                  │ clearReason（共用）           │
 * │ 处置类型     │ dispositionType              │ dispositionType（共用）       │
 * │ 活跃标记     │ isActive                     │ isActive（共用）              │
 * └──────────────┴─────────────────────────────┴─────────────────────────────┘
 */
@Entity('sys_events')
@Index(['eventType'])
@Index(['level'])
@Index(['status'])
@Index(['isActive'])
@Index(['createdAt'])
export class SystemEvent {
  /** 确定性 ID（如 sys-health-influxdb），用于去重和恢复时查找 */
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  // ========== 事件分类（系统独有） ==========

  /** 事件类型：health | startup | config_change | plugin */
  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType: string;

  /** 子类型：disk | memory | cpu | database | influxdb | redis 等 */
  @Column({ name: 'sub_type', type: 'varchar', length: 32, nullable: true })
  subType: string;

  /** 事件来源：health-checker | system-resource-checker | plugin-manager 等 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  source: string;

  /** 扩展元数据（JSON 字符串）：阈值、快照、详情等 */
  @Column({ type: 'text', nullable: true })
  metadata: string;

  // ========== 生命周期字段（与 AlarmRecord 对齐） ==========

  /** 事件级别 */
  @Column({ type: 'varchar', length: 16, default: AlarmLevel.WARNING })
  level: AlarmLevel;

  /** 事件描述 */
  @Column({ type: 'text' })
  message: string;

  /** 触发时的值（如磁盘使用率 95%） */
  @Column({ name: 'trigger_value', type: 'varchar', length: 50, nullable: true })
  triggerValue: string;

  /** 事件状态 */
  @Column({ type: 'varchar', length: 20, default: AlarmStatus.ACTIVE })
  status: AlarmStatus;

  /** 是否活跃（未清除）：true=active/acknowledged, false=cleared */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // -- 确认 --

  /** 是否已确认 */
  @Column({ default: false })
  acknowledged: boolean;

  /** 确认时间 */
  @Column({ name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  /** 确认人 */
  @Column({ name: 'acknowledged_by', type: 'varchar', length: 36, nullable: true })
  acknowledgedBy: string;

  // -- 清除 --

  /** 清除原因：auto=自动恢复 / manual=人工清除 / system_restart=系统重启恢复 */
  @Column({ name: 'clear_reason', type: 'varchar', length: 20, nullable: true })
  clearReason: string;

  /** 清除时间 */
  @Column({ name: 'cleared_at', nullable: true })
  clearedAt: Date;

  /** 清除人（自动恢复时为 'system'） */
  @Column({ name: 'cleared_by', type: 'varchar', length: 36, nullable: true })
  clearedBy: string;

  // -- 恢复 --

  /** 自动恢复时间（条件恢复正常的时间） */
  @Column({ name: 'recovered_at', nullable: true })
  recoveredAt: Date;

  /** 自动恢复时的值（如磁盘使用率降至 80%） */
  @Column({ name: 'recovered_value', type: 'varchar', length: 50, nullable: true })
  recoveredValue: string;

  // -- 处置 --

  /** 处置类型（生命周期动作）：event.triggered → event.acknowledged → event.cleared */
  @Column({
    name: 'disposition_type',
    type: 'varchar',
    length: 50,
    default: SystemEventDispositionType.TRIGGERED,
  })
  dispositionType: string;

  // ========== 时间戳 ==========

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
