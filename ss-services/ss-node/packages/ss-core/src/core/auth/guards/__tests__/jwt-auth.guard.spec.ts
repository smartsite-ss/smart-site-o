// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { UserRole } from '../../../user/entities/user.entity';

/**
 * JwtAuthGuard extends AuthGuard('jwt') from @nestjs/passport.
 * We test the override behavior:
 *  - In dev mode (NODE_ENV !== 'production'), debug-mock-token bypasses auth and sets a mock user.
 *  - In dev mode without debug token, super.canActivate() is invoked.
 *  - In production mode, super.canActivate() is invoked for all requests.
 *
 * To avoid depending on Passport strategy registration, we spy on the parent
 * prototype's canActivate method.
 */
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let parentCanActivate: jest.SpyInstance;

  beforeEach(() => {
    // Reset NODE_ENV to a non-production value for dev-mode tests
    process.env.NODE_ENV = 'test';

    guard = new JwtAuthGuard(new Reflector());

    // Spy on parent prototype canActivate so super.canActivate can be controlled
    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    parentCanActivate = jest.spyOn(parentProto, 'canActivate').mockResolvedValue(true);
  });

  afterEach(() => {
    parentCanActivate.mockRestore();
    process.env.NODE_ENV = 'test';
  });

  function createMockContext(authHeader?: string): ExecutionContext {
    const mockRequest: any = {
      headers: {} as Record<string, string>,
    };
    if (authHeader) {
      mockRequest.headers.authorization = authHeader;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  describe('dev mode (NODE_ENV !== production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should accept the debug-mock-token and set mock user on request', async () => {
      const ctx = createMockContext('Bearer debug-mock-token');

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      const request = ctx.switchToHttp().getRequest();
      expect(request.user).toEqual({
        id: 'debug-user',
        username: 'debug',
        email: 'debug@local.dev',
        displayName: 'Debug User',
        role: UserRole.ADMIN,
        isActive: true,
      });
      // super.canActivate should NOT be called when using debug token
      expect(parentCanActivate).not.toHaveBeenCalled();
    });

    it('should fall through to super.canActivate when token is not the debug token', async () => {
      const ctx = createMockContext('Bearer some-real-token');

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledTimes(1);
      expect(parentCanActivate).toHaveBeenCalledWith(ctx);
    });

    it('should fall through to super.canActivate when no token is present', async () => {
      const ctx = createMockContext();

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledTimes(1);
    });

    it('should propagate failure when super.canActivate rejects', async () => {
      parentCanActivate.mockRejectedValue(new Error('Unauthorized'));

      const ctx = createMockContext('Bearer some-real-token');

      await expect(guard.canActivate(ctx)).rejects.toThrow('Unauthorized');
    });

    it('should not set request.user when falling through to super.canActivate', async () => {
      const ctx = createMockContext('Bearer some-real-token');

      await guard.canActivate(ctx);

      const request = ctx.switchToHttp().getRequest();
      // Debug mock user is only set for debug-mock-token branch
      expect(request.user).toBeUndefined();
    });

    it('should treat non-Bearer debug token as a regular token', async () => {
      // The token is extracted via ExtractJwt.fromAuthHeaderAsBearerToken,
      // which only matches "Bearer <token>" scheme. A non-Bearer header
      // means token is undefined and we fall through to super.
      const ctx = createMockContext('Basic debug-mock-token');

      await guard.canActivate(ctx);

      expect(parentCanActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('production mode (NODE_ENV === production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should call super.canActivate even when debug-mock-token is provided', async () => {
      const ctx = createMockContext('Bearer debug-mock-token');

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledTimes(1);
      // Mock user should NOT be set in production
      const request = ctx.switchToHttp().getRequest();
      expect(request.user).toBeUndefined();
    });

    it('should call super.canActivate for any request', async () => {
      const ctx = createMockContext('Bearer any-token');

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledTimes(1);
    });

    it('should propagate failure from super.canActivate in production', async () => {
      parentCanActivate.mockRejectedValue(new Error('Unauthorized'));

      const ctx = createMockContext('Bearer debug-mock-token');

      await expect(guard.canActivate(ctx)).rejects.toThrow('Unauthorized');
    });
  });
});
