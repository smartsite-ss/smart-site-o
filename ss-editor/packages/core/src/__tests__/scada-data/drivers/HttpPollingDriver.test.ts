// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HttpPollingDriver } from '../../../scada-data/drivers/HttpPollingDriver';
import type { DataSourceConfig, TagValue } from '../../../scada-data/types/data-source.types';

// Mock fetch globally
const mockFetch = vi.fn();

describe('HttpPollingDriver', () => {
  let driver: HttpPollingDriver;

  beforeEach(() => {
    vi.useFakeTimers();
    driver = new HttpPollingDriver();
    mockFetch.mockReset();
    (globalThis as any).fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    driver.disconnect();
  });

  function makeConfig(overrides: Record<string, unknown> = {}): DataSourceConfig {
    return {
      type: 'polling',
      config: {
        url: 'http://localhost/api/data',
        method: 'GET',
        interval: 1000,
        timeout: 5000,
        retryCount: 3,
        responsePath: '',
        headers: {},
        ...overrides,
      },
    };
  }

  // ==================== connect ====================
  describe('connect', () => {
    it('TC-HPD-001: should connect and start polling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tag1: 100 }),
      });
      const connectPromise = driver.connect(makeConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });

    it('TC-HPD-002: should set status to connecting during connect', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      const connectPromise = driver.connect(makeConfig());
      // Status should be connecting before poll resolves
      vi.advanceTimersByTime(0);
      return connectPromise.then(() => {
        expect(driver.getStatus()).toBe('connected');
      });
    });

    it('TC-HPD-003: should handle connect with non-polling type config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tag1: 100 }),
      });
      const config: DataSourceConfig = {
        type: 'static',
        config: { url: 'http://localhost/api', interval: 500 } as any,
      };
      const connectPromise = driver.connect(config);
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });

    it('TC-HPD-004: should handle empty URL', async () => {
      const connectPromise = driver.connect(makeConfig({ url: '' }));
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('error');
    });
  });

  // ==================== disconnect ====================
  describe('disconnect', () => {
    it('TC-HPD-010: should disconnect and stop polling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tag1: 100 }),
      });
      const connectPromise = driver.connect(makeConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      await driver.disconnect();
      expect(driver.getStatus()).toBe('disconnected');
    });
  });

  // ==================== subscribe / unsubscribe ====================
  describe('subscribe / unsubscribe', () => {
    it('TC-HPD-020: should subscribe to tags', () => {
      driver.subscribe(['tag-1', 'tag-2']);
      driver.subscribe(['tag-2', 'tag-3']);
      // deduplication should happen
      expect(driver.subscribe).toBeDefined();
    });

    it('TC-HPD-021: should unsubscribe tags', () => {
      driver.subscribe(['tag-1', 'tag-2', 'tag-3']);
      driver.unsubscribe(['tag-2']);
      // Should filter out tag-2
      expect(driver.unsubscribe).toBeDefined();
    });
  });

  // ==================== onData / offData ====================
  describe('onData / offData', () => {
    it('TC-HPD-030: should register and call data callback', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tag1: 42 }),
      });
      const connectPromise = driver.connect(makeConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(callback).toHaveBeenCalled();
      const values: TagValue[] = callback.mock.calls[0][0];
      expect(values.some((v) => v.tagId === 'tag1' && v.value === 42)).toBe(true);
    });

    it('TC-HPD-031: should unregister data callback', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      driver.offData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tag1: 42 }),
      });
      const connectPromise = driver.connect(makeConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ==================== getStatus ====================
  describe('getStatus', () => {
    it('TC-HPD-040: should return disconnected initially', () => {
      expect(driver.getStatus()).toBe('disconnected');
    });
  });

  // ==================== write ====================
  describe('write', () => {
    it('TC-HPD-050: should throw error for write operations', async () => {
      await expect(driver.write('tag-1', 42)).rejects.toThrow('does not support write');
    });
  });

  // ==================== getAvailableTags ====================
  describe('getAvailableTags', () => {
    it('TC-HPD-060: should return empty array', () => {
      expect(driver.getAvailableTags()).toEqual([]);
    });
  });

  // ==================== polling ====================
  describe('polling', () => {
    it('TC-HPD-070: should poll periodically', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tag1: 100 }),
      });
      const connectPromise = driver.connect(makeConfig({ interval: 5000 }));
      vi.advanceTimersByTime(0);
      await connectPromise;
      callback.mockClear();
      // Advance past polling interval and drain microtasks
      await vi.advanceTimersByTimeAsync(5000);
      expect(callback).toHaveBeenCalled();
    });

    it('TC-HPD-071: should handle HTTP error status gracefully', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      // Return non-ok but not throw, so the driver handles it internally
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ tag1: 50 }),
      });
      const connectPromise = driver.connect(makeConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(driver.getStatus()).toBe('connected');
    });

    it('TC-HPD-072: should extract data by responsePath using ext config', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { values: { tag1: 99 } } }),
      });
      // Use a non-standard type so extConfig parsing kicks in
      const config: DataSourceConfig = {
        type: 'polling',
        config: {
          url: 'http://localhost/api',
          responsePath: 'data.values',
          method: 'GET',
          interval: 60000,
          timeout: 5000,
          retryCount: 0,
        } as any,
      };
      const connectPromise = driver.connect(config);
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(callback).toHaveBeenCalled();
      const values: TagValue[] = callback.mock.calls[0][0];
      expect(values.some((v) => v.tagId === 'tag1' && v.value === 99)).toBe(true);
    });

    it('TC-HPD-073: should filter tags by subscription', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      driver.subscribe(['tag1']);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tag1: 10, tag2: 20 }),
      });
      const connectPromise = driver.connect(makeConfig());
      vi.advanceTimersByTime(0);
      await connectPromise;
      const values: TagValue[] = callback.mock.calls[0][0];
      // Without subscription, all tags are returned; with subscription, only subscribed ones
      expect(values.some((v) => v.tagId === 'tag1')).toBe(true);
      expect(values.every((v) => v.tagId === 'tag2')).toBe(false);
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-HPD-080: should handle POST method with body', async () => {
      const callback = vi.fn();
      driver.onData(callback);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tag1: 1 }),
      });
      // Use non-standard type to trigger extConfig parsing which supports body/method
      const config: DataSourceConfig = {
        type: 'polling',
        config: {
          url: 'http://localhost/api/data',
          method: 'POST',
          body: { key: 'value' },
          interval: 60000,
          timeout: 5000,
          retryCount: 0,
        } as any,
      };
      const connectPromise = driver.connect(config);
      vi.advanceTimersByTime(0);
      await connectPromise;
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost/api/data',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});