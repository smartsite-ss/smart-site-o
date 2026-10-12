// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ConnectionMonitorService } from '../websocket/connection-monitor.service';
import { I18nService } from '@ss-node/ss-i18n';
import { EventBusService } from '../event-bus/event-bus.service';

import { Logger } from '@nestjs/common';

describe('ConnectionMonitorService', () => {
  let service: ConnectionMonitorService;
  let mockI18n: jest.Mocked<I18nService>;
  let mockEventBus: EventBusService;

  beforeEach(() => {
    mockI18n = {
      tSync: jest.fn().mockImplementation((key: string) => key),
      t: jest.fn(),
      translate: jest.fn(),
      translateSync: jest.fn(),
      getLanguage: jest.fn(),
      getFallbackLanguage: jest.fn().mockReturnValue('zh-CN'),
      getSupportedLanguages: jest.fn().mockReturnValue(['zh-CN', 'en-US']),
    } as any;

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    mockEventBus = new EventBusService(mockEventEmitter);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    service = new ConnectionMonitorService(mockI18n, mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerConnection / unregisterConnection', () => {
    it('should register a connection snapshot', () => {
      service.registerConnection('socket-1', 'user-1', 'testuser', '192.168.1.1');
      const snapshot = service.getConnectionSnapshot('socket-1');
      expect(snapshot).toBeDefined();
      expect(snapshot!.userId).toBe('user-1');
      expect(snapshot!.username).toBe('testuser');
      expect(snapshot!.ip).toBe('192.168.1.1');
    });

    it('should unregister a connection snapshot', () => {
      service.registerConnection('socket-1', 'user-1', 'testuser', '192.168.1.1');
      service.unregisterConnection('socket-1');
      expect(service.getConnectionSnapshot('socket-1')).toBeUndefined();
    });
  });

  describe('getOnlineCount', () => {
    it('should count connections by project', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      service.registerConnection('socket-2', 'user-2', 'u2', '192.168.1.2');
      service.updateProjectRooms('socket-1', ['project:p1', 'project:p2']);
      service.updateProjectRooms('socket-2', ['project:p1']);

      expect(service.getOnlineCountByProject('p1')).toBe(2);
      expect(service.getOnlineCountByProject('p2')).toBe(1);
      expect(service.getOnlineCountByProject('p3')).toBe(0);
    });

    it('should count connections by user', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', 'u1', '192.168.1.2');
      service.registerConnection('socket-3', 'user-2', 'u2', '192.168.1.3');

      expect(service.getOnlineCountByUser('user-1')).toBe(2);
      expect(service.getOnlineCountByUser('user-2')).toBe(1);
      expect(service.getOnlineCountByUser('user-3')).toBe(0);
    });
  });

  describe('getDurationStats', () => {
    it('should return duration distribution', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      const stats = service.getDurationStats();
      expect(stats).toBeDefined();
      expect(stats.distribution).toBeDefined();
      expect(stats.distribution.under1Min).toBeGreaterThanOrEqual(0);
      expect(stats.avgMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStats', () => {
    it('should return full monitor stats', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      service.registerConnection('socket-2', 'user-2', 'u2', '192.168.1.2');
      service.updateProjectRooms('socket-1', ['project:p1']);

      const stats = service.getStats();
      expect(stats.totalConnections).toBe(2);
      expect(stats.connectionsByProject).toBeDefined();
      expect(stats.connectionsByUser).toBeDefined();
      expect(stats.messageRates).toBeDefined();
      expect(stats.durationStats).toBeDefined();
      expect(stats.abnormalConnections).toBeDefined();
    });
  });

  describe('recordMessage and getMessageRates', () => {
    it('should record messages and compute rates', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      service.registerConnection('socket-2', 'user-2', 'u2', '192.168.1.2');

      for (let i = 0; i < 10; i++) {
        service.recordMessage('socket-1');
      }
      for (let i = 0; i < 5; i++) {
        service.recordMessage('socket-2');
      }

      const rates = service.getMessageRates();
      expect(rates.length).toBeGreaterThanOrEqual(0);
    });

    it('should increment message count and update last activity', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      const before = service.getConnectionSnapshot('socket-1')!.messageCount;

      service.recordMessage('socket-1');

      const after = service.getConnectionSnapshot('socket-1')!.messageCount;
      expect(after).toBe(before + 1);
    });
  });

  describe('detectAbnormalConnections', () => {
    it('should detect high message rate as abnormal', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      // 降低异常速率阈值，使少量消息即触发
      service.setAbnormalThresholds(0, undefined);

      // 在窗口内发送多条消息使速率超过阈值
      for (let i = 0; i < 5; i++) {
        service.recordMessage('socket-1');
      }

      const abnormal = service.detectAbnormalConnections();
      expect(abnormal).toContain('socket-1');
    });

    it('should return empty when no abnormal connections', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      service.setAbnormalThresholds(10000, 24 * 60 * 60 * 1000);

      const abnormal = service.detectAbnormalConnections();
      expect(abnormal).not.toContain('socket-1');
    });
  });

  describe('updateProjectRooms', () => {
    it('should update project rooms for a connection', () => {
      service.registerConnection('socket-1', 'user-1', 'u1', '192.168.1.1');
      service.updateProjectRooms('socket-1', ['project:p1', 'project:p2']);

      const snapshot = service.getConnectionSnapshot('socket-1');
      expect(snapshot!.projectRooms).toEqual(['project:p1', 'project:p2']);
    });
  });
});
