// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PipelineValue } from './pipeline.types';

export interface DataPoint {
  tagId: string;
  deviceId: string;
  projectId: string;
  /** 设备编码（项目内唯一，用于 Redis 最新值 key 层级结构） */
  deviceCode?: string;
  /** 设备名称（用于 tree 索引展示） */
  deviceName?: string;
  value: PipelineValue;
  quality: string;
  timestamp: Date;
}

export const PERSIST_WRITER = 'PERSIST_WRITER';

/**
 * 标签更新事件统一契约（P2-2）
 *
 * 用于统一以下场景的数据格式：
 * - PersistStep 构造 DataPoint 写入持久化层（Redis/SQLite/InfluxDB）
 * - PublishStep 通过 EventBus 推送 data_point_changed 事件
 * - DataPushBridge 转发到 WebSocket 广播
 *
 * 字段说明：
 * - value: 原始值（已 transform，未 format），保留 number/boolean/string 类型语义
 * - displayValue: 字符串类型的显示值（已 format，由 FormatStep 生成）
 * - timestamp: ISO 8601 字符串（避免 Date 序列化歧义）
 * - errors: 本次 Pipeline 周期产生的错误（无错误时为 undefined）
 */
export interface TagUpdatePayload {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: PipelineValue;
  displayValue?: string;
  quality: string;
  timestamp: string;
  errors?: Array<{ step: string; message: string; code?: string }>;
  /** 活跃告警（仅当本次数据触发告警时存在，无告警则不包含此字段，零开销） */
  activeAlarms?: ActiveAlarmInfo[];
}

/** 活跃告警摘要信息 */
export interface ActiveAlarmInfo {
  alarmId: string;
  level: string;
  condition: string;
  message: string;
}

/**
 * Writer 优先级
 * - critical: 关键 writer（如 Redis 最新值、SQLite 历史值），PersistStep 同步 await 写入完成
 * - best_effort: 尽力而为 writer（如 InfluxDB，耗时较高），PersistStep 异步 fire-and-forget，
 *                不阻塞 Pipeline 主流程
 *
 * 默认为 critical，保证向后兼容。
 */
export type PersistWriterPriority = 'critical' | 'best_effort';

export interface IPersistWriter {
  readonly name: string;
  /**
   * Writer 优先级（可选，默认 critical）。
   * 慢 writer（如 InfluxDB）应声明为 best_effort，避免拖累 Pipeline 周期。
   */
  readonly priority?: PersistWriterPriority;
  /** 是否激活（仅激活的 writer 参与写缓冲与指标计数） */
  isActive?: () => boolean;
  write(point: DataPoint): Promise<void>;
  writeBatch(points: DataPoint[]): Promise<void>;
  flush(): Promise<void>;
}
