// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

function createMockContext(url: string = '/api/v1/test'): ExecutionContext {
  const mockRequest = {
    url,
  };
  const mockResponse = {
    statusCode: 200,
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  } as any;
}

function createCallHandler<T>(data: T): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(of(data)),
  } as any;
}

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  // TC-API-001: wraps single object response
  it('TC-API-001: should wrap single object response with standard format', (done) => {
    const context = createMockContext('/api/v1/projects');
    const handler = createCallHandler({ id: 1, name: 'test' });

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: { id: 1, name: 'test' },
          message: 'success',
          timestamp: expect.any(String),
        });
        done();
      },
    });
  });

  // TC-API-002: wraps array response
  it('TC-API-002: should wrap array response with standard format', (done) => {
    const context = createMockContext('/api/v1/projects');
    const handler = createCallHandler([{ id: 1 }, { id: 2 }]);

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: [{ id: 1 }, { id: 2 }],
          message: 'success',
          timestamp: expect.any(String),
        });
        done();
      },
    });
  });

  // TC-API-003: wraps paginated response
  it('TC-API-003: should wrap paginated response with pagination info', (done) => {
    const paginationMeta = { page: 1, pageSize: 10, total: 50, totalPages: 5 };
    const context = createMockContext('/api/v1/projects?page=1&pageSize=10');
    const handler = createCallHandler({
      data: [{ id: 1 }, { id: 2 }],
      pagination: paginationMeta,
    });

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: [{ id: 1 }, { id: 2 }],
          pagination: paginationMeta,
          message: 'success',
          timestamp: expect.any(String),
        });
        done();
      },
    });
  });

  // TC-API-004: handles null/undefined data
  it('TC-API-004: should handle null data', (done) => {
    const context = createMockContext('/api/v1/test');
    const handler = createCallHandler(null);

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: null,
          message: 'success',
          timestamp: expect.any(String),
        });
        done();
      },
    });
  });

  it('TC-API-004b: should handle undefined data', (done) => {
    const context = createMockContext('/api/v1/test');
    const handler = createCallHandler(undefined);

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: null,
          message: 'success',
          timestamp: expect.any(String),
        });
        done();
      },
    });
  });

  // TC-API-005: response includes timestamp
  it('TC-API-005: response should include valid ISO timestamp', (done) => {
    const context = createMockContext('/api/v1/test');
    const handler = createCallHandler({ key: 'value' });

    interceptor.intercept(context, handler).subscribe({
      next: (result: any) => {
        expect(result.timestamp).toBeDefined();
        expect(typeof result.timestamp).toBe('string');
        const date = new Date(result.timestamp);
        expect(date.toISOString()).toBe(result.timestamp);
        done();
      },
    });
  });

  // TC-API-006: error responses pass through unwrapped
  it('TC-API-006: should not wrap already-wrapped error responses', (done) => {
    const context = createMockContext('/api/v1/test');
    const alreadyWrapped = {
      code: 400,
      data: null,
      message: 'Bad Request',
      timestamp: new Date().toISOString(),
    };
    const handler = createCallHandler(alreadyWrapped);

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toBe(alreadyWrapped);
        expect(result.code).toBe(400);
        done();
      },
    });
  });

  // TC-API-007: pagination has correct totalPages
  it('TC-API-007: pagination should preserve totalPages correctly', (done) => {
    const context = createMockContext('/api/v1/projects');
    const handler = createCallHandler({
      data: [],
      pagination: { page: 3, pageSize: 20, total: 105, totalPages: 6 },
    });

    interceptor.intercept(context, handler).subscribe({
      next: (result: any) => {
        expect(result.pagination).toBeDefined();
        expect(result.pagination.totalPages).toBe(6);
        expect(result.pagination.page).toBe(3);
        expect(result.pagination.pageSize).toBe(20);
        expect(result.pagination.total).toBe(105);
        done();
      },
    });
  });

  // TC-API-008: stream/file responses pass through
  it('TC-API-008: should pass through Buffer responses unchanged', (done) => {
    const context = createMockContext('/api/v1/export');
    const buffer = Buffer.from('file content');
    const handler = createCallHandler(buffer);

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toBe(buffer);
        expect(Buffer.isBuffer(result)).toBe(true);
        done();
      },
    });
  });

  // Health check endpoint should be skipped
  it('should skip wrapping for health check endpoints', (done) => {
    const context = createMockContext('/api/v1/system/health');
    const handler = createCallHandler({ status: 'ok' });

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({ status: 'ok' });
        done();
      },
    });
  });

  // Primitive values should be wrapped
  it('should wrap primitive string values', (done) => {
    const context = createMockContext('/api/v1/test');
    const handler = createCallHandler('hello');

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: 'hello',
          message: 'success',
          timestamp: expect.any(String),
        });
        done();
      },
    });
  });
});
