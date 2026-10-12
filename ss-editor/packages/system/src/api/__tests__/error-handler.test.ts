// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Use vi.hoisted to ensure mocks are available when vi.mock is hoisted
const { mockT } = vi.hoisted(() => ({
  mockT: vi.fn((key: string) => key),
}));

vi.mock('@scada-editor/core', () => ({
  i18n: { global: { t: mockT } },
}));

vi.mock('../../utils/messageBox', () => ({
  showError: vi.fn(),
}));

const { mockMarkOffline, mockEnqueue, mockIsOffline } = vi.hoisted(() => ({
  mockMarkOffline: vi.fn(),
  mockEnqueue: vi.fn(() => true),
  mockIsOffline: vi.fn(() => false),
}));

vi.mock('../connection-monitor', () => ({
  connectionMonitor: {
    markOffline: mockMarkOffline,
    markOnline: vi.fn(),
    onStatusChange: vi.fn(),
    onRecover: vi.fn(),
    getStatus: vi.fn(() => 'online'),
    isOffline: mockIsOffline,
  },
}));

vi.mock('../request-queue', () => ({
  requestQueue: {
    enqueue: mockEnqueue,
    flush: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn(() => ({ size: 0, oldest: null })),
    onSizeChange: vi.fn(),
  },
}));

import { ErrorHandler, shouldQueueRequest } from '../error-handler';
import { showError } from '../../utils/messageBox';

