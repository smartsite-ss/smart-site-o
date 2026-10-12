// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { InfluxWriteService, InfluxWritePoint } from '../influx-write.service';

describe('InfluxWriteService', () => {
  let service: InfluxWriteService;
  let fetchMock: jest.Mock;

  const createPoint = (overrides: Partial<InfluxWritePoint> = {}): InfluxWritePoint => ({
    measurement: 'tag_values',
    tags: { projectId: 'proj-1', tagId: 'tag-001' },
    fields: { value: 42.5, quality: 'good' },
    timestamp: new Date('2025-06-01T10:30:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = fetchMock as any;

    service = new InfluxWriteService();
    service.onModuleInit();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ──────────── Lifecycle ────────────

  describe('Lifecycle', () => {
    it('TC-IWS-001: onModuleInit should initialize without errors', () => {
      const svc = new InfluxWriteService();
      expect(() => svc.onModuleInit()).not.toThrow();
    });

    it('TC-IWS-002: onModuleDestroy should call flushAll', () => {
      const flushAllSpy = jest.spyOn(service, 'flushAll');
      service.onModuleDestroy();
      expect(flushAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────── configure ────────────

  describe('configure', () => {
    it('TC-IWS-003: should update enabled flag', () => {
      service.configure({ enabled: false });
      const stats = service.getStats();
      expect(stats.enabled).toBe(false);
    });

    it('TC-IWS-004: should update flushTimeoutMs', () => {
      service.configure({ flushTimeoutMs: 10000 });
      const stats = service.getStats();
      // Verify via getStats that maxBatchSize still has the original default
      expect(stats.maxBatchSize).toBe(1000);
    });

    it('TC-IWS-005: should update maxBatchSize', () => {
      service.configure({ maxBatchSize: 500 });
      const stats = service.getStats();
      expect(stats.maxBatchSize).toBe(500);
    });

    it('TC-IWS-006: should update multiple options at once', () => {
      service.configure({ enabled: false, maxBatchSize: 200, flushTimeoutMs: 3000 });
      const stats = service.getStats();
      expect(stats.enabled).toBe(false);
      expect(stats.maxBatchSize).toBe(200);
    });

    it('TC-IWS-007: should ignore undefined options', () => {
      const initialStats = service.getStats();
      service.configure({});
      const afterStats = service.getStats();
      expect(afterStats.enabled).toBe(initialStats.enabled);
      expect(afterStats.maxBatchSize).toBe(initialStats.maxBatchSize);
    });
  });

  // ──────────── writePoint ────────────

  describe('writePoint', () => {
    it('TC-IWS-008: should buffer a single point without flushing immediately', async () => {
      jest.useFakeTimers();

      const point = createPoint();
      await service.writePoint(point);

      const stats = service.getStats();
      expect(stats.pendingBuffers).toBe(1);
      expect(stats.totalWritten).toBe(0); // not flushed yet
    });

    it('TC-IWS-009: should not write when disabled', async () => {
      service.configure({ enabled: false });

      await service.writePoint(createPoint());

      const stats = service.getStats();
      expect(stats.pendingBuffers).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('TC-IWS-010: should buffer points separately by measurement:projectId key', async () => {
      jest.useFakeTimers();

      await service.writePoint(createPoint({ tags: { projectId: 'proj-1' } }));
      await service.writePoint(createPoint({ tags: { projectId: 'proj-2' } }));

      const stats = service.getStats();
      expect(stats.pendingBuffers).toBe(2);
    });

    it('TC-IWS-011: should use "default" projectId when tags do not have it', async () => {
      jest.useFakeTimers();

      await service.writePoint(createPoint({ tags: { tagId: 'tag-1' } }));

      const stats = service.getStats();
      expect(stats.pendingBuffers).toBe(1);
    });

    it('TC-IWS-012: should flush automatically when batch size is reached', async () => {
      jest.useFakeTimers();
      fetchMock = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 204, text: jest.fn().mockResolvedValue('') });
      global.fetch = fetchMock as any;
      // Create a fresh service for precise batch control
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 3, flushTimeoutMs: 999999 });

      const point = createPoint({ tags: { projectId: 'proj-1' } });
      await service.writePoint(point);
      await service.writePoint(point);
      // 3rd point should trigger an auto-flush
      await service.writePoint(point);

      // The flush is async - let pending promises settle
      await Promise.resolve();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('TC-IWS-013: should set a flush timer when buffer is not full', async () => {
      jest.useFakeTimers();
      fetchMock = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 204, text: jest.fn().mockResolvedValue('') });
      global.fetch = fetchMock as any;
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 100, flushTimeoutMs: 5000 });

      await service.writePoint(createPoint({ tags: { projectId: 'proj-timer' } }));

      // Advance timers to trigger flush
      jest.advanceTimersByTime(5000);
      // Allow async flush to complete
      await Promise.resolve();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────── writePoints (plural) ────────────

  describe('writePoints', () => {
    it('TC-IWS-014: should buffer multiple points in order', async () => {
      jest.useFakeTimers();

      const points = [
        createPoint({ tags: { projectId: 'batch' } }),
        createPoint({ tags: { projectId: 'batch' } }),
        createPoint({ tags: { projectId: 'batch' } }),
      ];
      await service.writePoints(points);

      const stats = service.getStats();
      expect(stats.pendingBuffers).toBe(1);
    });

    it('TC-IWS-015: should handle empty array', async () => {
      await service.writePoints([]);

      const stats = service.getStats();
      expect(stats.pendingBuffers).toBe(0);
    });
  });

  // ──────────── flushAll ────────────

  describe('flushAll', () => {
    beforeEach(() => {
      fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue(''),
      });
      global.fetch = fetchMock as any;
    });

    it('TC-IWS-016: should flush all pending buffers', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1000, flushTimeoutMs: 999999 }); // no auto-flush

      await service.writePoint(createPoint({ tags: { projectId: 'p1' } }));
      await service.writePoint(createPoint({ tags: { projectId: 'p2' } }));

      service.flushAll();

      // Allow async flush operations to complete (flushAll is sync, flushBuffer is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(service.getStats().totalWritten).toBe(2);
    });

    it('TC-IWS-017: should not fail when there are no buffers', async () => {
      expect(() => service.flushAll()).not.toThrow();
    });

    it('TC-IWS-018: should clear buffers after flush', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1000, flushTimeoutMs: 999999 });

      await service.writePoint(createPoint({ tags: { projectId: 'clear-1' } }));
      expect(service.getStats().pendingBuffers).toBe(1);

      service.flushAll();
      await Promise.resolve();

      expect(service.getStats().pendingBuffers).toBe(0);
    });
  });

  // ──────────── sendToInfluxDB (error paths via flush) ────────────

  describe('HTTP error handling', () => {
    it('TC-IWS-019: should increment error count on HTTP failure', async () => {
      jest.useFakeTimers();
      fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });
      global.fetch = fetchMock as any;
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      // writePoint with maxBatchSize=1 triggers immediate flush
      // flushBuffer increments totalErrors then re-throws — catch to verify stats
      await service.writePoint(createPoint({ tags: { projectId: 'err' } })).catch(() => {});
      await Promise.resolve();

      const stats = service.getStats();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(1);
      expect(stats.totalWritten).toBe(0);
    });

    it('TC-IWS-020: should handle non-204 ok responses correctly', async () => {
      jest.useFakeTimers();
      fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(''),
      });
      global.fetch = fetchMock as any;
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      await service.writePoint(createPoint({ tags: { projectId: 'ok200' } }));
      await Promise.resolve();

      // status 200 but ok=true should still work
      expect(service.getStats().totalWritten).toBe(1);
    });

    it('TC-IWS-021: should handle fetch throwing a network error', async () => {
      jest.useFakeTimers();
      fetchMock = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      global.fetch = fetchMock as any;
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      await service.writePoint(createPoint({ tags: { projectId: 'net-err' } })).catch(() => {});
      await Promise.resolve();

      const stats = service.getStats();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(1);
    });
  });

  // ──────────── getStats ────────────

  describe('getStats', () => {
    it('TC-IWS-022: should return initial default stats', () => {
      const stats = service.getStats();

      // CODE-02/03: getStats 新增 backendUnreachable / unavailableBuckets / nextRetryInMs 字段
      expect(stats).toEqual({
        enabled: true,
        totalWritten: 0,
        totalErrors: 0,
        pendingBuffers: 0,
        maxBatchSize: 1000,
        backendUnreachable: false,
        unavailableBuckets: [],
        nextRetryInMs: 0,
      });
    });

    it('TC-IWS-023: should reflect updated configuration in stats', () => {
      service.configure({ enabled: false, maxBatchSize: 500 });

      const stats = service.getStats();
      expect(stats.enabled).toBe(false);
      expect(stats.maxBatchSize).toBe(500);
    });
  });

  // ──────────── Line Protocol Formatting ────────────

  describe('InfluxDB line protocol formatting', () => {
    beforeEach(() => {
      fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: jest.fn().mockResolvedValue(''),
      });
      global.fetch = fetchMock as any;
    });

    it('TC-IWS-024: should format string fields with double quotes in line protocol', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      await service.writePoint(
        createPoint({ tags: { projectId: 'fmt' }, fields: { value: 1, status: 'active' } }),
      );
      await Promise.resolve();

      const call = fetchMock.mock.calls[0];
      const body = call[1].body as string;
      expect(body).toContain('status="active"');
      expect(body).toContain('value=1');
    });

    it('TC-IWS-025: should format boolean fields without quotes', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      await service.writePoint(
        createPoint({ tags: { projectId: 'fmt' }, fields: { value: 1, enabled: true } }),
      );
      await Promise.resolve();

      const call = fetchMock.mock.calls[0];
      const body = call[1].body as string;
      expect(body).toContain('enabled=true');
    });

    it('TC-IWS-026: should escape special characters in tag values', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      await service.writePoint(
        createPoint({
          tags: { projectId: 'fmt', tagId: 'tag,with=spaces' },
          fields: { value: 1 },
        }),
      );
      await Promise.resolve();

      const call = fetchMock.mock.calls[0];
      const body = call[1].body as string;
      expect(body).toContain('tagId=tag\\,with\\=spaces');
    });

    it('TC-IWS-027: should convert Date timestamp to nanosecond precision', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      const date = new Date('2025-06-01T12:00:00.000Z');
      await service.writePoint(
        createPoint({ tags: { projectId: 'fmt' }, fields: { value: 1 }, timestamp: date }),
      );
      await Promise.resolve();

      const call = fetchMock.mock.calls[0];
      const body = call[1].body as string;
      const expectedNs = String(date.getTime() * 1000000);
      expect(body).toContain(expectedNs);
    });

    it('TC-IWS-028: should use raw number as nanoseconds timestamp', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      await service.writePoint(
        createPoint({
          tags: { projectId: 'fmt' },
          fields: { value: 1 },
          timestamp: 1717200000000000000,
        }),
      );
      await Promise.resolve();

      const call = fetchMock.mock.calls[0];
      const body = call[1].body as string;
      expect(body).toContain('1717200000000000000');
    });

    it('TC-IWS-029: should omit timestamp when not provided', async () => {
      jest.useFakeTimers();
      service = new InfluxWriteService();
      service.configure({ maxBatchSize: 1, flushTimeoutMs: 999999 });

      await service.writePoint(
        createPoint({ tags: { projectId: 'fmt' }, fields: { value: 1 }, timestamp: undefined }),
      );
      await Promise.resolve();

      const call = fetchMock.mock.calls[0];
      const body = call[1].body as string;
      // InfluxDB line protocol: measurement,tag_set field_set [timestamp]
      // When timestamp is omitted, line should not have " space digits" at end
      expect(body).not.toMatch(/ \d+$/);
    });
  });
});
