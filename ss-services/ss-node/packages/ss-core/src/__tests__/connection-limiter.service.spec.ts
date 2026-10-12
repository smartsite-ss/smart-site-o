// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ConnectionLimiterService } from '../websocket/connection-limiter.service';
import { I18nService } from '@ss-node/ss-i18n';
import { Logger } from '@nestjs/common';

describe('ConnectionLimiterService', () => {
  let service: ConnectionLimiterService;
  let mockI18n: jest.Mocked<I18nService>;

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

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    service = new ConnectionLimiterService(mockI18n);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerConnection', () => {
    it('should allow connection within limits', () => {
      const result = service.registerConnection('socket-1', 'user-1', '192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject when user exceeds max connections per user', () => {
      // Register 5 connections for the same user (default max is 5)
      for (let i = 0; i < 5; i++) {
        service.registerConnection(`socket-u${i}`, 'user-1', `192.168.1.${i}`);
      }

      const result = service.registerConnection('socket-overflow', 'user-1', '192.168.1.100');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject when IP exceeds max connections per IP', () => {
      // Register 10 connections from the same IP (default max is 10)
      for (let i = 0; i < 10; i++) {
        service.registerConnection(`socket-ip${i}`, `user-ip${i}`, '10.0.0.1');
      }

      const result = service.registerConnection('socket-ip-overflow', 'user-new', '10.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow anonymous connections (no userId)', () => {
      const result = service.registerConnection('socket-anon', undefined, '192.168.1.50');
      expect(result.allowed).toBe(true);
    });

    it('should reject when global max connections exceeded', () => {
      service.updateConfig({ maxGlobalConnections: 2 });
      service.registerConnection('socket-g1', 'user-1', '10.0.0.1');
      service.registerConnection('socket-g2', 'user-2', '10.0.0.2');

      const result = service.registerConnection('socket-g3', 'user-3', '10.0.0.3');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject when global max connections exceeded (edge: exactly at limit)', () => {
      service.updateConfig({ maxGlobalConnections: 1 });
      service.registerConnection('socket-g1', 'user-1', '10.0.0.1');

      const result = service.registerConnection('socket-g2', 'user-2', '10.0.0.2');
      expect(result.allowed).toBe(false);
    });
  });

  describe('unregisterConnection', () => {
    it('should clean up user and IP indexes on disconnect', () => {
      service.registerConnection('socket-1', 'user-1', '192.168.1.1');
      expect(service.getUserConnectionCount('user-1')).toBe(1);
      expect(service.getIpConnectionCount('192.168.1.1')).toBe(1);

      service.unregisterConnection('socket-1');
      expect(service.getUserConnectionCount('user-1')).toBe(0);
      expect(service.getIpConnectionCount('192.168.1.1')).toBe(0);
    });

    it('should handle unregistering non-existent connection gracefully', () => {
      expect(() => service.unregisterConnection('non-existent')).not.toThrow();
    });
  });

  describe('checkIdleConnections', () => {
    it('should return empty when no idle connections', () => {
      service.registerConnection('socket-1', 'user-1', '192.168.1.1');
      const idle = service.checkIdleConnections();
      expect(idle).toHaveLength(0);
    });

    it('should detect idle connections after idle timeout exceeded', () => {
      service.registerConnection('socket-1', 'user-1', '192.168.1.1');
      // 缩短空闲超时为 1 分钟，并伪造一条很久之前的活动记录
      service.updateConfig({ idleTimeoutMinutes: 1 });
      const record = service.getConnection('socket-1');
      expect(record).toBeDefined();
      (record as any).lastActivityAt = Date.now() - 2 * 60 * 1000; // 2 分钟前

      const idle = service.checkIdleConnections();
      expect(idle).toContain('socket-1');
    });

    it('should keep connection alive when business activity recorded', () => {
      service.updateConfig({ idleTimeoutMinutes: 1 });
      service.registerConnection('socket-1', 'user-1', '192.168.1.1');
      const record = service.getConnection('socket-1');
      (record as any).lastActivityAt = Date.now() - 2 * 60 * 1000;

      // 记录业务活动刷新 lastActivityAt
      service.recordActivity('socket-1');
      const idle = service.checkIdleConnections();
      expect(idle).not.toContain('socket-1');
    });
  });

  describe('updateConfig / getConfig', () => {
    it('should update and return config', () => {
      service.updateConfig({ maxConnectionsPerUser: 10, idleTimeoutMinutes: 60 });
      const config = service.getConfig();
      expect(config.maxConnectionsPerUser).toBe(10);
      expect(config.idleTimeoutMinutes).toBe(60);
      expect(config.maxGlobalConnections).toBe(1000); // unchanged
    });
  });

  describe('getStats', () => {
    it('should return correct connection statistics', () => {
      service.registerConnection('socket-1', 'user-1', '192.168.1.1');
      service.registerConnection('socket-2', 'user-1', '192.168.1.2');
      service.registerConnection('socket-3', 'user-2', '192.168.1.1');

      const stats = service.getStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.uniqueIps).toBe(2);
    });
  });
});
