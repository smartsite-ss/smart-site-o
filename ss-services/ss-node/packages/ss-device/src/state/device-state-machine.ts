// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { Inject, Optional } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Device } from '../entities/device.entity';
import { DeviceStatusLog } from '../entities/device-status-log.entity';
import { DeviceStatus } from '@ss-node/ss-sdk';
import { EventBusService } from '@ss-node/ss-core';
import { DeviceGateway } from '../device.gateway';

export interface StatusChangeEvent {
  deviceId: string;
  projectId: string;
  fromStatus: DeviceStatus;
  toStatus: DeviceStatus;
  errorMessage?: string;
  timestamp: string;
}

@Injectable()
export class DeviceStateMachine {
  private readonly logger = new Logger(DeviceStateMachine.name);

  // 重试计数 (deviceId → retryCount)
  private retryCounts = new Map<string, number>();
  private maxRetries = 3;
  private baseRetryIntervalMs = 3000;
  private maxRetryIntervalMs = 60000;

  constructor(
    @Inject(getRepositoryToken(Device))
    private deviceRepo: Repository<Device>,
    private eventBus: EventBusService,
    @Optional()
    @Inject(getRepositoryToken(DeviceStatusLog))
    private statusLogRepo?: Repository<DeviceStatusLog>,
    @Optional()
    @Inject(DeviceGateway)
    private deviceGateway?: DeviceGateway,
  ) {}

  async transitionTo(
    device: Device,
    toStatus: DeviceStatus,
    errorMessage?: string,
  ): Promise<Device> {
    const fromStatus = device.status;

    // 无效状态转换检测
    if (fromStatus === toStatus) return device;
    if (!this.isValidTransition(fromStatus as DeviceStatus, toStatus)) {
      this.logger.warn(
        `Invalid state transition: ${device.id} ${fromStatus} → ${toStatus} (ignored)`,
      );
      return device;
    }

    device.status = toStatus;
    device.updatedAt = new Date();

    if (toStatus === DeviceStatus.ONLINE) {
      device.lastOnlineAt = new Date();
      device.errorCount = 0;
      this.retryCounts.delete(device.id);
    }

    if (toStatus === DeviceStatus.ERROR) {
      device.lastErrorAt = new Date();
      device.lastErrorMsg = errorMessage;
      device.errorCount = (device.errorCount || 0) + 1;
    }

    if (toStatus === DeviceStatus.ONLINE) {
      device.errorCount = 0;
    }

    await this.deviceRepo.save(device);

    // 记录状态变更历史到 dev_device_status_log 表
    if (this.statusLogRepo) {
      try {
        await this.statusLogRepo.save({
          deviceId: device.id,
          fromStatus: fromStatus as string,
          toStatus: toStatus as string,
          errorMessage,
          reason: errorMessage || `State transition: ${fromStatus} → ${toStatus}`,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to record status log for device ${device.id}: ${(err as Error).message}`,
        );
      }
    }

    const event: StatusChangeEvent = {
      deviceId: device.id,
      projectId: device.projectId,
      fromStatus: fromStatus as DeviceStatus,
      toStatus,
      errorMessage,
      timestamp: new Date().toISOString(),
    };

    this.eventBus.emit('device:statusChange', event);

    // WebSocket push
    if (this.deviceGateway) {
      this.deviceGateway.pushDeviceStatus(device.id, {
        fromStatus: fromStatus as string,
        toStatus: toStatus as string,
        errorMessage,
        timestamp: event.timestamp,
      });
    }

    this.logger.log(
      `Device ${device.id} (${device.deviceName}): ${fromStatus} → ${toStatus}` +
        (errorMessage ? ` (${errorMessage})` : ''),
    );

    return device;
  }

  async onConnectSuccess(device: Device): Promise<Device> {
    return this.transitionTo(device, DeviceStatus.ONLINE);
  }

  async onConnectFailure(device: Device, error: Error): Promise<Device> {
    const updated = await this.transitionTo(device, DeviceStatus.ERROR, error.message);

    // 自动重试
    const retryCount = this.retryCounts.get(device.id) || 0;
    if (retryCount < this.maxRetries) {
      const delay = Math.min(
        this.baseRetryIntervalMs * Math.pow(2, retryCount),
        this.maxRetryIntervalMs,
      );

      this.retryCounts.set(device.id, retryCount + 1);
      this.logger.warn(
        `Device ${device.id} retry ${retryCount + 1}/${this.maxRetries} in ${delay}ms`,
      );

      setTimeout(() => {
        this.eventBus.emit('device:retry', { deviceId: device.id });
      }, delay);
    } else {
      this.logger.error(
        `Device ${device.id} max retries (${this.maxRetries}) exceeded, staying in ERROR state`,
      );
    }

    return updated;
  }

  async onDisconnect(device: Device): Promise<Device> {
    this.retryCounts.delete(device.id);
    return this.transitionTo(device, DeviceStatus.OFFLINE);
  }

  async onDegrade(device: Device, reason: string): Promise<Device> {
    return this.transitionTo(device, DeviceStatus.DEGRADED, reason);
  }

  async onRecover(device: Device): Promise<Device> {
    return this.transitionTo(device, DeviceStatus.ONLINE);
  }

  getRetryCount(deviceId: string): number {
    return this.retryCounts.get(deviceId) || 0;
  }

  resetRetry(deviceId: string): void {
    this.retryCounts.delete(deviceId);
  }

  private isValidTransition(from: DeviceStatus, to: DeviceStatus): boolean {
    const validTransitions: Record<DeviceStatus, DeviceStatus[]> = {
      [DeviceStatus.OFFLINE]: [DeviceStatus.CONNECTING],
      [DeviceStatus.CONNECTING]: [DeviceStatus.ONLINE, DeviceStatus.ERROR, DeviceStatus.OFFLINE],
      [DeviceStatus.ONLINE]: [DeviceStatus.DEGRADED, DeviceStatus.OFFLINE, DeviceStatus.ERROR],
      [DeviceStatus.DEGRADED]: [DeviceStatus.ONLINE, DeviceStatus.ERROR, DeviceStatus.OFFLINE],
      [DeviceStatus.ERROR]: [DeviceStatus.CONNECTING, DeviceStatus.OFFLINE],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * 心跳检查：每30秒检查所有在线/降级设备的心跳状态
   * 超过2倍心跳间隔未通信 → 判定心跳失败
   */
  async checkHeartbeats(): Promise<void> {
    const onlineDevices = await this.deviceRepo.find({
      where: { status: In([DeviceStatus.ONLINE, DeviceStatus.DEGRADED]) },
    });

    if (onlineDevices.length === 0) return;

    const now = Date.now();
    for (const device of onlineDevices) {
      const lastOnlineTime = device.lastOnlineAt?.getTime() || 0;
      // 使用 heartbeatInterval 或默认 30000ms
      const heartbeatInterval = (device as any).heartbeatInterval || 30000;
      const timeSinceLastComm = now - lastOnlineTime;

      if (timeSinceLastComm > heartbeatInterval * 2) {
        this.logger.warn(
          `Device ${device.id} (${device.deviceName}) heartbeat timeout: ` +
            `${timeSinceLastComm}ms idle (> ${heartbeatInterval * 2}ms)`,
        );
        await this.onDegrade(device, `Heartbeat timeout: ${timeSinceLastComm}ms idle`);
      }
    }
  }
}
