// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AuthService } from '../auth.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

// Mock I18nService
const mockI18nService = {
  tSync: jest.fn().mockReturnValue('i18n-error-message'),
};

// Mock UserService
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

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('mock-token');
    mockI18nService.tSync.mockReturnValue('i18n-error-message');
    authService = new AuthService(
      mockUserService as any,
      mockJwtService as any,
      mockI18nService as any,
      mockAuditLoggerService as any,
    );
  });

  // ============================================================
  // validateUser
  // ============================================================
  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
        email: 'test@test.com',
        role: 'user',
      };
      mockUserService.findByUsername.mockResolvedValue(user);

      const result = await authService.validateUser('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
      expect(result.username).toBe('testuser');
      expect(result.password).toBeUndefined();
      expect(mockUserService.findByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should return null when user is not found', async () => {
      mockUserService.findByUsername.mockResolvedValue(null);

      const result = await authService.validateUser('nouser', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const passwordHash = await bcrypt.hash('correctPassword', 10);
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
      };
      mockUserService.findByUsername.mockResolvedValue(user);

      const result = await authService.validateUser('testuser', 'wrongPassword');

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // login
  // ============================================================
  describe('login', () => {
    const validPassword = 'Password123';
    let passwordHash: string;

    beforeEach(async () => {
      passwordHash = await bcrypt.hash(validPassword, 10);
    });

    it('should return tokens and user info on successful login', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
        email: 'test@test.com',
        displayName: 'Test User',
        role: 'user',
      };
      mockUserService.findByUsername.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await authService.login({
        username: 'testuser',
        password: validPassword,
      } as LoginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          username: 'testuser',
          email: 'test@test.com',
          displayName: 'Test User',
          role: 'user',
        },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserService.findByUsername.mockResolvedValue(null);

      await expect(
        authService.login({ username: 'nouser', password: 'pwd' } as LoginDto),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockI18nService.tSync).toHaveBeenCalledWith('auth.login.failed_invalid_credentials');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
        email: 'test@test.com',
        role: 'user',
      };
      mockUserService.findByUsername.mockResolvedValue(user);

      await expect(
        authService.login({ username: 'testuser', password: 'wrongPassword' } as LoginDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should sign access token with username, sub and role', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
        email: 'test@test.com',
        role: 'admin',
      };
      mockUserService.findByUsername.mockResolvedValue(user);

      await authService.login({ username: 'testuser', password: validPassword } as LoginDto);

      // First call: access token
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        { username: 'testuser', sub: 'user-1', role: 'admin' },
        { expiresIn: '15m' },
      );
    });

    it('should sign refresh token with sub and type=refresh', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
        email: 'test@test.com',
        role: 'user',
      };
      mockUserService.findByUsername.mockResolvedValue(user);

      await authService.login({ username: 'testuser', password: validPassword } as LoginDto);

      // Second call: refresh token
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        { sub: 'user-1', type: 'refresh' },
        { expiresIn: '7d' },
      );
    });

    it('should store refresh token in refreshTokenStore', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
        email: 'test@test.com',
        role: 'user',
      };
      mockUserService.findByUsername.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh-1');

      await authService.login({ username: 'testuser', password: validPassword } as LoginDto);

      const store = (authService as any).refreshTokenStore;
      expect(store.has('refresh-1')).toBe(true);
      expect(store.get('refresh-1')).toEqual({
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
      });
    });

    it('should reset login attempts on successful login', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        password: passwordHash,
        email: 'test@test.com',
        role: 'user',
      };
      mockUserService.findByUsername.mockResolvedValue(user);

      // Cause 2 failed attempts first
      for (let i = 0; i < 2; i++) {
        try {
          await authService.login({ username: 'testuser', password: 'wrong' } as LoginDto);
        } catch {
          // expected
        }
      }

      const attempts = (authService as any).loginAttempts;
      expect(attempts.get('user-1').count).toBe(2);

      // Successful login should clear attempts
      await authService.login({ username: 'testuser', password: validPassword } as LoginDto);

      expect(attempts.has('user-1')).toBe(false);
    });
  });

  // ============================================================
  // register
  // ============================================================
  describe('register', () => {
    it('should create user and return tokens on successful registration', async () => {
      const newUser = {
        id: 'user-new',
        username: 'newuser',
        password: 'should-be-stripped',
        email: 'new@test.com',
        displayName: 'New User',
        role: 'user',
      };
      mockUserService.createUser.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');

      const dto: RegisterDto = {
        username: 'newuser',
        password: 'Password123',
        email: 'new@test.com',
        displayName: 'New User',
      };

      const result = await authService.register(dto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(result.user.id).toBe('user-new');
      // 运行时安全检查：确保 password 字段已被剥离（类型层已 Omit，但需防止实现回归）
      expect((result.user as any).password).toBeUndefined();
    });

    it('should propagate conflict error from userService.createUser', async () => {
      mockUserService.createUser.mockRejectedValue(new Error('user exists'));

      const dto: RegisterDto = {
        username: 'existing',
        password: 'Password123',
        email: 'existing@test.com',
      };

      await expect(authService.register(dto)).rejects.toThrow('user exists');
    });

    it('should store refresh token after registration', async () => {
      const newUser = {
        id: 'user-new',
        username: 'newuser',
        password: 'hashed',
        email: 'new@test.com',
        role: 'user',
      };
      mockUserService.createUser.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh-reg');

      await authService.register({
        username: 'newuser',
        password: 'Password123',
        email: 'new@test.com',
      } as RegisterDto);

      const store = (authService as any).refreshTokenStore;
      expect(store.has('refresh-reg')).toBe(true);
    });
  });

  // ============================================================
  // refreshToken
  // ============================================================
  describe('refreshToken', () => {
    /** 通过直接调用私有 generateTokens 方法在 refreshTokenStore 中预置 token */
    function seedRefreshToken(userId: string, username: string, role: string): string {
      let callCount = 0;
      mockJwtService.sign.mockImplementationOnce(() => `access-${userId}-${++callCount}`);
      mockJwtService.sign.mockImplementationOnce(() => `refresh-${userId}-${++callCount}`);
      (authService as any).generateTokens({ id: userId, username, role });
      // 返回生成的 refresh token
      return `refresh-${userId}-2`;
    }

    it('should issue new token pair when refresh token is valid', async () => {
      const refreshToken = seedRefreshToken('user-1', 'testuser', 'user');

      // Refresh: provide new tokens
      mockJwtService.sign.mockReturnValueOnce('access-2').mockReturnValueOnce('refresh-2');

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockI18nService.tSync).toHaveBeenCalledWith('auth.login.failed_invalid_credentials');
    });

    it('should delete the old refresh token after use (one-time use)', async () => {
      const refreshToken = seedRefreshToken('user-1', 'testuser', 'user');

      mockJwtService.sign.mockReturnValueOnce('access-2').mockReturnValueOnce('refresh-2');

      await authService.refreshToken(refreshToken);

      // Old token should be removed
      const store = (authService as any).refreshTokenStore;
      expect(store.has(refreshToken)).toBe(false);
      // New token should be present
      expect(store.has('refresh-2')).toBe(true);
    });

    it('should reject second use of an already-consumed refresh token', async () => {
      const refreshToken = seedRefreshToken('user-1', 'testuser', 'user');

      mockJwtService.sign.mockReturnValueOnce('access-2').mockReturnValueOnce('refresh-2');

      // First use: success
      await authService.refreshToken(refreshToken);

      // Second use of same token: should fail
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================
  // logout
  // ============================================================
  describe('logout', () => {
    it('should remove refresh token from store', async () => {
      // Seed refresh token via private generateTokens method
      mockJwtService.sign.mockReturnValueOnce('access-1').mockReturnValueOnce('refresh-1');
      (authService as any).generateTokens({
        id: 'user-1',
        username: 'testuser',
        role: 'user',
      });

      const store = (authService as any).refreshTokenStore;
      expect(store.has('refresh-1')).toBe(true);

      await authService.logout('refresh-1');

      expect(store.has('refresh-1')).toBe(false);
    });

    it('should not throw when logging out with unknown token', async () => {
      await expect(authService.logout('non-existent')).resolves.toBeUndefined();
    });
  });

  // ============================================================
  // changePassword
  // ============================================================
  describe('changePassword', () => {
    const validDto: ChangePasswordDto = {
      oldPassword: 'OldPass123',
      newPassword: 'NewPass456',
      confirmPassword: 'NewPass456',
    };

    it('should change password successfully with valid input', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);

      const result = await authService.changePassword('user-1', validDto);

      expect(result).toEqual({ message: '密码修改成功' });
      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'OldPass123',
        'NewPass456',
      );
    });

    it('should throw BadRequestException when newPassword and confirmPassword do not match', async () => {
      const dto: ChangePasswordDto = {
        oldPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'DifferentPass789',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
      expect(mockUserService.changePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new password is too short', async () => {
      const dto: ChangePasswordDto = {
        oldPassword: 'OldPass123',
        newPassword: 'Ab1',
        confirmPassword: 'Ab1',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password has no letters', async () => {
      const dto: ChangePasswordDto = {
        oldPassword: 'OldPass123',
        newPassword: '12345678',
        confirmPassword: '12345678',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password has no numbers', async () => {
      const dto: ChangePasswordDto = {
        oldPassword: 'OldPass123',
        newPassword: 'abcdefgh',
        confirmPassword: 'abcdefgh',
      };

      await expect(authService.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should revoke all refresh tokens for the user after password change', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);

      // Seed two refresh tokens for user-1 and one for user-2 by calling generateTokens directly
      // Note: generateTokens calls jwtService.sign twice (access + refresh)
      mockJwtService.sign.mockReturnValueOnce('a1').mockReturnValueOnce('r1-user1-a');
      (authService as any).generateTokens({
        id: 'user-1',
        username: 'u1',
        role: 'user',
      });

      mockJwtService.sign.mockReturnValueOnce('a2').mockReturnValueOnce('r2-user1-b');
      (authService as any).generateTokens({
        id: 'user-1',
        username: 'u1',
        role: 'user',
      });

      mockJwtService.sign.mockReturnValueOnce('a3').mockReturnValueOnce('r3-user2');
      (authService as any).generateTokens({
        id: 'user-2',
        username: 'u2',
        role: 'user',
      });

      const store = (authService as any).refreshTokenStore;
      expect(store.size).toBe(3);

      await authService.changePassword('user-1', validDto);

      expect(store.size).toBe(1);
      for (const [, payload] of store.entries()) {
        expect(payload.userId).toBe('user-2');
      }
    });

    it('should propagate errors from userService.changePassword', async () => {
      mockUserService.changePassword.mockRejectedValue(new UnauthorizedException('当前密码不正确'));

      await expect(authService.changePassword('user-1', validDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
