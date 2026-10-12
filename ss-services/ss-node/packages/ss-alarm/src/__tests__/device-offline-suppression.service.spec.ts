// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @ss-node/ss-core — EventBusService
// ============================================================
const mockEventBusOn = jest.fn();
const mockEventBusEmit = jest.fn();

jest.mock('@ss-node/ss-core', () => ({
  EventBusService: jest.fn().mockImplementation(() => ({
    on: mockEventBusOn,
    emit: mockEventBusEmit,
    removeAllListeners: jest.fn(),
  })),
}));

// ============================================================
// Mock @ss-node/ss-sdk
// ============================================================
jest.mock('@ss-node/ss-sdk', () => ({
  DeviceStatus: {
    OFFLINE: 'offline',
    CONNECTING: 'connecting',
    ONLINE: 'online',
    DEGRADED: 'degraded',
    ERROR: 'error',
  },
}));

import { DeviceOfflineSuppressionService } from '../engine/device-offline-suppression.service';
import { AlarmSuppressionService } from '../engine/alarm-suppression.service';
import { EventBusService } from '@ss-node/ss-core';
import { DeviceStatus } from '@ss-node/ss-sdk';

describe('DeviceOfflineSuppressionService', () => {
  let service: DeviceOfflineSuppressionService;
  let eventBus: EventBusService;
  let suppressionService: AlarmSuppressionService;

  beforeEach(() => {
    jest.clearAllMocks();

    // @ts-expect-error - EventBusService is mocked via jest.mock, constructor args not needed at runtime
    eventBus = new EventBusService();
    suppressionService = new AlarmSuppressionService();
    service = new DeviceOfflineSuppressionService(eventBus, suppressionService);
  });

  describe('initialization', () => {
    it('should subscribe to device:statusChanged on init', () => {
      service.onModuleInit();
      expect(mockEventBusOn).toHaveBeenCalledWith('device:statusChanged', expect.any(Function));
    });
  });

  describe('device offline → suppression', () => {
    it('should suppress alarms when device goes offline', () => {
      service.onModuleInit();

      // 获取注册的回调函数
      const callback = mockEventBusOn.mock.calls[0][1];

      // 模拟设备离线事件
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      expect(service.isDeviceSuppressed('device-001')).toBe(true);
      expect(service.getSuppressedDevices()).toContain('device-001');
    });

    it('should not duplicate suppression for same device', () => {
      service.onModuleInit();
      const callback = mockEventBusOn.mock.calls[0][1];

      // 两次离线事件
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: Date.now(),
      });

      expect(service.getSuppressedDevices()).toHaveLength(1);
    });

    it('should not suppress when transitioning from non-OFFLINE to OFFLINE if already OFFLINE', () => {
      service.onModuleInit();
      const callback = mockEventBusOn.mock.calls[0][1];

      // 设备已经离线，再次收到离线事件（previousStatus=OFFLINE）
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: Date.now(),
      });

      // 不应该创建抑制规则（因为 previousStatus 已经是 OFFLINE）
      expect(service.isDeviceSuppressed('device-001')).toBe(false);
    });
  });

  describe('device online → release suppression', () => {
    it('should release suppression when device comes back online', () => {
      service.onModuleInit();
      const callback = mockEventBusOn.mock.calls[0][1];

      // 先离线
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });
      expect(service.isDeviceSuppressed('device-001')).toBe(true);

      // 再上线
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.ONLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: Date.now(),
      });
      expect(service.isDeviceSuppressed('device-001')).toBe(false);
      expect(service.getSuppressedDevices()).toHaveLength(0);
    });

    it('should not release suppression when transition is not from OFFLINE to ONLINE', () => {
      service.onModuleInit();
      const callback = mockEventBusOn.mock.calls[0][1];

      // 先离线
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });
      expect(service.isDeviceSuppressed('device-001')).toBe(true);

      // 从 CONNECTING 到 ONLINE — 不应该解除抑制
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.ONLINE,
        previousStatus: DeviceStatus.CONNECTING,
        timestamp: Date.now(),
      });
      expect(service.isDeviceSuppressed('device-001')).toBe(true);
    });
  });

  describe('multiple devices', () => {
    it('should handle multiple devices independently', () => {
      service.onModuleInit();
      const callback = mockEventBusOn.mock.calls[0][1];

      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      callback({
        deviceId: 'device-002',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      expect(service.getSuppressedDevices()).toHaveLength(2);
      expect(service.isDeviceSuppressed('device-001')).toBe(true);
      expect(service.isDeviceSuppressed('device-002')).toBe(true);

      // 只恢复 device-001
      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.ONLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: Date.now(),
      });

      expect(service.getSuppressedDevices()).toHaveLength(1);
      expect(service.isDeviceSuppressed('device-001')).toBe(false);
      expect(service.isDeviceSuppressed('device-002')).toBe(true);
    });
  });

  describe('manual release', () => {
    it('should allow manual release of device suppression', () => {
      service.onModuleInit();
      const callback = mockEventBusOn.mock.calls[0][1];

      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      const result = service.releaseDevice('device-001');
      expect(result).toBe(true);
      expect(service.isDeviceSuppressed('device-001')).toBe(false);
    });

    it('should return false when releasing non-suppressed device', () => {
      const result = service.releaseDevice('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clear all suppression on destroy', () => {
      service.onModuleInit();
      const callback = mockEventBusOn.mock.calls[0][1];

      callback({
        deviceId: 'device-001',
        projectId: 'project-1',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      service.onModuleDestroy();
      expect(service.getSuppressedDevices()).toHaveLength(0);
    });
  });
});
