// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MysqlStorageAdapter } from '../adapters/mysql-storage.adapter';
import { DataPoint } from '../interfaces/storage-adapter.interface';

describe('MysqlStorageAdapter', () => {
  let adapter: MysqlStorageAdapter;

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
    adapter = new MysqlStorageAdapter();
    adapter.onModuleInit();
  });

  afterEach(() => {
    adapter.onModuleDestroy();
    jest.clearAllMocks();
  });

  // ──────────── write ────────────

  describe('write', () => {
    it('TC-MY-001: should write data points to MySQL', async () => {
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
    it('TC-MY-002: should read data with query options', async () => {
      const result = await adapter.read({
        tagIds: ['tag-001'],
        startTime: new Date('2025-06-01T00:00:00Z'),
        endTime: new Date('2025-06-02T00:00:00Z'),
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle aggregation query', async () => {
      const result = await adapter.read({
        tagIds: ['tag-001'],
        startTime: new Date('2025-06-01T00:00:00Z'),
        endTime: new Date('2025-06-02T00:00:00Z'),
        aggregation: {
          function: 'avg',
          interval: '1h',
        },
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ──────────── delete ────────────

  describe('delete', () => {
    it('TC-MY-003: should delete data by criteria', async () => {
      const result = await adapter.delete({
        tagIds: ['tag-001'],
        before: new Date('2025-01-01T00:00:00Z'),
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
    it('TC-MY-004: should return health status', async () => {
      const result = await adapter.health();

      expect(result.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(result.details).toBeDefined();
    });
  });

  // ──────────── name ────────────

  describe('name', () => {
    it('should have name "MySQL"', () => {
      expect(adapter.name).toBe('MySQL');
    });
  });

  // ──────────── close ────────────

  describe('close', () => {
    it('should close the adapter', async () => {
      await adapter.close();

      // After close, writes should fail
      const result = await adapter.write([createDataPoint()]);
      expect(result.success).toBe(false);
    });
  });
});
