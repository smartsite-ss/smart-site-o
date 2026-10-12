// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Unit tests for ApiClient — HTTP client based on Node http/https
// ============================================================

import 'jest';

// ---------- Mock factories for http / https ----------
// Each mock exposes .request(options, cb) which returns a
// ClientRequest-like object whose event handlers ('error',
// 'timeout') and methods (write/end/destroy) can be inspected.

interface CapturedRequest {
  options: Record<string, unknown>;
  callback: (res: MockResponse) => void;
  req: {
    write: jest.Mock;
    end: jest.Mock;
    destroy: jest.Mock;
    on: jest.Mock;
    emit: jest.Mock;
  };
}

interface MockResponse {
  statusCode: number;
  on: jest.Mock;
  emit: jest.Mock;
}

const capturedHttp: CapturedRequest[] = [];
const capturedHttps: CapturedRequest[] = [];

function createMockRequest(captured: CapturedRequest[]): jest.Mock {
  return jest.fn((options: Record<string, unknown>, callback: (res: MockResponse) => void) => {
    const reqObj = {
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };
    const entry: CapturedRequest = {
      options,
      callback,
      req: reqObj,
    };
    captured.push(entry);
    // Defer callback invocation to the next tick so the caller
    // (ApiClient.request) can attach 'error'/'timeout' handlers
    // before we simulate the response. Tests will flush this
    // manually via flushResponse().
    return reqObj;
  });
}

const httpRequestMock = createMockRequest(capturedHttp);
const httpsRequestMock = createMockRequest(capturedHttps);

jest.mock('http', () => ({
  request: httpRequestMock,
}));

jest.mock('https', () => ({
  request: httpsRequestMock,
}));

// ---------- Helpers to flush captured requests ----------
function buildResponse(statusCode: number, body: string): MockResponse {
  const handlers: Record<string, (chunk?: unknown) => void> = {};
  const res: MockResponse = {
    statusCode,
    on: jest.fn((event: string, handler: (chunk?: unknown) => void) => {
      handlers[event] = handler;
      return res;
    }),
    emit: jest.fn((event: string, chunk?: unknown) => {
      const h = handlers[event];
      if (h) h(chunk);
    }),
  };
  // Attach a helper to drive events
  (res as unknown as { __handlers: typeof handlers }).__handlers = handlers;
  return res;
}

function flushResponse(entry: CapturedRequest, statusCode: number, body: string): void {
  const res = buildResponse(statusCode, body);
  entry.callback(res);
  // Emit 'data' chunks then 'end'
  const handlers = (res as unknown as { __handlers: Record<string, (chunk?: unknown) => void> })
    .__handlers;
  if (handlers.data) handlers.data(Buffer.from(body));
  if (handlers.end) handlers.end();
}

function flushError(entry: CapturedRequest, err: Error): void {
  // Find the 'error' handler attached via req.on('error', ...)
  const onErrorCall = entry.req.on.mock.calls.find((c) => c[0] === 'error');
  if (onErrorCall) {
    (onErrorCall[1] as (e: Error) => void)(err);
  }
}

function flushTimeout(entry: CapturedRequest): void {
  const onTimeoutCall = entry.req.on.mock.calls.find((c) => c[0] === 'timeout');
  if (onTimeoutCall) {
    (onTimeoutCall[1] as () => void)();
  }
}

// ---------- Import after mocks are in place ----------
import { ApiClient, ApiError, ApiClientConfig } from '../ApiClient';

