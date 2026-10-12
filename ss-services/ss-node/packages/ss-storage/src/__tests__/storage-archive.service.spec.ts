// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StorageArchiveService, ArchiveConfig } from '../storage-archive.service';
import { StorageEngineRouterService } from '../storage-engine-router.service';
import { StorageAdapter, DataPoint } from '../interfaces/storage-adapter.interface';

describe('StorageArchiveService', () => {
  let service: StorageArchiveService;
  let mockRouter: jest.Mocked<StorageEngineRouterService>;
  let mockAdapter: jest.Mocked<StorageAdapter>;

  const createDataPoint = (overrides: Partial<DataPoint> = {}): DataPoint => ({
    tagId: 'tag-001',
    deviceId: 'dev-001',
    projectId: 'proj-001',
    value: 42.5,
    timestamp: new Date('2025-05-01T10:30:00Z'),
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

    mockRouter = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
      getAdapterForEngine: jest.fn(),
      registerAdapter: jest.fn(),
      getAvailableEngines: jest.fn(),
    } as any;

    service = new StorageArchiveService(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── setArchiveConfig / getArchiveConfig ────────────

  describe('setArchiveConfig / getArchiveConfig', () => {
    it('TC-STO-050: should set and retrieve archive config', () => {
      const config: ArchiveConfig = {
        retentionDays: 60,
        hotDays: 3,
        warmDays: 14,
        compressionEnabled: true,
      };

      service.setArchiveConfig('proj-1', config);

      const result = service.getArchiveConfig('proj-1');
      expect(result.retentionDays).toBe(60);
      expect(result.hotDays).toBe(3);
      expect(result.warmDays).toBe(14);
      expect(result.compressionEnabled).toBe(true);
    });

    it('TC-STO-051: should return default config when no project config is set', () => {
      const result = service.getArchiveConfig('proj-unknown');

      expect(result.retentionDays).toBe(90);
      expect(result.hotDays).toBe(7);
      expect(result.warmDays).toBe(30);
      expect(result.compressionEnabled).toBe(false);
    });

    it('should return a copy of config to prevent mutation', () => {
      const config: ArchiveConfig = {
        retentionDays: 30,
        hotDays: 1,
        warmDays: 7,
        compressionEnabled: false,
      };
      service.setArchiveConfig('proj-1', config);

      const result1 = service.getArchiveConfig('proj-1');
      result1.retentionDays = 999;

      const result2 = service.getArchiveConfig('proj-1');
      expect(result2.retentionDays).toBe(30);
    });
  });

  // ──────────── archiveData ────────────

  describe('archiveData', () => {
    it('TC-STO-052: should archive data and calculate size', async () => {
      const points = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];
      mockAdapter.read.mockResolvedValue(points);

      const result = await service.archiveData('proj-1', new Date('2025-06-01T00:00:00Z'));

      expect(result.archivedCount).toBe(2);
      expect(result.archivedSize).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockRouter.getAdapter).toHaveBeenCalledWith('proj-1');
    });

    it('TC-STO-055: should apply compression when enabled', async () => {
      const points = [createDataPoint()];
      mockAdapter.read.mockResolvedValue(points);

      service.setArchiveConfig('proj-1', {
        retentionDays: 90,
        hotDays: 7,
        warmDays: 30,
        compressionEnabled: true,
      });

      const result = await service.archiveData('proj-1', new Date('2025-06-01T00:00:00Z'));

      // With compression, size should be ~30% of original
      const rawSize = JSON.stringify(points[0]).length;
      expect(result.archivedSize).toBeLessThan(rawSize);
    });
  });

  // ──────────── cleanupExpired ────────────

  describe('cleanupExpired', () => {
    it('TC-STO-053: should cleanup expired data based on retention config', async () => {
      mockAdapter.delete.mockResolvedValue(150);
      service.setArchiveConfig('proj-1', {
        retentionDays: 30,
        hotDays: 7,
        warmDays: 14,
        compressionEnabled: false,
      });

      const result = await service.cleanupExpired('proj-1');

      expect(result).toBe(150);
      expect(mockAdapter.delete).toHaveBeenCalledTimes(1);
      const deleteArg = mockAdapter.delete.mock.calls[0][0];
      expect(deleteArg.before).toBeDefined();
    });

    it('should propagate errors from adapter', async () => {
      mockAdapter.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.cleanupExpired('proj-1')).rejects.toThrow('Delete failed');
    });
  });

  // ──────────── getDataTier ────────────

  describe('getDataTier', () => {
    it('TC-STO-054: should classify data as hot when age is within hotDays', () => {
      const now = new Date();
      const recentTimestamp = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const tier = service.getDataTier('proj-1', recentTimestamp);

      expect(tier).toBe('hot');
    });

    it('should classify data as warm when age is between hotDays and warmDays', () => {
      const now = new Date();
      const warmTimestamp = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

      const tier = service.getDataTier('proj-1', warmTimestamp);

      expect(tier).toBe('warm');
    });

    it('should classify data as cold when age exceeds warmDays', () => {
      const now = new Date();
      const coldTimestamp = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      const tier = service.getDataTier('proj-1', coldTimestamp);

      expect(tier).toBe('cold');
    });

    it('should respect custom hot/warm thresholds', () => {
      service.setArchiveConfig('proj-1', {
        retentionDays: 90,
        hotDays: 1,
        warmDays: 3,
        compressionEnabled: false,
      });

      const now = new Date();
      const hotTimestamp = new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000);
      const warmTimestamp = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const coldTimestamp = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      expect(service.getDataTier('proj-1', hotTimestamp)).toBe('hot');
      expect(service.getDataTier('proj-1', warmTimestamp)).toBe('warm');
      expect(service.getDataTier('proj-1', coldTimestamp)).toBe('cold');
    });
  });
});
