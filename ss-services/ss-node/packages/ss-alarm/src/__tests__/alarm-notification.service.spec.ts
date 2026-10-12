// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @ss-node/ss-core — EventBusService + StructuredLogger
// ============================================================
jest.mock('@ss-node/ss-core', () => ({
  EventBusService: class {
    emit = jest.fn();
  },
  EventBusModule: class {},
  StructuredLogger: class {
    setContext() {}
    log() {}
    warn() {}
    error() {}
    debug() {}
    verbose() {}
  },
}));

import { AlarmNotificationService, NotificationPayload } from '../alarm-notification.service';

// ============================================================
// Mock EventBusService
// ============================================================
class MockEventBusService {
  emit = jest.fn();
}

// ============================================================
// Factory helpers
// ============================================================
function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    alarmId: 'alarm-001',
    ruleName: '温度过高',
    level: 'WARNING',
    message: '温度值 95 超过阈值 80',
    value: 95,
    timestamp: new Date('2025-01-01T10:00:00Z'),
    channels: ['email', 'sound', 'popup', 'sms', 'webhook'],
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================
describe('AlarmNotificationService', () => {
  let service: AlarmNotificationService;
  let mockEventBus: MockEventBusService;

  beforeEach(() => {
    mockEventBus = new MockEventBusService();
    service = new AlarmNotificationService(mockEventBus as any);
  });

  // ==================== TC-ALM-100: configureChannel ====================
  describe('configureChannel', () => {
    it('TC-ALM-100: should configure an existing channel', () => {
      service.configureChannel('email', {
        enabled: true,
        config: {
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          from: 'alert@example.com',
          to: ['admin@example.com'],
        },
      });

      const channels = service.getChannels();
      const emailChannel = channels.find((c) => c.type === 'email');
      expect(emailChannel).toBeDefined();
      expect(emailChannel!.enabled).toBe(true);
      expect(emailChannel!.config.smtpHost).toBe('smtp.example.com');
    });

    it('TC-ALM-101: should not throw when configuring unknown channel type', () => {
      service.configureChannel('unknown', { enabled: true });
      // Unknown channel type - channel not found, silently ignored
      const channels = service.getChannels();
      expect(channels).toHaveLength(7);
    });
  });

  // ==================== TC-ALM-102: getChannels ====================
  describe('getChannels', () => {
    it('TC-ALM-102: should return all 7 channels', () => {
      const channels = service.getChannels();
      expect(channels).toHaveLength(7);
      expect(channels.map((c) => c.type)).toEqual([
        'email',
        'sound',
        'popup',
        'sms',
        'tts',
        'webhook',
        'wechatSubscribe',
      ]);
    });

    it('should return a copy of channels array', () => {
      const channels1 = service.getChannels();
      const channels2 = service.getChannels();
      expect(channels1).not.toBe(channels2);
      expect(channels1).toEqual(channels2);
    });
  });

  // ==================== TC-ALM-103: getEnabledChannels ====================
  describe('getEnabledChannels', () => {
    it('TC-ALM-103: should return only enabled channels', () => {
      const enabled = service.getEnabledChannels();
      expect(enabled).toContain('sound');
      expect(enabled).toContain('popup');
      expect(enabled).not.toContain('email');
      expect(enabled).not.toContain('sms');
      expect(enabled).not.toContain('webhook');
    });

    it('should reflect channel configuration changes', () => {
      service.configureChannel('email', { enabled: true });
      const enabled = service.getEnabledChannels();
      expect(enabled).toContain('email');
    });
  });

  // ==================== TC-ALM-104: sendNotification ====================
  describe('sendNotification', () => {
    it('TC-ALM-104: should send notification to enabled channels and emit event', async () => {
      const payload = makePayload({ channels: ['sound', 'popup'] });

      await service.sendNotification(payload);

      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.notification.sent', {
        alarmId: 'alarm-001',
        channels: ['sound', 'popup'],
        timestamp: expect.any(Number),
      });
    });

    it('TC-ALM-105: should dispatch email notification when email channel is enabled', async () => {
      service.configureChannel('email', {
        enabled: true,
        config: {
          smtpHost: 'smtp.test.com',
          smtpPort: 587,
          from: 'alert@test.com',
          to: ['admin@test.com'],
        },
      });
      const payload = makePayload({ channels: ['email'] });

      await service.sendNotification(payload);

      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.notification.sent', {
        alarmId: 'alarm-001',
        channels: ['email'],
        timestamp: expect.any(Number),
      });
    });

    it('TC-ALM-106: should dispatch sound notification', async () => {
      const payload = makePayload({ channels: ['sound'] });

      await service.sendNotification(payload);

      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.sound.trigger', {
        alarmId: 'alarm-001',
        level: 'WARNING',
        config: { volume: 0.8, repeat: 3 },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.notification.sent', {
        alarmId: 'alarm-001',
        channels: ['sound'],
        timestamp: expect.any(Number),
      });
    });

    it('TC-ALM-107: should dispatch popup notification', async () => {
      const payload = makePayload({ channels: ['popup'] });

      await service.sendNotification(payload);

      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.popup.show', {
        alarmId: 'alarm-001',
        ruleName: '温度过高',
        level: 'WARNING',
        message: '温度值 95 超过阈值 80',
        value: 95,
        timestamp: payload.timestamp,
        config: { duration: 10000, requireAck: true },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('alarm.notification.sent', {
        alarmId: 'alarm-001',
        channels: ['popup'],
        timestamp: expect.any(Number),
      });
    });
  });

  // ==================== Error handling ====================
  describe('error handling', () => {
    it('TC-ALM-108: should handle errors gracefully when channel dispatch fails', async () => {
      const payload = makePayload({ channels: ['sound'] });
      // sound channel should succeed even if eventBus throws
      mockEventBus.emit = jest.fn().mockImplementation((event: string) => {
        if (event === 'alarm.sound.trigger') {
          throw new Error('Sound dispatch failed');
        }
      });

      // Should not throw - errors are caught in sendNotification
      await expect(service.sendNotification(payload)).resolves.toBeUndefined();
    });
  });
});
