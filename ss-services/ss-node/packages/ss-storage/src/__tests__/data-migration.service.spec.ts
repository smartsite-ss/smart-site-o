// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  DataMigrationService,
  MigrationConfig,
  MigrationCheckpoint,
} from '../services/data-migration.service';
import { StorageAdapter, DataPoint } from '../interfaces/storage-adapter.interface';

describe('DataMigrationService', () => {
  let service: DataMigrationService;
  let mockSourceAdapter: jest.Mocked<StorageAdapter>;
  let mockTargetAdapter: jest.Mocked<StorageAdapter>;

  const createDataPoint = (overrides: Partial<DataPoint> = {}): DataPoint => ({
    tagId: 'tag-001',
    deviceId: 'dev-001',
    projectId: 'proj-001',
    value: 42.5,
    timestamp: new Date('2025-06-01T10:30:00Z'),
    quality: 95,
    ...overrides,
  });

  const createMockAdapter = (name: string): jest.Mocked<StorageAdapter> => ({
    name,
    engineType: name,
    capabilities: { delete: true, interpolation: false, aggregation: false },
    write: jest.fn().mockResolvedValue({ success: true, written: 0, failed: 0 }),
    read: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(0),
    health: jest.fn().mockResolvedValue({ status: 'healthy' }),
    close: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    mockSourceAdapter = createMockAdapter('SQLite');
    mockTargetAdapter = createMockAdapter('InfluxDB');
    service = new DataMigrationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── migrate ────────────

  describe('migrate', () => {
    it('TC-DM-001: should migrate data from SQLite to InfluxDB', async () => {
      const batch1 = [
        createDataPoint({ tagId: 'tag-a', timestamp: new Date('2025-06-01T10:00:00Z'), value: 10 }),
        createDataPoint({ tagId: 'tag-b', timestamp: new Date('2025-06-01T10:01:00Z'), value: 20 }),
      ];
      const batch2 = [
        createDataPoint({ tagId: 'tag-c', timestamp: new Date('2025-06-01T10:02:00Z'), value: 30 }),
      ];

      // First call returns batch1, second returns batch2, third returns empty
      mockSourceAdapter.read
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce([]);

      mockTargetAdapter.write.mockResolvedValue({
        success: true,
        written: batch1.length,
        failed: 0,
      });

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
        batchSize: 2,
      };

      const result = await service.migrate('mig-001', config);

      expect(result.totalMigrated).toBeGreaterThan(0);
      expect(result.totalFailed).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.checksum).toBeDefined();
      expect(result.checksum.length).toBe(64); // SHA256 hex
      expect(mockSourceAdapter.read).toHaveBeenCalled();
      expect(mockTargetAdapter.write).toHaveBeenCalled();
    });

    it('TC-DM-002: should support checkpoint resume', async () => {
      // Pre-populate a checkpoint
      const checkpoint: MigrationCheckpoint = {
        lastMigratedTimestamp: new Date('2025-06-01T10:01:00Z'),
        lastMigratedTagId: 'tag-b',
        totalMigrated: 2,
      };
      (service as any).checkpoints.set('mig-002', checkpoint);

      const batch = [
        createDataPoint({ tagId: 'tag-c', timestamp: new Date('2025-06-01T10:02:00Z'), value: 30 }),
      ];
      mockSourceAdapter.read.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockTargetAdapter.write.mockResolvedValue({ success: true, written: 1, failed: 0 });

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
        batchSize: 10,
      };

      const result = await service.migrate('mig-002', config);

      expect(result.totalMigrated).toBe(3); // 2 from checkpoint + 1 new
      expect(mockSourceAdapter.read).toHaveBeenCalled();
      // The first read call should use the checkpoint timestamp
      const firstCall = mockSourceAdapter.read.mock.calls[0][0];
      expect(firstCall.startTime).toEqual(checkpoint.lastMigratedTimestamp);
    });

    it('TC-DM-003: should verify consistency after migration', async () => {
      const batch = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockSourceAdapter.read
        .mockResolvedValueOnce(batch) // batch read
        .mockResolvedValueOnce([]) // no more
        .mockResolvedValueOnce(batch); // consistency check: source read

      mockTargetAdapter.write.mockResolvedValue({ success: true, written: 1, failed: 0 });
      mockTargetAdapter.read.mockResolvedValueOnce(batch); // consistency check: target read

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
      };

      const result = await service.migrate('mig-003', config);

      expect(result.verified).toBe(true);
    });

    it('TC-DM-004: should report migration progress', async () => {
      const batch = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];
      mockSourceAdapter.read.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockTargetAdapter.write.mockResolvedValue({ success: true, written: 2, failed: 0 });

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
      };

      // Start migration but don't await - check progress during
      const migrationPromise = service.migrate('mig-004', config);
      await migrationPromise;

      const progress = service.getProgress();
      expect(progress.status).toBe('completed');
      expect(progress.percentage).toBe(100);
      expect(progress.migrated).toBe(2);
      expect(progress.startedAt).toBeDefined();
      expect(progress.completedAt).toBeDefined();
    });

    it('TC-DM-005: should handle empty source', async () => {
      mockSourceAdapter.read.mockResolvedValue([]);

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
      };

      const result = await service.migrate('mig-005', config);

      expect(result.totalMigrated).toBe(0);
      expect(result.totalFailed).toBe(0);
      expect(result.verified).toBe(true);
      expect(mockTargetAdapter.write).not.toHaveBeenCalled();
    });

    it('TC-DM-006: should handle errors during migration', async () => {
      mockSourceAdapter.read.mockRejectedValue(new Error('Source read failed'));

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
      };

      await expect(service.migrate('mig-006', config)).rejects.toThrow('Source read failed');

      const progress = service.getProgress();
      expect(progress.status).toBe('failed');
    });

    it('TC-DM-007: should handle batch migration with multiple batches', async () => {
      const batches = Array.from({ length: 5 }, (_, i) => [
        createDataPoint({ tagId: `tag-${i}`, value: i * 10 }),
      ]);

      mockSourceAdapter.read
        .mockResolvedValueOnce(batches[0])
        .mockResolvedValueOnce(batches[1])
        .mockResolvedValueOnce(batches[2])
        .mockResolvedValueOnce(batches[3])
        .mockResolvedValueOnce(batches[4])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(batches[0]); // consistency check: source read

      mockTargetAdapter.write.mockResolvedValue({ success: true, written: 1, failed: 0 });
      mockTargetAdapter.read.mockResolvedValueOnce(batches[0]); // consistency check: target read

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
        batchSize: 1,
      };

      const result = await service.migrate('mig-007', config);

      expect(result.totalMigrated).toBe(5);
      expect(mockSourceAdapter.read).toHaveBeenCalledTimes(7); // 5 batches + 1 empty + 1 consistency source
      expect(mockTargetAdapter.write).toHaveBeenCalledTimes(5);
    });

    it('TC-DM-008: should support migration cancellation', async () => {
      const batch = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockSourceAdapter.read.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockTargetAdapter.write.mockResolvedValue({ success: true, written: 1, failed: 0 });

      // Cancel immediately after starting
      service.cancelMigration('mig-008');

      const config: MigrationConfig = {
        sourceAdapter: mockSourceAdapter,
        targetAdapter: mockTargetAdapter,
      };

      const _result = await service.migrate('mig-008', config);

      const progress = service.getProgress();
      expect(progress.status).toBe('cancelled');
    });
  });

  // ──────────── getCheckpoint / clearCheckpoint ────────────

  describe('getCheckpoint / clearCheckpoint', () => {
    it('should return undefined for non-existent checkpoint', () => {
      const checkpoint = service.getCheckpoint('non-existent');
      expect(checkpoint).toBeUndefined();
    });

    it('should clear checkpoint', () => {
      const checkpoint: MigrationCheckpoint = {
        lastMigratedTimestamp: new Date(),
        lastMigratedTagId: 'tag-a',
        totalMigrated: 5,
      };
      (service as any).checkpoints.set('mig-cp', checkpoint);

      service.clearCheckpoint('mig-cp');

      expect(service.getCheckpoint('mig-cp')).toBeUndefined();
    });
  });

  // ──────────── computeChecksum ────────────

  describe('computeChecksum', () => {
    it('should produce deterministic checksum', () => {
      const data = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];

      const checksum1 = service.computeChecksum(data);
      const checksum2 = service.computeChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different data', () => {
      const data1 = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      const data2 = [createDataPoint({ tagId: 'tag-a', value: 20 })];

      const checksum1 = service.computeChecksum(data1);
      const checksum2 = service.computeChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should be order-independent (sorted internally)', () => {
      const data1 = [
        createDataPoint({ tagId: 'tag-b', value: 20 }),
        createDataPoint({ tagId: 'tag-a', value: 10 }),
      ];
      const data2 = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];

      const checksum1 = service.computeChecksum(data1);
      const checksum2 = service.computeChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });
  });

  // ──────────── verifyConsistency ────────────

  describe('verifyConsistency', () => {
    it('should return true when source and target match', async () => {
      const data = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockSourceAdapter.read.mockResolvedValue(data);
      mockTargetAdapter.read.mockResolvedValue(data);

      const result = await service.verifyConsistency(mockSourceAdapter, mockTargetAdapter);

      expect(result).toBe(true);
    });

    it('should return false when source and target differ', async () => {
      mockSourceAdapter.read.mockResolvedValue([createDataPoint({ value: 10 })]);
      mockTargetAdapter.read.mockResolvedValue([createDataPoint({ value: 20 })]);

      const result = await service.verifyConsistency(mockSourceAdapter, mockTargetAdapter);

      expect(result).toBe(false);
    });

    it('should return false when verification encounters error', async () => {
      mockSourceAdapter.read.mockRejectedValue(new Error('Read failed'));

      const result = await service.verifyConsistency(mockSourceAdapter, mockTargetAdapter);

      expect(result).toBe(false);
    });
  });
});
