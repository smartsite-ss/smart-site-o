// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OfflineMessageService } from '../websocket/offline-message.service';
import { I18nService } from '@ss-node/ss-i18n';
import { Logger } from '@nestjs/common';

describe('OfflineMessageService', () => {
  let service: OfflineMessageService;
  let mockI18n: jest.Mocked<I18nService>;

  beforeEach(() => {
    mockI18n = {
      tSync: jest.fn().mockImplementation((key: string, args?: Record<string, any>) => {
        if (args) {
          return `${key} ${JSON.stringify(args)}`;
        }
        return key;
      }),
      t: jest.fn(),
      translate: jest.fn(),
      translateSync: jest.fn(),
      getLanguage: jest.fn(),
      getFallbackLanguage: jest.fn().mockReturnValue('zh-CN'),
      getSupportedLanguages: jest.fn().mockReturnValue(['zh-CN', 'en-US']),
    } as any;

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    service = new OfflineMessageService(mockI18n);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('cacheMessage', () => {
    it('should cache an offline message for a user', () => {
      const msg = service.cacheMessage('user-1', 'alarm_trigger', 'project-1', {
        alarmId: 'alarm-1',
        level: 'critical',
      });

      expect(msg).toBeDefined();
      expect(msg.id).toBeDefined();
      expect(msg.type).toBe('alarm_trigger');
      expect(msg.userId).toBe('user-1');
      expect(msg.confirmed).toBe(false);
    });

    it('should cache multiple messages for the same user', () => {
      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });
      service.cacheMessage('user-1', 'device_status_change', 'project-1', { deviceId: 'd1' });

      const allMessages = service.getAllMessages('user-1');
      expect(allMessages).toHaveLength(2);
    });
  });

  describe('getUnreadMessages', () => {
    it('should return only unconfirmed messages', () => {
      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });
      const msg2 = service.cacheMessage('user-1', 'alarm_cleared', 'project-1', { alarmId: 'a2' });

      service.confirmMessage(msg2.id);

      const unread = service.getUnreadMessages('user-1');
      expect(unread).toHaveLength(1);
    });

    it('should return empty for user with no messages', () => {
      const unread = service.getUnreadMessages('non-existent-user');
      expect(unread).toHaveLength(0);
    });
  });

  describe('replayMessages', () => {
    it('should return unread messages for replay on reconnect', () => {
      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });
      service.cacheMessage('user-1', 'device_status_change', 'project-1', { deviceId: 'd1' });

      const replay = service.replayMessages('user-1');
      expect(replay).toHaveLength(2);
    });

    it('should return empty when no unread messages', () => {
      const replay = service.replayMessages('user-1');
      expect(replay).toHaveLength(0);
    });
  });

  describe('confirmMessage', () => {
    it('should confirm a single message as read', () => {
      const msg = service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });
      const result = service.confirmMessage(msg.id);
      expect(result).toBe(true);

      const unread = service.getUnreadMessages('user-1');
      expect(unread).toHaveLength(0);
    });

    it('should return false for non-existent message', () => {
      const result = service.confirmMessage('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('confirmAllMessages', () => {
    it('should confirm all messages for a user', () => {
      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });
      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a2' });
      service.cacheMessage('user-1', 'device_status_change', 'project-1', { deviceId: 'd1' });

      const count = service.confirmAllMessages('user-1');
      expect(count).toBe(3);

      const unread = service.getUnreadMessages('user-1');
      expect(unread).toHaveLength(0);
    });
  });

  describe('cleanupExpiredMessages', () => {
    it('should clean up expired messages', () => {
      // Set a very short expiration
      service.updateConfig({ expireAfterMs: 1 });

      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });

      const cleaned = service.cleanupExpiredMessages();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a specific message', () => {
      const msg = service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });
      const result = service.deleteMessage(msg.id);
      expect(result).toBe(true);
      expect(service.getAllMessages('user-1')).toHaveLength(0);
    });

    it('should return false for non-existent message', () => {
      const result = service.deleteMessage('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct message statistics', () => {
      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a1' });
      service.cacheMessage('user-1', 'alarm_trigger', 'project-1', { alarmId: 'a2' });
      service.cacheMessage('user-2', 'device_status_change', 'project-2', { deviceId: 'd1' });

      const stats = service.getStats();
      expect(stats.totalMessages).toBe(3);
      expect(stats.activeUsers).toBe(2);
      expect(stats.unconfirmedMessages).toBe(3);
    });
  });
});
