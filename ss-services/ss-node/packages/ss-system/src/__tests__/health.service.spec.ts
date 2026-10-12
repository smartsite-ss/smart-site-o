// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import { HealthService } from '../health/health.service';

jest.mock('@ss-node/ss-core', () => ({
  PathResolverService: jest.fn().mockImplementation(() => ({
    resolve: jest.fn((p: string) => p),
    getProjectRoot: jest.fn().mockReturnValue('/fake/project-root'),
  })),
  EventBusService: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    emitConfigChanged: jest.fn(),
  })),
  EventBusModule: class {},
}));

jest.mock('typeorm', () => {
  const Entity = function (name?: string, options?: any) {
    return function (target: any) { return target; };
  };
  return {
    DataSource: class MockDataSource {},
    PrimaryGeneratedColumn: () => jest.fn(),
    CreateDateColumn: () => jest.fn(),
    UpdateDateColumn: () => jest.fn(),
    Column: () => jest.fn(),
    Entity,
    PrimaryColumn: () => jest.fn(),
    OneToMany: () => jest.fn(),
    ManyToOne: () => jest.fn(),
    JoinColumn: () => jest.fn(),
    Index: () => jest.fn(),
    Unique: () => jest.fn(),
  };
});

jest.mock('os', () => ({
  totalmem: jest.fn(() => 16 * 1024 * 1024 * 1024),
  freemem: jest.fn(() => 8 * 1024 * 1024 * 1024),
  loadavg: jest.fn(() => [0.5, 0.3, 0.1]),
  hostname: jest.fn(() => 'test-host'),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  statfsSync: jest.fn(() => ({
    bsize: 4096,
    blocks: 1000000,
    bavail: 500000,
  })),
}));

