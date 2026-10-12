// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SessionService } from '../core/auth/session/session.service';
import { MfaService } from '../core/auth/mfa/mfa.service';

// Mock the I18nService
const mockI18nService = {
  tSync: jest.fn().mockReturnValue('Login from new IP address'),
};

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionService = new SessionService(mockI18nService as any);
  });

  // ============================================================
  // TC-AUTH-300: create session for a user
  // ============================================================
  describe('TC-AUTH-300: create session', () => {
    it('should create a session and return session info', () => {
      const session = sessionService.createSession('user-1', '192.168.1.1', 'Chrome/100');
      expect(session).toBeDefined();
      expect(session.id).toBeTruthy();
      expect(session.userId).toBe('user-1');
      expect(session.ip).toBe('192.168.1.1');
      expect(session.userAgent).toBe('Chrome/100');
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActivity).toBe(session.createdAt);
    });
  });

  // ============================================================
  // TC-AUTH-301: get user sessions
  // ============================================================
  describe('TC-AUTH-301: get user sessions', () => {
    it('should return all sessions for a user', () => {
      sessionService.createSession('user-1', '192.168.1.1', 'Chrome');
      sessionService.createSession('user-1', '10.0.0.1', 'Firefox');
      sessionService.createSession('user-2', '172.16.0.1', 'Safari');

      const sessions = sessionService.getUserSessions('user-1');
      expect(sessions.length).toBe(2);
      expect(sessions[0].userId).toBe('user-1');
      expect(sessions[1].userId).toBe('user-1');

      const otherSessions = sessionService.getUserSessions('user-2');
      expect(otherSessions.length).toBe(1);
    });

    it('should return empty array for user with no sessions', () => {
      const sessions = sessionService.getUserSessions('nonexistent');
      expect(sessions).toEqual([]);
    });
  });

  // ============================================================
  // TC-AUTH-302: force logout a session
  // ============================================================
  describe('TC-AUTH-302: force logout session', () => {
    it('should remove the session when force logout', () => {
      const session = sessionService.createSession('user-1', '192.168.1.1', 'Chrome');
      expect(sessionService.getSession(session.id)).toBeDefined();

      const result = sessionService.forceLogout(session.id);
      expect(result).toBe(true);
      expect(sessionService.getSession(session.id)).toBeUndefined();
      expect(sessionService.getUserSessions('user-1')).toEqual([]);
    });

    it('should return false for non-existent session', () => {
      const result = sessionService.forceLogout('non-existent');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // TC-AUTH-303: logout all except current session
  // ============================================================
  describe('TC-AUTH-303: logout all except current', () => {
    it('should logout all other sessions and keep the current one', () => {
      const _s1 = sessionService.createSession('user-1', '192.168.1.1', 'Chrome');
      const s2 = sessionService.createSession('user-1', '10.0.0.1', 'Firefox');
      const _s3 = sessionService.createSession('user-1', '172.16.0.1', 'Safari');

      const count = sessionService.logoutAllExcept('user-1', s2.id);
      expect(count).toBe(2);

      const remaining = sessionService.getUserSessions('user-1');
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(s2.id);
    });
  });

  // ============================================================
  // TC-AUTH-304: record and retrieve login history
  // ============================================================
  describe('TC-AUTH-304: login history', () => {
    it('should record and retrieve login history', () => {
      sessionService.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      sessionService.recordLoginHistory('user-1', '10.0.0.1', 'Firefox', false);

      const history = sessionService.getLoginHistory('user-1');
      expect(history.length).toBe(2);
      expect(history[0].success).toBe(false); // most recent first
      expect(history[1].success).toBe(true);
    });

    it('should limit history to 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        sessionService.recordLoginHistory('user-1', `192.168.1.${i}`, 'Chrome', true);
      }

      const history = sessionService.getLoginHistory('user-1');
      expect(history.length).toBe(20);
    });
  });

  // ============================================================
  // TC-AUTH-305: update session activity
  // ============================================================
  describe('TC-AUTH-305: update session activity', () => {
    it('should update lastActivity timestamp', () => {
      const session = sessionService.createSession('user-1', '192.168.1.1', 'Chrome');
      const original = session.lastActivity;

      // Wait a tiny bit
      const before = Date.now();
      sessionService.updateActivity(session.id);
      const after = Date.now();

      const updated = sessionService.getSession(session.id);
      expect(updated!.lastActivity).toBeGreaterThanOrEqual(original);
      expect(updated!.lastActivity).toBeGreaterThanOrEqual(before);
      expect(updated!.lastActivity).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================
  // TC-AUTH-306: cleanup expired sessions
  // ============================================================
  describe('TC-AUTH-306: cleanup expired sessions', () => {
    it('should remove sessions that have been inactive for 24 hours', () => {
      const session = sessionService.createSession('user-1', '192.168.1.1', 'Chrome');

      // Manually set lastActivity to 25 hours ago
      const sessionData = (sessionService as any).sessions.get(session.id);
      sessionData.lastActivity = Date.now() - 25 * 60 * 60 * 1000;

      const count = sessionService.cleanupExpired();
      expect(count).toBe(1);
      expect(sessionService.getSession(session.id)).toBeUndefined();
    });

    it('should not remove active sessions', () => {
      sessionService.createSession('user-1', '192.168.1.1', 'Chrome');
      const count = sessionService.cleanupExpired();
      expect(count).toBe(0);
      expect(sessionService.getUserSessions('user-1').length).toBe(1);
    });
  });

  // ============================================================
  // TC-AUTH-307: get known IPs for a user
  // ============================================================
  describe('TC-AUTH-307: get known IPs', () => {
    it('should return unique IPs from successful login history', () => {
      sessionService.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      sessionService.recordLoginHistory('user-1', '10.0.0.1', 'Firefox', true);
      sessionService.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true); // duplicate
      sessionService.recordLoginHistory('user-1', '172.16.0.1', 'Safari', false); // failed

      const ips = sessionService.getKnownIps('user-1');
      expect(ips.length).toBe(2);
      expect(ips).toContain('192.168.1.1');
      expect(ips).toContain('10.0.0.1');
      expect(ips).not.toContain('172.16.0.1');
    });
  });

  // ============================================================
  // TC-AUTH-308: active session count
  // ============================================================
  describe('TC-AUTH-308: active session count', () => {
    it('should return correct count of active sessions', () => {
      expect(sessionService.getActiveSessionCount()).toBe(0);

      sessionService.createSession('user-1', '192.168.1.1', 'Chrome');
      sessionService.createSession('user-2', '10.0.0.1', 'Firefox');
      sessionService.createSession('user-1', '172.16.0.1', 'Safari');

      expect(sessionService.getActiveSessionCount()).toBe(3);
    });
  });

  // ============================================================
  // TC-AUTH-309: get session by ID
  // ============================================================
  describe('TC-AUTH-309: get session by ID', () => {
    it('should return session for valid ID', () => {
      const session = sessionService.createSession('user-1', '192.168.1.1', 'Chrome');
      const found = sessionService.getSession(session.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(session.id);
    });

    it('should return undefined for invalid ID', () => {
      const found = sessionService.getSession('invalid-id');
      expect(found).toBeUndefined();
    });
  });
});

describe('MfaService', () => {
  let mfaService: MfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mfaService = new MfaService(mockI18nService as any);
  });

  // ============================================================
  // TC-AUTH-400: generate TOTP secret
  // ============================================================
  describe('TC-AUTH-400: generate TOTP secret', () => {
    it('should generate a valid base32 secret', () => {
      const secret = mfaService.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(0);
      // Should only contain base32 characters
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    });

    it('should generate unique secrets', () => {
      const secret1 = mfaService.generateSecret();
      const secret2 = mfaService.generateSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  // ============================================================
  // TC-AUTH-401: generate QR code URI
  // ============================================================
  describe('TC-AUTH-401: generate QR code URI', () => {
    it('should generate a valid otpauth URI', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const uri = mfaService.generateQrCodeUri(secret, 'testuser');
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('testuser');
      expect(uri).toContain(secret);
      expect(uri).toContain('issuer=SmartData');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });
  });

  // ============================================================
  // TC-AUTH-402: verify valid TOTP token
  // ============================================================
  describe('TC-AUTH-402: verify valid TOTP token', () => {
    it('should verify a valid token generated from the same secret', () => {
      const secret = mfaService.generateSecret();
      // Generate a token using the internal HOTP for the current time window
      const now = Math.floor(Date.now() / 1000);
      const counter = Math.floor(now / 30);
      const token = (mfaService as any).generateHotp(secret, counter);

      const result = mfaService.verifyToken(secret, token);
      expect(result).toBe(true);
    });
  });

  // ============================================================
  // TC-AUTH-403: reject invalid TOTP token
  // ============================================================
  describe('TC-AUTH-403: reject invalid TOTP token', () => {
    it('should reject an invalid token', () => {
      const secret = mfaService.generateSecret();
      const result = mfaService.verifyToken(secret, '000000');
      expect(result).toBe(false);
    });

    it('should reject token for different secret', () => {
      const secret1 = mfaService.generateSecret();
      const secret2 = mfaService.generateSecret();

      const now = Math.floor(Date.now() / 1000);
      const counter = Math.floor(now / 30);
      const token = (mfaService as any).generateHotp(secret1, counter);

      const result = mfaService.verifyToken(secret2, token);
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // TC-AUTH-404: enable MFA for a user
  // ============================================================
  describe('TC-AUTH-404: enable MFA', () => {
    it('should enable MFA and return recovery codes', () => {
      const secret = mfaService.generateSecret();
      const result = mfaService.enableMfa('user-1', secret);

      expect(result.recoveryCodes).toBeDefined();
      expect(result.recoveryCodes.length).toBe(8);
      expect(mfaService.isMfaEnabled('user-1')).toBe(true);
    });

    it('should generate 8 unique recovery codes', () => {
      const secret = mfaService.generateSecret();
      const result = mfaService.enableMfa('user-1', secret);
      const uniqueCodes = new Set(result.recoveryCodes);
      expect(uniqueCodes.size).toBe(8);
    });
  });

  // ============================================================
  // TC-AUTH-405: disable MFA
  // ============================================================
  describe('TC-AUTH-405: disable MFA', () => {
    it('should disable MFA for a user', () => {
      const secret = mfaService.generateSecret();
      mfaService.enableMfa('user-1', secret);
      expect(mfaService.isMfaEnabled('user-1')).toBe(true);

      const result = mfaService.disableMfa('user-1');
      expect(result).toBe(true);
      expect(mfaService.isMfaEnabled('user-1')).toBe(false);
    });

    it('should return false when disabling MFA for user without MFA', () => {
      const result = mfaService.disableMfa('user-2');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // TC-AUTH-406: verify TOTP token for MFA-enabled user
  // ============================================================
  describe('TC-AUTH-406: verify MFA token for user', () => {
    it('should verify token for MFA-enabled user', () => {
      const secret = mfaService.generateSecret();
      mfaService.enableMfa('user-1', secret);

      const now = Math.floor(Date.now() / 1000);
      const counter = Math.floor(now / 30);
      const token = (mfaService as any).generateHotp(secret, counter);

      const result = mfaService.verifyMfaToken('user-1', token);
      expect(result).toBe(true);
    });

    it('should reject token for non-MFA user', () => {
      const result = mfaService.verifyMfaToken('user-1', '123456');
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // TC-AUTH-407: use recovery code
  // ============================================================
  describe('TC-AUTH-407: use recovery code', () => {
    it('should accept a valid recovery code', () => {
      const secret = mfaService.generateSecret();
      const { recoveryCodes } = mfaService.enableMfa('user-1', secret);

      const success = mfaService.useRecoveryCode('user-1', recoveryCodes[0]);
      expect(success).toBe(true);
    });

    it('should reject an already used recovery code', () => {
      const secret = mfaService.generateSecret();
      const { recoveryCodes } = mfaService.enableMfa('user-1', secret);

      mfaService.useRecoveryCode('user-1', recoveryCodes[0]);
      const success = mfaService.useRecoveryCode('user-1', recoveryCodes[0]);
      expect(success).toBe(false);
    });

    it('should reject an invalid recovery code', () => {
      const secret = mfaService.generateSecret();
      mfaService.enableMfa('user-1', secret);

      const success = mfaService.useRecoveryCode('user-1', 'INVALID1');
      expect(success).toBe(false);
    });
  });

  // ============================================================
  // TC-AUTH-408: get MFA status
  // ============================================================
  describe('TC-AUTH-408: get MFA status', () => {
    it('should return disabled status for user without MFA', () => {
      const status = mfaService.getMfaStatus('user-1');
      expect(status.enabled).toBe(false);
      expect(status.remainingRecoveryCodes).toBe(0);
    });

    it('should return enabled status with remaining code count', () => {
      const secret = mfaService.generateSecret();
      mfaService.enableMfa('user-1', secret);

      const status = mfaService.getMfaStatus('user-1');
      expect(status.enabled).toBe(true);
      expect(status.remainingRecoveryCodes).toBe(8);

      // Use one code
      const { recoveryCodes } = mfaService.enableMfa('user-1', secret);
      mfaService.useRecoveryCode('user-1', recoveryCodes[0]);

      const status2 = mfaService.getMfaStatus('user-1');
      expect(status2.remainingRecoveryCodes).toBe(7);
    });
  });

  // ============================================================
  // TC-AUTH-409: get remaining recovery codes count
  // ============================================================
  describe('TC-AUTH-409: get remaining recovery codes', () => {
    it('should return correct count of unused recovery codes', () => {
      const secret = mfaService.generateSecret();
      const { recoveryCodes } = mfaService.enableMfa('user-1', secret);

      expect(mfaService.getRemainingRecoveryCodes('user-1')).toBe(8);

      mfaService.useRecoveryCode('user-1', recoveryCodes[0]);
      mfaService.useRecoveryCode('user-1', recoveryCodes[1]);
      mfaService.useRecoveryCode('user-1', recoveryCodes[2]);

      expect(mfaService.getRemainingRecoveryCodes('user-1')).toBe(5);
    });

    it('should return 0 for non-MFA user', () => {
      expect(mfaService.getRemainingRecoveryCodes('user-1')).toBe(0);
    });
  });
});

describe('AnomalyDetection', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionService = new SessionService(mockI18nService as any);
  });

  // ============================================================
  // TC-AUTH-500: detect new IP as anomalous
  // ============================================================
  describe('TC-AUTH-500: detect new IP as anomalous', () => {
    it('should detect login from new IP as anomalous', () => {
      // Record successful logins from known IPs
      sessionService.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);
      sessionService.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);

      // Check anomaly for new IP
      const result = sessionService.checkAnomaly('user-1', '10.0.0.99', 'Firefox');
      expect(result.isAnomalous).toBe(true);
      expect(result.reason).toBeTruthy();
    });
  });

  // ============================================================
  // TC-AUTH-501: known IP is not anomalous
  // ============================================================
  describe('TC-AUTH-501: known IP is not anomalous', () => {
    it('should not flag known IP as anomalous', () => {
      sessionService.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);

      const result = sessionService.checkAnomaly('user-1', '192.168.1.1', 'Firefox');
      expect(result.isAnomalous).toBe(false);
    });
  });

  // ============================================================
  // TC-AUTH-502: first login is not anomalous
  // ============================================================
  describe('TC-AUTH-502: first login is not anomalous', () => {
    it('should not flag first-time login as anomalous', () => {
      const result = sessionService.checkAnomaly('user-1', '192.168.1.1', 'Chrome');
      expect(result.isAnomalous).toBe(false);
    });
  });

  // ============================================================
  // TC-AUTH-503: only successful logins are considered for known IPs
  // ============================================================
  describe('TC-AUTH-503: only successful logins for known IPs', () => {
    it('should not consider failed login IPs as known', () => {
      // Record a successful login from known IP as baseline
      sessionService.recordLoginHistory('user-1', '192.168.1.1', 'Chrome', true);

      // Record failed login from a different IP
      sessionService.recordLoginHistory('user-1', '10.0.0.99', 'Chrome', false);

      // Check from the IP that only had failed login - should be anomalous
      const result = sessionService.checkAnomaly('user-1', '10.0.0.99', 'Firefox');
      expect(result.isAnomalous).toBe(true);
    });
  });
});
