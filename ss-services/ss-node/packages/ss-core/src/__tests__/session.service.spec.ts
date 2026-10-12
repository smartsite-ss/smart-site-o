// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../core/auth/session/session.service';
import { I18nService } from '@ss-node/ss-i18n';

describe('SessionService', () => {
  let service: SessionService;
  let mockI18nService: Partial<I18nService>;

  beforeEach(async () => {
    mockI18nService = {
      tSync: jest.fn().mockImplementation((key: string) => {
        if (key === 'auth.session.anomaly_new_ip') return 'Login from new IP address';
        return key;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService, { provide: I18nService, useValue: mockI18nService }],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  describe('TC-AUTH-SESSION-001: create session', () => {
    it('should create a session with userId, ip and userAgent', () => {
      const session = service.createSession('user-1', '192.168.1.1', 'Mozilla/5.0');
      expect(session).toBeDefined();
      expect(session.userId).toBe('user-1');
      expect(session.ip).toBe('192.168.1.1');
      expect(session.userAgent).toBe('Mozilla/5.0');
      expect(session.id).toBeDefined();
      expect(session.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should create multiple sessions for the same user', () => {
      const s1 = service.createSession('user-1', '192.168.1.1', 'Chrome');
      const s2 = service.createSession('user-1', '10.0.0.1', 'Firefox');
      expect(s1.id).not.toBe(s2.id);
      const sessions = service.getUserSessions('user-1');
      expect(sessions).toHaveLength(2);
    });
  });

  describe('TC-AUTH-SESSION-002: get user sessions', () => {
    it('should return all sessions for a user', () => {
      service.createSession('user-1', '192.168.1.1', 'Chrome');
      service.createSession('user-1', '10.0.0.1', 'Firefox');
      service.createSession('user-2', '172.16.0.1', 'Safari');

      const user1Sessions = service.getUserSessions('user-1');
      const user2Sessions = service.getUserSessions('user-2');

      expect(user1Sessions).toHaveLength(2);
      expect(user2Sessions).toHaveLength(1);
      expect(user2Sessions[0].userId).toBe('user-2');
    });

    it('should return empty array for unknown user', () => {
      const sessions = service.getUserSessions('unknown-user');
      expect(sessions).toEqual([]);
    });
  });

  describe('TC-AUTH-SESSION-003: get session by id', () => {
    it('should return session by id', () => {
      const session = service.createSession('user-1', '192.168.1.1', 'Chrome');
      const found = service.getSession(session.id);
      expect(found).toBeDefined();
      expect(found!.userId).toBe('user-1');
    });

    it('should return undefined for unknown session id', () => {
      const found = service.getSession('unknown-id');
      expect(found).toBeUndefined();
    });
  });

  describe('TC-AUTH-SESSION-004: force logout session', () => {
    it('should remove session and update user sessions', () => {
      const session = service.createSession('user-1', '192.168.1.1', 'Chrome');
      const result = service.forceLogout(session.id);
      expect(result).toBe(true);
      expect(service.getSession(session.id)).toBeUndefined();
      expect(service.getUserSessions('user-1')).toEqual([]);
    });

    it('should return false for unknown session id', () => {
      const result = service.forceLogout('unknown-id');
      expect(result).toBe(false);
    });
  });

  describe('TC-AUTH-SESSION-005: logout all except current', () => {
    it('should logout all other sessions', () => {
      const s1 = service.createSession('user-1', '192.168.1.1', 'Chrome');
      const s2 = service.createSession('user-1', '10.0.0.1', 'Firefox');
      const s3 = service.createSession('user-1', '172.16.0.1', 'Safari');

      const count = service.logoutAllExcept('user-1', s1.id);
      expect(count).toBe(2);
      expect(service.getSession(s1.id)).toBeDefined();
      expect(service.getSession(s2.id)).toBeUndefined();
      expect(service.getSession(s3.id)).toBeUndefined();
    });
  });

  describe('TC-AUTH-SESSION-006: update activity', () => {
    it('should update lastActivity timestamp', () => {
      const session = service.createSession('user-1', '192.168.1.1', 'Chrome');
      const originalActivity = session.lastActivity;

      // 全局 fake timers 下 setTimeout 不会触发，改用 advanceTimersByTime 推进时钟
      jest.advanceTimersByTime(10);
      service.updateActivity(session.id);

      const updated = service.getSession(session.id);
      expect(updated!.lastActivity).toBeGreaterThan(originalActivity);
    });

    it('should not throw for unknown session id', () => {
      expect(() => service.updateActivity('unknown-id')).not.toThrow();
    });
  });

  describe('TC-AUTH-SESSION-007: record login history', () => {
    it('should record successful login', () => {
      service.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      const history = service.getLoginHistory('user-1');
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
      expect(history[0].ip).toBe('192.168.1.1');
    });

    it('should record failed login', () => {
      service.recordLoginHistory('user-1', '10.0.0.1', 'Firefox', false);
      const history = service.getLoginHistory('user-1');
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
    });

    it('should limit history to MAX_LOGIN_HISTORY entries', () => {
      for (let i = 0; i < 25; i++) {
        service.recordLoginHistory('user-1', `192.168.1.${i}`, 'Chrome', true);
      }
      const history = service.getLoginHistory('user-1');
      expect(history.length).toBeLessThanOrEqual(20);
    });
  });

  describe('TC-AUTH-SESSION-008: anomaly detection', () => {
    it('should not flag first login as anomalous', () => {
      const result = service.checkAnomaly('user-1', '192.168.1.1', 'Chrome');
      expect(result.isAnomalous).toBe(false);
    });

    it('should flag login from new IP as anomalous', () => {
      service.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      const result = service.checkAnomaly('user-1', '10.0.0.1', 'Chrome');
      expect(result.isAnomalous).toBe(true);
      expect(result.reason).toBe('Login from new IP address');
    });

    it('should not flag login from known IP', () => {
      service.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      service.recordLoginHistory('user-1', '10.0.0.1', 'Firefox', true);
      const result = service.checkAnomaly('user-1', '192.168.1.1', 'Chrome');
      expect(result.isAnomalous).toBe(false);
    });
  });

  describe('TC-AUTH-SESSION-009: get known IPs', () => {
    it('should return unique known IPs from successful logins', () => {
      service.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      service.recordLoginHistory('user-1', '10.0.0.1', 'Firefox', true);
      service.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      service.recordLoginHistory('user-1', '172.16.0.1', 'Safari', false);

      const ips = service.getKnownIps('user-1');
      expect(ips).toHaveLength(2);
      expect(ips).toContain('192.168.1.1');
      expect(ips).toContain('10.0.0.1');
      expect(ips).not.toContain('172.16.0.1');
    });
  });

  describe('TC-AUTH-SESSION-010: cleanup expired sessions', () => {
    it('should cleanup sessions with expired activity', () => {
      const session = service.createSession('user-1', '192.168.1.1', 'Chrome');
      // Force session to be expired by manipulating lastActivity
      const s = service.getSession(session.id);
      if (s) {
        s.lastActivity = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      }
      const count = service.cleanupExpired();
      expect(count).toBe(1);
      expect(service.getSession(session.id)).toBeUndefined();
    });

    it('should not cleanup active sessions', () => {
      service.createSession('user-1', '192.168.1.1', 'Chrome');
      const count = service.cleanupExpired();
      expect(count).toBe(0);
      expect(service.getUserSessions('user-1')).toHaveLength(1);
    });
  });

  describe('TC-AUTH-SESSION-011: active session count', () => {
    it('should return correct active session count', () => {
      expect(service.getActiveSessionCount()).toBe(0);
      service.createSession('user-1', '192.168.1.1', 'Chrome');
      service.createSession('user-2', '10.0.0.1', 'Firefox');
      expect(service.getActiveSessionCount()).toBe(2);
    });
  });
});
