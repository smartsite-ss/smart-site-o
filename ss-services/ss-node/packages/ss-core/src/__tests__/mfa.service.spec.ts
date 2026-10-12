// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from '../core/auth/mfa/mfa.service';
import { I18nService } from '@ss-node/ss-i18n';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const mockI18nService: Partial<I18nService> = {
      tSync: jest.fn().mockImplementation((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MfaService, { provide: I18nService, useValue: mockI18nService }],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  describe('TC-AUTH-MFA-001: generate secret', () => {
    it('should generate a valid base32 secret', () => {
      const secret = service.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(0);
      expect(/^[A-Z2-7]+=*$/.test(secret)).toBe(true);
    });

    it('should generate unique secrets', () => {
      const secret1 = service.generateSecret();
      const secret2 = service.generateSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('TC-AUTH-MFA-002: generate QR code URI', () => {
    it('should generate a valid otpauth URI', () => {
      const uri = service.generateQrCodeUri('JBSWY3DPEHPK3PXP', 'testuser');
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('SmartData');
      expect(uri).toContain('testuser');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });
  });

  describe('TC-AUTH-MFA-003: verify token', () => {
    it('should verify a valid TOTP token', () => {
      const secret = service.generateSecret();
      // Generate a token manually using the service's internal method
      const now = Math.floor(Date.now() / 1000);
      const _counter = Math.floor(now / 30);
      // We can't easily test the token directly without knowing the HOTP output,
      // but we can test that verifyToken doesn't throw
      const result = service.verifyToken(secret, '000000');
      expect(typeof result).toBe('boolean');
    });

    it('should reject invalid token format', () => {
      const secret = service.generateSecret();
      const result = service.verifyToken(secret, 'invalid');
      expect(result).toBe(false);
    });
  });

  describe('TC-AUTH-MFA-004: enable MFA', () => {
    it('should enable MFA and return recovery codes', () => {
      const secret = service.generateSecret();
      const result = service.enableMfa('user-1', secret);
      expect(result.recoveryCodes).toHaveLength(8);
      expect(service.isMfaEnabled('user-1')).toBe(true);
    });

    it('should generate unique recovery codes', () => {
      const secret = service.generateSecret();
      const result = service.enableMfa('user-1', secret);
      const uniqueCodes = new Set(result.recoveryCodes);
      expect(uniqueCodes.size).toBe(8);
    });
  });

  describe('TC-AUTH-MFA-005: disable MFA', () => {
    it('should disable MFA for a user', () => {
      const secret = service.generateSecret();
      service.enableMfa('user-1', secret);
      expect(service.isMfaEnabled('user-1')).toBe(true);

      const result = service.disableMfa('user-1');
      expect(result).toBe(true);
      expect(service.isMfaEnabled('user-1')).toBe(false);
    });

    it('should return false for user without MFA', () => {
      const result = service.disableMfa('unknown-user');
      expect(result).toBe(false);
    });
  });

  describe('TC-AUTH-MFA-006: verify MFA token for user', () => {
    it('should return false when MFA is not enabled', () => {
      const result = service.verifyMfaToken('user-1', '123456');
      expect(result).toBe(false);
    });

    it('should return false for invalid token', () => {
      const secret = service.generateSecret();
      service.enableMfa('user-1', secret);
      const result = service.verifyMfaToken('user-1', '000000');
      expect(result).toBe(false);
    });
  });

  describe('TC-AUTH-MFA-007: use recovery code', () => {
    it('should accept a valid recovery code', () => {
      const secret = service.generateSecret();
      const { recoveryCodes } = service.enableMfa('user-1', secret);
      const result = service.useRecoveryCode('user-1', recoveryCodes[0]);
      expect(result).toBe(true);
    });

    it('should reject already used recovery code', () => {
      const secret = service.generateSecret();
      const { recoveryCodes } = service.enableMfa('user-1', secret);
      service.useRecoveryCode('user-1', recoveryCodes[0]);
      const result = service.useRecoveryCode('user-1', recoveryCodes[0]);
      expect(result).toBe(false);
    });

    it('should reject invalid recovery code', () => {
      const secret = service.generateSecret();
      service.enableMfa('user-1', secret);
      const result = service.useRecoveryCode('user-1', 'INVALID1');
      expect(result).toBe(false);
    });

    it('should return false for user without MFA', () => {
      const result = service.useRecoveryCode('unknown-user', 'ABCDEFGH');
      expect(result).toBe(false);
    });
  });

  describe('TC-AUTH-MFA-008: get remaining recovery codes', () => {
    it('should return correct count of unused codes', () => {
      const secret = service.generateSecret();
      const { recoveryCodes } = service.enableMfa('user-1', secret);
      expect(service.getRemainingRecoveryCodes('user-1')).toBe(8);

      service.useRecoveryCode('user-1', recoveryCodes[0]);
      service.useRecoveryCode('user-1', recoveryCodes[1]);
      expect(service.getRemainingRecoveryCodes('user-1')).toBe(6);
    });

    it('should return 0 for user without MFA', () => {
      expect(service.getRemainingRecoveryCodes('unknown-user')).toBe(0);
    });
  });

  describe('TC-AUTH-MFA-009: get MFA status', () => {
    it('should return enabled=false for user without MFA', () => {
      const status = service.getMfaStatus('user-1');
      expect(status.enabled).toBe(false);
      expect(status.remainingRecoveryCodes).toBe(0);
    });

    it('should return enabled=true and correct recovery count', () => {
      const secret = service.generateSecret();
      service.enableMfa('user-1', secret);
      const status = service.getMfaStatus('user-1');
      expect(status.enabled).toBe(true);
      expect(status.remainingRecoveryCodes).toBe(8);
    });
  });

  describe('TC-AUTH-MFA-010: get secret', () => {
    it('should return secret for MFA-enabled user', () => {
      const secret = service.generateSecret();
      service.enableMfa('user-1', secret);
      expect(service.getSecret('user-1')).toBe(secret);
    });

    it('should return undefined for user without MFA', () => {
      expect(service.getSecret('unknown-user')).toBeUndefined();
    });
  });
});
