// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../event-bus/event-bus.service';
import { ScadaWebSocketGateway } from './websocket.gateway';
import { OfflineMessageCacheService } from './offline-message-cache.service';
import { WebSocketMetricsService } from './websocket-metrics.service';
import type {
  DataPointChangedEvent,
  DeviceStatusChangedEvent,
  AlarmTriggeredEvent,
} from '../event-bus/event-bus.types';

/**
 * 数据推送桥接器
 *
 * 监控消息的"来"过程：EventBus 事件 → DataPushBridge → ScadaWebSocketGateway
 *
 * 每次处理记录：
 * - 消息追踪日志（trace）：事件类型 + 关键字段 + 耗时
 * - 指标计数：bridgeLatency、offlineCache 命中/未命中
 */
@Injectable()
export class DataPushBridge implements OnModuleInit {
  private readonly logger = new Logger(DataPushBridge.name);

  /** 日志采样率：高频事件（data_point_changed）每 N 条只记录 1 条日志，避免日志淹没 */
  private static readonly DATA_POINT_LOG_SAMPLE_RATE = 100;
  private dataPointLogCounter = 0;

  /** P2优化：data_point_changed 批量缓冲，200ms 合并窗口 */
  private batchBuffer = new Map<
    string,
    Array<{
      tagId: string;
      tagName: string;
      value: number | null;
      quality: string;
      timestamp: string;
    }>
  >();
  private batchFlushTimer: NodeJS.Timeout | null = null;
  private static readonly BATCH_FLUSH_INTERVAL_MS = 200;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly wsGateway: ScadaWebSocketGateway,
    private readonly offlineCache: OfflineMessageCacheService,
    private readonly metricsService: WebSocketMetricsService,
  ) {}

  onModuleInit(): void {
    this.eventBus.on('data_point_changed', (event: DataPointChangedEvent) => {
      this.handleDataPointChanged(event);
    });

    // 统一事件: DeviceStateManager 发射的 device:statusChanged
    this.eventBus.on('device:statusChanged', (event: any) => {
      this.handleDeviceStatusChanged(event as DeviceStatusChangedEvent);
    });

    // 兼容旧事件名（后续版本移除）
    this.eventBus.on('device_status_changed', (event: DeviceStatusChangedEvent) => {
      this.handleDeviceStatusChanged(event);
    });

    this.eventBus.on('alarm_triggered', (event: AlarmTriggeredEvent) => {
      this.handleAlarmTriggered(event);
    });

    this.eventBus.on(
      'alarm_acknowledged',
      (event: {
        alarmId: string;
        projectId: string;
        acknowledgedBy: string;
        timestamp: number;
      }) => {
        this.handleAlarmAcknowledged(event);
      },
    );

    this.eventBus.on(
      'alarm.cleared',
      (event: { alarmId: string; projectId: string; clearedBy: string; timestamp: number }) => {
        this.handleAlarmCleared(event);
      },
    );

    this.eventBus.on(
      'alarm.recovered',
      (event: {
        recordId: string;
        projectId: string;
        recoveredValue: string;
        recoveredAt: Date;
        ruleId?: string;
        ruleName?: string;
      }) => {
        this.handleAlarmRecovered(event);
      },
    );

    this.logger.log(
      'DataPushBridge initialized — EventBus → WebSocket bridge active (with metrics)',
    );
  }

  private handleDataPointChanged(event: DataPointChangedEvent): void {
    const startMs = Date.now();
    const timestamp = new Date(event.timestamp).toISOString();

    // P2优化：批量缓冲替代逐条 broadcastTagUpdate，200ms 合并窗口内多次推送合并为一次
    const projectBuffer = this.batchBuffer.get(event.projectId) || [];
    projectBuffer.push({
      tagId: event.tagId,
      tagName: '',
      value: event.value,
      quality: event.quality,
      timestamp,
    });
    this.batchBuffer.set(event.projectId, projectBuffer);

    // 启动 200ms 刷新定时器（如未启动，有自停机制）
    if (!this.batchFlushTimer) {
      this.batchFlushTimer = setInterval(
        () => this.flushBatch(),
        DataPushBridge.BATCH_FLUSH_INTERVAL_MS,
      );
    }

    const durationMs = Date.now() - startMs;
    this.metricsService.recordBridgeLatency('data_point_changed', durationMs);

    // 采样日志：每 100 条记录一次，避免高频日志淹没
    this.dataPointLogCounter++;
    if (this.dataPointLogCounter % DataPushBridge.DATA_POINT_LOG_SAMPLE_RATE === 0) {
      this.logger.log(
        `data_point_changed #${this.dataPointLogCounter} tag=${event.tagId} ${durationMs}ms`,
      );
    }
  }

  /** P2优化：刷新批量缓冲，调用 gateway broadcastBatchUpdate */
  private flushBatch(): void {
    if (this.batchBuffer.size === 0) {
      // 无数据时停止定时器（自停机制）
      if (this.batchFlushTimer) {
        clearInterval(this.batchFlushTimer);
        this.batchFlushTimer = null;
      }
      return;
    }

    for (const [projectId, tags] of this.batchBuffer.entries()) {
      this.wsGateway.broadcastBatchUpdate(projectId, tags);
    }
    this.batchBuffer.clear();
  }

  private handleDeviceStatusChanged(event: DeviceStatusChangedEvent): void {
    const startMs = Date.now();
    const timestamp = new Date(event.timestamp).toISOString();

    const payload = {
      event: 'deviceStatusChanged',
      deviceId: event.deviceId,
      fromStatus: event.previousStatus || 'unknown',
      toStatus: event.status,
      errorMessage: event.errorMessage,
      timestamp,
    };

    this.wsGateway.broadcastDeviceStatus(event.projectId, event.deviceId, {
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
      errorMessage: payload.errorMessage,
      timestamp,
    });

    // 为离线客户端缓存设备状态变更消息
    this.cacheForOffline('device:statusChange', payload);

    const durationMs = Date.now() - startMs;
    this.metricsService.recordBridgeLatency('device:statusChanged', durationMs);
    this.logger.log(
      `device:statusChanged device=${event.deviceId} ${payload.fromStatus}→${payload.toStatus} ${durationMs}ms`,
    );
  }

  private handleAlarmTriggered(event: AlarmTriggeredEvent): void {
    const startMs = Date.now();
    const timestamp = new Date(event.timestamp).toISOString();

    const payload = {
      event: 'alarmTriggered',
      alarmId: event.alarmId,
      ruleName: '',
      tagName: '',
      level: event.level,
      value: event.value ?? 0,
      message: event.message,
      timestamp,
    };

    this.wsGateway.broadcastAlarmTrigger(event.projectId, {
      alarmId: payload.alarmId,
      ruleName: payload.ruleName,
      tagName: payload.tagName,
      level: payload.level,
      value: payload.value,
      message: payload.message,
      timestamp,
    });

    // 为离线客户端缓存报警触发消息
    this.cacheForOffline('alarm:trigger', payload);

    const durationMs = Date.now() - startMs;
    this.metricsService.recordBridgeLatency('alarm_triggered', durationMs);
    this.logger.log(
      `alarm_triggered alarmId=${event.alarmId} level=${event.level} ${durationMs}ms`,
    );
  }

  private handleAlarmAcknowledged(event: {
    alarmId: string;
    projectId: string;
    acknowledgedBy: string;
    timestamp: number;
  }): void {
    const startMs = Date.now();
    const timestamp = new Date(event.timestamp).toISOString();

    this.wsGateway.broadcastAlarmAcknowledged(event.projectId, {
      alarmId: event.alarmId,
      acknowledgedBy: event.acknowledgedBy,
      timestamp,
    });

    const durationMs = Date.now() - startMs;
    this.metricsService.recordBridgeLatency('alarm_acknowledged', durationMs);
    this.logger.log(
      `alarm_acknowledged alarmId=${event.alarmId} by=${event.acknowledgedBy} ${durationMs}ms`,
    );
  }

  private handleAlarmCleared(event: {
    alarmId: string;
    projectId: string;
    clearedBy: string;
    timestamp: number;
  }): void {
    const startMs = Date.now();
    const timestamp = new Date(event.timestamp).toISOString();

    this.wsGateway.broadcastAlarmCleared(event.projectId, {
      alarmId: event.alarmId,
      clearedBy: event.clearedBy,
      timestamp,
    });

    const durationMs = Date.now() - startMs;
    this.metricsService.recordBridgeLatency('alarm.cleared', durationMs);
    this.logger.log(`alarm.cleared alarmId=${event.alarmId} by=${event.clearedBy} ${durationMs}ms`);
  }

  private handleAlarmRecovered(event: {
    recordId: string;
    projectId: string;
    recoveredValue: string;
    recoveredAt: Date;
    ruleId?: string;
    ruleName?: string;
  }): void {
    const startMs = Date.now();
    const timestamp =
      event.recoveredAt instanceof Date
        ? event.recoveredAt.toISOString()
        : new Date(event.recoveredAt).toISOString();

    this.wsGateway.broadcastAlarmRecovered(event.projectId, {
      alarmId: event.recordId,
      recoveredValue: event.recoveredValue,
      ruleName: event.ruleName,
      timestamp,
    });

    const durationMs = Date.now() - startMs;
    this.metricsService.recordBridgeLatency('alarm.recovered', durationMs);
    this.logger.log(
      `alarm.recovered recordId=${event.recordId} value=${event.recoveredValue} ${durationMs}ms`,
    );
  }

  /**
   * 为离线客户端缓存消息
   * 查找已注册但当前不在线的客户端，将消息缓存到其离线消息队列
   * @param event 事件名称
   * @param data 消息数据
   */
  cacheForOffline(event: string, data: unknown): void {
    const onlineIds = this.wsGateway.getOnlineUserIds();
    const offlineIds = this.offlineCache.getOfflineClientIds(onlineIds);

    if (offlineIds.length === 0) {
      this.metricsService.recordOfflineCacheMiss();
      return;
    }

    for (const clientId of offlineIds) {
      this.offlineCache.cacheMessage(clientId, event, data);
    }
    this.metricsService.recordOfflineCacheHit();

    this.logger.debug(`Cached offline message for ${offlineIds.length} client(s): event=${event}`);
  }
}
