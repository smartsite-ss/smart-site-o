// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventBusService } from '@ss-node/ss-core';
import { DeviceStatus } from '@ss-node/ss-sdk';
import { AlarmSuppressionService } from './alarm-suppression.service';

/**
 * 设备离线 → 报警级联抑制服务
 *
 * 监听 device:statusChanged 事件：
 * - 设备变为 OFFLINE → 自动创建 device_offline 抑制规则，抑制该设备所有报警
 * - 设备变为 ONLINE  → 自动解除抑制规则
 *
 * 这是 P0 优先级优化：防止设备离线后产生大量"通信失败"类报警淹没真正的业务报警。
 */
@Injectable()
export class DeviceOfflineSuppressionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceOfflineSuppressionService.name);

  /** deviceId → suppressionRuleId 映射，用于快速查找和解除 */
  private readonly deviceSuppressionMap = new Map<string, string>();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly suppressionService: AlarmSuppressionService,
  ) {}

  onModuleInit(): void {
    this.eventBus.on('device:statusChanged', this.handleDeviceStatusChanged.bind(this));
    this.logger.log(
      'DeviceOfflineSuppressionService initialized — listening for device:statusChanged',
    );
  }

  onModuleDestroy(): void {
    this.eventBus.removeAllListeners?.('device:statusChanged');
    this.deviceSuppressionMap.clear();
  }

  /**
   * 处理设备状态变更事件
   */
  private handleDeviceStatusChanged(event: {
    deviceId: string;
    projectId: string;
    status: DeviceStatus;
    previousStatus: DeviceStatus;
    timestamp: number;
  }): void {
    const { deviceId, status, previousStatus } = event;

    // 设备变为离线 → 创建抑制规则
    if (status === DeviceStatus.OFFLINE && previousStatus !== DeviceStatus.OFFLINE) {
      this.suppressDeviceAlarms(deviceId);
    }

    // 设备变为在线 → 解除抑制规则
    if (status === DeviceStatus.ONLINE && previousStatus === DeviceStatus.OFFLINE) {
      this.releaseDeviceAlarms(deviceId);
    }
  }

  /**
   * 创建设备离线抑制规则
   */
  private suppressDeviceAlarms(deviceId: string): void {
    // 避免重复创建
    if (this.deviceSuppressionMap.has(deviceId)) {
      return;
    }

    const ruleId = this.suppressionService.addSuppressionRule({
      id: `offline-${deviceId}`,
      type: 'device_offline',
      devices: [deviceId],
      createdAt: Date.now(),
      // 无过期时间：设备恢复 ONLINE 时手动解除
    });

    this.deviceSuppressionMap.set(deviceId, ruleId);
    this.logger.log(`Device ${deviceId} offline → alarms suppressed (rule: ${ruleId})`);
  }

  /**
   * 解除设备离线抑制规则
   */
  private releaseDeviceAlarms(deviceId: string): void {
    const ruleId = this.deviceSuppressionMap.get(deviceId);
    if (!ruleId) {
      return;
    }

    const removed = this.suppressionService.removeSuppressionRule(ruleId);
    this.deviceSuppressionMap.delete(deviceId);

    if (removed) {
      this.logger.log(`Device ${deviceId} online → alarm suppression released (rule: ${ruleId})`);
    }
  }

  /**
   * 获取当前被抑制的设备列表
   */
  getSuppressedDevices(): string[] {
    return Array.from(this.deviceSuppressionMap.keys());
  }

  /**
   * 检查指定设备是否被抑制
   */
  isDeviceSuppressed(deviceId: string): boolean {
    return this.deviceSuppressionMap.has(deviceId);
  }

  /**
   * 手动解除指定设备的抑制
   */
  releaseDevice(deviceId: string): boolean {
    const ruleId = this.deviceSuppressionMap.get(deviceId);
    if (!ruleId) return false;

    this.suppressionService.removeSuppressionRule(ruleId);
    this.deviceSuppressionMap.delete(deviceId);
    this.logger.log(`Device ${deviceId} suppression manually released`);
    return true;
  }
}