describe('ss-cli — ApiClient (core/ApiClient.ts)', () => {
  beforeEach(() => {
    capturedHttp.length = 0;
    capturedHttps.length = 0;
    httpRequestMock.mockClear();
    httpsRequestMock.mockClear();
  });

  // ---- TC-API-001: Constructor & config defaults ----
  describe('TC-API-001: Constructor & config defaults', () => {
    it('TC-API-001-01: should construct with a baseUrl', () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('TC-API-001-02: should use default timeout of 30000ms when not provided', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/test');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.timeout).toBe(30000);
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-001-03: should respect custom timeout when provided', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:4000',
        timeout: 5000,
      });
      const promise = client.get('/test');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.timeout).toBe(5000);
      flushResponse(entry, 200, '{}');
      await promise;
    });
  });

  // ---- TC-API-002: HTTP method verbs ----
  describe('TC-API-002: HTTP method verbs', () => {
    it('TC-API-002-01: get() should issue a GET request', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.method).toBe('GET');
      flushResponse(entry, 200, '{"ok":true}');
      await expect(promise).resolves.toEqual({ ok: true });
    });

    it('TC-API-002-02: post() should issue a POST request', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.post('/items', { name: 'a' });
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.method).toBe('POST');
      flushResponse(entry, 201, '{"id":1}');
      await expect(promise).resolves.toEqual({ id: 1 });
    });

    it('TC-API-002-03: put() should issue a PUT request', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.put('/items/1', { name: 'b' });
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.method).toBe('PUT');
      flushResponse(entry, 200, '{"id":1,"name":"b"}');
      await expect(promise).resolves.toEqual({ id: 1, name: 'b' });
    });

    it('TC-API-002-04: delete() should issue a DELETE request', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.delete('/items/1');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.method).toBe('DELETE');
      flushResponse(entry, 204, '');
      await expect(promise).resolves.toBe('');
    });

    it('TC-API-002-05: post() without body should not write a body', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.post('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.req.write).not.toHaveBeenCalled();
      flushResponse(entry, 201, '{}');
      await promise;
    });

    it('TC-API-002-06: post() with body should write JSON body', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.post('/items', { a: 1 });
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.req.write).toHaveBeenCalledWith('{"a":1}');
      expect(entry.req.end).toHaveBeenCalled();
      flushResponse(entry, 201, '{}');
      await promise;
    });
  });

  // ---- TC-API-003: Authentication header injection ----
  describe('TC-API-003: Authentication header injection', () => {
    it('TC-API-003-01: should add Authorization Bearer header when token is set', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'my-jwt-token',
      });
      const promise = client.get('/me');
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-jwt-token');
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-003-02: should add X-API-Key header when apiKey is set', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:4000',
        apiKey: 'my-api-key',
      });
      const promise = client.get('/me');
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('my-api-key');
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-003-03: should include both token and apiKey headers when both are set', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'tok',
        apiKey: 'key',
      });
      const promise = client.get('/me');
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer tok');
      expect(headers['X-API-Key']).toBe('key');
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-003-04: should not add auth headers when none are provided', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/me');
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['X-API-Key']).toBeUndefined();
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-003-05: should always include Content-Type and Accept JSON headers', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/me');
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
      flushResponse(entry, 200, '{}');
      await promise;
    });
  });

  // ---- TC-API-004: Body & Content-Length handling ----
  describe('TC-API-004: Body & Content-Length handling', () => {
    it('TC-API-004-01: should set Content-Length for JSON body', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.post('/items', { name: 'test' });
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      // '{"name":"test"}' = 15 bytes
      expect(headers['Content-Length']).toBe('15');
      flushResponse(entry, 201, '{}');
      await promise;
    });

    it('TC-API-004-02: should not set Content-Length when no body is sent', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      expect(headers['Content-Length']).toBeUndefined();
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-004-03: should compute Content-Length correctly for multi-byte UTF-8', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      // '中' is 3 bytes in UTF-8; JSON string "中" has 5 bytes: "中"
      const promise = client.post('/items', { name: '中' });
      await Promise.resolve();
      const entry = capturedHttp[0];
      const headers = entry.options.headers as Record<string, string>;
      // '{"name":"中"}' = 9 chars but 11 bytes (中 = 3 bytes)
      const expectedBytes = Buffer.byteLength(JSON.stringify({ name: '中' }));
      expect(headers['Content-Length']).toBe(String(expectedBytes));
      flushResponse(entry, 201, '{}');
      await promise;
    });
  });

  // ---- TC-API-005: URL & protocol selection ----
  describe('TC-API-005: URL & protocol selection', () => {
    it('TC-API-005-01: should use http module for http:// baseUrl', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      expect(httpRequestMock).toHaveBeenCalled();
      expect(httpsRequestMock).not.toHaveBeenCalled();
      const entry = capturedHttp[0];
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-005-02: should use https module for https:// baseUrl', async () => {
      const client = new ApiClient({ baseUrl: 'https://example.com' });
      const promise = client.get('/items');
      await Promise.resolve();
      expect(httpsRequestMock).toHaveBeenCalled();
      expect(httpRequestMock).not.toHaveBeenCalled();
      const entry = capturedHttps[0];
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-005-03: should pass hostname from baseUrl', async () => {
      const client = new ApiClient({ baseUrl: 'http://my-host:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.hostname).toBe('my-host');
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-005-04: should pass port from baseUrl when present', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.port).toBe('4000');
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-005-05: should default to port 80 for http without explicit port', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.port).toBe(80);
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-005-06: should default to port 443 for https without explicit port', async () => {
      const client = new ApiClient({ baseUrl: 'https://localhost' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttps[0];
      expect(entry.options.port).toBe(443);
      flushResponse(entry, 200, '{}');
      await promise;
    });

    it('TC-API-005-07: should combine pathname and search in the request path', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items?foo=bar');
      await Promise.resolve();
      const entry = capturedHttp[0];
      expect(entry.options.path).toBe('/items?foo=bar');
      flushResponse(entry, 200, '{}');
      await promise;
    });
  });

  // ---- TC-API-006: Error handling for non-2xx responses ----
  describe('TC-API-006: Error handling for non-2xx responses', () => {
    it('TC-API-006-01: should reject with ApiError on 404 response', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/missing');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 404, '{"error":"not found"}');
      await expect(promise).rejects.toThrow(ApiError);
      await expect(promise).rejects.toThrow(/404/);
      try {
        await promise;
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).statusCode).toBe(404);
        expect((err as ApiError).responseBody).toBe('{"error":"not found"}');
      }
    });

    it('TC-API-006-02: should reject with ApiError on 500 response', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/broken');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 500, 'internal error');
      await expect(promise).rejects.toThrow(ApiError);
      try {
        await promise;
      } catch (err) {
        expect((err as ApiError).statusCode).toBe(500);
        expect((err as ApiError).responseBody).toBe('internal error');
      }
    });

    it('TC-API-006-03: should reject with ApiError on 400 response', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.post('/items', { bad: true });
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 400, 'bad request');
      await expect(promise).rejects.toThrow(ApiError);
    });

    it('TC-API-006-04: should reject with ApiError on 401 response', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'expired',
      });
      const promise = client.get('/me');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 401, 'unauthorized');
      await expect(promise).rejects.toThrow(ApiError);
    });

    it('TC-API-006-05: ApiError message should include method and path', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/missing');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 404, '');
      try {
        await promise;
      } catch (err) {
        expect((err as ApiError).message).toContain('GET');
        expect((err as ApiError).message).toContain('/missing');
        expect((err as ApiError).message).toContain('404');
      }
    });

    it('TC-API-006-06: should treat statusCode 0 (missing) as error', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      // Force statusCode undefined → ApiClient uses ?? 0
      const res = buildResponse(undefined as unknown as number, '');
      entry.callback(res);
      const handlers = (res as unknown as { __handlers: Record<string, (chunk?: unknown) => void> })
        .__handlers;
      if (handlers.data) handlers.data(Buffer.from(''));
      if (handlers.end) handlers.end();
      await expect(promise).rejects.toThrow(ApiError);
    });

    it('TC-API-006-07: should accept 2xx responses (boundary 200 and 299)', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });

      // 200
      const p1 = client.get('/a');
      await Promise.resolve();
      flushResponse(capturedHttp[0], 200, '"ok-200"');
      await expect(p1).resolves.toBe('ok-200');

      // 299
      const p2 = client.get('/b');
      await Promise.resolve();
      flushResponse(capturedHttp[1], 299, '"ok-299"');
      await expect(p2).resolves.toBe('ok-299');
    });

    it('TC-API-006-08: should reject on 199 (below 2xx range)', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      flushResponse(capturedHttp[0], 199, '');
      await expect(promise).rejects.toThrow(ApiError);
    });

    it('TC-API-006-09: should reject on 300 (above 2xx range)', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      flushResponse(capturedHttp[0], 300, '');
      await expect(promise).rejects.toThrow(ApiError);
    });
  });

  // ---- TC-API-007: Network errors ----
  describe('TC-API-007: Network errors', () => {
    it('TC-API-007-01: should reject with "Network error: ..." on req error event', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushError(entry, new Error('ECONNREFUSED'));
      await expect(promise).rejects.toThrow('Network error: ECONNREFUSED');
    });

    it('TC-API-007-02: should reject with a plain Error (not ApiError) on network errors', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushError(entry, new Error('connection reset'));
      try {
        await promise;
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err).not.toBeInstanceOf(ApiError);
      }
    });
  });

  // ---- TC-API-008: Timeout handling ----
  describe('TC-API-008: Timeout handling', () => {
    it('TC-API-008-01: should reject with timeout message on timeout event', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:4000',
        timeout: 1000,
      });
      const promise = client.get('/slow');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushTimeout(entry);
      await expect(promise).rejects.toThrow('Request timeout after 1000ms');
    });

    it('TC-API-008-02: should call req.destroy() on timeout', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:4000',
        timeout: 2000,
      });
      const promise = client.get('/slow');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushTimeout(entry);
      expect(entry.req.destroy).toHaveBeenCalled();
      await promise.catch(() => {
        /* swallow */
      });
    });

    it('TC-API-008-03: should use default 30000ms in timeout message when no timeout configured', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/slow');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushTimeout(entry);
      await expect(promise).rejects.toThrow('Request timeout after 30000ms');
    });
  });

  // ---- TC-API-009: Response parsing ----
  describe('TC-API-009: Response parsing', () => {
    it('TC-API-009-01: should parse JSON object response', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items/1');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 200, '{"id":1,"name":"test"}');
      await expect(promise).resolves.toEqual({ id: 1, name: 'test' });
    });

    it('TC-API-009-02: should parse JSON array response', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/items');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 200, '[1,2,3]');
      await expect(promise).resolves.toEqual([1, 2, 3]);
    });

    it('TC-API-009-03: should return raw string when response is not valid JSON', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/text');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 200, 'plain text response');
      await expect(promise).resolves.toBe('plain text response');
    });

    it('TC-API-009-04: should return empty string for empty 2xx response body', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.delete('/items/1');
      await Promise.resolve();
      const entry = capturedHttp[0];
      flushResponse(entry, 204, '');
      await expect(promise).resolves.toBe('');
    });

    it('TC-API-009-05: should accumulate multi-chunk responses', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:4000' });
      const promise = client.get('/large');
      await Promise.resolve();
      const entry = capturedHttp[0];
      const res = buildResponse(200, '');
      entry.callback(res);
      const handlers = (res as unknown as { __handlers: Record<string, (chunk?: unknown) => void> })
        .__handlers;
      // Emit two chunks then end
      if (handlers.data) {
        handlers.data(Buffer.from('{"part'));
        handlers.data(Buffer.from('":1}'));
      }
      if (handlers.end) handlers.end();
      await expect(promise).resolves.toEqual({ part: 1 });
    });
  });

  // ---- TC-API-010: ApiError class ----
  describe('TC-API-010: ApiError class', () => {
    it('TC-API-010-01: should be an instance of Error', () => {
      const err = new ApiError('boom', 500, 'body');
      expect(err).toBeInstanceOf(Error);
    });

    it('TC-API-010-02: should expose statusCode and responseBody', () => {
      const err = new ApiError('boom', 500, 'body');
      expect(err.statusCode).toBe(500);
      expect(err.responseBody).toBe('body');
    });

    it('TC-API-010-03: should set name to "ApiError"', () => {
      const err = new ApiError('boom', 500, 'body');
      expect(err.name).toBe('ApiError');
    });

    it('TC-API-010-04: should preserve the provided message', () => {
      const err = new ApiError('something failed', 503, 'svc unavailable');
      expect(err.message).toBe('something failed');
    });
  });
});
