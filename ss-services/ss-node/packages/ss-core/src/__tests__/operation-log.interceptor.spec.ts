// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OperationLogInterceptor } from '../api/operation-log.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { Logger } from '@nestjs/common';

type MockExecutionContext = {
  switchToHttp: jest.Mock;
};

type MockCallHandler = {
  handle: jest.Mock;
};

function createMockContext(
  overrides: Record<string, any> = {},
): MockExecutionContext & ExecutionContext {
  const mockRequest = {
    method: 'POST',
    route: { path: '/api/v1/data' },
    url: '/api/v1/data',
    params: { id: '123' },
    user: { id: 'user-1', username: 'testuser' },
    ip: '192.168.1.1',
    connection: { remoteAddress: '192.168.1.1' },
    headers: { 'user-agent': 'jest-test' },
    body: { key: 'value' },
    ...overrides,
  };

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue({}),
    }),
  } as any;
}

function createMockCallHandler(): MockCallHandler & CallHandler {
  return {
    handle: jest.fn().mockReturnValue(of({ data: 'success' })),
  } as any;
}

describe('OperationLogInterceptor', () => {
  let interceptor: OperationLogInterceptor;
  let mockRepo: any;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    interceptor = new OperationLogInterceptor();
    mockRepo = {
      save: jest.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('intercept', () => {
    it('should call next handler', (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(next.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should save operation log on success', (done) => {
      interceptor.setRepository(mockRepo);
      const context = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(mockRepo.save).toHaveBeenCalled();
          const savedEntry = mockRepo.save.mock.calls[0][0];
          expect(savedEntry.status).toBe('success');
          expect(savedEntry.action).toContain('POST');
          done();
        },
      });
    });

    it('should save operation log on error', (done) => {
      interceptor.setRepository(mockRepo);
      const context = createMockContext();
      const next: MockCallHandler & CallHandler = {
        handle: jest.fn().mockReturnValue(throwError(() => new Error('test error'))),
      } as any;

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockRepo.save).toHaveBeenCalled();
          const savedEntry = mockRepo.save.mock.calls[0][0];
          expect(savedEntry.status).toBe('error');
          done();
        },
      });
    });

    it('should not throw when operation log repo is not set', (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          // Should not throw even without repo
          expect(next.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle GET requests without body', (done) => {
      interceptor.setRepository(mockRepo);
      const context = createMockContext({ method: 'GET', body: undefined });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(mockRepo.save).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('setRepository', () => {
    it('should set operation log repository', () => {
      interceptor.setRepository(mockRepo);
      // Verify by checking that intercept saves to repo
      const next = createMockCallHandler();
      const context = createMockContext();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          expect(mockRepo.save).toHaveBeenCalled();
        },
      });
    });
  });

  describe('saveOperationLog', () => {
    it('should save entry properly', (done) => {
      interceptor.setRepository(mockRepo);
      const context = createMockContext({
        method: 'DELETE',
        route: { path: '/api/v1/tags/:id' },
        params: { id: 'tag-99' },
      });
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe({
        next: () => {
          const savedEntry = mockRepo.save.mock.calls[0][0];
          expect(savedEntry.action).toBe('DELETE /api/v1/tags/:id');
          expect(savedEntry.resource).toBe('/api/v1/tags/:id');
          expect(savedEntry.resourceId).toBe('tag-99');
          expect(savedEntry.userId).toBe('user-1');
          expect(savedEntry.username).toBe('testuser');
          expect(savedEntry.ip).toBe('192.168.1.1');
          expect(savedEntry.userAgent).toBe('jest-test');
          expect(savedEntry.status).toBe('success');
          done();
        },
      });
    });
  });
});
