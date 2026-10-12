// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../event-bus/event-bus.service';
import { EventLogService } from '../event-log/event-log.service';
import { DeviceStatus } from '@ss-node/ss-sdk';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 设备统计信息（按协议分组） */
export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  other: number;
}

/** 设备内存状态记录的诊断数据 */
export interface DeviceDiagnostics {
  /** 采集调度器重试次数 */
  retryCount?: number;
  /** 熔断器状态 */
  circuitState?: 'closed' | 'open' | 'half-open';
  /** 连续失败次数 */
  consecutiveFailures?: number;
  /** 最近一次错误发生时间（epoch ms） */
  lastErrorAt?: number;
}

/** 设备内存状态记录 */
export interface DeviceStateRecord {
  deviceId: string;
  projectId: string;
  protocol: string;
  status: DeviceStatus;
  /** 最近一次成功采集的时间戳 */
  lastHeartbeat: number;
  /** 最近一次数据时间 */
  lastDataAt: number | null;
  /** 最近一次在线时间 */
  lastOnlineAt: number | null;
  /** 最近一次离线时间 */
  lastOfflineAt: number | null;
  /** 采集周期（ms）；0 = 不启用检测 */
  scanRate: number;
  /** 离线周期（ms），超过此周期无数据上报视为离线 */
  offlinePeriod: number;
  /** DEGRADED 状态下的失败标签列表 */
  failingTags: string[];
  /** 标签总数（用于健康度计算） */
  totalTags: number;
  /** 在线标签数 */
  onlineTags: number;
  /** 最近一次错误信息 */
  lastErrorMessage: string | null;
  /** 采集诊断数据（调度器/插件层推送） */
  diagnostics: DeviceDiagnostics | null;
}

