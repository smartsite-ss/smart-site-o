// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Pipeline 指标相关类型定义
 * 与后端 ss-core/src/pipeline 对齐
 */

/** Pipeline 指标快照（JSON 格式） */
export interface PipelineMetricsSnapshot {
  /** Pipeline 执行总次数 */
  pipeline_executions_total: number;
  /** Pipeline 执行成功次数 */
  pipeline_executions_success: number;
  /** Pipeline 执行失败次数 */
  pipeline_executions_error: number;
  /** 最近一次 Pipeline 执行耗时（毫秒） */
  pipeline_duration_ms: number;
  /** 当前 Pipeline 队列深度 */
  pipeline_queue_depth: number;
  /** 当前活跃任务数 */
  pipeline_active_tasks: number;
  /** 各步骤最近一次耗时（毫秒） */
  step_duration_ms: Record<string, number>;
  /** 各步骤错误累计数 */
  step_error_count: Record<string, number>;
  /** 协议读取总次数 */
  protocol_read_total: number;
  /** 协议读取错误次数 */
  protocol_read_errors: number;
  /** 死区过滤总次数 */
  deadband_filtered_total: number;
  /** 缓存命中次数 */
  cache_hit_total: number;
  /** 缓存未命中次数 */
  cache_miss_total: number;
  /** 持久化写入总次数 */
  persist_write_total: number;
  /** 持久化写入错误次数 */
  persist_write_errors: number;
}

/** 单步执行耗时记录（用于火焰图） */
export interface StepTimingRecord {
  stepName: string;
  durationMs: number;
  timestamp: number;
  isError: boolean;
  tagId: string;
  deviceId: string;
}

/** Pipeline 整体耗时分解 */
export interface PipelineTimingBreakdown {
  pipelineTotalMs: number;
  steps: StepTimingRecord[];
  tagId: string;
  deviceId: string;
  timestamp: number;
}

/** 步骤耗时统计（含 P50/P95/P99） */
export interface StepTimingStats {
  stepName: string;
  order: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  totalCalls: number;
  errorCount: number;
  errorRate: number;
}

/** 按协议维度的指标（与后端 ProtocolMetrics 对齐） */
export interface ProtocolMetrics {
  totalReads: number;
  totalErrors: number;
  totalConnections: number;
  activeConnections: number;
  avgResponseTime: number;
  lastActivity: Date | null;
}

/** 协议列表项（供筛选下拉框） */
export interface ProtocolSummary {
  protocol: string;
  totalReads: number;
  activeConnections: number;
  lastActivity: Date | null;
}
