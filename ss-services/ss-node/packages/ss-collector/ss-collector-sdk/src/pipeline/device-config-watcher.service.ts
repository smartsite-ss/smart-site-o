// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { EventBusService, EventLogService } from '@ss-node/ss-core';
import { IsolationFactory, PluginRegistry } from '../plugins';
import type { ShardRef } from '../plugins/isolation/isolation.types';
import { EnhancedScheduler } from './scheduler/enhanced-scheduler';

/**
 * 设备配置变更监听器
 *
 * 监听 device.created / updated / deleted 事件，同步更新采集层的连接和调度任务。
 * 所有 EventBus 操作都在主进程内完成，隔离体通过 executor IPC 接收 connect/disconnect 指令。
 *
 * 业务效果追踪（#6 事件持久化）：
 * - 每个 handler 通过 EventLogService.wrapSubscriber 包装，自动记录处理状态和业务效果
 * - handler 返回 { connectionId, tagsLoaded, tasksRegistered, deviceOnline } 等业务效果对象
 * - 失败时抛出异常，由 wrapSubscriber 捕获并记录为 failed
 */
@Injectable()
export class DeviceConfigWatcher implements OnModuleInit {
  private readonly logger = new Logger(DeviceConfigWatcher.name);

  /** 当前活跃的设备 → ShardRef / TaskRef 映射 */
  private activeDevices = new Map<string, { shard: ShardRef }>();

  constructor(
    private readonly eventBus: EventBusService,
    @Optional() private readonly pluginRegistry?: PluginRegistry,
    @Optional() private readonly isolationFactory?: IsolationFactory,
    @Optional() private readonly scheduler?: EnhancedScheduler,
    /** 事件日志服务 — 用于追踪 handler 的处理结果和业务效果（#6 事件持久化） */
    @Optional() private readonly eventLogService?: EventLogService,
  ) {}

  onModuleInit(): void {
    // 包装 helper：
    // - 若 EventLogService 可用，通过 wrapSubscriber 自动记录处理状态和业务效果
    // - 外层 try/catch 捕获 wrapSubscriber 重新抛出的错误，避免 EventBus.emit（同步）
    //   未 await async handler 导致的 unhandled rejection
    const wrap = <T extends any[]>(
      eventType: string,
      handler: (...args: T) => Promise<Record<string, any> | void>,
    ): ((...args: T) => Promise<void>) => {
      const traced = this.eventLogService
        ? this.eventLogService.wrapSubscriber(
            eventType,
            'DeviceConfigWatcher',
            handler,
          )
        : async (...args: T) => {
            await handler(...args);
          };

      // 外层捕获：wrapSubscriber 失败时会重新抛出，这里捕获以防止 unhandled rejection
      return async (...args: T) => {
        try {
          await traced(...args);
        } catch (err) {
          this.logger.error(
            `Handler for ${eventType} failed: ${(err as Error).message}`,
          );
        }
      };
    };

    this.eventBus.on('device.created', wrap('device.created', this.onDeviceCreated.bind(this) as any));
    this.eventBus.on('device.updated', wrap('device.updated', this.onDeviceUpdated.bind(this) as any));
    this.eventBus.on('device.deleted', wrap('device.deleted', this.onDeviceDeleted.bind(this) as any));
    this.eventBus.on('device.enabled', wrap('device.enabled', this.onDeviceEnabled.bind(this) as any));
    this.eventBus.on('device.disabled', wrap('device.disabled', this.onDeviceDisabled.bind(this) as any));
    this.logger.log('DeviceConfigWatcher initialized, listening for device events');
  }