/** 按协议分组的设备统计 */
export interface AllDeviceStats {
  [protocol: string]: DeviceStats;
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

/**
 * 统一设备状态管理器 (UDSM)
 *
 * 作为系统中设备状态的唯一权威数据源。所有模块（采集器、插件管理、前端 API、
 * WebSocket 推送）都通过此类读写设备状态。
 *
 * 职责：
 * - 维护 deviceId → DeviceStateRecord 的内存映射
 * - 状态变更时通过 EventBus 发射统一事件 `device:statusChanged`
 * - 内置心跳检测定时器（@Cron 每 5 秒）
 * - 提供按协议/全量的统计查询
 */
@Injectable()
export class DeviceStateManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceStateManager.name);

  /** 设备状态内存映射 */
  private readonly stateMap = new Map<string, DeviceStateRecord>();

  /** 心跳超时倍数：scanRate × 4 */
  private readonly HEARTBEAT_TIMEOUT_MULTIPLIER = 4;
  /** 默认 scanRate（30 秒） */
  private readonly DEFAULT_SCAN_RATE_MS = 30_000;
  /** 心跳检测间隔（5 秒） */
  private readonly HEARTBEAT_CHECK_INTERVAL_MS = 5_000;
  /** 心跳定时器 */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService,
    @Optional() private readonly eventLogService?: EventLogService,
  ) {}

  onModuleInit(): void {
    const interval =
      this.configService.get<number>('DEVICE_HEARTBEAT_CHECK_INTERVAL_MS') ||
      this.HEARTBEAT_CHECK_INTERVAL_MS;
    this.startHeartbeatTimer(interval);

    // wrap helper：通过 EventLogService.wrapSubscriber 自动追踪处理结果和业务效果
    const wrap = <T extends any[]>(
      eventType: string,
      handler: (...args: T) => Promise<Record<string, any> | void>,
    ): ((...args: T) => Promise<void>) => {
      const traced = this.eventLogService
        ? this.eventLogService.wrapSubscriber(eventType, 'DeviceStateManager', handler)
        : async (...args: T) => { await handler(...args); };
      return async (...args: T) => {
        try { await traced(...args); }
        catch (err) { this.logger.error(`Handler for ${eventType} failed: ${(err as Error).message}`); }
      };
    };

    // 订阅定时器配置变更事件，支持运行时热更新
    this.eventBus.on('timer:configChanged', wrap('timer:configChanged', async (payload: { id: string; interval: number }) => {
      if (payload.id === 'DEVICE_HEARTBEAT_CHECK_INTERVAL_MS') {
        this.restartHeartbeatTimer(payload.interval);
        return { heartbeatIntervalUpdated: true, newInterval: payload.interval };
      }
    }));

    // 订阅设备更新事件，支持 scanRate / offlinePeriod 热更新
    this.eventBus.on(
      'device.updated',
      wrap('device.updated', async (payload: {
        deviceId: string;
        changedFields: string[];
        scanRate?: number;
        offlinePeriod?: number;
      }) => {
        const record = this.stateMap.get(payload.deviceId);
        if (!record) return;

        const result: Record<string, any> = { deviceId: payload.deviceId };
        if (payload.changedFields.includes('scanRate') && payload.scanRate) {
          record.scanRate = payload.scanRate;
          this.logger.log(
            `Device ${payload.deviceId} scanRate hot-reloaded to ${payload.scanRate}ms`,
          );
          result.scanRateUpdated = true;
          result.newScanRate = payload.scanRate;
        }

        if (payload.changedFields.includes('offlinePeriod') && payload.offlinePeriod) {
          record.offlinePeriod = payload.offlinePeriod;
          this.logger.log(
            `Device ${payload.deviceId} offlinePeriod hot-reloaded to ${payload.offlinePeriod}ms`,
          );
          result.offlinePeriodUpdated = true;
          result.newOfflinePeriod = payload.offlinePeriod;
        }
        return result;
      }),
    );

    this.logger.log(`DeviceStateManager initialized (heartbeat interval: ${interval}ms)`);
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }

  /** 启动/重启心跳检测定时器 */
  private startHeartbeatTimer(interval: number): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => this.checkHeartbeats(), interval);
  }

  /** 运行时热更新心跳检测间隔 */
  restartHeartbeatTimer(newInterval: number): void {
    this.startHeartbeatTimer(newInterval);
    this.logger.log(`Heartbeat check interval hot-reloaded to ${newInterval}ms`);
  }

  // -------------------------------------------------------------------------
  // 状态写入
  // -------------------------------------------------------------------------

  /** 注册或更新设备追踪记录 */
  registerDevice(params: {
    deviceId: string;
    projectId: string;
    protocol: string;
    scanRate?: number;
    offlinePeriod?: number;
    initialStatus?: DeviceStatus;
    totalTags?: number;
  }): DeviceStateRecord {
    const existing = this.stateMap.get(params.deviceId);
    if (existing) {
      existing.protocol = params.protocol ?? existing.protocol;
      existing.scanRate = params.scanRate ?? existing.scanRate;
      existing.offlinePeriod = params.offlinePeriod ?? existing.offlinePeriod;
      if (params.totalTags !== undefined) {
        existing.totalTags = params.totalTags;
      }
      return existing;
    }

    const record: DeviceStateRecord = {
      deviceId: params.deviceId,
      projectId: params.projectId,
      protocol: params.protocol,
      status: params.initialStatus ?? DeviceStatus.OFFLINE,
      lastHeartbeat: 0,
      lastDataAt: null,
      lastOnlineAt: null,
      lastOfflineAt: params.initialStatus === DeviceStatus.OFFLINE ? Date.now() : null,
      scanRate: params.scanRate ?? this.DEFAULT_SCAN_RATE_MS,
      offlinePeriod:
        params.offlinePeriod ??
        (params.scanRate ?? this.DEFAULT_SCAN_RATE_MS) * this.HEARTBEAT_TIMEOUT_MULTIPLIER,
      failingTags: [],
      totalTags: params.totalTags ?? 0,
      onlineTags: 0,
      lastErrorMessage: null,
      diagnostics: null,
    };

    this.stateMap.set(params.deviceId, record);
    return record;
  }

  /** 注销设备追踪 */
  unregisterDevice(deviceId: string): void {
    this.stateMap.delete(deviceId);
  }

  /**
   * 注销某个项目下所有设备的追踪记录（项目停用时调用）
   *
   * 遍历内存状态表，移除所有 projectId 匹配的设备。
   * 不直接访问项目 DB，调用方负责持久化与任务调度清理。
   *
   * @param projectId 项目 ID
   * @returns 被注销的设备 ID 列表（供调用方进一步清理任务调度器/插件）
   */
  unregisterProjectDevices(projectId: string): string[] {
    const removedDeviceIds: string[] = [];
    for (const [deviceId, record] of this.stateMap) {
      if (record.projectId === projectId) {
        this.stateMap.delete(deviceId);
        removedDeviceIds.push(deviceId);
      }
    }
    return removedDeviceIds;
  }

  /** 设置设备在线（采集成功） */
  setOnline(deviceId: string, dataTimestamp?: number): void {
    const record = this.stateMap.get(deviceId);
    if (!record) {
      this.logger.warn(`setOnline: device ${deviceId} not tracked`);
      return;
    }

    const now = Date.now();
    const prevStatus = record.status;
    record.status = DeviceStatus.ONLINE;
    record.lastHeartbeat = now;
    record.lastDataAt = dataTimestamp ?? now;
    record.lastErrorMessage = null;
    record.diagnostics = null; // 恢复后清空诊断数据

    if (prevStatus !== DeviceStatus.ONLINE) {
      // 只在状态切换（非在线→在线）时更新最近上线时间，避免跟随实时数据跳动
      record.lastOnlineAt = now;
      this.logger.log(`Device ${deviceId}: ${prevStatus} → online`);
      this.emitStatusChanged(record, prevStatus);
    }
  }

  /** 设置设备离线 */
  setOffline(deviceId: string, reason?: string): void {
    const record = this.stateMap.get(deviceId);
    if (!record) return;

    const prevStatus = record.status;
    if (prevStatus === DeviceStatus.OFFLINE) return;

    record.status = DeviceStatus.OFFLINE;
    record.lastOfflineAt = Date.now();

    this.logger.log(`Device ${deviceId}: ${prevStatus} → offline${reason ? ` (${reason})` : ''}`);
    this.emitStatusChanged(record, prevStatus);
  }

  /** 设置设备错误 */
  setError(deviceId: string, errorMessage?: string): void {
    const record = this.stateMap.get(deviceId);
    if (!record) return;

    const prevStatus = record.status;
    record.status = DeviceStatus.ERROR;
    record.lastErrorMessage = errorMessage ?? null;

    this.logger.warn(
      `Device ${deviceId}: ${prevStatus} → error${errorMessage ? ` (${errorMessage})` : ''}`,
    );
    this.emitStatusChanged(record, prevStatus);
  }

  /** 设置设备采集诊断数据（调度器/插件层推送） */
  setDiagnostics(deviceId: string, diagnostics: DeviceDiagnostics): void {
    const record = this.stateMap.get(deviceId);
    if (!record) return;
    record.diagnostics = { ...record.diagnostics, ...diagnostics };
  }

  /** 设置设备为 DEGRADED（部分标签失败） */
  setDegraded(deviceId: string, failingTagIds: string[], errorMessage?: string): void {
    const record = this.stateMap.get(deviceId);
    if (!record) return;

    const prevStatus = record.status;
    record.status = DeviceStatus.DEGRADED;
    record.failingTags = failingTagIds;
    record.onlineTags = record.totalTags - failingTagIds.length;
    record.lastErrorMessage = errorMessage ?? null;

    this.logger.warn(
      `Device ${deviceId}: ${prevStatus} → degraded (${failingTagIds.length}/${record.totalTags} tags failing)`,
    );
    this.emitStatusChanged(record, prevStatus);
  }

  /** 更新 DEGRADED 设备的失败标签列表 */
  updateFailingTags(deviceId: string, failingTagIds: string[]): void {
    const record = this.stateMap.get(deviceId);
    if (!record) return;

    record.failingTags = failingTagIds;
    record.onlineTags = record.totalTags - failingTagIds.length;

    if (failingTagIds.length === 0 && record.status === DeviceStatus.DEGRADED) {
      // 所有标签恢复 → 回到 ONLINE
      this.setOnline(deviceId);
    } else if (failingTagIds.length > 0 && record.status === DeviceStatus.ONLINE) {
      // 出现失败标签 → 进入 DEGRADED
      this.setDegraded(deviceId, failingTagIds);
    }
  }

  /** 获取设备标签健康度（0-1） */
  getTagHealth(deviceId: string): number | null {
    const record = this.stateMap.get(deviceId);
    if (!record || record.totalTags === 0) return null;
    return record.onlineTags / record.totalTags;
  }

  /** 更新心跳时间戳 */
  touchHeartbeat(deviceId: string): void {
    const record = this.stateMap.get(deviceId);
    if (record) {
      record.lastHeartbeat = Date.now();
    }
  }

  // -------------------------------------------------------------------------
  // 状态读取
  // -------------------------------------------------------------------------

  getState(deviceId: string): DeviceStateRecord | undefined {
    return this.stateMap.get(deviceId);
  }

  getAllStates(): ReadonlyMap<string, DeviceStateRecord> {
    return this.stateMap;
  }

  /** 获取某个协议下的活跃设备 ID 列表 */
  getDeviceIdsByProtocol(protocol: string): string[] {
    const ids: string[] = [];
    for (const [id, record] of this.stateMap) {
      if (record.protocol === protocol) {
        ids.push(id);
      }
    }
    return ids;
  }

  /** 按协议获取统计 */
  getStatsByProtocol(protocol: string): DeviceStats {
    let total = 0;
    let online = 0;
    let offline = 0;
    let error = 0;
    let other = 0;

    for (const [, record] of this.stateMap) {
      if (record.protocol !== protocol) continue;
      total++;
      switch (record.status) {
        case DeviceStatus.ONLINE:
          online++;
          break;
        case DeviceStatus.OFFLINE:
          offline++;
          break;
        case DeviceStatus.ERROR:
          error++;
          break;
        default:
          other++;
      }
    }

    return { total, online, offline, error, other };
  }

  /** 获取所有协议统计 */
  getAllStats(): AllDeviceStats {
    const result: AllDeviceStats = {};
    for (const [, record] of this.stateMap) {
      const stats = result[record.protocol] || {
        total: 0,
        online: 0,
        offline: 0,
        error: 0,
        other: 0,
      };
      stats.total++;
      switch (record.status) {
        case DeviceStatus.ONLINE:
          stats.online++;
          break;
        case DeviceStatus.OFFLINE:
          stats.offline++;
          break;
        case DeviceStatus.ERROR:
          stats.error++;
          break;
        default:
          stats.other++;
      }
      result[record.protocol] = stats;
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // 心跳检测
  // -------------------------------------------------------------------------

  /** 心跳检测（每 5 秒由 setInterval 触发） */
  private checkHeartbeats(): void {
    const now = Date.now();
    for (const [deviceId, record] of this.stateMap) {
      // 只检测在线状态
      if (record.status !== DeviceStatus.ONLINE) continue;

      // offlinePeriod 或 scanRate 为 0 表示不启用心跳检测
      const offlinePeriod =
        record.offlinePeriod > 0
          ? record.offlinePeriod
          : record.scanRate * this.HEARTBEAT_TIMEOUT_MULTIPLIER;
      if (offlinePeriod <= 0) continue;

      if (record.lastHeartbeat > 0 && now - record.lastHeartbeat > offlinePeriod) {
        this.setOffline(deviceId, 'heartbeat timeout');
      }
    }
  }

  // -------------------------------------------------------------------------
  // 内部方法
  // -------------------------------------------------------------------------

  private emitStatusChanged(record: DeviceStateRecord, prevStatus: DeviceStatus): void {
    this.eventBus.emit('device:statusChanged', {
      deviceId: record.deviceId,
      projectId: record.projectId,
      protocol: record.protocol,
      status: record.status,
      previousStatus: prevStatus,
      timestamp: Date.now(),
    });
  }
}
