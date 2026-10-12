// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';

export interface PipelineMetricsSnapshot {
  pipeline_executions_total: number;
  pipeline_executions_success: number;
  pipeline_executions_error: number;
  pipeline_duration_ms: number;
  pipeline_queue_depth: number;
  pipeline_active_tasks: number;
  step_duration_ms: Record<string, number>;
  step_error_count: Record<string, number>;
  protocol_read_total: number;
  protocol_read_errors: number;
  deadband_filtered_total: number;
  cache_hit_total: number;
  cache_miss_total: number;
  persist_write_total: number;
  persist_write_errors: number;
}

/** 按协议维度的指标条目 */
interface ProtocolMetricsEntry {
  totalReads: number;
  totalErrors: number;
  totalConnections: number;
  /** 最近 N 次读取耗时（ms），用于计算平均响应时间 */
  recentDurations: number[];
  /** 协议下活跃设备集合（deviceId → 最近活跃时间戳 ms） */
  activeDevices: Map<string, number>;
  lastActivity: number | null;
}

/** 按协议维度的对外指标（与 PluginMetrics 对齐） */
export interface ProtocolMetrics {
  totalReads: number;
  totalErrors: number;
  totalConnections: number;
  activeConnections: number;
  avgResponseTime: number;
  lastActivity: Date | null;
}

/**
 * pipeline 级别 Prometheus 指标收集服务。
 * 使用纯内存计数器，无需外部依赖，可通过 API 端点暴露。
 */
@Injectable()
export class PipelineMetricsService {
  private readonly logger = new Logger(PipelineMetricsService.name);

  // --- 全局计数器 ---
  private pipelineExecutionsTotal = 0;
  private pipelineExecutionsSuccess = 0;
  private pipelineExecutionsError = 0;

  // --- 直方图 / gauge ---
  private pipelineDurationMs = 0;

  // --- Gauge ---
  private pipelineQueueDepth = 0;
  private pipelineActiveTasks = 0;

  // --- 按 step 维度 ---
  private stepDurationMs = new Map<string, number>();
  private stepErrorCount = new Map<string, number>();

  // --- 协议读取 ---
  private protocolReadTotal = 0;
  private protocolReadErrors = 0;

  // --- 死区过滤 ---
  private deadbandFilteredTotal = 0;

  // --- 缓存 ---
  private cacheHitTotal = 0;
  private cacheMissTotal = 0;

  // --- 持久化 ---
  private persistWriteTotal = 0;
  private persistWriteErrors = 0;

  // --- 按协议维度 ---
  private protocolMetrics = new Map<string, ProtocolMetricsEntry>();
  /** 活跃设备判定窗口：5 分钟内有过读取的设备视为活跃 */
  private readonly ACTIVE_DEVICE_WINDOW_MS = 5 * 60 * 1000;
  /** 保留最近 N 次读取耗时用于计算平均 */
  private readonly MAX_RECENT_DURATIONS = 100;

  // ═══════════════════════════════════════════════════════════════
  // 记录方法
  // ═══════════════════════════════════════════════════════════════

  /** 记录一次 pipeline 执行结果 */
  recordExecution(success: boolean, durationMs: number): void {
    this.pipelineExecutionsTotal++;
    if (success) {
      this.pipelineExecutionsSuccess++;
    } else {
      this.pipelineExecutionsError++;
    }
    this.pipelineDurationMs = durationMs;
  }

  /** 设置当前队列深度 */
  setQueueDepth(depth: number): void {
    this.pipelineQueueDepth = depth;
  }

  /** 设置当前活跃任务数 */
  setActiveTasks(count: number): void {
    this.pipelineActiveTasks = count;
  }

  /** 记录某步骤的执行耗时 */
  recordStepDuration(step: string, durationMs: number): void {
    this.stepDurationMs.set(step, durationMs);
  }

  /** 记录某步骤的错误 */
  recordStepError(step: string): void {
    const current = this.stepErrorCount.get(step) || 0;
    this.stepErrorCount.set(step, current + 1);
  }

  /** 记录一次协议读取 */
  recordProtocolRead(success: boolean): void {
    this.protocolReadTotal++;
    if (!success) {
      this.protocolReadErrors++;
    }
  }

  /** 记录一次死区过滤 */
  recordDeadband(): void {
    this.deadbandFilteredTotal++;
  }

  /** 记录一次缓存命中 */
  recordCacheHit(): void {
    this.cacheHitTotal++;
  }

  /** 记录一次缓存未命中 */
  recordCacheMiss(): void {
    this.cacheMissTotal++;
  }

  /** 记录一次持久化写入 */
  recordPersistWrite(success: boolean): void {
    this.persistWriteTotal++;
    if (!success) {
      this.persistWriteErrors++;
    }
  }

