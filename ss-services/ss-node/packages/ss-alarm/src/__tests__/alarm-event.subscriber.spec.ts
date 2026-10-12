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
  DeviceStatus: {},
  DeviceType: {},
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

// ============================================================
// Mock @ss-node/ss-device — entity 文件中 import DataTag 需要
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
// Mock @ss-node/ss-collector-sdk — device module 链式依赖
// ============================================================
jest.mock('@ss-node/ss-collector-sdk', () => ({
  PluginRegistry: class {},
  PipelineModule: class {},
  PERSIST_WRITER: 'PERSIST_WRITER',
}));

import { AlarmEventSubscriber } from '../alarm-event.subscriber';
import { AlarmRule, AlarmRecord, AlarmStatus } from '../entities/alarm.entity';

// ============================================================
// Tests
// ============================================================
describe('AlarmEventSubscriber', () => {
  let subscriber: AlarmEventSubscriber;
  let mockEventBus: any;
  let mockProjectDbService: any;
  let mockRecordRepo: any;
  let mockRuleRepo: any;
  let eventHandler: ((event: any) => void) | null;

  beforeEach(() => {
    eventHandler = null;

    mockRecordRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockRuleRepo = {
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
          if (entity === AlarmRule) return mockRuleRepo;
          if (entity === AlarmRecord) return mockRecordRepo;
          return null;
        }),
      }),
    };

    subscriber = new AlarmEventSubscriber(mockEventBus, mockProjectDbService);
  });

  describe('onModuleInit', () => {
    it('TC-ALM-EVT-001: should subscribe to alarm_triggered events', () => {
      subscriber.onModuleInit();
      expect(mockEventBus.on).toHaveBeenCalledWith('alarm_triggered', expect.any(Function));
    });

    it('TC-ALM-EVT-002: should not subscribe when eventBus is missing', () => {
      const sub = new AlarmEventSubscriber(undefined, mockProjectDbService);
      sub.onModuleInit();
      // no crash expected
    });
  });

  describe('handleAlarmTriggered', () => {
    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-EVT-003: should create new AlarmRecord when no matching rule', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);
      mockRecordRepo.findOne.mockResolvedValue(null);
      const savedRecord = {
        id: 'rec-001',
        projectId: 'proj-001',
        level: 'warning',
        status: 'active',
      };
      mockRecordRepo.create.mockReturnValue(savedRecord);
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      const event = {
        tagId: 'tag-001',
        deviceId: 'dev-001',
        projectId: 'proj-001',
        condition: { severity: 'warning', type: 'limit' },
        value: 95,
        message: 'Temperature too high',
      };

      await eventHandler!(event);

      expect(mockProjectDbService.getSystemDb).toHaveBeenCalledWith('proj-001');
      expect(mockRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-001',
          ruleId: null,
          level: 'warning',
          message: 'Temperature too high',
          triggerValue: '95',
          status: AlarmStatus.ACTIVE,
          // limit 类型 → alarmType 自动映射为 overlimit
          alarmType: 'overlimit',
          // 产生时处置类型初始化为 alarm.triggered
          dispositionType: 'alarm.triggered',
        }),
      );
      expect(mockRecordRepo.save).toHaveBeenCalled();
    });

    it('TC-ALM-EVT-004: should create record with ruleId when matching rule found', async () => {
      const rule = { id: 'rule-001', tagId: 'tag-001', projectId: 'proj-001', alarmType: 'device' };
      mockRuleRepo.findOne.mockResolvedValue(rule);
      mockRecordRepo.findOne.mockResolvedValue(null);
      const savedRecord = { id: 'rec-001', projectId: 'proj-001' };
      mockRecordRepo.create.mockReturnValue(savedRecord);
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      const event = {
        tagId: 'tag-001',
        projectId: 'proj-001',
        condition: { severity: 'critical' },
        value: 100,
        message: 'Critical alarm',
      };

      await eventHandler!(event);

      expect(mockRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-001',
          level: 'critical',
          // 告警类型从匹配规则复制
          alarmType: 'device',
          dispositionType: 'alarm.triggered',
        }),
      );
    });

    it('TC-ALM-EVT-005: should update existing record instead of creating duplicate', async () => {
      const rule = { id: 'rule-001', tagId: 'tag-001', projectId: 'proj-001' };
      mockRuleRepo.findOne.mockResolvedValue(rule);
      const existingRecord = {
        id: 'rec-001',
        ruleId: 'rule-001',
        projectId: 'proj-001',
        status: 'active',
        triggerValue: 80,
        message: 'Old message',
        dispositionType: 'alarm.acknowledged',
      };
      mockRecordRepo.findOne.mockResolvedValue(existingRecord);

      const event = {
        tagId: 'tag-001',
        projectId: 'proj-001',
        condition: { severity: 'warning' },
        value: 95,
        message: 'New message',
      };

      await eventHandler!(event);

      expect(existingRecord.triggerValue).toBe('95');
      expect(existingRecord.message).toBe('New message');
      // 重新触发时重置处置类型为 alarm.triggered
      expect(existingRecord.dispositionType).toBe('alarm.triggered');
      expect(mockRecordRepo.save).toHaveBeenCalledWith(existingRecord);
      expect(mockRecordRepo.create).not.toHaveBeenCalled();
    });

    it('TC-ALM-EVT-006: should skip when projectId is missing', async () => {
      await eventHandler!({ tagId: 'tag-001' });
      expect(mockProjectDbService.getSystemDb).not.toHaveBeenCalled();
    });

    it('TC-ALM-EVT-007: should skip when projectDbService is missing', async () => {
      const sub = new AlarmEventSubscriber(mockEventBus, undefined);
      sub.onModuleInit();
      // Should not crash
    });

    it('TC-ALM-EVT-008: should handle errors gracefully', async () => {
      mockProjectDbService.getSystemDb.mockRejectedValue(new Error('DB connection failed'));

      const event = {
        tagId: 'tag-001',
        projectId: 'proj-001',
        condition: { severity: 'warning' },
        value: 95,
        message: 'Test',
      };

      // Should not throw
      await eventHandler!(event);
    });

    it('TC-ALM-EVT-009: should default to warning level when severity is missing', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);
      mockRecordRepo.findOne.mockResolvedValue(null);
      const savedRecord = { id: 'rec-001' };
      mockRecordRepo.create.mockReturnValue(savedRecord);
      mockRecordRepo.save.mockResolvedValue(savedRecord);

      const event = {
        tagId: 'tag-001',
        projectId: 'proj-001',
        value: 50,
        message: 'No condition',
      };

      await eventHandler!(event);

      expect(mockRecordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'warning' }),
      );
    });

    it('TC-ALM-EVT-011: should skip when alarmId already exists (system subscriber dedup)', async () => {
      // Simulate a record already created by DeviceCommunicationAlarmSubscriber
      const existingRecord = {
        id: 'comm-offline-dev-001',
        projectId: 'proj-001',
        status: AlarmStatus.ACTIVE,
        alarmType: 'communication',
      };
      mockRuleRepo.findOne.mockResolvedValue(null); // no matching rule
      mockRecordRepo.findOne.mockResolvedValue(existingRecord); // record already exists by alarmId

      const event = {
        alarmId: 'comm-offline-dev-001',
        tagId: '',
        deviceId: 'dev-001',
        projectId: 'proj-001',
        level: 'error',
        message: '设备通讯中断: dev-001',
        timestamp: Date.now(),
      };

      await eventHandler!(event);

      // Should NOT create or save (skip duplicate persistence)
      expect(mockRecordRepo.create).not.toHaveBeenCalled();
      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('TC-ALM-EVT-010: should unsubscribe from alarm_triggered events', () => {
      subscriber.onModuleDestroy();
      expect(mockEventBus.off).toHaveBeenCalledWith('alarm_triggered', expect.any(Function));
    });
  });
});
