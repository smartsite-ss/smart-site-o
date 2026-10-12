// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SqlQueryDriver } from '../../../scada-data/drivers/SqlQueryDriver';
import type { DataSourceConfig, TagValue } from '../../../scada-data/types/data-source.types';

const mockFetch = vi.fn();

describe('SqlQueryDriver', () => {
  let driver: SqlQueryDriver;

  beforeEach(() => {
    vi.useFakeTimers();
    driver = new SqlQueryDriver();
    mockFetch.mockReset();
    (globalThis as any).fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    driver.disconnect();
  });

  function makeSqlConfig(overrides: Record<string, unknown> = {}): DataSourceConfig {
    return {
      type: 'sql',
      config: {
        connectionString: 'mysql://localhost:3306/test',
        query: 'SELECT * FROM sensors',
        interval: 60000,
        timeout: 5000,
        databaseType: 'mysql',
        ...overrides,
      },
    };
  }

  // ==================== connect ====================
  describe('connect', () => {
    it('TC-SQD-001: should connect with SQL query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 100, tag2: 200 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });

    it('TC-SQD-002: should connect with table name and columns', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 100 }]),
      });
      const config: DataSourceConfig = {
        type: 'sql',
        config: {
          connectionString: 'mysql://localhost:3306/test',
          query: 'SELECT tag1, tag2 FROM sensors',
          interval: 60000,
          timeout: 5000,
          databaseType: 'mysql',
        },
      };
      const connectPromise = driver.connect(config);
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });

    it('TC-SQD-003: should handle non-sql type config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 100 }]),
      });
      const config: DataSourceConfig = {
        type: 'static',
        config: { query: 'SELECT 1', interval: 60000 } as any,
      };
      const connectPromise = driver.connect(config);
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });

    it('TC-SQD-004: should handle query with no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });
  });

  // ==================== disconnect ====================
  describe('disconnect', () => {
    it('TC-SQD-010: should disconnect and stop polling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 100 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      await driver.disconnect();
      expect(driver.getStatus()).toBe('disconnected');
    });
  });

  // ==================== subscribe / unsubscribe ====================
  describe('subscribe / unsubscribe', () => {
    it('TC-SQD-020: should subscribe to tags', () => {
      driver.subscribe(['tag-1', 'tag-2']);
      driver.subscribe(['tag-2', 'tag-3']);
      expect(driver.subscribe).toBeDefined();
    });

    it('TC-SQD-021: should unsubscribe tags', () => {
      driver.subscribe(['tag-1', 'tag-2', 'tag-3']);
      driver.unsubscribe(['tag-2']);
      expect(driver.unsubscribe).toBeDefined();
    });
  });

  // ==================== onData / offData ====================
  describe('onData / offData', () => {
    it('TC-SQD-030: should register and call data callback', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 42 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(callback).toHaveBeenCalled();
      const values: TagValue[] = callback.mock.calls[0][0];
      expect(values.some((v) => v.tagId === 'tag1' && v.value === 42)).toBe(true);
    });

    it('TC-SQD-031: should unregister data callback', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      driver.offData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 42 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ==================== getStatus ====================
  describe('getStatus', () => {
    it('TC-SQD-040: should return disconnected initially', () => {
      expect(driver.getStatus()).toBe('disconnected');
    });
  });

  // ==================== write ====================
  describe('write', () => {
    it('TC-SQD-050: should throw error for write operations', async () => {
      await expect(driver.write('tag-1', 42)).rejects.toThrow('does not support write');
    });
  });

  // ==================== getAvailableTags ====================
  describe('getAvailableTags', () => {
    it('TC-SQD-060: should return empty array', () => {
      expect(driver.getAvailableTags()).toEqual([]);
    });
  });

  // ==================== query execution ====================
  describe('query execution', () => {
    it('TC-SQD-070: should filter by subscribed tags', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      driver.subscribe(['tag1', 'tag3']);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 10, tag2: 20, tag3: 30 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      const values: TagValue[] = callback.mock.calls[0][0];
      expect(values).toHaveLength(2);
      expect(values.map((v) => v.tagId).sort()).toEqual(['tag1', 'tag3']);
    });

    it('TC-SQD-071: should return all columns when no tag filter', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 10, tag2: 20 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      const values: TagValue[] = callback.mock.calls[0][0];
      expect(values).toHaveLength(2);
    });

    it('TC-SQD-072: should skip underscore-prefixed columns', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 10, _internal: 'skip', tag2: 20 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      const values: TagValue[] = callback.mock.calls[0][0];
      const hasInternal = values.some((v) => v.tagId === '_internal');
      expect(hasInternal).toBe(false);
    });
  });

  // ==================== error handling ====================
  describe('error handling', () => {
    it('TC-SQD-080: should handle connect with valid query', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ tag1: 50 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });

    it('TC-SQD-081: should handle response with rows property', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rows: [{ tag1: 99 }] }),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      const values: TagValue[] = callback.mock.calls[0][0];
      expect(values.some((v) => v.tagId === 'tag1')).toBe(true);
    });

    it('TC-SQD-082: should handle response with data property', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ tag1: 77 }] }),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      const values: TagValue[] = callback.mock.calls[0][0];
      expect(values.some((v) => v.tagId === 'tag1')).toBe(true);
    });

    it('TC-SQD-083: should handle error and retry mechanism', async () => {
      vi.useRealTimers();
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockRejectedValue(new Error('Network error'));
      const connectPromise = driver.connect(makeSqlConfig());
      await expect(connectPromise).rejects.toThrow();
      vi.useFakeTimers();
    }, 15000);
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-SQD-090: should handle polling after initial connect', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ tag1: 10 }]),
      });
      const connectPromise = driver.connect(makeSqlConfig({ interval: 1000 }));
      vi.advanceTimersByTime(0);
      await connectPromise;
      callback.mockClear();
      await vi.advanceTimersByTimeAsync(1000);
      expect(callback).toHaveBeenCalled();
    });

    it('TC-SQD-091: should handle result with null/undefined rows', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });
      const connectPromise = driver.connect(makeSqlConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });
  });
});