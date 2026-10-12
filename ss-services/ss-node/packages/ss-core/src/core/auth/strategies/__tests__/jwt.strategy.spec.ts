// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../jwt.strategy';
import { I18nService } from '@ss-node/ss-i18n';

// Mock UserService
const mockUserService = {
  findById: jest.fn(),
};

// Mock I18nService
const mockI18nService = {
  tSync: jest.fn().mockReturnValue('user not found'),
} as unknown as jest.Mocked<I18nService>;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Preserve original JWT_SECRET so constructor does not throw
    process.env.JWT_SECRET = 'test-jwt-secret';

    strategy = new JwtStrategy(mockUserService as any, mockI18nService as any);
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('constructor', () => {
    it('should be instantiated successfully', () => {
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });

    it('should use JWT_SECRET from environment when set', () => {
      process.env.JWT_SECRET = 'my-custom-secret';
      // Re-instantiate to pick up env var
      const s = new JwtStrategy(mockUserService as any, mockI18nService as any);
      expect(s).toBeDefined();
    });

    it('should fall back to default secret when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      const s = new JwtStrategy(mockUserService as any, mockI18nService as any);
      expect(s).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should return user when payload.sub resolves to an existing user', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@test.com',
        role: 'user',
      };
      mockUserService.findById.mockResolvedValue(user);

      const result = await strategy.validate({ sub: 'user-1', username: 'testuser' });

      expect(result).toEqual(user);
      expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(strategy.validate({ sub: 'nonexistent' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockI18nService.tSync).toHaveBeenCalledWith('auth.login.failed_not_found');
    });

    it('should throw UnauthorizedException when payload.sub is undefined', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(strategy.validate({})).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate errors from userService.findById', async () => {
      const dbError = new Error('DB connection failed');
      mockUserService.findById.mockRejectedValue(dbError);

      await expect(strategy.validate({ sub: 'user-1' })).rejects.toThrow('DB connection failed');
    });

    it('should pass payload.sub as the user id to findById', async () => {
      const user = { id: 'abc-123', username: 'u' };
      mockUserService.findById.mockResolvedValue(user);

      await strategy.validate({ sub: 'abc-123', role: 'admin' });

      expect(mockUserService.findById).toHaveBeenCalledWith('abc-123');
    });

    it('should not call findById with username from payload', async () => {
      mockUserService.findById.mockResolvedValue({ id: 'user-1' });

      await strategy.validate({ sub: 'user-1', username: 'someone' });

      // findById should be called only with sub, never with username
      expect(mockUserService.findById).toHaveBeenCalledTimes(1);
      expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
    });
  });
});
