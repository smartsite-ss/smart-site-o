// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 微信通知偏好实体（10 模块）
 *
 * 每用户一条记录：是否接收报警订阅消息 + 最低推送级别。
 * 表位于系统库，开发环境经 TypeORM synchronize 自动建表。
 */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../entities/base.entity';

export type MinimumAlarmLevel = 'info' | 'warning' | 'error' | 'critical';

/** 级别数值（用于"最低级别"过滤比较） */
export const ALARM_LEVEL_SEVERITY: Record<MinimumAlarmLevel, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

@Entity('wx_notification_preferences')
export class WechatNotificationPreference extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId: string;

  /** 是否接收报警订阅消息 */
  @Column({ name: 'alarm_notification_enabled', default: true })
  alarmNotificationEnabled: boolean;

  /** 最低推送级别（低于该级别的报警不下发） */
  @Column({ name: 'minimum_alarm_level', type: 'varchar', length: 20, default: 'info' })
  minimumAlarmLevel: MinimumAlarmLevel;
}
