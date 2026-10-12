// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { DeviceStateMachine } from '../state/device-state-machine';
import { DeviceStatus } from '@ss-node/ss-sdk';
import { EventBusService, CircuitBreakerService, ConnectionPoolService, EventLogService } from '@ss-node/ss-core';

export interface ActiveConnection {
  deviceId: string;
  connectedAt: number;
  lastActivity: number;
  tags: string[];
}

@Injectable()
export class ConnectionManagerService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private activeConnections = new Map<string, ActiveConnection>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(getRepositoryToken(Device))
    private deviceRepo: Repository<Device>,
    private stateMachine: DeviceStateMachine,
    private eventBus: EventBusService,
    private circuitBreaker: CircuitBreakerService,
    private connectionPool: ConnectionPoolService,
    private configService: ConfigService,
    @Optional() private readonly eventLogService?: EventLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.startHeartbeat();

    // wrap helper：通过 EventLogService.wrapSubscriber 自动追踪处理结果和业务效果
    const wrap = <T extends any[]>(
      eventType: string,
      handler: (...args: T) => Promise<Record<string, any> | void>,
    ): ((...args: T) => Promise<void>) => {
      const traced = this.eventLogService
        ? this.eventLogService.wrapSubscriber(eventType, 'ConnectionManagerService', handler)
        : async (...args: T) => { await handler(...args); };
      return async (...args: T) => {
        try { await traced(...args); }
        catch (err) { this.logger.error(`Handler for ${eventType} failed: ${(err as Error).message}`); }
      };
    };

    // 订阅定时器配置变更事件，支持运行时热更新
    this.eventBus.on('timer:configChanged', wrap('timer:configChanged', async (payload: { id: string; interval: number }) => {
      if (payload.id === 'DEVICE_CONNECTION_HEARTBEAT_INTERVAL_MS') {
        this.restartHeartbeat(payload.interval);
        return { heartbeatIntervalUpdated: true, newInterval: payload.interval };
      }
    }));
  }

  async connect(deviceId: string): Promise<void> {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) throw new Error(`Device not found: ${deviceId}`);

    if (this.activeConnections.has(deviceId)) {
      this.logger.warn(`Device ${deviceId} already connected`);
      return;
    }

    await this.stateMachine.transitionTo(device, DeviceStatus.CONNECTING);

    try {
      const _connection = await this.connectionPool.getConnection(deviceId);

      this.activeConnections.set(deviceId, {
        deviceId,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        tags: [],
      });

      this.circuitBreaker.recordSuccess(deviceId);
      await this.stateMachine.onConnectSuccess(device);
      this.logger.log(`Device ${deviceId} (${device.deviceName}) connected successfully`);
    } catch (error) {
      this.circuitBreaker.recordFailure(deviceId);
      await this.stateMachine.onConnectFailure(device, error);
      throw error;
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) return;

    try {
      await this.connectionPool.releaseConnection(deviceId);
    } catch (error) {
      this.logger.warn(`Error releasing connection for device ${deviceId}: ${error.message}`);
    }

    this.activeConnections.delete(deviceId);
    await this.stateMachine.onDisconnect(device);
  }

  async registerTags(deviceId: string, tagIds: string[]): Promise<void> {
    const conn = this.activeConnections.get(deviceId);
    if (!conn) {
      throw new Error(`Device ${deviceId} is not connected`);
    }
    conn.tags = [...new Set([...conn.tags, ...tagIds])];
  }

  isConnected(deviceId: string): boolean {
    return this.activeConnections.has(deviceId);
  }

  getActiveConnections(): ActiveConnection[] {
    return Array.from(this.activeConnections.values());
  }

  getConnectionCount(): number {
    return this.activeConnections.size;
  }

  getTagCount(deviceId: string): number {
    return this.activeConnections.get(deviceId)?.tags.length || 0;
  }

  touchActivity(deviceId: string): void {
    const conn = this.activeConnections.get(deviceId);
    if (conn) {
      conn.lastActivity = Date.now();
    }
  }

  private startHeartbeat(): void {
    const intervalMs =
      this.configService.get<number>('DEVICE_CONNECTION_HEARTBEAT_INTERVAL_MS') || 30000;

    this.heartbeatTimer = setInterval(async () => {
      await this.checkHeartbeats();
    }, intervalMs);
  }

  /** 运行时热更新连接心跳间隔 */
  restartHeartbeat(newInterval: number): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(async () => {
      await this.checkHeartbeats();
    }, newInterval);
    this.logger.log(`Connection heartbeat interval hot-reloaded to ${newInterval}ms`);
  }

  private async checkHeartbeats(): Promise<void> {
    const now = Date.now();
    const timeoutMs = 60000;

    for (const [deviceId, conn] of this.activeConnections) {
      const idleTime = now - conn.lastActivity;
      if (idleTime > timeoutMs * 2) {
        this.logger.warn(`Device ${deviceId} heartbeat timeout (idle: ${idleTime}ms)`);
        try {
          const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
          if (device) {
            await this.stateMachine.onDegrade(device, `Heartbeat timeout: ${idleTime}ms idle`);
          }
        } catch (error) {
          this.logger.error(`Heartbeat check failed for device ${deviceId}: ${error.message}`);
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    for (const deviceId of this.activeConnections.keys()) {
      await this.disconnect(deviceId);
    }
  }
}
