// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { VersionMiddleware } from '../version.middleware';
import { VersionGuard } from '../version.guard';
import { API_VERSION_CONFIG } from '../api-version.config';
import { Request, Response, NextFunction } from 'express';
import { HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';

function createMockResponse(): Response & { setHeader: jest.Mock } {
  const res: any = {
    setHeader: jest.fn(),
  };
  return res as Response & { setHeader: jest.Mock };
}

function createMockRequest(url: string): Request {
  return { url } as Request;
}

describe('API Version Management', () => {
  describe('API_VERSION_CONFIG', () => {
    // TC-API-100: default config has current version v1
    it('TC-API-100: should have v1 as current version', () => {
      expect(API_VERSION_CONFIG.current).toBe('v1');
      expect(API_VERSION_CONFIG.supported).toContain('v1');
      expect(Array.isArray(API_VERSION_CONFIG.deprecated)).toBe(true);
    });
  });

  describe('VersionMiddleware', () => {
    let middleware: VersionMiddleware;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-10T00:00:00Z'));
      middleware = new VersionMiddleware();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // TC-API-101: deprecated version sets Deprecation/Sunset/Link headers
    it('TC-API-101: should set deprecation headers for deprecated version', () => {
      const originalDeprecated = API_VERSION_CONFIG.deprecated;
      (API_VERSION_CONFIG as any).deprecated = ['v0'];

      const req = createMockRequest('/api/v0/projects');
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      middleware.use(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
      expect(res.setHeader).toHaveBeenCalledWith('Sunset', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Link', '</api/v1>; rel="latest-version"');
      expect(next).toHaveBeenCalled();

      (API_VERSION_CONFIG as any).deprecated = originalDeprecated;
    });

    // TC-API-102: supported version does not set deprecation headers
    it('TC-API-102: should not set deprecation headers for supported version', () => {
      const req = createMockRequest('/api/v1/projects');
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      middleware.use(req as any, res as any, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    // TC-API-103: non-versioned URL passes through without headers
    it('TC-API-103: should pass through non-versioned URLs without headers', () => {
      const req = createMockRequest('/health');
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      middleware.use(req as any, res as any, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    // TC-API-104: Sunset header is 90 days in the future
    it('TC-API-104: should set Sunset header 90 days ahead', () => {
      const originalDeprecated = API_VERSION_CONFIG.deprecated;
      (API_VERSION_CONFIG as any).deprecated = ['v0'];

      const req = createMockRequest('/api/v0/projects');
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      middleware.use(req as any, res as any, next);

      const sunsetCall = res.setHeader.mock.calls.find((call: any[]) => call[0] === 'Sunset');
      expect(sunsetCall).toBeDefined();
      const sunsetValue = sunsetCall![1] as string;
      const sunsetDate = new Date(sunsetValue);
      const expectedDate = new Date('2026-10-08T00:00:00Z');
      expect(sunsetDate.toISOString()).toBe(expectedDate.toISOString());

      (API_VERSION_CONFIG as any).deprecated = originalDeprecated;
    });
  });

  describe('VersionGuard', () => {
    let guard: VersionGuard;

    beforeEach(() => {
      guard = new VersionGuard();
    });

    function createMockExecutionContext(url: string): ExecutionContext {
      const mockRequest = { url };
      return {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;
    }

    // TC-API-105: guard allows supported version
    it('TC-API-105: should allow request for supported version', () => {
      const context = createMockExecutionContext('/api/v1/projects');
      expect(guard.canActivate(context)).toBe(true);
    });

    // TC-API-106: guard blocks unsupported version with 410
    it('TC-API-106: should throw 410 Gone for unsupported version', () => {
      const context = createMockExecutionContext('/api/v9/projects');

      expect(() => guard.canActivate(context)).toThrow(HttpException);
      try {
        guard.canActivate(context);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.GONE);
        const response = exc.getResponse() as any;
        expect(response.code).toBe('UNSUPPORTED_API_VERSION');
      }
    });

    // TC-API-107: guard allows non-versioned URL
    it('TC-API-107: should allow non-versioned URLs', () => {
      const context = createMockExecutionContext('/api/docs');
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
