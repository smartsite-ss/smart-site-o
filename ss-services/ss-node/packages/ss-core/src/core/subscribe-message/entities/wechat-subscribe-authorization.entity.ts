// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 微信订阅消息授权记录实体（10 模块）
 *
 * 微信一次性订阅模型：用户每次"允许"授权为该模板累加一次发送配额，
 * 后端每成功下发一条扣减一次；配额为 0 时不再下发（需前端引导续订）。
 * 表位于系统库（非项目隔离库），开发环境经 TypeORM synchronize 自动建表。
 */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../entities/base.entity';

export type SubscribeAuthorizationStatus = 'accept' | 'reject' | 'ban';

@Entity('wx_subscribe_authorizations')
export class WechatSubscribeAuthorization extends BaseEntity {
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  /** 小程序 openid（发送目标；冗余存储避免发送时回查用户表） */
  @Index()
  @Column({ name: 'mp_open_id' })
  mpOpenId: string;

  @Index()
  @Column({ name: 'template_id' })
  templateId: string;

  /** 最近一次授权结果 */
  @Column({ name: 'authorization_status', type: 'varchar', length: 20, default: 'reject' })
  authorizationStatus: SubscribeAuthorizationStatus;

  /** 剩余发送配额（每次 accept +1，每次成功下发 -1） */
  @Column({ name: 'quota_remaining', default: 0 })
  quotaRemaining: number;

  /** 最近一次授权时间 */
  @Column({ name: 'authorized_at', type: 'datetime', nullable: true })
  authorizedAt: Date;
}
