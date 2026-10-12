// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StoragePerformanceService } from '../services/storage-performance.service';
import { StorageAdapter, DataPoint, QueryOptions } from '../interfaces/storage-adapter.interface';
import * as zlib from 'zlib';

describe('StoragePerformanceService', () => {
  let service: StoragePerformanceService;
  let mockAdapter: jest.Mocked<StorageAdapter>;

  const createDataPoint = (overrides: Partial<DataPoint> = {}): DataPoint => ({
    tagId: 'tag-001',
    deviceId: 'dev-001',
    projectId: 'proj-001',
    value: 42.5,
    timestamp: new Date('2025-06-01T10:30:00Z'),
    quality: 95,
    ...overrides,
  });

  beforeEach(() => {
    mockAdapter = {
      name: 'InfluxDB',
      engineType: 'influxdb2',
      capabilities: { delete: true, interpolation: false, aggregation: false },
      write: jest.fn().mockResolvedValue({ success: true, written: 0, failed: 0 }),
      read: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(0),
      health: jest.fn().mockResolvedValue({ status: 'healthy' }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    service = new StoragePerformanceService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ──────────── Batch Buffer Write ────────────

  describe('batchWrite', () => {
    it('TC-SP-001: should batch write and flush when buffer reaches max size', async () => {
      service.configureBatchBuffer({ maxSize: 2, flushIntervalMs: 5000 });

      mockAdapter.write.mockResolvedValue({ success: true, written: 2, failed: 0 });

      // First write: buffer has 1, not full
      const result1 = await service.batchWrite(mockAdapter, [createDataPoint({ tagId: 'tag-a' })]);
      expect(result1.success).toBe(true);
      expect(mockAdapter.write).not.toHaveBeenCalled();

      // Second write: buffer reaches 2, flush triggered
      const result2 = await service.batchWrite(mockAdapter, [createDataPoint({ tagId: 'tag-b' })]);
      expect(result2.success).toBe(true);
      expect(mockAdapter.write).toHaveBeenCalledTimes(1);
    });

    it('should flush buffer on timer expiry', async () => {
      service.configureBatchBuffer({ maxSize: 100, flushIntervalMs: 5000 });

      mockAdapter.write.mockResolvedValue({ success: true, written: 1, failed: 0 });

      await service.batchWrite(mockAdapter, [createDataPoint()]);

      // Advance timer to trigger flush
      jest.advanceTimersByTime(5000);
      // Need to flush the promise microtask queue
      await Promise.resolve();
      await Promise.resolve();

      expect(mockAdapter.write).toHaveBeenCalled();
    });

    it('should not flush empty buffer', async () => {
      const result = await service.flushBuffer(mockAdapter);
      expect(result.success).toBe(true);
      expect(result.written).toBe(0);
      expect(mockAdapter.write).not.toHaveBeenCalled();
    });
  });

  // ──────────── LRU Cache ────────────

  describe('cache', () => {
    it('TC-SP-002: should evict least recently used entry when cache is full', () => {
      service.configureCache(2, 60000);

      const data1 = [createDataPoint({ tagId: 'tag-a' })];
      const data2 = [createDataPoint({ tagId: 'tag-b' })];
      const data3 = [createDataPoint({ tagId: 'tag-c' })];

      service.setCachedQuery('key1', data1);
      service.setCachedQuery('key2', data2);

      // Access key1 to make it recently used
      service.getCachedQuery('key1');

      // Add key3, should evict key2 (least recently used)
      service.setCachedQuery('key3', data3);

      expect(service.getCachedQuery('key1')).toEqual(data1);
      expect(service.getCachedQuery('key2')).toBeNull();
      expect(service.getCachedQuery('key3')).toEqual(data3);
    });

    it('TC-SP-003: should expire cache entries after TTL', () => {
      service.configureCache(10, 1000); // 1 second TTL

      service.setCachedQuery('key1', [createDataPoint({ tagId: 'tag-a' })]);

      // Advance time past TTL
      jest.advanceTimersByTime(1500);

      const result = service.getCachedQuery('key1');
      expect(result).toBeNull();
    });

    it('should return null for non-existent cache key', () => {
      const result = service.getCachedQuery('non-existent');
      expect(result).toBeNull();
    });

    it('should invalidate specific cache key', () => {
      service.setCachedQuery('key1', [createDataPoint()]);
      service.setCachedQuery('key2', [createDataPoint()]);

      service.invalidateCache('key1');

      expect(service.getCachedQuery('key1')).toBeNull();
      expect(service.getCachedQuery('key2')).not.toBeNull();
    });

    it('should invalidate all cache', () => {
      service.setCachedQuery('key1', [createDataPoint()]);
      service.setCachedQuery('key2', [createDataPoint()]);

      service.invalidateCache();

      expect(service.getCachedQuery('key1')).toBeNull();
      expect(service.getCachedQuery('key2')).toBeNull();
    });
  });

  // ──────────── cachedRead ────────────

  describe('cachedRead', () => {
    it('should return cached data on cache hit', async () => {
      const data = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      const options: QueryOptions = { tagIds: ['tag-a'], limit: 10 };

      mockAdapter.read.mockResolvedValue(data);

      // First call: cache miss, reads from adapter
      const result1 = await service.cachedRead(mockAdapter, options);
      expect(result1).toEqual(data);
      expect(mockAdapter.read).toHaveBeenCalledTimes(1);

      // Second call: cache hit, should not call adapter
      const result2 = await service.cachedRead(mockAdapter, options);
      expect(result2).toEqual(data);
      expect(mockAdapter.read).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should read from adapter on cache miss', async () => {
      const data = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockAdapter.read.mockResolvedValue(data);

      const result = await service.cachedRead(mockAdapter, { tagIds: ['tag-a'] });

      expect(result).toEqual(data);
      expect(mockAdapter.read).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────── Index Optimization ────────────

  describe('optimizeIndex', () => {
    it('TC-SP-004: should optimize query with index pushdown', () => {
      const query = 'SELECT * FROM data WHERE tagId = "tag-001" AND timestamp > NOW()';
      const availableIndexes = ['tagId', 'timestamp'];

      const result = service.optimizeIndex(query, availableIndexes);

      expect(result.originalQuery).toBe(query);
      expect(result.optimizedQuery).not.toBe(query);
      expect(result.estimatedImprovement).toBeGreaterThan(0);
    });

    it('should return no improvement when no indexes match', () => {
      const query = 'SELECT * FROM data WHERE value > 100';
      const availableIndexes = ['tagId', 'timestamp'];

      const result = service.optimizeIndex(query, availableIndexes);

      expect(result.estimatedImprovement).toBe(0);
    });

    it('should cap improvement at 90%', () => {
      const query =
        'WHERE tagId = x AND timestamp = y AND deviceId = z AND projectId = w AND quality = q';
      const availableIndexes = ['tagId', 'timestamp', 'deviceId', 'projectId', 'quality'];

      const result = service.optimizeIndex(query, availableIndexes);

      expect(result.estimatedImprovement).toBeLessThanOrEqual(90);
    });
  });

  // ──────────── Compression ────────────

  describe('compress', () => {
    it('TC-SP-005: should compress data with Zstandard', async () => {
      const originalData = Buffer.from('A'.repeat(10000));

      const result = await service.compress(originalData, 'zstd');

      expect(result.algorithm).toBe('zstd');
      expect(result.originalSize).toBe(10000);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('TC-SP-006: should compress data with gzip', async () => {
      const originalData = Buffer.from('Hello World! '.repeat(1000));

      const result = await service.compress(originalData, 'gzip');

      expect(result.algorithm).toBe('gzip');
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('should decompress gzip data back to original', async () => {
      const originalData = Buffer.from('Test data for compression roundtrip');
      const gzipCompressed = zlib.gzipSync(originalData);

      const decompressed = await service.decompress(gzipCompressed, 'gzip');
      expect(decompressed).toBeDefined();
      expect(decompressed.toString()).toBe(originalData.toString());
    });
  });

  // ──────────── Performance Metrics ────────────

  describe('getMetrics', () => {
    it('TC-SP-007: should collect and return performance metrics', async () => {
      // Generate some cache activity
      service.setCachedQuery('key1', [createDataPoint()]);
      service.getCachedQuery('key1'); // hit
      service.getCachedQuery('key2'); // miss

      // Generate some writes
      service.configureBatchBuffer({ maxSize: 100, flushIntervalMs: 5000 });
      await service.batchWrite(mockAdapter, [createDataPoint()]);

      // Generate some reads
      mockAdapter.read.mockResolvedValue([createDataPoint()]);
      await service.cachedRead(mockAdapter, { tagIds: ['tag-new'] }); // miss

      const metrics = service.getMetrics();

      expect(metrics.cacheHits).toBeGreaterThanOrEqual(1);
      expect(metrics.cacheMisses).toBeGreaterThanOrEqual(1);
      expect(metrics.totalWrites).toBeGreaterThanOrEqual(1);
      expect(metrics.totalReads).toBeGreaterThanOrEqual(1);
      expect(metrics.cacheHitRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRatio).toBeLessThanOrEqual(1);
    });

    it('TC-SP-008: should calculate cache hit/miss ratio correctly', () => {
      // All hits
      service.setCachedQuery('key1', [createDataPoint()]);
      service.getCachedQuery('key1');
      service.getCachedQuery('key1');

      const stats = service.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
      expect(stats.hitRatio).toBe(1);

      service.resetMetrics();
      service.invalidateCache(); // Clear cache for clean state

      // All misses
      service.getCachedQuery('key1');
      service.getCachedQuery('key2');

      const stats2 = service.getCacheStats();
      expect(stats2.hits).toBe(0);
      expect(stats2.misses).toBe(2);
      expect(stats2.hitRatio).toBe(0);
    });

    it('should reset metrics to zero', async () => {
      service.setCachedQuery('key1', [createDataPoint()]);
      service.getCachedQuery('key1');

      service.resetMetrics();
      service.invalidateCache();

      const metrics = service.getMetrics();
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.totalWrites).toBe(0);
      expect(metrics.totalReads).toBe(0);
    });
  });

  // ──────────── getCacheStats ────────────

  describe('getCacheStats', () => {
    it('should return current cache statistics', () => {
      service.configureCache(50, 60000);
      service.setCachedQuery('key1', [createDataPoint()]);
      service.setCachedQuery('key2', [createDataPoint()]);

      const stats = service.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(50);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});
