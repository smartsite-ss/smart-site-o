// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/** Pipeline 中转换后的值类型 — 保留原始数据类型语义（bool/string/number） */
export type PipelineValue = number | boolean | string | null;

export interface PipelineContext {
  tagId: string;
  deviceId: string;
  projectId: string;
  /** 设备编码（项目内唯一，用于 Redis key 层级结构 ss:latest:{projectId}:{deviceCode}） */
  deviceCode?: string;
  /** 标签名称（便于日志诊断） */
  tagName?: string;
  /** 设备名称（便于日志诊断） */
  deviceName?: string;
  tagConfig?: any;
  deviceClient?: any;
  deviceType?: string;
  deviceConnection?: Record<string, any>;
  rawValue: any;
  rawTimestamp?: Date;
  transformedValue: PipelineValue;
  /** 显示格式化的值（字符串），由 FormatStep 根据 displayFormat 生成 */
  formattedValue?: string;
  quality: string;
  shouldPersist: boolean;
  shouldPublish: boolean;
  startTime: number;
  errors: Array<{ step: string; message: string; code?: string }>;
}

export interface PipelineStep {
  readonly name: string;
  readonly order: number;
  process(ctx: PipelineContext): Promise<PipelineContext>;
}

export interface StepMetrics {
  stepName: string;
  totalCalls: number;
  totalDurationMs: number;
  errorCount: number;
  lastCallAt: number | null;
  lastDurationMs: number | null;
}

export interface AlarmConditionType {
  type: 'limit' | 'deviation' | 'rate' | 'digital';
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

export interface AlarmEvent {
  /** 预生成的唯一告警 ID（UUID），贯穿 Pipeline 和 DB 持久化 */
  alarmId: string;
  tagId: string;
  deviceId: string;
  projectId: string;
  condition: AlarmConditionType;
  value: PipelineValue;
  timestamp: Date;
  message: string;
}

/**
 * 告警条件恢复正常事件（Phase 5 状态机闭环）
 *
 * 由 AlarmCheckStep 在检测到告警条件恢复正常（isTriggered=false 且该条件曾处于活跃状态）时生成，
 * 附加到 PipelineContext.normalizedAlarms，由 PublishStep 发出 'alarm_normalized' 事件。
 * AlarmRecoverySubscriber 订阅此事件后执行自动恢复。
 */
export interface NormalizedAlarmEvent {
  tagId: string;
  deviceId?: string;
  projectId: string;
  /** 恢复时的采集值 */
  value: number;
  timestamp: Date;
  message: string;
  /** 触发此恢复的告警条件类型（limit/deviation/rate/digital） */
  conditionType?: string;
}