  /**
   * 设备新增 → 建立连接 + 注册调度任务
   *
   * 业务效果：返回 connectionId、设备是否上线、连接是否新建
   * 失败时抛出异常（由 wrapSubscriber 记录为 failed）
   */
  private async onDeviceCreated(event: {
    deviceId: string;
    projectId: string;
    protocol: string;
    connection: Record<string, any>;
    scanRate: number;
  }): Promise<Record<string, any>> {
    this.logger.log(`Device created: ${event.deviceId} (${event.protocol})`);

    // ensureConnection 失败会抛出，由 wrapSubscriber 捕获
    const connectionId = await this.ensureConnection(
      event.deviceId,
      event.protocol,
      event.connection,
    );

    return {
      connectionId,
      deviceOnline: true,
      connectionRebuilt: false,
      tagsLoaded: 0, // 标签加载由 EnhancedScheduler / CollectorBootstrap 处理
      tasksRegistered: 0, // 任务注册由 EnhancedScheduler 处理
      protocol: event.protocol,
    };
  }

  /**
   * 设备更新 → 按 changedFields 执行增量操作
   *
   * 业务效果：返回各字段处理结果（连接是否重建、scanRate 是否更新、是否触发 tagsChanged）
   */
  private async onDeviceUpdated(event: {
    deviceId: string;
    projectId: string;
    protocol: string;
    changedFields: string[];
    connection?: Record<string, any>;
    scanRate?: number;
    driver?: string;
  }): Promise<Record<string, any>> {
    const { deviceId, protocol, changedFields } = event;
    this.logger.log(
      `Device updated: ${deviceId} (${protocol}), changedFields=${JSON.stringify(changedFields)}`,
    );

    const result: {
      fieldsProcessed: string[];
      connectionRebuilt: boolean;
      connectionId: string | null;
      scanRateUpdated: boolean;
      tasksUpdated: number;
      tagsChangedEmitted: boolean;
      deviceOnline: boolean;
    } = {
      fieldsProcessed: [],
      connectionRebuilt: false,
      connectionId: null,
      scanRateUpdated: false,
      tasksUpdated: 0,
      tagsChangedEmitted: false,
      deviceOnline: false,
    };

    // 通道配置变更：断开旧连接 → 建立新连接
    if (changedFields.includes('connection') && event.connection) {
      await this.disconnectDevice(deviceId);
      const newConnectionId = await this.ensureConnection(
        deviceId,
        protocol,
        event.connection,
      );
      result.fieldsProcessed.push('connection');
      result.connectionRebuilt = true;
      result.connectionId = newConnectionId;
      result.deviceOnline = true;
      this.logger.log(`Device ${deviceId} connection rebuilt`);
    }

    // 采集驱动变更：断开旧连接 → 用新驱动重建连接 → 重载任务
    if (changedFields.includes('driver') && event.driver) {
      await this.disconnectDevice(deviceId);
      const newConnectionId = await this.ensureConnection(
        deviceId,
        event.driver,
        event.connection || {},
      );
      // 驱动变更后需要 reload，emit tagsChanged 让上层重载任务
      this.eventBus.emit('device.tagsChanged', {
        deviceId,
        projectId: event.projectId,
        protocol: event.driver,
        changeType: 'driver_switch',
        timestamp: Date.now(),
      });
      result.fieldsProcessed.push('driver');
      result.connectionRebuilt = true;
      result.connectionId = newConnectionId;
      result.tagsChangedEmitted = true;
      result.deviceOnline = true;
      this.logger.log(
        `Device ${deviceId} driver changed to ${event.driver}, connection rebuilt`,
      );
    }

    // 采集频率变更：更新调度器
    if (changedFields.includes('scanRate') && event.scanRate) {
      if (this.scheduler) {
        const updated = this.scheduler.updateTaskInterval(deviceId, event.scanRate);
        result.fieldsProcessed.push('scanRate');
        result.scanRateUpdated = true;
        result.tasksUpdated = updated;
        this.logger.log(
          `Device ${deviceId} scanRate changed to ${event.scanRate}ms (${updated} tasks updated)`,
        );
      } else {
        this.logger.warn(
          `Device ${deviceId} scanRate changed to ${event.scanRate}ms but scheduler unavailable`,
        );
      }
    }

    // 标签变更：转发 device.tagsChanged 事件，由上层 CollectorBootstrap 执行任务重载
    if (changedFields.includes('tags')) {
      this.eventBus.emit('device.tagsChanged', {
        deviceId,
        projectId: event.projectId,
        protocol: event.protocol,
        changeType: 'template_sync',
        timestamp: Date.now(),
      });
      result.fieldsProcessed.push('tags');
      result.tagsChangedEmitted = true;
      this.logger.log(`Device ${deviceId} tags changed, emitted tagsChanged event`);
    }

    // 如果未处理任何字段但仍调用，标记设备在线（如果已有连接）
    if (result.fieldsProcessed.length === 0) {
      result.deviceOnline = this.activeDevices.has(deviceId);
      result.connectionId =
        this.activeDevices.get(deviceId)?.shard.connectionId ?? null;
    }

    return result;
  }