  // ── 按协议维度 ──────────────────────────────────────────────

  /**
   * 记录一次按协议的读取（在 PipelineOrchestrator.execute 完成后调用）
   *
   * @param protocol 设备协议（deviceType）
   * @param success  本次 pipeline 执行是否成功
   * @param durationMs 本次 pipeline 执行耗时
   * @param deviceId  可选，设备 ID（用于统计活跃连接数）
   */
  recordProtocolReadDetailed(
    protocol: string,
    success: boolean,
    durationMs: number,
    deviceId?: string,
  ): void {
    if (!protocol) return;
    const entry = this.getOrCreateProtocolEntry(protocol);
    entry.totalReads++;
    if (!success) {
      entry.totalErrors++;
    }
    // 维护最近 N 次耗时环形数组
    entry.recentDurations.push(durationMs);
    if (entry.recentDurations.length > this.MAX_RECENT_DURATIONS) {
      entry.recentDurations.shift();
    }
    // 活跃设备追踪
    if (deviceId) {
      const now = Date.now();
      const isNew = !entry.activeDevices.has(deviceId);
      entry.activeDevices.set(deviceId, now);
      if (isNew) {
        entry.totalConnections++;
      }
    }
    entry.lastActivity = Date.now();
  }

  /** 获取指定协议的汇总指标（供 PluginManagerService 合并到插件卡片） */
  getProtocolMetrics(protocol: string): ProtocolMetrics | null {
    const entry = this.protocolMetrics.get(protocol);
    if (!entry) return null;
    return this.computeProtocolMetrics(entry);
  }

  /** 获取所有协议的汇总指标 */
  getAllProtocolMetrics(): Record<string, ProtocolMetrics> {
    const result: Record<string, ProtocolMetrics> = {};
    for (const [protocol, entry] of this.protocolMetrics) {
      result[protocol] = this.computeProtocolMetrics(entry);
    }
    return result;
  }

  private getOrCreateProtocolEntry(protocol: string): ProtocolMetricsEntry {
    let entry = this.protocolMetrics.get(protocol);
    if (!entry) {
      entry = {
        totalReads: 0,
        totalErrors: 0,
        totalConnections: 0,
        recentDurations: [],
        activeDevices: new Map(),
        lastActivity: null,
      };
      this.protocolMetrics.set(protocol, entry);
    }
    return entry;
  }

