// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AuthService } from '../core/auth/auth.service';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock the I18nService
const mockI18nService = {
  tSync: jest.fn().mockReturnValue('error message'),
};

// Mock the UserService
const mockUserService = {
  findByUsername: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  changePassword: jest.fn(),
};

// Mock JwtService
const mockJwtService = {
  sign: jest.fn(),
};

// Mock AuditLoggerService（S-M02: 审计日志，无需实际写入文件）
const mockAuditLoggerService = {
  logSecurityEvent: jest.fn(),
};

describe('AuthService - ChangePassword & LoginLockout', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockJwtService.sign.mockReturnValue('mock-token-value');
    mockI18nService.tSync.mockReturnValue('error message');

    authService = new AuthService(
      mockUserService as any,
      mockJwtService as any,
      mockI18nService as any,
      mockAuditLoggerService as any,
    );
  });

  // ============================================================
  // TC-AUTH-200: change password with valid old password
  // ============================================================
  describe('TC-AUTH-200: change password with valid old password', () => {
    it('should change password successfully with valid credentials', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);

      const dto = {
        oldPassword: 'oldPassword123',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      };

      const result = await authService.changePassword('user-1', dto);
      expect(result).toEqual({ message: '密码修改成功' });
      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'oldPassword123',
        'NewPass456',
      );
    });
  });

  // ============================================================
  // TC-AUTH-201: reject wrong old password
  // ============================================================
  describe('TC-AUTH-201: reject wrong old password', () => {
    it('should throw UnauthorizedException when old password is incorrect', async () => {
      mockUserService.changePassword.mockRejectedValue(new UnauthorizedException('当前密码不正确'));

      const dto = {
        oldPassword: 'wrongPassword',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ============================================================
  // TC-AUTH-202: reject weak new password
  // ============================================================
  describe('TC-AUTH-202: reject weak new password', () => {
    it('should reject password without letters', async () => {
      const dto = {
        oldPassword: 'oldPassword123',
        newPassword: '12345678',
        confirmPassword: '12345678',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject password without numbers', async () => {
      const dto = {
        oldPassword: 'oldPassword123',
        newPassword: 'abcdefgh',
        confirmPassword: 'abcdefgh',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject password shorter than 8 characters', async () => {
      const dto = {
        oldPassword: 'oldPassword123',
        newPassword: 'Ab1',
        confirmPassword: 'Ab1',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // TC-AUTH-203: reject password mismatch
  // ============================================================
  describe('TC-AUTH-203: reject password mismatch', () => {
    it('should throw BadRequestException when newPassword and confirmPassword do not match', async () => {
      const dto = {
        oldPassword: 'oldPassword123',
        newPassword: 'NewPass456',
        confirmPassword: 'DifferentPass789',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
      expect(mockUserService.changePassword).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TC-AUTH-204: verify all tokens revoked after password change
  // ============================================================
  describe('TC-AUTH-204: verify all tokens revoked after password change', () => {
    it('should revoke all refresh tokens for the user after password change', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);

      // generateTokens calls sign twice (access + refresh), so use a counter
      let callCount = 0;
      mockJwtService.sign.mockImplementation(() => `token-${++callCount}`);

      // Generate 2 tokens for user-1
      (authService as any).generateTokens({
        id: 'user-1',
        username: 'testuser',
        role: 'user',
      });
      (authService as any).generateTokens({
        id: 'user-1',
        username: 'testuser',
        role: 'user',
      });

      // Generate 1 token for user-2 (should not be revoked)
      (authService as any).generateTokens({
        id: 'user-2',
        username: 'otheruser',
        role: 'user',
      });

      // Verify tokens exist (3 refresh tokens: 2 for user-1, 1 for user-2)
      const store = (authService as any).refreshTokenStore;
      expect(store.size).toBe(3);

      // Change password for user-1
      const dto = {
        oldPassword: 'oldPassword123',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      };
      await authService.changePassword('user-1', dto);

      // user-1 tokens should be revoked, user-2 token should remain
      expect(store.size).toBe(1);
      for (const [, payload] of store.entries()) {
        expect(payload.userId).toBe('user-2');
      }
    });
  });

  // ============================================================
  // TC-AUTH-205: login with old password after change fails
  // ============================================================
  describe('TC-AUTH-205: login with old password after change fails', () => {
    it('should fail login with old password after password change', async () => {
      // Simulate: user has new password hash
      const newHash = await bcrypt.hash('NewPass456', 10);
      const _oldHash = await bcrypt.hash('OldPass123', 10);

      const user = {
        id: 'user-1',
        username: 'testuser',
        password: newHash,
        email: 'test@test.com',
        displayName: 'Test',
        role: 'user',
      };

      mockUserService.findByUsername.mockResolvedValue(user);

      await expect(
        authService.login({ username: 'testuser', password: 'OldPass123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================
  // TC-AUTH-206: login with new password after change succeeds
  // ============================================================
  describe('TC-AUTH-206: login with new password after change succeeds', () => {
    it('should succeed login with new password after password change', async () => {
      const newHash = await bcrypt.hash('NewPass456', 10);

      const user = {
        id: 'user-1',
        username: 'testuser',
        password: newHash,
        email: 'test@test.com',
        displayName: 'Test',
        role: 'user',
      };

      mockUserService.findByUsername.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.login({
        username: 'testuser',
        password: 'NewPass456',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.username).toBe('testuser');
    });
  });

  // ============================================================
  // TC-AUTH-210: login lockout after 5 failed attempts
  // ============================================================
  describe('TC-AUTH-210: login lockout after 5 failed attempts', () => {
    it('should lock account after 5 consecutive failed login attempts', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: hash,
        email: 'test@test.com',
        displayName: 'Test',
        role: 'user',
      };

      mockUserService.findByUsername.mockResolvedValue(user);

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login({
            username: 'testuser',
            password: 'wrongPassword',
          });
        } catch (e) {
          expect(e).toBeInstanceOf(UnauthorizedException);
        }
      }

      // 6th attempt should be locked out
      await expect(
        authService.login({
          username: 'testuser',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================
  // TC-AUTH-211: locked account cannot login with correct password
  // ============================================================
  describe('TC-AUTH-211: locked account cannot login with correct password', () => {
    it('should reject correct password when account is locked', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: hash,
        email: 'test@test.com',
        displayName: 'Test',
        role: 'user',
      };

      mockUserService.findByUsername.mockResolvedValue(user);

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login({
            username: 'testuser',
            password: 'wrongPassword',
          });
        } catch (e) {
          // expected
        }
      }

      // Try correct password - should be locked
      await expect(
        authService.login({
          username: 'testuser',
          password: 'correctPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================
  // TC-AUTH-212: lockout expires after 30 minutes
  // ============================================================
  describe('TC-AUTH-212: lockout expires after 30 minutes', () => {
    it('should allow login after lockout expires', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: hash,
        email: 'test@test.com',
        displayName: 'Test',
        role: 'user',
      };

      mockUserService.findByUsername.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login({
            username: 'testuser',
            password: 'wrongPassword',
          });
        } catch (e) {
          // expected
        }
      }

      // Manually manipulate the loginAttempts map to simulate time passing
      const attempts = (authService as any).loginAttempts;
      const entry = attempts.get('user-1');
      entry.lastAttempt = Date.now() - 31 * 60 * 1000; // 31 minutes ago

      // Now login should succeed because lockout expired
      const result = await authService.login({
        username: 'testuser',
        password: 'correctPassword',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.user.username).toBe('testuser');
    });
  });

  // ============================================================
  // TC-AUTH-213: successful login resets fail count
  // ============================================================
  describe('TC-AUTH-213: successful login resets fail count', () => {
    it('should reset fail count after a successful login', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: hash,
        email: 'test@test.com',
        displayName: 'Test',
        role: 'user',
      };

      mockUserService.findByUsername.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        try {
          await authService.login({
            username: 'testuser',
            password: 'wrongPassword',
          });
        } catch (e) {
          // expected
        }
      }

      // Verify fail count is 3
      const attempts = (authService as any).loginAttempts;
      expect(attempts.get('user-1').count).toBe(3);

      // Successful login
      await authService.login({
        username: 'testuser',
        password: 'correctPassword',
      });

      // Fail count should be reset
      expect(attempts.has('user-1')).toBe(false);

      // Should be able to have 5 more failed attempts before lockout
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login({
            username: 'testuser',
            password: 'wrongPassword',
          });
        } catch (e) {
          // expected
        }
      }

      // 6th attempt triggers lockout
      await expect(
        authService.login({
          username: 'testuser',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
