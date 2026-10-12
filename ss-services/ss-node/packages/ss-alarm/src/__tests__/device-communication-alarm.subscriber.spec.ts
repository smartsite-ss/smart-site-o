// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @ss-node/ss-sdk
// ============================================================
jest.mock('@ss-node/ss-sdk', () => ({
  AlarmLevel: { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'critical' },
  AlarmStatus: {
    ACTIVE: 'active',
    ACKNOWLEDGED: 'acknowledged',
    CLEARED: 'cleared',
    SHELVED: 'shelved',
  },
  AlarmCondition: {},
  DataQuality: {},
  DeviceStatus: {
    OFFLINE: 'offline',
    CONNECTING: 'connecting',
    ONLINE: 'online',
    DEGRADED: 'degraded',
    ERROR: 'error',
  },
  DeviceType: {},
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

// ============================================================
// Mock @ss-node/ss-device
// ============================================================
jest.mock('@ss-node/ss-device', () => ({
  DataTag: class {},
  Device: class {},
  DeviceGroup: class {},
  DeviceModule: class {},
  DeviceService: class {},
  TagDataType: {},
  DeadbandMode: {},
  ConversionType: {},
}));

// ============================================================
// Mock @ss-node/ss-collector-sdk
// ============================================================
jest.mock('@ss-node/ss-collector-sdk', () => ({
  PluginRegistry: class {},
  PipelineModule: class {},
  PERSIST_WRITER: 'PERSIST_WRITER',
}));

import { DeviceCommunicationAlarmSubscriber } from '../engine/device-communication-alarm.subscriber';
import { AlarmRecord, AlarmStatus, AlarmLevel } from '../entities/alarm.entity';
import { Device } from '@ss-node/ss-device';
import { DeviceStatus } from '@ss-node/ss-sdk';

// ============================================================
// Tests
// ============================================================
describe('DeviceCommunicationAlarmSubscriber', () => {
  let subscriber: DeviceCommunicationAlarmSubscriber;
  let mockEventBus: any;
  let mockProjectDbService: any;
  let mockRecordRepo: any;
  let mockDeviceRepo: any;
  let eventHandler: ((event: any) => void) | null;

  beforeEach(() => {
    eventHandler = null;

    mockRecordRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockDeviceRepo = {
      findOne: jest.fn(),
    };

    mockEventBus = {
      on: jest.fn((event: string, handler: any) => {
        eventHandler = handler;
      }),
      off: jest.fn(),
      emit: jest.fn(),
    };

    mockProjectDbService = {
      getSystemDb: jest.fn().mockResolvedValue({
        getRepository: jest.fn((entity: any) => {
          if (entity === AlarmRecord) return mockRecordRepo;
          if (entity === Device) return mockDeviceRepo;
          return null;
        }),
      }),
    };

    subscriber = new DeviceCommunicationAlarmSubscriber(mockEventBus, mockProjectDbService);
  });

  describe('onModuleInit', () => {
    it('TC-ALM-COMM-001: should subscribe to device:statusChanged events', () => {
      subscriber.onModuleInit();
      expect(mockEventBus.on).toHaveBeenCalledWith('device:statusChanged', expect.any(Function));
    });

    it('TC-ALM-COMM-002: should not subscribe when eventBus is missing', () => {
      const sub = new DeviceCommunicationAlarmSubscriber(undefined, mockProjectDbService);
      sub.onModuleInit();
      // no crash expected
    });
  });

  describe('handleDeviceStatusChanged — device offline', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-COMM-003: should create communication alarm when device goes offline', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null); // no existing alarm
      // L3 重构后设备实体字段为 deviceName(不再是 name),mock 需与之对齐
      mockDeviceRepo.findOne.mockResolvedValue({ id: 'dev-001', deviceName: '泵站A' });
      const savedRecord = { id: 'comm-offline-dev-001' };
      mockRecordRepo.create.mockReturnValue(savedRecord);
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      expect(mockProjectDbService.getSystemDb).toHaveBeenCalledWith('proj-001');
      expect(mockRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'comm-offline-dev-001',
          projectId: 'proj-001',
          ruleId: null,
          deviceId: 'dev-001',
          deviceName: '泵站A',
          triggerValue: 'offline',
          level: AlarmLevel.ERROR,
          status: AlarmStatus.ACTIVE,
          alarmType: 'communication',
          dispositionType: 'alarm.triggered',
        }),
      );
      expect(mockRecordRepo.save).toHaveBeenCalled();
    });

    it('TC-ALM-COMM-004: should emit alarm_triggered event when device goes offline', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);
      // L3 重构后设备实体字段为 deviceName(不再是 name),mock 需与之对齐
      mockDeviceRepo.findOne.mockResolvedValue({ id: 'dev-001', deviceName: '泵站A' });
      mockRecordRepo.create.mockReturnValue({});
      mockRecordRepo.save.mockResolvedValue({});

      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: 1700000000000,
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'alarm_triggered',
        expect.objectContaining({
          alarmId: 'comm-offline-dev-001',
          projectId: 'proj-001',
          deviceId: 'dev-001',
          level: AlarmLevel.ERROR,
        }),
      );
    });

    it('TC-ALM-COMM-005: should skip when alarm already exists (dedup)', async () => {
      const existingRecord = {
        id: 'comm-offline-dev-001',
        status: AlarmStatus.ACTIVE,
      };
      mockRecordRepo.findOne.mockResolvedValue(existingRecord);

      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      expect(mockRecordRepo.create).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('TC-ALM-COMM-006: should use deviceId as deviceName when device lookup fails', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);
      mockDeviceRepo.findOne.mockRejectedValue(new Error('Device not found'));
      mockRecordRepo.create.mockReturnValue({});
      mockRecordRepo.save.mockResolvedValue({});

      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      expect(mockRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceName: 'dev-001',
          message: '设备通讯中断: dev-001',
        }),
      );
    });
  });

  describe('handleDeviceStatusChanged — device online (recovery)', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-COMM-007: should clear communication alarm when device comes online', async () => {
      const existingRecord = {
        id: 'comm-offline-dev-001',
        status: AlarmStatus.ACTIVE,
        clearedAt: null,
        clearedBy: null,
        dispositionType: 'alarm.triggered',
      };
      mockRecordRepo.findOne.mockResolvedValue(existingRecord);

      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.ONLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: Date.now(),
      });

      expect(existingRecord.status).toBe(AlarmStatus.CLEARED);
      expect(existingRecord.clearedBy).toBe('system');
      expect(existingRecord.dispositionType).toBe('alarm.cleared');
      expect(mockRecordRepo.save).toHaveBeenCalledWith(existingRecord);
    });

    it('TC-ALM-COMM-008: should emit alarm.cleared event when device recovers', async () => {
      const existingRecord = {
        id: 'comm-offline-dev-001',
        status: AlarmStatus.ACTIVE,
        dispositionType: 'alarm.triggered',
      };
      mockRecordRepo.findOne.mockResolvedValue(existingRecord);
      mockRecordRepo.save.mockResolvedValue(existingRecord);

      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.ONLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: 1700000000000,
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'alarm.cleared',
        expect.objectContaining({
          alarmId: 'comm-offline-dev-001',
          projectId: 'proj-001',
          deviceId: 'dev-001',
        }),
      );
    });

    it('TC-ALM-COMM-009: should skip clearing when no active alarm exists', async () => {
      mockRecordRepo.findOne.mockResolvedValue(null);

      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.ONLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: Date.now(),
      });

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleDeviceStatusChanged — non-offline transitions', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-COMM-010: should not create alarm for connecting status', async () => {
      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.CONNECTING,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });

      expect(mockProjectDbService.getSystemDb).not.toHaveBeenCalled();
    });

    it('TC-ALM-COMM-011: should not create alarm when already offline', async () => {
      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.OFFLINE,
        timestamp: Date.now(),
      });

      expect(mockProjectDbService.getSystemDb).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-COMM-012: should handle DB errors gracefully', async () => {
      mockProjectDbService.getSystemDb.mockRejectedValue(new Error('DB connection failed'));

      // Should not throw
      await eventHandler!({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });
    });

    it('TC-ALM-COMM-013: should skip when projectDbService is missing', async () => {
      const sub = new DeviceCommunicationAlarmSubscriber(mockEventBus, undefined);
      sub.onModuleInit();

      // Capture the handler registered by this subscriber
      const handler = mockEventBus.on.mock.calls.find(
        (c: any[]) => c[0] === 'device:statusChanged',
      )?.[1];
      // Should not throw
      await handler?.({
        deviceId: 'dev-001',
        projectId: 'proj-001',
        status: DeviceStatus.OFFLINE,
        previousStatus: DeviceStatus.ONLINE,
        timestamp: Date.now(),
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('TC-ALM-COMM-014: should unsubscribe from device:statusChanged events', () => {
      subscriber.onModuleInit();
      subscriber.onModuleDestroy();
      expect(mockEventBus.off).toHaveBeenCalledWith('device:statusChanged', expect.any(Function));
    });
  });
});
