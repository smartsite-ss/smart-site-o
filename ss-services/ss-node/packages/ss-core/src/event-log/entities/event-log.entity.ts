// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../core/entities/base.entity';

/**
 * 订阅者处理记录 — 嵌入在 EventLog.subscribers 数组中
 */
export interface SubscriberRecord {
  /** 订阅者类名（如 'DeviceConfigWatcher'） */
  name: string;
  /** 处理状态 */
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'skipped';
  /** 开始处理时间（ISO 字符串） */
  startedAt?: string;
  /** 完成时间（ISO 字符串） */
  completedAt?: string;
  /** 处理耗时（ms） */
  duration?: number;
  /** 错误信息（status=failed 时填充） */
  error?: string;
  /** 业务效果（如 { connectionId, tagsLoaded, tasksRegistered }） */
  result?: Record<string, any>;
}

/**
 * 事件日志状态枚举
 */
export type EventLogStatus =
  | 'emitted'        // 已发射，等待订阅者处理
  | 'processing'     // 订阅者处理中
  | 'processed'     // 所有订阅者处理完成
  | 'partial'       // 部分订阅者成功，部分失败
  | 'failed'        // 所有订阅者失败
  | 'no_subscribers'; // 无订阅者

/**
 * 事件日志实体 — 配置变更类事件持久化 + 订阅者追踪
 *
 * 存储在全局 ss-node.db（参考 SystemEvent 模式），不按项目隔离。
 * 仅存储配置变更类事件（21 个），高频数据事件（data_point_changed）不入库。
 *
 * 设计要点：
 * 1. 继承 BaseEntity（含 id / createdAt / updatedAt，不含 projectId）
 * 2. projectId 为可选字段，系统级事件可为 null
 * 3. subscribers 字段记录每个订阅者的处理状态和业务效果
 * 4. status 字段标识事件整体生命周期
 */
@Entity('evt_event_log')
@Index(['projectId', 'createdAt'])   // 按项目+时间倒序查询（最常用）
@Index(['eventType', 'createdAt'])   // 按类型+时间筛选
@Index(['emittedBy', 'createdAt'])    // 按操作者筛选（用户审计）
@Index(['status', 'createdAt'])      // 按状态筛选（找失败的）
@Index(['traceId'])                   // 按 traceId 查询事件链（#7 预留）
export class EventLog extends BaseEntity {
  /** 事件类型（如 'device.created'、'project:enabled'） */
  @Column({ type: 'varchar', length: 64 })
  eventType: string;

  /** 项目 ID（可选：系统级事件为 null，项目级事件携带 projectId 便于筛选） */
  @Column({ name: 'project_id', type: 'varchar', length: 36, nullable: true })
  projectId?: string | null;

  /** 事件负载（simple-json 序列化，保留完整 payload） */
  @Column({ type: 'simple-json' })
  payload: Record<string, any>;

  /** 事件发起者（用户 ID / 系统服务名）
   * 来源优先级：payload.userId > payload.emittedBy > payload.sourceInstance > null */
  @Column({ name: 'emitted_by', type: 'varchar', length: 64, nullable: true })
  emittedBy?: string | null;

  /** 事件来源（rest_api / pipeline / scheduler / system / websocket） */
  @Column({ type: 'varchar', length: 20, default: 'rest_api' })
  source: string;

  /** 事件本身的 timestamp（统一转为 datetime 存储） */
  @Column({ name: 'event_timestamp', type: 'datetime' })
  eventTimestamp: Date;

  /** 订阅者处理记录（JSON 数组，每个元素记录一个订阅者的处理结果） */
  @Column({ type: 'simple-json', nullable: true })
  subscribers: SubscriberRecord[];

  /** 事件整体状态 */
  @Column({ type: 'varchar', length: 20, default: 'emitted' })
  status: EventLogStatus;

  /** 订阅者成功数 / 总数（如 "2/3"），便于快速查询部分失败的事件 */
  @Column({ name: 'success_ratio', type: 'varchar', length: 10, nullable: true })
  successRatio?: string | null;

  /** 错误信息（status=failed/partial 时填充） */
  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  /** 事件追踪 ID（#7 优化预留，当前可为 null） */
  @Column({ name: 'trace_id', type: 'varchar', length: 36, nullable: true })
  traceId?: string | null;
}
