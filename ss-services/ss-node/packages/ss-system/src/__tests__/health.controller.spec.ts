// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health/health.controller';
import { HealthService } from '../health/health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthService: any;

  beforeEach(async () => {
    mockHealthService = {
      getSimple: jest.fn().mockReturnValue({
        status: 'ok',
        uptime: 12345,
        timestamp: '2026-07-12T00:00:00.000Z',
      }),
      getDetailed: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: {},
        uptime: 12345,
        memory: { total: 16000000000, free: 8000000000, used: 8000000000, usagePercent: 50 },
        memoryThresholds: { warnPercent: 70, criticalPercent: 85 },
        cpuLoad: [0.5, 0.3, 0.1],
        nodeVersion: 'v20.0.0',
        platform: 'win32',
        hostname: 'test-host',
        pid: 1234,
        disks: {},
        diskThresholds: { warnPercent: 70, criticalPercent: 85 },
      }),
      getLiveness: jest.fn().mockReturnValue({
        status: 'ok',
        timestamp: '2026-07-12T00:00:00.000Z',
      }),
      getReadiness: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: ['database', 'memory'],
      }),
      getDiskPartitions: jest.fn().mockResolvedValue({
        appDir: {
          path: '/app',
          totalBytes: 100000000000,
          freeBytes: 50000000000,
          usedBytes: 50000000000,
          usagePercent: 50,
          totalFormatted: '100.00 GB',
          freeFormatted: '50.00 GB',
          usedFormatted: '50.00 GB',
          status: 'normal',
        },
        dataDir: {
          path: '/data',
          totalBytes: 200000000000,
          freeBytes: 100000000000,
          usedBytes: 100000000000,
          usagePercent: 50,
          totalFormatted: '200.00 GB',
          freeFormatted: '100.00 GB',
          usedFormatted: '100.00 GB',
          status: 'normal',
        },
        backupDir: {
          path: '/backups',
          totalBytes: 300000000000,
          freeBytes: 150000000000,
          usedBytes: 150000000000,
          usagePercent: 50,
          totalFormatted: '300.00 GB',
          freeFormatted: '150.00 GB',
          usedFormatted: '150.00 GB',
          status: 'normal',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  // ==================== 简单健康检查 ====================

  describe('GET /health', () => {
    it('TC-HCTL-001: should return simple health status', () => {
      const result = controller.health();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.uptime).toBe(12345);
      expect(result.timestamp).toBeDefined();
      expect(mockHealthService.getSimple).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 详细健康检查 ====================

  describe('GET /health/detailed', () => {
    it('TC-HCTL-010: should return detailed health with all metrics', async () => {
      const result = await controller.detailedHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.memory).toBeDefined();
      expect(result.memoryThresholds).toBeDefined();
      expect(result.cpuLoad).toBeDefined();
      expect(result.disks).toBeDefined();
      expect(result.diskThresholds).toBeDefined();
      expect(mockHealthService.getDetailed).toHaveBeenCalledTimes(1);
    });

    it('TC-HCTL-011: should return error status when health is degraded', async () => {
      mockHealthService.getDetailed.mockResolvedValueOnce({
        status: 'error',
        checks: {
          database: { status: 'error', message: 'Connection refused', latencyMs: 100 },
        },
        uptime: 12345,
        memory: { total: 16000000000, free: 1000000000, used: 15000000000, usagePercent: 93.75 },
        memoryThresholds: { warnPercent: 70, criticalPercent: 85 },
        cpuLoad: [2.5, 1.8, 1.2],
        nodeVersion: 'v20.0.0',
        platform: 'win32',
        hostname: 'test-host',
        pid: 1234,
        disks: {},
        diskThresholds: { warnPercent: 70, criticalPercent: 85 },
      });

      const result = await controller.detailedHealth();

      expect(result.status).toBe('error');
      expect(mockHealthService.getDetailed).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 磁盘信息 ====================

  describe('GET /health/disk-info', () => {
    it('TC-HCTL-020: should return disk partition info', async () => {
      const result = await controller.diskInfo();

      expect(result).toBeDefined();
      expect(result.appDir).toBeDefined();
      expect(result.appDir.path).toBe('/app');
      expect(result.dataDir).toBeDefined();
      expect(result.backupDir).toBeDefined();
      expect(mockHealthService.getDiskPartitions).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== Liveness 探针 ====================

  describe('GET /health/live', () => {
    it('TC-HCTL-030: should return liveness status', () => {
      const result = controller.liveness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(mockHealthService.getLiveness).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== Readiness 探针 ====================

  describe('GET /health/ready', () => {
    it('TC-HCTL-040: should return readiness with checks', async () => {
      const result = await controller.readiness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.checks).toContain('database');
      expect(result.checks).toContain('memory');
      expect(mockHealthService.getReadiness).toHaveBeenCalledTimes(1);
    });

    it('TC-HCTL-041: should return error when not ready', async () => {
      mockHealthService.getReadiness.mockResolvedValueOnce({
        status: 'error',
        checks: [],
        details: { database: 'Connection refused', memory: 'Low memory' },
      });

      const result = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.checks).toHaveLength(0);
      expect(result.details).toBeDefined();
      expect(mockHealthService.getReadiness).toHaveBeenCalledTimes(1);
    });
  });
});
