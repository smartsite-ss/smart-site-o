// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StorageHealthService } from '../storage-health.service';
import { StorageEngineRouterService } from '../storage-engine-router.service';
import { STORAGE_ENGINE_TYPES } from '../storage-engine-types';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';

describe('StorageHealthService', () => {
  let service: StorageHealthService;
  let mockRouter: jest.Mocked<StorageEngineRouterService>;
  let mockAdapter: jest.Mocked<StorageAdapter>;

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
    mockAdapter = createMockAdapter('InfluxDB');

    mockRouter = {
      getAdapter: jest.fn(),
      getAdapterForEngine: jest.fn().mockReturnValue(mockAdapter),
      registerAdapter: jest.fn(),
      getAvailableEngines: jest.fn().mockReturnValue([STORAGE_ENGINE_TYPES.INFLUXDB2]),
    } as any;

    service = new StorageHealthService(mockRouter);
  });

  afterEach(() => {
    delete process.env.STORAGE_DISK_USAGE_PERCENT;
    jest.clearAllMocks();
  });

  // ──────────── checkHealth ────────────

  describe('checkHealth', () => {
    it('TC-STO-060: should return healthy when all adapters are healthy and disk is normal', async () => {
      mockAdapter.health.mockResolvedValue({ status: 'healthy', details: { version: '2.7' } });

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks.length).toBeGreaterThanOrEqual(1);
      const adapterCheck = result.checks.find(
        (c) => c.name === `${STORAGE_ENGINE_TYPES.INFLUXDB2} adapter`,
      );
      expect(adapterCheck).toBeDefined();
      expect(adapterCheck!.status).toBe('healthy');
    });

    it('TC-STO-061: should return degraded when disk usage is above 80%', async () => {
      process.env.STORAGE_DISK_USAGE_PERCENT = '85';
      mockAdapter.health.mockResolvedValue({ status: 'healthy' });

      const result = await service.checkHealth();

      expect(result.status).toBe('degraded');
      const diskCheck = result.checks.find((c) => c.name === 'disk');
      expect(diskCheck).toBeDefined();
      expect(diskCheck!.status).toBe('degraded');
    });

    it('TC-STO-062: should return unhealthy when disk usage is above 90%', async () => {
      process.env.STORAGE_DISK_USAGE_PERCENT = '95';
      mockAdapter.health.mockResolvedValue({ status: 'healthy' });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      const diskCheck = result.checks.find((c) => c.name === 'disk');
      expect(diskCheck).toBeDefined();
      expect(diskCheck!.status).toBe('unhealthy');
    });

    it('should return unhealthy when an adapter reports unhealthy', async () => {
      mockAdapter.health.mockResolvedValue({
        status: 'unhealthy',
        details: { error: 'Connection refused' },
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should handle adapter health check errors gracefully', async () => {
      mockAdapter.health.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.checkHealth();

      const adapterCheck = result.checks.find(
        (c) => c.name === `${STORAGE_ENGINE_TYPES.INFLUXDB2} adapter`,
      );
      expect(adapterCheck).toBeDefined();
      expect(adapterCheck!.status).toBe('unhealthy');
      expect(adapterCheck!.message).toBe('Connection timeout');
      expect(result.status).toBe('unhealthy');
    });
  });

  // ──────────── getStorageMetrics ────────────

  describe('getStorageMetrics', () => {
    it('TC-STO-063: should return storage metrics with default values', async () => {
      const metrics = await service.getStorageMetrics();

      expect(metrics.diskUsagePercent).toBeDefined();
      expect(metrics.diskTotalGb).toBe(100);
      expect(metrics.diskUsedGb).toBeDefined();
      expect(metrics.writeRate).toBe(0);
      expect(metrics.readRate).toBe(0);
      expect(metrics.avgLatencyMs).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('TC-STO-064: should include all required fields in metrics', async () => {
      const metrics = await service.getStorageMetrics();

      expect(metrics).toHaveProperty('diskUsagePercent');
      expect(metrics).toHaveProperty('diskTotalGb');
      expect(metrics).toHaveProperty('diskUsedGb');
      expect(metrics).toHaveProperty('writeRate');
      expect(metrics).toHaveProperty('readRate');
      expect(metrics).toHaveProperty('avgLatencyMs');
      expect(metrics).toHaveProperty('errorCount');
    });

    it('should reflect disk usage percent from env', async () => {
      process.env.STORAGE_DISK_USAGE_PERCENT = '75';

      const metrics = await service.getStorageMetrics();

      expect(metrics.diskUsagePercent).toBe(75);
      expect(metrics.diskUsedGb).toBe(75);
    });

    it('should track error count from health checks', async () => {
      mockAdapter.health.mockRejectedValue(new Error('Fail'));
      await service.checkHealth();

      const metrics = await service.getStorageMetrics();

      expect(metrics.errorCount).toBeGreaterThan(0);
    });
  });
});
