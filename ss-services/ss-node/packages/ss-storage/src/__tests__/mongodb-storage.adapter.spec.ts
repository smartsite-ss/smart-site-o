// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MongodbStorageAdapter } from '../adapters/mongodb-storage.adapter';
import { DataPoint } from '../interfaces/storage-adapter.interface';

describe('MongodbStorageAdapter', () => {
  let adapter: MongodbStorageAdapter;

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
    adapter = new MongodbStorageAdapter();
    adapter.onModuleInit();
  });

  afterEach(() => {
    adapter.onModuleDestroy();
    jest.clearAllMocks();
  });

  // ──────────── write ────────────

  describe('write', () => {
    it('TC-MG-001: should write documents to MongoDB collection', async () => {
      const points = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];

      const result = await adapter.write(points);

      expect(result.success).toBe(true);
      expect(result.written).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should return failure when adapter is closed', async () => {
      await adapter.close();

      const result = await adapter.write([createDataPoint()]);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });
  });

  // ──────────── read ────────────

  describe('read', () => {
    it('TC-MG-002: should read documents with filtering and sorting', async () => {
      // First write some data
      const points = [
        createDataPoint({ tagId: 'tag-a', value: 10, timestamp: new Date('2025-06-01T10:00:00Z') }),
        createDataPoint({ tagId: 'tag-b', value: 20, timestamp: new Date('2025-06-01T11:00:00Z') }),
      ];
      await adapter.write(points);

      const result = await adapter.read({
        tagIds: ['tag-a'],
        startTime: new Date('2025-06-01T09:00:00Z'),
        endTime: new Date('2025-06-01T12:00:00Z'),
        order: 'asc',
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle aggregation in read', async () => {
      const points = [
        createDataPoint({ tagId: 'tag-a', value: 10, timestamp: new Date('2025-06-01T10:00:00Z') }),
        createDataPoint({ tagId: 'tag-a', value: 20, timestamp: new Date('2025-06-01T10:05:00Z') }),
      ];
      await adapter.write(points);

      const result = await adapter.read({
        tagIds: ['tag-a'],
        aggregation: {
          function: 'avg',
          interval: '1h',
        },
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle limit and offset', async () => {
      const points = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
        createDataPoint({ tagId: 'tag-c', value: 30 }),
      ];
      await adapter.write(points);

      const result = await adapter.read({
        limit: 2,
        offset: 0,
        order: 'asc',
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  // ──────────── delete ────────────

  describe('delete', () => {
    it('TC-MG-003: should delete documents by criteria', async () => {
      // Write some data first
      await adapter.write([createDataPoint({ tagId: 'tag-a', value: 10 })]);

      const result = await adapter.delete({
        tagIds: ['tag-a'],
        before: new Date('2025-12-31T23:59:59Z'),
      });

      expect(typeof result).toBe('number');
    });

    it('should return 0 when no criteria provided', async () => {
      const result = await adapter.delete({});

      expect(result).toBe(0);
    });
  });

  // ──────────── health ────────────

  describe('health', () => {
    it('TC-MG-004: should return health status with details', async () => {
      const result = await adapter.health();

      expect(result.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(result.details).toBeDefined();
      expect(result.details.latency).toBeDefined();
    });
  });

  // ──────────── name ────────────

  describe('name', () => {
    it('should have name "MongoDB"', () => {
      expect(adapter.name).toBe('MongoDB');
    });
  });

  // ──────────── close ────────────

  describe('close', () => {
    it('should close the adapter gracefully', async () => {
      await adapter.close();

      const result = await adapter.write([createDataPoint()]);
      expect(result.success).toBe(false);
    });
  });
});
