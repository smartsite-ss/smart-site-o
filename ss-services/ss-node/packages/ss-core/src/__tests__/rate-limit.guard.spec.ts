// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { RateLimitGuard } from '../api/rate-limit.guard';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

type MockExecutionContext = {
  switchToHttp: jest.Mock;
};

function createMockContext(ip: string = '127.0.0.1'): MockExecutionContext & ExecutionContext {
  const mockRequest = {
    ip,
    connection: { remoteAddress: ip },
  };
  const mockResponse = {
    setHeader: jest.fn(),
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  } as any;
}

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    guard = new RateLimitGuard({ max: 5, windowMs: 60000 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request within limit', () => {
      const context = createMockContext('10.0.0.1');

      for (let i = 0; i < 5; i++) {
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should block request exceeding limit', () => {
      const context = createMockContext('10.0.0.2');

      // Allow first 5 requests
      for (let i = 0; i < 5; i++) {
        guard.canActivate(context);
      }

      // 6th request should throw
      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should allow after window reset', () => {
      // Use a very short window
      const shortGuard = new RateLimitGuard({ max: 2, windowMs: 1 });
      const context = createMockContext('10.0.0.3');

      // First request - creates entry
      shortGuard.canActivate(context);
      // Second request - within limit
      shortGuard.canActivate(context);

      // Advance time past the window (fake timers are active globally)
      jest.advanceTimersByTime(2);

      // Window has expired, so next request should create new entry
      const result = shortGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should track different IPs independently', () => {
      const ctx1 = createMockContext('10.0.0.4');
      const ctx2 = createMockContext('10.0.0.5');

      // Exhaust IP1
      for (let i = 0; i < 5; i++) {
        guard.canActivate(ctx1);
      }

      // IP2 should still be allowed
      expect(guard.canActivate(ctx2)).toBe(true);

      // IP1 should be blocked
      expect(() => guard.canActivate(ctx1)).toThrow(HttpException);
    });

    it('should set rate limit headers on response', () => {
      const ctx = createMockContext('10.0.0.6');
      const response = ctx.switchToHttp().getResponse();

      // Exhaust
      for (let i = 0; i < 5; i++) {
        guard.canActivate(ctx);
      }

      try {
        guard.canActivate(ctx);
      } catch (e) {
        // Expected
      }

      expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const shortGuard = new RateLimitGuard({ max: 2, windowMs: 1 });
      const context = createMockContext('10.0.0.7');

      shortGuard.canActivate(context);

      // Access the private cleanup method - entry should be expired
      (shortGuard as any).cleanup();

      // Should be able to make requests again (cleanup removed expired)
      const result = shortGuard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should set up config with custom values', () => {
      const customGuard = new RateLimitGuard({ max: 100, windowMs: 30000 });
      const context = createMockContext('10.0.0.8');

      // Should allow up to 100 requests
      for (let i = 0; i < 100; i++) {
        expect(customGuard.canActivate(context)).toBe(true);
      }

      expect(() => customGuard.canActivate(context)).toThrow(HttpException);
    });
  });
});
