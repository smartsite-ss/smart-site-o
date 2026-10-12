// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Optional, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventBusService, ProjectDatabaseService } from '@ss-node/ss-core';
import { DeviceStatus } from '@ss-node/ss-sdk';
import { AlarmRecord, AlarmStatus, AlarmLevel } from '../entities/alarm.entity';
import { Device } from '@ss-node/ss-device';

/**
 * 设备通讯告警订阅器
 *
 * 监听 device:statusChanged 事件：
 * - 设备变为 OFFLINE → 自动产生通信告警（alarmType='communication'）
 * - 设备变为 ONLINE  → 自动清除对应的通信告警
 *
 * 与 DeviceOfflineSuppressionService 互补：
 * - 抑制服务管「已有告警的静默」（设备离线时抑制该设备的业务告警）
 * - 本订阅器管「通信告警的产生」（设备离线本身作为一种告警）
 *
 * 告警 ID 格式：`comm-offline-${deviceId}`（确定性 ID，便于恢复时查找清除）
 */
@Injectable()
export class DeviceCommunicationAlarmSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceCommunicationAlarmSubscriber.name);
  private readonly handler: (event: any) => void;

  constructor(
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly projectDbService?: ProjectDatabaseService,
  ) {
    this.handler = this.handleDeviceStatusChanged.bind(this);
  }

  onModuleInit(): void {
    if (this.eventBus) {
      this.eventBus.on('device:statusChanged', this.handler);
      this.logger.log(
        'DeviceCommunicationAlarmSubscriber initialized — listening for device:statusChanged',
      );
    }
  }

  onModuleDestroy(): void {
    if (this.eventBus) {
      this.eventBus.off('device:statusChanged', this.handler);
    }
  }

  /**
   * 处理设备状态变更事件
   */
  private async handleDeviceStatusChanged(event: {
    deviceId: string;
    projectId: string;
    status: string;
    previousStatus?: string;
    errorMessage?: string;
    timestamp: number;
  }): Promise<void> {
    const { status, previousStatus } = event;

    // 设备变为离线 → 产生通信告警
    if (status === DeviceStatus.OFFLINE && previousStatus !== DeviceStatus.OFFLINE) {
      await this.triggerCommunicationAlarm(event);
    }

    // 设备恢复在线 → 清除通信告警
    if (status === DeviceStatus.ONLINE && previousStatus === DeviceStatus.OFFLINE) {
      await this.clearCommunicationAlarm(event);
    }
  }

  /**
   * 设备离线 → 创建通信告警
   */
  private async triggerCommunicationAlarm(event: {
    deviceId: string;
    projectId: string;
    errorMessage?: string;
    timestamp: number;
  }): Promise<void> {
    if (!this.projectDbService || !event.projectId || !event.deviceId) {
      this.logger.warn(
        `Skipped communication alarm: projectDbService=${!!this.projectDbService} ` +
          `projectId=${event.projectId} deviceId=${event.deviceId}`,
      );
      return;
    }

    const alarmId = `comm-offline-${event.deviceId}`;

    try {
      const ds = await this.projectDbService.getSystemDb(event.projectId);
      const repo = ds.getRepository(AlarmRecord);

      // 去重：已存在同 ID 的活跃告警则跳过
      const existing = await repo.findOne({
        where: { id: alarmId, projectId: event.projectId, status: AlarmStatus.ACTIVE },
      });
      if (existing) {
        this.logger.debug(`Communication alarm ${alarmId} already active, skipping`);
        return;
      }

      // 查找设备名称
      let deviceName = event.deviceId;
      try {
        const deviceRepo = ds.getRepository(Device);
        const device = await deviceRepo.findOne({ where: { id: event.deviceId } });
        if (device?.deviceName) deviceName = device.deviceName;
      } catch {
        // 查找设备名称失败不阻断告警创建
      }

      const message = event.errorMessage
        ? `设备通讯中断: ${deviceName} (${event.errorMessage})`
        : `设备通讯中断: ${deviceName}`;

      // 创建告警记录
      const record = repo.create({
        id: alarmId,
        projectId: event.projectId,
        ruleId: null,
        deviceId: event.deviceId,
        deviceName,
        tagId: null,
        tagName: null,
        message,
        triggerValue: 'offline',
        level: AlarmLevel.ERROR,
        status: AlarmStatus.ACTIVE,
        alarmType: 'communication',
        dispositionType: 'alarm.triggered',
      });
      await repo.save(record);

      // 触发 alarm_triggered 事件 → DataPushBridge WebSocket 实时推送
      this.eventBus?.emit('alarm_triggered', {
        alarmId,
        tagId: '',
        deviceId: event.deviceId,
        projectId: event.projectId,
        level: AlarmLevel.ERROR,
        message,
        timestamp: event.timestamp,
      });

      this.logger.warn(
        `Communication alarm triggered: deviceId=${event.deviceId} alarmId=${alarmId}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to trigger communication alarm: ${error.message}`);
    }
  }

  /**
   * 设备恢复在线 → 清除通信告警
   */
  private async clearCommunicationAlarm(event: {
    deviceId: string;
    projectId: string;
    timestamp: number;
  }): Promise<void> {
    if (!this.projectDbService || !event.projectId || !event.deviceId) {
      return;
    }

    const alarmId = `comm-offline-${event.deviceId}`;

    try {
      const ds = await this.projectDbService.getSystemDb(event.projectId);
      const repo = ds.getRepository(AlarmRecord);

      const record = await repo.findOne({
        where: { id: alarmId, projectId: event.projectId },
      });
      if (!record || record.status === AlarmStatus.CLEARED) {
        return;
      }

      record.status = AlarmStatus.CLEARED;
      record.clearedAt = new Date();
      record.clearedBy = 'system';
      record.dispositionType = 'alarm.cleared';
      await repo.save(record);

      // 触发 alarm.cleared 事件
      this.eventBus?.emit('alarm.cleared', {
        alarmId,
        projectId: event.projectId,
        deviceId: event.deviceId,
        timestamp: event.timestamp,
      });

      this.logger.log(`Communication alarm cleared: deviceId=${event.deviceId} alarmId=${alarmId}`);
    } catch (error: any) {
      this.logger.error(`Failed to clear communication alarm: ${error.message}`);
    }
  }
}