  /**
   * 设备删除 → 断开连接 + 移除调度任务
   *
   * 业务效果：返回连接是否已关闭、设备是否从采集层移除
   */
  private async onDeviceDeleted(event: {
    deviceId: string;
  }): Promise<Record<string, any>> {
    this.logger.log(`Device deleted: ${event.deviceId}`);

    const hadConnection = this.activeDevices.has(event.deviceId);
    await this.disconnectDevice(event.deviceId);
    this.activeDevices.delete(event.deviceId);

    return {
      deviceRemoved: true,
      connectionClosed: hadConnection,
      deviceId: event.deviceId,
    };
  }

  /**
   * 设备启用 → 复用 onDeviceCreated 流程
   */
  private async onDeviceEnabled(event: {
    deviceId: string;
    projectId: string;
    protocol: string;
    connection: Record<string, any>;
    scanRate: number;
  }): Promise<Record<string, any>> {
    const result = await this.onDeviceCreated(event);
    return { ...result, action: 'enabled' };
  }

  /**
   * 设备禁用 → 复用 onDeviceDeleted 流程
   */
  private async onDeviceDisabled(event: {
    deviceId: string;
  }): Promise<Record<string, any>> {
    const result = await this.onDeviceDeleted(event);
    return { ...result, action: 'disabled' };
  }

  /**
   * 确保设备连接已建立，支持三种隔离模式
   * - in_process: 直接调用 adapter.connect()
   * - worker_thread/child_process: 通过 executor.connect()
   *
   * @returns connectionId（用于业务效果追踪）
   * @throws 连接失败时抛出异常
   */
  async ensureConnection(
    deviceId: string,
    protocol: string,
    connection: Record<string, any>,
  ): Promise<string> {
    if (!this.isolationFactory) {
      this.logger.warn('IsolationFactory not available, skipping ensureConnection');
      return 'unavailable';
    }

    const executor = this.isolationFactory.getExecutor(protocol);
    const shard = await executor.connect({
      id: deviceId,
      name: deviceId,
      protocol,
      connection,
    });
    this.activeDevices.set(deviceId, { shard });
    return shard.connectionId;
  }

  /**
   * 断开设备连接，支持三种隔离模式
   *
   * @returns 是否实际断开了已有连接（false 表示设备本就不在线）
   */
  async disconnectDevice(deviceId: string): Promise<boolean> {
    const record = this.activeDevices.get(deviceId);
    if (!record) return false;

    try {
      const executor = this.isolationFactory?.getExecutor(record.shard.protocol);
      if (executor) {
        await executor.disconnect(record.shard);
      }
    } catch (err) {
      // 断开失败不抛出，避免影响后续 ensureConnection
      this.logger.warn(
        `disconnectDevice ${deviceId} failed (will still remove from active map): ${(err as Error).message}`,
      );
    }
    this.activeDevices.delete(deviceId);
    return true;
  }

  getActiveDevices(): Map<string, { shard: ShardRef }> {
    return new Map(this.activeDevices);
  }
}
