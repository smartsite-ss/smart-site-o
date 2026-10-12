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

import { AlarmNotificationSubscriber } from '../engine/alarm-notification.subscriber';

// ============================================================
// Tests
// ============================================================
describe('AlarmNotificationSubscriber', () => {
  let subscriber: AlarmNotificationSubscriber;
  let mockEventBus: any;
  let mockNotificationService: any;
  let ruleResolvedHandler: ((event: any) => void) | null;
  let escalatedHandler: ((event: any) => void) | null;

  beforeEach(() => {
    ruleResolvedHandler = null;
    escalatedHandler = null;

    mockEventBus = {
      on: jest.fn().mockImplementation((evt: string, h: any) => {
        if (evt === 'alarm.rule_resolved') ruleResolvedHandler = h;
        if (evt === 'alarm.escalated') escalatedHandler = h;
      }),
      off: jest.fn(),
      emit: jest.fn(),
    };

    mockNotificationService = {
      getEnabledChannels: jest.fn().mockReturnValue(['sound', 'popup']),
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    subscriber = new AlarmNotificationSubscriber(mockEventBus, mockNotificationService);
  });

  // ----------------------------------------------------------
  // onModuleInit / onModuleDestroy
  // ----------------------------------------------------------
  describe('onModuleInit', () => {
    it('TC-ALM-NOTSUB-001: should subscribe to alarm.rule_resolved + alarm.escalated', () => {
      subscriber.onModuleInit();
      expect(mockEventBus.on).toHaveBeenCalledWith('alarm.rule_resolved', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('alarm.escalated', expect.any(Function));
    });

    it('TC-ALM-NOTSUB-002: should not subscribe when eventBus is missing', () => {
      subscriber = new AlarmNotificationSubscriber(undefined, mockNotificationService);
      expect(() => subscriber.onModuleInit()).not.toThrow();
      expect(mockEventBus.on).not.toHaveBeenCalled();
    });

    it('TC-ALM-NOTSUB-003: should not subscribe when notificationService is missing', () => {
      subscriber = new AlarmNotificationSubscriber(mockEventBus, undefined);
      subscriber.onModuleInit();
      expect(mockEventBus.on).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('TC-ALM-NOTSUB-004: should unsubscribe from both events', () => {
      subscriber.onModuleInit();
      subscriber.onModuleDestroy();
      expect(mockEventBus.off).toHaveBeenCalledWith('alarm.rule_resolved', expect.any(Function));
      expect(mockEventBus.off).toHaveBeenCalledWith('alarm.escalated', expect.any(Function));
    });
  });

  // ----------------------------------------------------------
  // handleAlarmRuleResolved (P1-4: pre-resolved rule data)
  // ----------------------------------------------------------
  describe('handleAlarmRuleResolved', () => {
    const baseEvent = {
      alarmId: 'alarm-001',
      tagId: 'tag-001',
      deviceId: 'dev-001',
      projectId: 'proj-001',
      level: 'warning',
      message: '温度值 95 超过阈值 80',
      value: 95,
      timestamp: Date.now(),
      rule: {
        id: 'rule-001',
        name: '温度过高',
        alarmType: 'data',
        notifyChannels: ['sound', 'sms'],
      },
    };

    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-NOTSUB-005: should use rule notifyChannels &cap; enabled channels', async () => {
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound', 'popup']);

      await ruleResolvedHandler!(baseEvent);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmId: 'alarm-001',
          ruleName: '温度过高',
          level: 'warning',
          message: '温度值 95 超过阈值 80',
          value: 95,
          channels: ['sound'],
        }),
      );
    });

    it('TC-ALM-NOTSUB-006: should fallback to global enabled channels when rule has no notifyChannels', async () => {
      const event = {
        ...baseEvent,
        rule: { ...baseEvent.rule, notifyChannels: [] },
      };
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound', 'popup']);

      await ruleResolvedHandler!(event);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ channels: ['sound', 'popup'] }),
      );
    });

    it('TC-ALM-NOTSUB-007: should use global channels for system-generated alarm (rule=null)', async () => {
      const event = { ...baseEvent, rule: null };
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound', 'popup']);

      await ruleResolvedHandler!(event);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmId: 'alarm-001',
          ruleName: '温度值 95 超过阈值 80',
          level: 'warning',
          channels: ['sound', 'popup'],
        }),
      );
    });

    it('TC-ALM-NOTSUB-008: should skip when no enabled channels', async () => {
      mockNotificationService.getEnabledChannels.mockReturnValue([]);

      await ruleResolvedHandler!(baseEvent);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('TC-ALM-NOTSUB-009: should skip when rule channels have no intersection with enabled', async () => {
      const event = {
        ...baseEvent,
        rule: { ...baseEvent.rule, notifyChannels: ['sms', 'tts'] },
      };
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound', 'popup']);

      await ruleResolvedHandler!(event);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('TC-ALM-NOTSUB-010: should handle errors gracefully without throwing', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(new Error('notify failed'));
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound']);

      await expect(ruleResolvedHandler!(baseEvent)).resolves.not.toThrow();
    });

    it('TC-ALM-NOTSUB-011: should use rule.name as ruleName when available', async () => {
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound']);

      await ruleResolvedHandler!(baseEvent);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ ruleName: '温度过高' }),
      );
    });

    it('TC-ALM-NOTSUB-012: should fallback to message when ruleName is empty', async () => {
      const event = {
        ...baseEvent,
        rule: { ...baseEvent.rule, name: '' },
      };
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound']);

      await ruleResolvedHandler!(event);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ ruleName: '温度值 95 超过阈值 80' }),
      );
    });
  });

  // ----------------------------------------------------------
  // handleAlarmEscalated (P1-4: no rule query, fallback to global channels)
  // ----------------------------------------------------------
  describe('handleAlarmEscalated', () => {
    const escalationEvent = {
      recordId: 'rec-001',
      projectId: 'proj-001',
      ruleId: 'rule-001',
      deviceId: 'dev-001',
      fromLevel: 'warning',
      toLevel: 'error',
      message: '温度值 95 超过阈值 80',
      escalationChain: ['warning', 'error'],
      timestamp: Date.now(),
    };

    beforeEach(() => {
      subscriber.onModuleInit();
    });

    it('TC-ALM-NOTSUB-013: should dispatch escalation notification with global channels', async () => {
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound', 'popup']);

      await escalatedHandler!(escalationEvent);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmId: 'rec-001',
          ruleName: '告警升级',
          level: 'error',
          message: '[升级 warning→error] 温度值 95 超过阈值 80',
          channels: ['sound', 'popup'],
        }),
      );
    });

    it('TC-ALM-NOTSUB-014: should skip escalation notification when no enabled channels', async () => {
      mockNotificationService.getEnabledChannels.mockReturnValue([]);

      await escalatedHandler!(escalationEvent);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('TC-ALM-NOTSUB-015: should handle escalation errors gracefully', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(new Error('notify failed'));
      mockNotificationService.getEnabledChannels.mockReturnValue(['sound']);

      await expect(escalatedHandler!(escalationEvent)).resolves.not.toThrow();
    });
  });
});
