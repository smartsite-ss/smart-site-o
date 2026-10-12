// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { DataTag } from '@ss-node/ss-device';
import { AlarmLevel, AlarmStatus, AlarmCondition } from '@ss-node/ss-sdk';
import { ProjectScopedEntity } from '@ss-node/ss-core';

export { AlarmLevel, AlarmStatus, AlarmCondition };

@Entity('alm_alarm_rules')
export class AlarmRule extends ProjectScopedEntity {
  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: AlarmLevel.WARNING })
  level: AlarmLevel;

  @Column({ type: 'varchar', length: 20 })
  condition: AlarmCondition;

  @Column({ type: 'text' })
  conditionValue: any;

  @Column({ default: true })
  enabled: boolean;

  @ManyToOne(() => DataTag)
  @JoinColumn({ name: 'tagId' })
  tag: DataTag;

  @Column({ name: 'tagId' })
  tagId: string;

  @Column({ default: 5000 })
  debounceMs: number;

  @Column({ default: 0 })
  debounceCount: number;

  /** 告警类型（来源于字典 alarmType）：device/communication/data/safety/power/process/environment/system/security/custom */
  @Column({ type: 'varchar', length: 30, default: 'data' })
  alarmType: string;

  /** 值恢复后是否自动清除告警（true=自动清除完成闭环，false=需人工确认）。
   *  对应 DDL alarm_rules.auto_clear 字段，Phase 5 启用 */
  @Column({ default: true })
  autoClear: boolean;

  /** 通知渠道（JSON 数组字符串，如 '["sound","popup","sms"]'）。
   *  对应 DDL alarm_rules.notify_channels 列（TEXT DEFAULT '["sound","popup"]'）。
   *  Phase 6 通知接线启用：AlarmNotificationSubscriber 解析此字段决定告警触发时使用哪些通知渠道；
   *  null/空数组时回退到 AlarmNotificationService 全局启用渠道。
   *  TS 标记可选以匹配 DB 默认值语义（未显式赋值时由 DB 填充默认值） */
  @Column({ type: 'text', default: '["sound","popup"]', nullable: true })
  notifyChannels?: string;
}

@Entity('alm_alarm_records')
@Index(['level', 'status'])
@Index(['createdAt'])
@Index(['projectId'])
@Index(['ruleId'])
@Index(['projectId', 'createdAt'])
@Index(['deviceId'])
@Index(['acknowledgedAt'])
@Index(['alarmType'])
@Index(['dispositionType'])
@Index(['isActive'])
@Index(['clearReason'])
@Index(['recoveredAt'])
export class AlarmRecord extends ProjectScopedEntity {
  @ManyToOne(() => AlarmRule)
  @JoinColumn({ name: 'ruleId' })
  rule: AlarmRule;

  @Column({ name: 'ruleId', nullable: true })
  ruleId: string;

  @Column({ name: 'deviceId', nullable: true, type: 'varchar', length: 36 })
  deviceId: string;

  @Column({ name: 'deviceName', nullable: true, type: 'varchar', length: 100 })
  deviceName: string;

  @Column({ name: 'tagId', nullable: true, type: 'varchar', length: 36 })
  tagId: string;

  @Column({ name: 'tagName', nullable: true, type: 'varchar', length: 100 })
  tagName: string;

  @Column()
  message: string;

  @Column({ type: 'varchar', length: 50 })
  triggerValue: string;

  @Column({ type: 'varchar', length: 20 })
  level: AlarmLevel;

  @Column({ type: 'varchar', length: 20, default: AlarmStatus.ACTIVE })
  status: AlarmStatus;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true, type: 'varchar', length: 36 })
  acknowledgedBy: string;

  @Column({ nullable: true })
  clearedAt: Date;

  @Column({ nullable: true, type: 'varchar', length: 36 })
  clearedBy: string;

  @Column({ nullable: true })
  shelvedAt: Date;

  @Column({ nullable: true, type: 'varchar', length: 36 })
  shelvedBy: string;

  @Column({ nullable: true, type: 'text' })
  shelveReason: string;

  /** 暂缓到期时间：设置后由 AlarmShelveRecoveryService 定时扫描自动恢复，null 表示手动暂缓（不会自动恢复） */
  @Column({ nullable: true })
  shelvedUntil: Date;

  /** 暂缓前的状态：自动恢复时回退到此状态（通常为 ACTIVE 或 ACKNOWLEDGED），null 时回退到 ACTIVE */
  @Column({ nullable: true, type: 'varchar', length: 20 })
  preShelveStatus: AlarmStatus;

  /** 告警类型（来源于字典 alarmType，产生时从匹配规则复制；无规则时默认 custom） */
  @Column({ type: 'varchar', length: 30, default: 'data' })
  alarmType: string;

  /** 告警处置类型（来源于字典 alarmActionType，随生命周期更新）：
   *  alarm.triggered（产生）→ alarm_acknowledged（确认）→ alarm.cleared（清除）
   *  → alarm.escalated（升级）→ alarm.shelve.expired（暂缓恢复） */
  @Column({ name: 'dispositionType', type: 'varchar', length: 50, default: 'alarm.triggered' })
  dispositionType: string;

  /** 是否实时告警（未恢复）：true=实时(active/acknowledged/shelved) / false=历史(cleared)。
   *  显式标识，避免前后端维护 status 映射规则，查询效率高于 status IN (...)。
   *  Phase 5 新增：状态流转到 CLEARED 时置 false */
  @Column({ default: true })
  isActive: boolean;

  /** 清除原因：auto=条件自动恢复 / manual=人工清除 / rule_disabled=规则禁用 / shelve_expired=暂缓到期。
   *  Phase 5 新增：区分告警闭环的清除路径 */
  @Column({ type: 'varchar', length: 20, default: 'manual' })
  clearReason: string;

  /** 自动恢复时间（条件恢复正常的时间），仅 clearReason='auto' 时有值。
   *  Phase 5 新增：完成告警闭环的关键字段，记录"何时恢复" */
  @Column({ nullable: true })
  recoveredAt: Date;

  /** 自动恢复时的值（条件恢复正常时的采集值）。
   *  Phase 5 新增：记录恢复瞬间的采集值，便于追溯 */
  @Column({ nullable: true, type: 'varchar', length: 50 })
  recoveredValue: string;
}
