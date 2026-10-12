// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventType,
  DataPointChangedEvent,
  DeviceStatusChangedEvent,
  AlarmTriggeredEvent,
  AlarmAcknowledgedEvent,
  ConfigChangedEvent,
  ProcessingErrorEvent,
  HealthEvent,
  PluginLifecycleEvent,
} from './event-bus.types';
import { Logger } from '@nestjs/common';

/**
 * emit 钩子函数类型
 * - 监听所有事件发射
 * - 用于 EventLogService 记录事件日志（不阻塞主流程）
 */
export type EmitHook = (eventType: string, payload: any) => void | Promise<void>;

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly listeners = new Map<string, Set<(data: any) => void>>();

  /** emit 钩子集合（用于 EventLogService 记录事件日志） */
  private readonly emitHooks = new Set<EmitHook>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit(): void {
    this.logger.log('EventBusService initialized');
  }

  onModuleDestroy(): void {
    this.logger.log('EventBusService destroyed');
  }

  emit<T extends EventType>(eventType: T, payload: any): void {
    try {
      // 先触发 emit 钩子（用于 EventLogService 记录事件日志）
      // 同步调用，异步钩子在后台运行；缓存 logId 让订阅者能找到
      this.triggerEmitHooks(eventType, payload);
      // 再发射事件给订阅者
      this.eventEmitter.emit(eventType, payload);
      this.logEvent(eventType, payload);
    } catch (error) {
      this.logger.error(`Failed to emit event ${eventType}: ${error.message}`);
    }
  }

  /**
   * 异步发射事件 — 等待所有异步监听器完成后返回
   * 用于需要确保监听器完成资源清理后再继续的场景（如项目删除前关闭 DB 连接）
   *
   * 注意：emit 钩子（写入事件日志）在订阅者之前触发并等待完成，
   * 以确保订阅者能通过 findRecentLogId 找到对应的 logId。
   */
  async emitAsync<T extends EventType>(eventType: T, payload: any): Promise<void> {
    try {
      // 先触发并等待 emit 钩子完成（写入事件日志），让订阅者能找到 logId
      await this.triggerEmitHooksAsync(eventType, payload);
      // 再执行订阅者
      await this.eventEmitter.emitAsync(eventType, payload);
      this.logEvent(eventType, payload);
    } catch (error) {
      this.logger.error(`Failed to emit async event ${eventType}: ${error.message}`);
    }
  }

  /**
   * 注册 emit 钩子 — 监听所有事件发射
   *
   * 用于 EventLogService 在 onModuleInit 时调用，记录配置变更类事件。
   * 钩子函数可以同步或异步，但失败不影响主流程。
   *
   * @returns 注销函数，调用后移除钩子
   */
  registerEmitHook(hook: EmitHook): () => void {
    this.emitHooks.add(hook);
    this.logger.debug(`Emit hook registered (total: ${this.emitHooks.size})`);
    return () => {
      this.emitHooks.delete(hook);
    };
  }

  /**
   * 触发所有 emit 钩子（异步，不阻塞主流程）
   *
   * 用于同步 emit() 场景：钩子可能在后台异步执行（如写入事件日志），
   * 不等待完成即返回。订阅者通过 findRecentLogId 兜底查数据库。
   */
  private triggerEmitHooks(eventType: string, payload: any): void {
    if (this.emitHooks.size === 0) return;

    for (const hook of this.emitHooks) {
      try {
        const result = hook(eventType, payload);
        // 如果是 Promise，捕获错误但不等待
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch((err) => {
            this.logger.warn(`Emit hook failed: ${err.message}`);
          });
        }
      } catch (err) {
        this.logger.warn(`Emit hook failed: ${(err as Error).message}`);
      }
    }
  }

  /**
   * 触发所有 emit 钩子并等待完成（异步）
   *
   * 用于 emitAsync() 场景：确保事件日志写入完成后再执行订阅者，
   * 让订阅者能通过 findRecentLogId 在内存索引中找到 logId。
   *
   * 单个钩子失败不影响其他钩子，仅 warn 日志。
   */
  private async triggerEmitHooksAsync(eventType: string, payload: any): Promise<void> {
    if (this.emitHooks.size === 0) return;

    const hookPromises: Promise<void>[] = [];
    for (const hook of this.emitHooks) {
      try {
        const result = hook(eventType, payload);
        if (result && typeof (result as Promise<void>).then === 'function') {
          // 包装：单个钩子失败不中断其他钩子
          hookPromises.push(
            (result as Promise<void>).catch((err) => {
              this.logger.warn(`Emit hook failed: ${(err as Error).message}`);
            }),
          );
        }
      } catch (err) {
        this.logger.warn(`Emit hook failed: ${(err as Error).message}`);
      }
    }
    await Promise.all(hookPromises);
  }

  /**
   * 统一的事件日志输出：打印事件类型与关键负载字段
   * 使用纯文本 [Event] 前缀，与 StructuredLogger 的 [LEVEL]/[context] 风格保持一致，
   * 避免 emoji 在 Windows 控制台/日志收集系统中渲染异常
   */
  private logEvent(eventType: string, payload: any): void {
    const summary = this.buildPayloadSummary(payload);
    this.logger.log(`[Event] ${eventType}${summary ? ` | ${summary}` : ''}`);
  }

  /**
   * 从 payload 提取可读摘要（最多 3 个关键字段）
   */
  private buildPayloadSummary(payload: any): string {
    if (!payload || typeof payload !== 'object') return '';
    const parts: string[] = [];
    // 通用标识字段
    if (payload.tagId) parts.push(`tag=${payload.tagId}`);
    if (payload.deviceId) parts.push(`device=${payload.deviceId}`);
    if (payload.projectId) parts.push(`project=${payload.projectId}`);
    // 值字段：优先使用已格式化的 displayValue，否则对数值做舍入
    if (payload.value !== undefined) {
      const displayVal =
        payload.displayValue ??
        (typeof payload.value === 'number' ? payload.value.toFixed(2) : payload.value);
      parts.push(`value=${displayVal}`);
    }
    if (payload.level) parts.push(`level=${payload.level}`);
    if (payload.status) parts.push(`status=${payload.status}`);
    // 报警特有
    if (payload.message && typeof payload.message === 'string') {
      parts.push(`msg=${payload.message.substring(0, 80)}`);
    }
    return parts.slice(0, 4).join(' ');
  }

  emitDataPointChanged(event: DataPointChangedEvent): void {
    this.emit('data_point_changed', event);
  }

  emitDeviceStatusChanged(event: DeviceStatusChangedEvent): void {
    this.emit('device_status_changed', event);
  }

  emitAlarmTriggered(event: AlarmTriggeredEvent): void {
    this.emit('alarm_triggered', event);
  }

  emitAlarmAcknowledged(event: AlarmAcknowledgedEvent): void {
    this.emit('alarm_acknowledged', event);
  }

  emitConfigChanged(event: ConfigChangedEvent): void {
    this.emit('config_changed', event);
  }

  emitProcessingError(event: ProcessingErrorEvent): void {
    this.emit('processing_error', event);
  }

  emitHealthDegraded(event: HealthEvent): void {
    this.emit('health_degraded', event);
  }

  emitHealthRecovered(event: HealthEvent): void {
    this.emit('health_recovered', event);
  }

  // ---- 插件生命周期事件 ----

  emitPluginDiscovered(event: PluginLifecycleEvent): void {
    this.emit('plugin.discovered', event);
  }

  emitPluginRegistered(event: PluginLifecycleEvent): void {
    this.emit('plugin.registered', event);
  }

  emitPluginActivated(event: PluginLifecycleEvent): void {
    this.emit('plugin.activated', event);
  }

  emitPluginDeactivated(event: PluginLifecycleEvent): void {
    this.emit('plugin.deactivated', event);
  }

  emitPluginError(event: PluginLifecycleEvent): void {
    this.emit('plugin.error', event);
  }

  emitPluginUnregistered(event: PluginLifecycleEvent): void {
    this.emit('plugin.unregistered', event);
  }

  emitPluginUpdated(event: PluginLifecycleEvent): void {
    this.emit('plugin.updated', event);
  }

  on<T extends EventType>(eventType: T, handler: (payload: any) => void): void {
    let handlers = this.listeners.get(eventType);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(eventType, handlers);
    }
    handlers.add(handler);
    this.eventEmitter.on(eventType, handler);
    this.logger.debug(`Registered listener for event: ${eventType}`);
  }

  once<T extends EventType>(eventType: T, handler: (payload: any) => void): void {
    this.eventEmitter.once(eventType, handler);
  }

  off<T extends EventType>(eventType: T, handler?: (payload: any) => void): void {
    if (handler) {
      this.listeners.get(eventType)?.delete(handler);
      this.eventEmitter.off(eventType, handler);
    } else {
      this.listeners.delete(eventType);
      this.eventEmitter.removeAllListeners(eventType);
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      this.eventEmitter.removeAllListeners(eventType);
    } else {
      this.listeners.clear();
      this.eventEmitter.removeAllListeners();
    }
  }

  getListenerCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }
    return Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0);
  }
}
