// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BackupService, BackupFile } from '../services/backup.service';
import { StorageEngineRouterService } from '../storage-engine-router.service';
import { StorageAdapter, DataPoint } from '../interfaces/storage-adapter.interface';

describe('BackupService', () => {
  let service: BackupService;
  let mockRouter: jest.Mocked<StorageEngineRouterService>;
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

    mockRouter = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
      getAdapterForEngine: jest.fn(),
      registerAdapter: jest.fn(),
      getAvailableEngines: jest.fn(),
    } as any;

    service = new BackupService(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── createFullBackup ────────────

  describe('createFullBackup', () => {
    it('TC-BK-001: should create full backup and store data', async () => {
      const data = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);

      const result = await service.createFullBackup('proj-001');

      expect(result.type).toBe('full');
      expect(result.recordCount).toBe(2);
      expect(result.size).toBeGreaterThan(0);
      expect(result.checksum).toBeDefined();
      expect(result.checksum.length).toBe(64);
      expect(result.duration).toBeGreaterThanOrEqual(0);

      const backups = service.listBackups('proj-001');
      expect(backups.length).toBe(1);
      expect(backups[0].id).toBe(result.backupId);
      expect(backups[0].status).toBe('completed');
    });

    it('should handle empty project data', async () => {
      mockAdapter.read.mockResolvedValue([]);

      const result = await service.createFullBackup('proj-001');

      expect(result.recordCount).toBe(0);
      expect(result.size).toBe(0);
    });

    it('should throw error when backup size exceeds limit', async () => {
      // Override the MAX_BACKUP_SIZE_GB to a small value for testing
      (service as any).MAX_BACKUP_SIZE_GB = 0.0001; // ~100KB limit
      const largeStr = 'x'.repeat(1024); // 1KB per point
      const hugeData = Array.from({ length: 200 }, (_, i) =>
        createDataPoint({ tagId: `tag-${i}`, value: largeStr }),
      );
      mockAdapter.read.mockResolvedValueOnce(hugeData).mockResolvedValueOnce([]);

      await expect(service.createFullBackup('proj-001')).rejects.toThrow('Insufficient space');
    });
  });

  // ──────────── createIncrementalBackup ────────────

  describe('createIncrementalBackup', () => {
    it('TC-BK-002: should create incremental backup based on full backup', async () => {
      // First create a full backup
      const fullData = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockAdapter.read.mockResolvedValueOnce(fullData);
      const fullResult = await service.createFullBackup('proj-001');

      // Reset mock for incremental backup
      mockAdapter.read.mockReset();
      const incrData = [
        createDataPoint({ tagId: 'tag-b', value: 20, timestamp: new Date('2025-06-02T10:00:00Z') }),
      ];
      mockAdapter.read.mockResolvedValueOnce(incrData);

      const result = await service.createIncrementalBackup('proj-001', fullResult.backupId);

      expect(result.type).toBe('incremental');
      expect(result.recordCount).toBe(1);

      const backups = service.listBackups('proj-001');
      expect(backups.length).toBe(2);
    });

    it('should throw error when base backup not found', async () => {
      await expect(service.createIncrementalBackup('proj-001', 'non-existent-id')).rejects.toThrow(
        'Base backup non-existent-id not found',
      );
    });

    it('should throw error when base backup is not completed', async () => {
      const failedBackup: BackupFile = {
        id: 'bkf-failed',
        projectId: 'proj-001',
        type: 'full',
        size: 0,
        recordCount: 0,
        checksum: '',
        createdAt: new Date(),
        status: 'failed',
      };
      (service as any).backups.set('bkf-failed', failedBackup);

      await expect(service.createIncrementalBackup('proj-001', 'bkf-failed')).rejects.toThrow(
        'not in completed state',
      );
    });
  });

  // ──────────── restore ────────────

  describe('restore', () => {
    it('TC-BK-003: should restore backup with validation', async () => {
      // Create full backup
      const data = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      const backupResult = await service.createFullBackup('proj-001');

      // For restore, adapter reads existing data (empty) and writes restored data
      mockAdapter.read.mockResolvedValue([]);
      mockAdapter.write.mockResolvedValue({ success: true, written: 2, failed: 0 });

      const restoreResult = await service.restore({
        backupId: backupResult.backupId,
        projectId: 'proj-001',
        validateIntegrity: true,
      });

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredCount).toBe(2);
      expect(mockAdapter.write).toHaveBeenCalled();
    });

    it('TC-BK-006: should pass integrity check for valid backup', async () => {
      const data = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      const backupResult = await service.createFullBackup('proj-001');

      mockAdapter.read.mockResolvedValue([]);
      mockAdapter.write.mockResolvedValue({ success: true, written: 1, failed: 0 });

      const restoreResult = await service.restore({
        backupId: backupResult.backupId,
        projectId: 'proj-001',
        validateIntegrity: true,
      });

      expect(restoreResult.success).toBe(true);
    });

    it('should fail restore when integrity check fails', async () => {
      const data = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      const backupResult = await service.createFullBackup('proj-001');

      // Tamper with the backup data
      const tamperedData = [createDataPoint({ tagId: 'tag-a', value: 999 })];
      (service as any).backupData.set(backupResult.backupId, tamperedData);

      mockAdapter.read.mockResolvedValue([]);

      await expect(
        service.restore({
          backupId: backupResult.backupId,
          projectId: 'proj-001',
          validateIntegrity: true,
        }),
      ).rejects.toThrow('integrity check failed');
    });

    it('TC-BK-007: should perform space check during restore', async () => {
      const data = [createDataPoint({ tagId: 'tag-a', value: 10 })];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      const backupResult = await service.createFullBackup('proj-001');

      mockAdapter.read.mockResolvedValue([]);
      mockAdapter.write.mockResolvedValue({ success: true, written: 1, failed: 0 });

      const restoreResult = await service.restore({
        backupId: backupResult.backupId,
        projectId: 'proj-001',
        checkSpace: true,
        maxSpaceGb: 100,
      });

      expect(restoreResult.success).toBe(true);
    });

    it('TC-BK-008: should detect conflicts during restore', async () => {
      const data = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
      ];
      mockAdapter.read.mockResolvedValueOnce(data);
      const backupResult = await service.createFullBackup('proj-001');

      // Reset mock for restore: target already has overlapping data
      mockAdapter.read.mockReset();
      const existingData = [createDataPoint({ tagId: 'tag-a', value: 5 })];
      mockAdapter.read.mockResolvedValue(existingData);
      mockAdapter.write.mockResolvedValue({ success: true, written: 2, failed: 0 });

      const restoreResult = await service.restore({
        backupId: backupResult.backupId,
        projectId: 'proj-001',
      });

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.conflicts.length).toBeGreaterThan(0);
    });

    it('should throw error when backup not found', async () => {
      await expect(
        service.restore({ backupId: 'non-existent', projectId: 'proj-001' }),
      ).rejects.toThrow('Backup non-existent not found');
    });
  });

  // ──────────── listBackups ────────────

  describe('listBackups', () => {
    it('TC-BK-004: should list backups by project', async () => {
      const data = [createDataPoint()];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      await service.createFullBackup('proj-001');

      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      await service.createFullBackup('proj-002');

      const proj1Backups = service.listBackups('proj-001');
      expect(proj1Backups.length).toBe(1);
      expect(proj1Backups[0].projectId).toBe('proj-001');

      const allBackups = service.listBackups();
      expect(allBackups.length).toBe(2);
    });

    it('should return empty array when no backups exist', () => {
      const backups = service.listBackups('proj-unknown');
      expect(backups).toEqual([]);
    });
  });

  // ──────────── getBackup ────────────

  describe('getBackup', () => {
    it('should return backup by ID', async () => {
      const data = [createDataPoint()];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      const result = await service.createFullBackup('proj-001');

      const backup = service.getBackup(result.backupId);
      expect(backup).toBeDefined();
      expect(backup!.id).toBe(result.backupId);
    });

    it('should return undefined for non-existent backup', () => {
      const backup = service.getBackup('non-existent');
      expect(backup).toBeUndefined();
    });

    it('should return a copy to prevent mutation', async () => {
      const data = [createDataPoint()];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      const result = await service.createFullBackup('proj-001');

      const backup = service.getBackup(result.backupId);
      backup!.recordCount = 999;

      const backup2 = service.getBackup(result.backupId);
      expect(backup2!.recordCount).toBe(1);
    });
  });

  // ──────────── deleteBackup ────────────

  describe('deleteBackup', () => {
    it('TC-BK-005: should delete backup file', async () => {
      const data = [createDataPoint()];
      mockAdapter.read.mockResolvedValueOnce(data).mockResolvedValueOnce([]);
      const result = await service.createFullBackup('proj-001');

      const deleted = service.deleteBackup(result.backupId);
      expect(deleted).toBe(true);

      const backups = service.listBackups('proj-001');
      expect(backups.length).toBe(0);
    });

    it('should return false when deleting non-existent backup', () => {
      const deleted = service.deleteBackup('non-existent');
      expect(deleted).toBe(false);
    });
  });
});
