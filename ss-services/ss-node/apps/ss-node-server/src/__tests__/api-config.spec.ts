// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { API_VERSION_CONFIG } from '../version/api-version.config';
import { VersionMiddleware } from '../version/version.middleware';
import { VersionGuard } from '../version/version.guard';
import { Request, Response } from 'express';
import { ExecutionContext } from '@nestjs/common';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

function createMockRequest(url: string): Request {
  return {
    url,
    method: 'GET',
    headers: {},
  } as any;
}

function createMockResponse(): Response {
  const headers: Record<string, string> = {};
  return {
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    getHeader: jest.fn((key: string) => headers[key]),
    getHeaders: jest.fn(() => headers),
    _headers: headers,
  } as any;
}

function createMockExecutionContext(url: string): ExecutionContext {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ url }),
      getResponse: jest.fn().mockReturnValue({}),
    }),
  } as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-API-100 ~ TC-API-104: Version Config
// ─────────────────────────────────────────────────────────────────────────────

describe('API Version Config', () => {
  // TC-API-100: config has current version set to v1
  it('TC-API-100: should have current version set to v1', () => {
    expect(API_VERSION_CONFIG.current).toBe('v1');
  });

  // TC-API-101: config has supported versions including v1
  it('TC-API-101: should have v1 in supported versions', () => {
    expect(API_VERSION_CONFIG.supported).toContain('v1');
  });

  // TC-API-102: config has deprecated versions as empty array
  it('TC-API-102: should have deprecated versions as empty array', () => {
    expect(API_VERSION_CONFIG.deprecated).toEqual([]);
  });

  // TC-API-103: config has correct structure
  it('TC-API-103: config should have correct structure', () => {
    expect(API_VERSION_CONFIG).toHaveProperty('current');
    expect(API_VERSION_CONFIG).toHaveProperty('supported');
    expect(API_VERSION_CONFIG).toHaveProperty('deprecated');
    expect(Array.isArray(API_VERSION_CONFIG.supported)).toBe(true);
    expect(Array.isArray(API_VERSION_CONFIG.deprecated)).toBe(true);
  });

  // TC-API-104: current version is in supported list
  it('TC-API-104: current version should be in supported list', () => {
    expect(API_VERSION_CONFIG.supported).toContain(API_VERSION_CONFIG.current);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-API-110 ~ TC-API-113: Version Middleware
// ─────────────────────────────────────────────────────────────────────────────

describe('VersionMiddleware', () => {
  let middleware: VersionMiddleware;

  beforeEach(() => {
    middleware = new VersionMiddleware();
  });

  // TC-API-110: middleware calls next() for supported versions
  it('TC-API-110: should call next() for supported version v1', () => {
    const req = createMockRequest('/api/v1/projects');
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // TC-API-111: middleware calls next() for non-versioned URLs
  it('TC-API-111: should call next() for non-versioned URLs', () => {
    const req = createMockRequest('/health');
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // TC-API-112: middleware adds Deprecation/Sunset headers for deprecated versions
  it('TC-API-112: should add Deprecation and Sunset headers for deprecated versions', () => {
    // Temporarily modify deprecated list for this test
    const originalDeprecated = [...API_VERSION_CONFIG.deprecated];
    (API_VERSION_CONFIG as any).deprecated = ['v0'];

    const req = createMockRequest('/api/v0/projects');
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
    expect(res.setHeader).toHaveBeenCalledWith('Sunset', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith(
      'Link',
      `</api/${API_VERSION_CONFIG.current}>; rel="latest-version"`,
    );
    expect(next).toHaveBeenCalled();

    // Restore
    (API_VERSION_CONFIG as any).deprecated = originalDeprecated;
  });

  // TC-API-113: middleware does not add headers for current version
  it('TC-API-113: should not add Deprecation headers for current version', () => {
    const req = createMockRequest('/api/v1/projects');
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    const headers = (res as any)._headers;
    expect(headers['Deprecation']).toBeUndefined();
    expect(headers['Sunset']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-API-120 ~ TC-API-122: Version Guard
// ─────────────────────────────────────────────────────────────────────────────

describe('VersionGuard', () => {
  let guard: VersionGuard;

  beforeEach(() => {
    guard = new VersionGuard();
  });

  // TC-API-120: guard allows supported version v1
  it('TC-API-120: should allow supported version v1', () => {
    const ctx = createMockExecutionContext('/api/v1/projects');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // TC-API-121: guard allows non-versioned URLs
  it('TC-API-121: should allow non-versioned URLs', () => {
    const ctx = createMockExecutionContext('/health');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // TC-API-122: guard rejects unsupported versions
  it('TC-API-122: should reject unsupported version v2', () => {
    const ctx = createMockExecutionContext('/api/v2/projects');
    expect(() => guard.canActivate(ctx)).toThrow();
  });
});