  private computeProtocolMetrics(entry: ProtocolMetricsEntry): ProtocolMetrics {
    const now = Date.now();
    // 清理超过窗口期的设备，统计活跃连接
    let activeConnections = 0;
    for (const [deviceId, lastSeen] of entry.activeDevices) {
      if (now - lastSeen < this.ACTIVE_DEVICE_WINDOW_MS) {
        activeConnections++;
      } else {
        entry.activeDevices.delete(deviceId);
      }
    }
    // 计算平均响应时间
    const avgResponseTime =
      entry.recentDurations.length > 0
        ? Math.round(
            entry.recentDurations.reduce((a, b) => a + b, 0) / entry.recentDurations.length,
          )
        : 0;
    return {
      totalReads: entry.totalReads,
      totalErrors: entry.totalErrors,
      totalConnections: entry.totalConnections,
      activeConnections,
      avgResponseTime,
      lastActivity: entry.lastActivity ? new Date(entry.lastActivity) : null,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 导出方法
  // ═══════════════════════════════════════════════════════════════

  /** 返回当前指标快照（JSON 格式） */
  getMetricsSnapshot(): PipelineMetricsSnapshot {
    return {
      pipeline_executions_total: this.pipelineExecutionsTotal,
      pipeline_executions_success: this.pipelineExecutionsSuccess,
      pipeline_executions_error: this.pipelineExecutionsError,
      pipeline_duration_ms: this.pipelineDurationMs,
      pipeline_queue_depth: this.pipelineQueueDepth,
      pipeline_active_tasks: this.pipelineActiveTasks,
      step_duration_ms: Object.fromEntries(this.stepDurationMs),
      step_error_count: Object.fromEntries(this.stepErrorCount),
      protocol_read_total: this.protocolReadTotal,
      protocol_read_errors: this.protocolReadErrors,
      deadband_filtered_total: this.deadbandFilteredTotal,
      cache_hit_total: this.cacheHitTotal,
      cache_miss_total: this.cacheMissTotal,
      persist_write_total: this.persistWriteTotal,
      persist_write_errors: this.persistWriteErrors,
    };
  }

  /** 返回 Prometheus 文本格式指标 */
  getMetrics(): string {
    const lines: string[] = [];

    // pipeline_executions_total
    lines.push('# HELP pipeline_executions_total Total pipeline executions');
    lines.push('# TYPE pipeline_executions_total counter');
    lines.push(`pipeline_executions_total ${this.pipelineExecutionsTotal}`);
    lines.push('');

    // pipeline_executions_success
    lines.push('# HELP pipeline_executions_success Successful pipeline executions');
    lines.push('# TYPE pipeline_executions_success counter');
    lines.push(`pipeline_executions_success ${this.pipelineExecutionsSuccess}`);
    lines.push('');

    // pipeline_executions_error
    lines.push('# HELP pipeline_executions_error Failed pipeline executions');
    lines.push('# TYPE pipeline_executions_error counter');
    lines.push(`pipeline_executions_error ${this.pipelineExecutionsError}`);
    lines.push('');

    // pipeline_duration_ms
    lines.push('# HELP pipeline_duration_ms Pipeline execution duration in milliseconds');
    lines.push('# TYPE pipeline_duration_ms gauge');
    lines.push(`pipeline_duration_ms ${this.pipelineDurationMs}`);
    lines.push('');

    // pipeline_queue_depth
    lines.push('# HELP pipeline_queue_depth Current pipeline queue depth');
    lines.push('# TYPE pipeline_queue_depth gauge');
    lines.push(`pipeline_queue_depth ${this.pipelineQueueDepth}`);
    lines.push('');

    // pipeline_active_tasks
    lines.push('# HELP pipeline_active_tasks Currently active pipeline tasks');
    lines.push('# TYPE pipeline_active_tasks gauge');
    lines.push(`pipeline_active_tasks ${this.pipelineActiveTasks}`);
    lines.push('');

    // step_duration_ms
    lines.push('# HELP step_duration_ms Per-step execution duration in milliseconds');
    lines.push('# TYPE step_duration_ms gauge');
    for (const [step, duration] of this.stepDurationMs) {
      lines.push(`step_duration_ms{step="${step}"} ${duration}`);
    }
    lines.push('');

    // step_error_count
    lines.push('# HELP step_error_count Per-step error count');
    lines.push('# TYPE step_error_count counter');
    for (const [step, count] of this.stepErrorCount) {
      lines.push(`step_error_count{step="${step}"} ${count}`);
    }
    lines.push('');

    // protocol_read_total
    lines.push('# HELP protocol_read_total Total protocol reads');
    lines.push('# TYPE protocol_read_total counter');
    lines.push(`protocol_read_total ${this.protocolReadTotal}`);
    lines.push('');

    // protocol_read_errors
    lines.push('# HELP protocol_read_errors Protocol read errors');
    lines.push('# TYPE protocol_read_errors counter');
    lines.push(`protocol_read_errors ${this.protocolReadErrors}`);
    lines.push('');

    // deadband_filtered_total
    lines.push('# HELP deadband_filtered_total Deadband filtered count');
    lines.push('# TYPE deadband_filtered_total counter');
    lines.push(`deadband_filtered_total ${this.deadbandFilteredTotal}`);
    lines.push('');

    // cache_hit_total
    lines.push('# HELP cache_hit_total Cache hits');
    lines.push('# TYPE cache_hit_total counter');
    lines.push(`cache_hit_total ${this.cacheHitTotal}`);
    lines.push('');

    // cache_miss_total
    lines.push('# HELP cache_miss_total Cache misses');
    lines.push('# TYPE cache_miss_total counter');
    lines.push(`cache_miss_total ${this.cacheMissTotal}`);
    lines.push('');

    // persist_write_total
    lines.push('# HELP persist_write_total Persist writes');
    lines.push('# TYPE persist_write_total counter');
    lines.push(`persist_write_total ${this.persistWriteTotal}`);
    lines.push('');

    // persist_write_errors
    lines.push('# HELP persist_write_errors Persist write errors');
    lines.push('# TYPE persist_write_errors counter');
    lines.push(`persist_write_errors ${this.persistWriteErrors}`);
    lines.push('');

    return lines.join('\n');
  }

  /** 重置所有指标（主要用于测试） */
  reset(): void {
    this.pipelineExecutionsTotal = 0;
    this.pipelineExecutionsSuccess = 0;
    this.pipelineExecutionsError = 0;
    this.pipelineDurationMs = 0;
    this.pipelineQueueDepth = 0;
    this.pipelineActiveTasks = 0;
    this.stepDurationMs.clear();
    this.stepErrorCount.clear();
    this.protocolReadTotal = 0;
    this.protocolReadErrors = 0;
    this.deadbandFilteredTotal = 0;
    this.cacheHitTotal = 0;
    this.cacheMissTotal = 0;
    this.persistWriteTotal = 0;
    this.persistWriteErrors = 0;
    this.protocolMetrics.clear();

    this.logger.debug('Pipeline metrics reset');
  }
}
