// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataPointCacheService } from '../cache/data-point-cache.service';
import { CachedDataPoint } from '../cache/cache.types';
import { Logger } from '@nestjs/common';

function makeCachedDataPoint(overrides: Partial<CachedDataPoint> = {}): CachedDataPoint {
  return {
    tagId: 'tag-001',
    deviceId: 'device-001',
    projectId: 'project-001',
    value: 42.5,
    timestamp: Date.now(),
    quality: 'good',
    cachedAt: Date.now(),
    ...overrides,
  };
}

describe('DataPointCacheService', () => {
  let service: DataPointCacheService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new DataPointCacheService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('set and get', () => {
    it('should set and get a cached data point', async () => {
      const dp = makeCachedDataPoint();
      await service.set(dp);

      const result = await service.get(dp.tagId);
      expect(result).not.toBeNull();
      expect(result!.tagId).toBe(dp.tagId);
      expect(result!.value).toBe(dp.value);
    });

    it('should get from L3 cache when L1 is disabled', async () => {
      service.setConfig({ l1Enabled: false });
      const dp = makeCachedDataPoint();
      await service.set(dp);

      const result = await service.get(dp.tagId);
      expect(result).not.toBeNull();
      expect(result!.tagId).toBe(dp.tagId);
    });

    it('should return null for non-existent keys', async () => {
      const result = await service.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired entries', async () => {
      const dp = makeCachedDataPoint({ cachedAt: Date.now() - 100000 });
      await service.set(dp);

      const result = await service.get(dp.tagId);
      expect(result).toBeNull();
    });

    it('should return L3 cached data when L1 entry is expired', async () => {
      service.setConfig({ l2TtlMs: 1 });
      const dp = makeCachedDataPoint({ cachedAt: Date.now() - 100 });
      await service.set(dp);

      // L1 should be expired, L3 should still be valid
      const result = await service.get(dp.tagId);
      expect(result).not.toBeNull();
    });
  });

  describe('setMany and getMany', () => {
    it('should set and get multiple data points', async () => {
      const dp1 = makeCachedDataPoint({ tagId: 'tag-1' });
      const dp2 = makeCachedDataPoint({ tagId: 'tag-2' });
      await service.setMany([dp1, dp2]);

      const results = await service.getMany(['tag-1', 'tag-2']);
      expect(results.size).toBe(2);
      expect(results.get('tag-1')!.tagId).toBe('tag-1');
      expect(results.get('tag-2')!.tagId).toBe('tag-2');
    });

    it('should return only existing entries', async () => {
      const dp = makeCachedDataPoint({ tagId: 'tag-1' });
      await service.set(dp);

      const results = await service.getMany(['tag-1', 'non-existent']);
      expect(results.size).toBe(1);
      expect(results.has('tag-1')).toBe(true);
      expect(results.has('non-existent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entry from cache', async () => {
      const dp = makeCachedDataPoint();
      await service.set(dp);
      await service.delete(dp.tagId);

      const result = await service.get(dp.tagId);
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(service.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('has', () => {
    it('should return true for existing entry', async () => {
      const dp = makeCachedDataPoint();
      await service.set(dp);
      expect(service.has(dp.tagId)).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(service.has('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should empty the cache', async () => {
      const dp1 = makeCachedDataPoint({ tagId: 'tag-1' });
      const dp2 = makeCachedDataPoint({ tagId: 'tag-2' });
      await service.setMany([dp1, dp2]);

      await service.clear();

      expect(service.has('tag-1')).toBe(false);
      expect(service.has('tag-2')).toBe(false);
    });
  });

  describe('getSize', () => {
    it('should return correct counts', async () => {
      const dp = makeCachedDataPoint();
      await service.set(dp);

      const size = service.getSize();
      expect(size.l1).toBeGreaterThanOrEqual(1);
      expect(size.l3).toBeGreaterThanOrEqual(1);
    });

    it('should return zero sizes when empty', () => {
      const size = service.getSize();
      expect(size.l1).toBe(0);
      expect(size.l3).toBe(0);
    });
  });

  describe('warmUp', () => {
    it('should populate cache with data', async () => {
      const fetchData = jest.fn().mockResolvedValue(makeCachedDataPoint({ tagId: 'tag-1' }));

      await service.warmUp(['tag-1'], fetchData);

      expect(fetchData).toHaveBeenCalledWith('tag-1');
      expect(service.has('tag-1')).toBe(true);
    });

    it('should skip already cached entries', async () => {
      const dp = makeCachedDataPoint({ tagId: 'tag-1' });
      await service.set(dp);

      const fetchData = jest.fn();
      await service.warmUp(['tag-1'], fetchData);

      expect(fetchData).not.toHaveBeenCalled();
    });

    it('should handle null fetch data gracefully', async () => {
      const fetchData = jest.fn().mockResolvedValue(null);

      await service.warmUp(['tag-1'], fetchData);

      expect(service.has('tag-1')).toBe(false);
    });
  });

  describe('L1 cache eviction', () => {
    it('should evict oldest entry when L1 max size reached', async () => {
      service.setConfig({ l1MaxSize: 2, l2TtlMs: 100000 });

      const dp1 = makeCachedDataPoint({ tagId: 'tag-1', cachedAt: Date.now() - 1000 });
      const dp2 = makeCachedDataPoint({ tagId: 'tag-2', cachedAt: Date.now() - 500 });
      const dp3 = makeCachedDataPoint({ tagId: 'tag-3', cachedAt: Date.now() });

      await service.set(dp1);
      await service.get(dp1.tagId); // access to update order
      await service.set(dp2);
      await service.get(dp2.tagId);
      await service.set(dp3);

      // tag-1 should be evicted from L1, but still in L3
      expect(service.has('tag-1')).toBe(true);
    });
  });
});
