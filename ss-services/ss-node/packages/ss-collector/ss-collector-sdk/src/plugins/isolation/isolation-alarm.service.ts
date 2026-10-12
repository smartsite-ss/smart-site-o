// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { EventBusService } from '@ss-node/ss-core';
import { IsolationFactory } from './isolation-factory';
import { IsolationMode } from '../plugin.types';

/**
 * 隔离体重启跟踪记录
 */
interface RestartRecord {
  protocol: string;
  mode: IsolationMode;
  restartCount: number;
  firstRestartAt: number;
  lastRestartAt: number;
}

/**
 * 隔离体告警事件
 */
export interface IsolationAlarmEvent {
  alarmType: 'worker-high-restart' | 'worker-dead' | 'worker-high-latency';
  protocol: string;
  mode: IsolationMode;
  level: 'warning' | 'critical';
  message: string;
  detail: {
    restartCount?: number;
    avgLatencyMs?: number;
    status?: string;
    firstRestartAt?: number;
    lastRestartAt?: number;
    windowMinutes?: number;
    threshold?: number;
  };
  timestamp: number;
}

/**
 * 隔离模式告警服务
 *
 * 监听 plugin.isolation.crash 事件，跟踪重启次数，
 * 定时检查 executor 健康状态，触发告警：
 * - worker-high-restart: 10 分钟内重启 > 3 次 → warning
 * - worker-dead: executor 状态为 dead → critical
 * - worker-high-latency: avgLatencyMs > 10000 → warning
 */
@Injectable()
export class IsolationAlarmService implements OnModuleDestroy {
  private readonly logger = new Logger(IsolationAlarmService.name);

  /** 协议重启记录 */
  private restartRecords = new Map<string, RestartRecord>();

  /** 定时器 */
  private healthCheckTimer: NodeJS.Timeout | null = null;

  /** 健康检查间隔（ms），默认 30s */
  private readonly healthCheckIntervalMs = 30000;

  /** 重启窗口（ms），10 分钟 */
  private readonly restartWindowMs = 10 * 60 * 1000;

  /** 重启阈值 */
  private readonly restartThreshold = 3;

  /** 延迟阈值（ms） */
  private readonly latencyThresholdMs = 10000;

  constructor(
    private readonly isolationFactory: IsolationFactory,
    @Optional() private readonly eventBus?: EventBusService,
  ) {
    this.subscribeToCrashEvents();
    this.startHealthCheck();
  }

  // ==================== 事件订阅 ====================

  private subscribeToCrashEvents(): void {
    if (!this.eventBus) return;

    this.eventBus.on('plugin.isolation.crash', (payload: any) => {
      this.onCrash(payload);
    });

    this.logger.log('Subscribed to plugin.isolation.crash events');
  }

  private onCrash(payload: {
    protocol: string;
    mode: IsolationMode;
    restartCount: number;
    error?: string;
    timestamp: number;
  }): void {
    const { protocol, mode, restartCount, error, timestamp } = payload;

    this.logger.warn(
      `[${protocol}] Isolation crash detected (mode=${mode}, restartCount=${restartCount}): ${error || 'unknown'}`,
    );

    // 记录重启
    let record = this.restartRecords.get(protocol);
    if (!record) {
      record = {
        protocol,
        mode,
        restartCount: 0,
        firstRestartAt: timestamp,
        lastRestartAt: timestamp,
      };
      this.restartRecords.set(protocol, record);
    }

    record.restartCount = restartCount;
    record.lastRestartAt = timestamp;

    // 检查高频重启
    this.checkHighRestart(protocol, record);
  }

  // ==================== 健康检查 ====================

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch((err) => {
        this.logger.error(`Health check error: ${(err as Error).message}`);
      });
    }, this.healthCheckIntervalMs);
  }

  private async performHealthCheck(): Promise<void> {
    const healthMap = await this.isolationFactory.getAllHealth();

    for (const [protocol, health] of healthMap) {
      // 检查 dead 状态
      if (health.status === 'dead') {
        const plugin = (this.isolationFactory as any).pluginRegistry?.getPlugin?.(protocol);
        const mode = plugin?.meta?.isolationMode ?? IsolationMode.IN_PROCESS;
        this.emitAlarm({
          alarmType: 'worker-dead',
          protocol,
          mode,
          level: 'critical',
          message: `采集插件 [${protocol}] 隔离执行器已停止，需要手动恢复`,
          detail: {
            status: health.status,
          },
          timestamp: Date.now(),
        });
        continue;
      }

      // 检查延迟
      if (health.avgLatencyMs > this.latencyThresholdMs) {
        const plugin = (this.isolationFactory as any).pluginRegistry?.getPlugin?.(protocol);
        const mode = plugin?.meta?.isolationMode ?? IsolationMode.IN_PROCESS;
        this.emitAlarm({
          alarmType: 'worker-high-latency',
          protocol,
          mode,
          level: 'warning',
          message: `采集插件 [${protocol}] 平均延迟过高 (${health.avgLatencyMs.toFixed(0)}ms > ${this.latencyThresholdMs}ms)`,
          detail: {
            avgLatencyMs: health.avgLatencyMs,
            threshold: this.latencyThresholdMs,
          },
          timestamp: Date.now(),
        });
      }
    }
  }

  // ==================== 告警检查 ====================

  private checkHighRestart(protocol: string, record: RestartRecord): void {
    const windowStart = record.firstRestartAt;
    const windowEnd = record.lastRestartAt;
    const windowMs = windowEnd - windowStart;

    if (record.restartCount > this.restartThreshold && windowMs <= this.restartWindowMs) {
      this.emitAlarm({
        alarmType: 'worker-high-restart',
        protocol,
        mode: record.mode,
        level: 'warning',
        message: `采集插件 [${protocol}] 在 ${Math.round(windowMs / 1000)}s 内重启 ${record.restartCount} 次，超过阈值 ${this.restartThreshold} 次`,
        detail: {
          restartCount: record.restartCount,
          firstRestartAt: record.firstRestartAt,
          lastRestartAt: record.lastRestartAt,
          windowMinutes: Math.round(windowMs / 60000),
          threshold: this.restartThreshold,
        },
        timestamp: Date.now(),
      });
    }
  }

  // ==================== 告警发射 ====================

  private emitAlarm(event: IsolationAlarmEvent): void {
    this.logger.warn(`[IsolationAlarm] ${event.alarmType}: ${event.message}`);

    this.eventBus?.emit('plugin.isolation.alarm', event);
  }

  // ==================== 生命周期 ====================

  onModuleDestroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.eventBus) {
      this.eventBus.off('plugin.isolation.crash');
    }

    this.restartRecords.clear();
  }

  // ==================== 查询接口 ====================

  /** 获取所有协议的重启记录 */
  getRestartRecords(): Map<string, RestartRecord> {
    return new Map(this.restartRecords);
  }

  /** 获取指定协议的重启记录 */
  getRestartRecord(protocol: string): RestartRecord | undefined {
    return this.restartRecords.get(protocol);
  }
}