function createError(
  overrides: Partial<AxiosError> & { config?: Partial<InternalAxiosRequestConfig> } = {},
): AxiosError {
  const config = {
    method: 'GET',
    url: '/test',
    ...overrides.config,
  } as InternalAxiosRequestConfig;
  return {
    name: 'AxiosError',
    message: 'Error',
    config,
    isAxiosError: true,
    toJSON: () => ({}),
    ...overrides,
  } as AxiosError;
}

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueue.mockReturnValue(true);
    handler = new ErrorHandler();
  });

  describe('network errors (filter mode)', () => {
    it('should enqueue POST request (filter mode: all methods enqueued)', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'post', url: '/devices' },
      });

      const promise = handler.handle(error);

      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should enqueue GET request (filter mode: GET also enqueued, not rejected)', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'get', url: '/devices' },
      });

      const promise = handler.handle(error);

      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
      // GET requests are now enqueued, not rejected
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should enqueue DELETE request on network error', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'delete', url: '/devices/1' },
      });

      handler.handle(error);
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    });

    it('should reject and show error for _noRetry network error', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'get', url: '/auth/login', _noRetry: true } as any,
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).not.toHaveBeenCalled();
      expect(showError).toHaveBeenCalledWith('error.network');
    });

    it('should detect ERR_NETWORK code and enqueue', async () => {
      const error = createError({
        message: 'Network Error',
        code: 'ERR_NETWORK',
        config: { method: 'get', url: '/test' },
      });

      handler.handle(error);
      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).toHaveBeenCalled();
    });

    it('should detect ECONNREFUSED as network error and enqueue', async () => {
      const error = createError({
        message: 'connect ECONNREFUSED',
        code: 'ECONNREFUSED',
        config: { method: 'get', url: '/test' },
      });

      handler.handle(error);
      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    });

    it('should detect ENOTFOUND as network error and enqueue', async () => {
      const error = createError({
        message: 'getaddrinfo ENOTFOUND',
        code: 'ENOTFOUND',
        config: { method: 'get', url: '/test' },
      });

      handler.handle(error);
      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    });

    it('should detect ERR_CONNECTION_REFUSED as network error and enqueue', async () => {
      const error = createError({
        message: 'net::ERR_CONNECTION_REFUSED',
        code: 'ERR_CONNECTION_REFUSED',
        config: { method: 'get', url: '/test' },
      });

      handler.handle(error);
      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    });

    it('should detect response status 0 as network error and enqueue', async () => {
      const error = createError({
        message: 'Request failed',
        response: { status: 0, data: null } as any,
        config: { method: 'get', url: '/test' },
      });

      handler.handle(error);
      expect(mockMarkOffline).toHaveBeenCalled();
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
    });
  });

  describe('timeout errors', () => {
    it('should enqueue retryable POST on timeout', async () => {
      const error = createError({
        code: 'ECONNABORTED',
        message: 'timeout of 15000ms exceeded',
        config: { method: 'put', url: '/devices/1' },
      });

      const promise = handler.handle(error);
      expect(mockEnqueue).toHaveBeenCalled();
      expect(showError).not.toHaveBeenCalled();
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should show timeout error for non-retryable GET', async () => {
      const error = createError({
        code: 'ECONNABORTED',
        message: 'timeout',
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(showError).toHaveBeenCalledWith('error.timeout');
    });
  });

  describe('5xx server errors', () => {
    it('should enqueue retryable POST on 500 error', async () => {
      const error = createError({
        response: { status: 500, data: { message: 'Internal error' } } as any,
        config: { method: 'post', url: '/devices' },
      });

      const promise = handler.handle(error);
      expect(mockEnqueue).toHaveBeenCalled();
      expect(promise).toBeInstanceOf(Promise);
    });

    it('should show error message for non-retryable GET on 500', async () => {
      const error = createError({
        response: { status: 500, data: { message: 'Internal error' } } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(showError).toHaveBeenCalledWith('Internal error');
    });
  });

  describe('401 auth errors', () => {
    it('should pass through 401 without handling', async () => {
      const error = createError({
        response: { status: 401, data: { message: 'Unauthorized' } } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(showError).not.toHaveBeenCalled();
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  describe('4xx business errors', () => {
    it('should show i18n message when error code is present', async () => {
      const error = createError({
        response: {
          status: 404,
          data: { code: 'NOT_FOUND_001', message: 'Resource not found' },
        } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(mockT).toHaveBeenCalledWith('error.not_found');
      expect(showError).toHaveBeenCalledWith('error.not_found');
    });

    it('should show raw message when error code is unknown', async () => {
      const error = createError({
        response: {
          status: 400,
          data: { code: 'UNKNOWN_CODE', message: 'Custom error' },
        } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(showError).toHaveBeenCalledWith('Custom error');
    });

    it('should show i18n message for known validation error code', async () => {
      const error = createError({
        response: {
          status: 422,
          data: {
            code: 'VALIDATION_001',
            message: 'Validation failed',
            details: [{ message: 'name is required' }],
          },
        } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(mockT).toHaveBeenCalledWith('error.validation.invalid_input');
      expect(showError).toHaveBeenCalledWith('error.validation.invalid_input');
    });
  });

  describe('_noRetry flag', () => {
    it('should not enqueue requests marked with _noRetry', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'post', url: '/auth/login', _noRetry: true } as any,
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(mockEnqueue).not.toHaveBeenCalled();
      expect(showError).toHaveBeenCalled();
    });
  });

  describe('queue full', () => {
    it('should show queueFull message and reject when enqueue returns false', async () => {
      mockEnqueue.mockReturnValueOnce(false);

      const error = createError({
        message: 'Network Error',
        config: { method: 'get', url: '/devices' },
      });

      await expect(handler.handle(error)).rejects.toThrow('QUEUE_FULL');
      expect(showError).toHaveBeenCalledWith('connection.queueFull');
    });
  });

  describe('_errorHandled flag', () => {
    it('should NOT mark error as handled for enqueued network errors (filter mode)', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'get', url: '/test' },
      });

      handler.handle(error);
      // Filter mode: GET network errors are enqueued, not rejected immediately
      expect((error as any)._errorHandled).toBeUndefined();
    });

    it('should mark error as handled for _noRetry network error', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'get', url: '/test', _noRetry: true } as any,
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect((error as any)._errorHandled).toBe(true);
    });

    it('should mark error as handled after showing error for 5xx', async () => {
      const error = createError({
        response: { status: 500, data: { message: 'Error' } } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect((error as any)._errorHandled).toBe(true);
    });

    it('should mark error as handled after showing error for 4xx', async () => {
      const error = createError({
        response: { status: 400, data: { message: 'Bad request' } } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect((error as any)._errorHandled).toBe(true);
    });

    it('should mark error as handled in fallback case', async () => {
      const error = createError({
        message: 'Some unexpected error',
        config: { method: 'get', url: '/test' },
        response: { status: 300, data: {} } as any,
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect((error as any)._errorHandled).toBe(true);
    });

    it('should NOT mark error as handled for 401 (passthrough)', async () => {
      const error = createError({
        response: { status: 401, data: { message: 'Unauthorized' } } as any,
        config: { method: 'get', url: '/test' },
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect((error as any)._errorHandled).toBeUndefined();
    });

    it('should NOT mark error as handled for retryable POST (enqueued)', async () => {
      const error = createError({
        message: 'Network Error',
        config: { method: 'post', url: '/devices' },
      });

      handler.handle(error);
      expect((error as any)._errorHandled).toBeUndefined();
    });
  });

  describe('fallback behavior', () => {
    it('should show error.unknown i18n key instead of raw error.message', async () => {
      const error = createError({
        message: 'Some raw technical error message',
        config: { method: 'get', url: '/test' },
        response: { status: 300, data: {} } as any,
      });

      await expect(handler.handle(error)).rejects.toThrow();
      expect(showError).toHaveBeenCalledWith('error.unknown');
    });
  });
});

describe('shouldQueueRequest', () => {
  it('should return true for config without _noRetry', () => {
    const config = { method: 'GET', url: '/test' } as InternalAxiosRequestConfig;
    expect(shouldQueueRequest(config)).toBe(true);
  });

  it('should return false for config with _noRetry', () => {
    const config = {
      method: 'GET',
      url: '/test',
      _noRetry: true,
    } as any;
    expect(shouldQueueRequest(config)).toBe(false);
  });

  it('should return false for undefined config', () => {
    expect(shouldQueueRequest(undefined)).toBe(false);
  });
});