describe('HealthService', () => {
  let service: HealthService;
  let mockDataSource: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ '1': 1 }]),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'DATA_DIR') return undefined;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PathResolverService, useValue: { resolve: jest.fn((p: string) => p), getProjectRoot: jest.fn().mockReturnValue('/fake/project-root') } },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    jest.clearAllMocks();
  });

  describe('getSimple', () => {
    it('TC-HLTH-001: should return ok status with uptime and timestamp', () => {
      const result = service.getSimple();

      expect(result.status).toBe('ok');
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('number');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('getDetailed', () => {
    it('TC-HLTH-010: should return detailed health with all checks', async () => {
      const result = await service.getDetailed();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.checks.database).toBeDefined();
      expect(result.checks.memory).toBeDefined();
      expect(result.checks.disk).toBeDefined();
      expect(result.checks.influxdb).toBeDefined();
      expect(result.memory).toBeDefined();
      expect(result.cpuLoad).toBeDefined();
      expect(result.disks).toBeDefined();
      expect(result.disks.appDir).toBeDefined();
      expect(result.disks.dataDir).toBeDefined();
      expect(result.disks.backupDir).toBeDefined();
    });

    it('TC-HLTH-010b: should return error status when database probe fails', async () => {
      mockDataSource.query.mockRejectedValueOnce(new Error('Database file not found: test.db'));

      const result = await service.getDetailed();

      expect(result.checks.database.status).toBe('error');
      expect(result.checks.database.message).toContain('not found');
      expect(result.status).toBe('error');
    });

    it('TC-HLTH-010c: should return degraded status when memory is high', async () => {
      // 模拟高内存使用（90%）
      const os = require('os');
      os.totalmem.mockReturnValueOnce(16 * 1024 * 1024 * 1024);
      os.freemem.mockReturnValueOnce(1.6 * 1024 * 1024 * 1024);

      const result = await service.getDetailed();

      expect(result.checks.memory.status).toBe('error');
    });
  });

  describe('getLiveness', () => {
    it('TC-HLTH-020: should return ok for K8s liveness probe', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getReadiness', () => {
    it('TC-HLTH-030: should return readiness with checks', async () => {
      const result = await service.getReadiness();

      expect(result.status).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(Array.isArray(result.checks)).toBe(true);
      expect(result.checks).toContain('database');
      expect(result.checks).toContain('memory');
    });

    it('TC-HLTH-031: should return error when database is down', async () => {
      mockDataSource.query.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.getReadiness();

      expect(result.status).toBe('error');
      expect(result.details).toBeDefined();
      expect(result.details.database).toBeDefined();
    });
  });

  describe('getDiskPartitions', () => {
    it('TC-HLTH-040: should return disk partition info for all directories', async () => {
      const result = await service.getDiskPartitions();

      expect(result).toBeDefined();
      expect(result.appDir).toBeDefined();
      expect(result.appDir.path).toBeDefined();
      expect(result.appDir.totalBytes).toBeGreaterThan(0);
      expect(result.appDir.freeBytes).toBeGreaterThan(0);
      expect(result.appDir.totalFormatted).toBeDefined();
      expect(result.appDir.freeFormatted).toBeDefined();
      expect(result.appDir.usedFormatted).toBeDefined();
      expect(['normal', 'warning', 'critical']).toContain(result.appDir.status);

      expect(result.dataDir).toBeDefined();
      expect(result.backupDir).toBeDefined();
    });

    it('TC-HLTH-040b: should return N/A for disk info when statfs fails', async () => {
      const fs = require('fs');
      fs.statfsSync.mockImplementation(() => {
        throw new Error('statfs not available');
      });

      const result = await service.getDiskPartitions();

      // 所有三个目录都应返回 fallback 值
      for (const disk of [result.appDir, result.dataDir, result.backupDir]) {
        expect(disk.totalBytes).toBe(0);
        expect(disk.freeBytes).toBe(0);
        expect(disk.totalFormatted).toBe('N/A');
        expect(disk.freeFormatted).toBe('N/A');
        expect(disk.usedFormatted).toBe('N/A');
        expect(disk.status).toBe('normal');
      }
    });
  });

  // ==================== 阈值环境变量 ====================

  describe('memory thresholds from env', () => {
    it('TC-HLTH-050: should use custom memory thresholds from env', async () => {
      process.env.MEMORY_WARN_PERCENT = '50';
      process.env.MEMORY_CRITICAL_PERCENT = '80';

      const os = require('os');
      os.totalmem.mockReturnValueOnce(16 * 1024 * 1024 * 1024);
      os.freemem.mockReturnValueOnce(8 * 1024 * 1024 * 1024);

      const result = await service.getDetailed();

      expect(result.memoryThresholds.warnPercent).toBe(50);
      expect(result.memoryThresholds.criticalPercent).toBe(80);

      delete process.env.MEMORY_WARN_PERCENT;
      delete process.env.MEMORY_CRITICAL_PERCENT;
    });
  });

  describe('disk thresholds from env', () => {
    it('TC-HLTH-051: should use custom disk thresholds from env', async () => {
      process.env.DISK_WARN_PERCENT = '60';
      process.env.DISK_CRITICAL_PERCENT = '90';

      const result = await service.getDetailed();

      expect(result.diskThresholds.warnPercent).toBe(60);
      expect(result.diskThresholds.criticalPercent).toBe(90);

      delete process.env.DISK_WARN_PERCENT;
      delete process.env.DISK_CRITICAL_PERCENT;
    });
  });

  // ==================== Readiness 补充 ====================

  describe('getReadiness extended', () => {
    it('TC-HLTH-032: should return ok with all checks when everything is healthy', async () => {
      const os = require('os');
      os.freemem.mockReturnValueOnce(8 * 1024 * 1024 * 1024);

      const result = await service.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.checks).toContain('database');
      expect(result.checks).toContain('memory');
      expect(result.details).toBeUndefined();
    });

    it('TC-HLTH-033: should return error when memory is critically low', async () => {
      const os = require('os');
      os.freemem.mockReturnValueOnce(10 * 1024 * 1024); // 10MB, below 50MB threshold

      const result = await service.getReadiness();

      expect(result.status).toBe('error');
      expect(result.checks).not.toContain('memory');
      expect(result.details).toBeDefined();
      expect(result.details!.memory).toBeDefined();
    });
  });

  // ==================== Detailed 补充 ====================

  describe('getDetailed extended', () => {
    it('TC-HLTH-010d: should return degraded status when memory is in warn range', async () => {
      process.env.MEMORY_WARN_PERCENT = '20';
      process.env.MEMORY_CRITICAL_PERCENT = '90';

      const os = require('os');
      os.totalmem.mockReturnValueOnce(16 * 1024 * 1024 * 1024);
      os.freemem.mockReturnValueOnce(12 * 1024 * 1024 * 1024); // 25% used

      const result = await service.getDetailed();

      expect(result.checks.memory.status).toBe('warn');

      delete process.env.MEMORY_WARN_PERCENT;
      delete process.env.MEMORY_CRITICAL_PERCENT;
    });

    it('TC-HLTH-010e: should handle disk probe failure gracefully', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValueOnce(false);

      const result = await service.getDetailed();

      // disk probe 应该返回 warn 状态
      expect(result.checks.disk).toBeDefined();
      expect(['warn', 'pass']).toContain(result.checks.disk.status);
    });
  });
});
