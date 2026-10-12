// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemController } from '../system.controller';
import { SystemService } from '../system.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ErrorLog, SystemConfig, OperationLog } from '../entities/system.entity';

// ============================================================
// Mock @nestjs/swagger decorators to avoid Reflect metadata issues
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const noop = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  const noopProp = () => () => {};
  return {
    ApiTags: (..._tags: string[]) => noop(),
    ApiBearerAuth: () => noop(),
    ApiOperation: (_opts: any) => noop(),
    ApiParam: (_opts: any) => noop(),
    ApiQuery: (_opts: any) => noop(),
    ApiProperty: (_opts?: any) => noopProp(),
    ApiPropertyOptional: (_opts?: any) => noopProp(),
    PartialType: (cls: any) => cls,
    OmitType: (cls: any, _keys: string[]) => cls,
    PickType: (cls: any, _keys: string[]) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

// ============================================================
// Mock JWT & RBAC guards
// ============================================================
jest.mock('@ss-node/ss-core', () => ({
  JwtAuthGuard: { canActivate: jest.fn(() => true) },
  RolesGuard: { canActivate: jest.fn(() => true) },
  Roles: (..._roles: any[]) => jest.fn(),
  UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
}));

// ============================================================
// Mock services
// ============================================================
const mockSystemService = {
  getSimpleHealth: jest.fn(),
  getDetailedHealth: jest.fn(),
  getInfo: jest.fn(),
  cleanExpiredOperationLogs: jest.fn(),
  cleanAllOperationLogs: jest.fn(),
};

const mockErrorLogRepo = {
  find: jest.fn(),
  delete: jest.fn(),
};

const mockConfigRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockOperationLogRepo = {
  find: jest.fn(),
  findAndCount: jest.fn(),
};

describe('SystemController', () => {
  let controller: SystemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        { provide: SystemService, useValue: mockSystemService },
        { provide: getRepositoryToken(ErrorLog), useValue: mockErrorLogRepo },
        { provide: getRepositoryToken(SystemConfig), useValue: mockConfigRepo },
        { provide: getRepositoryToken(OperationLog), useValue: mockOperationLogRepo },
      ],
    }).compile();

    controller = module.get<SystemController>(SystemController);
    jest.clearAllMocks();
  });

  // ==================== health ====================
  describe('GET /system/health', () => {
    it('TC-SYC-001: should return simple health status', () => {
      const health = { status: 'ok', uptime: 3600, timestamp: '2026-06-04T12:00:00.000Z' };
      mockSystemService.getSimpleHealth.mockReturnValue(health);

      const result = controller.health();

      expect(result).toEqual(health);
      expect(result.status).toBe('ok');
      expect(mockSystemService.getSimpleHealth).toHaveBeenCalled();
    });
  });

  // ==================== detailedHealth ====================
  describe('GET /system/health/details', () => {
    it('TC-SYC-010: should return detailed health info', async () => {
      const detailed = {
        status: 'ok' as const,
        checks: { memory: { status: 'pass', message: 'OK', latencyMs: 1 } },
        uptime: 3600,
        memory: { total: 16000000, free: 8000000, used: 8000000, usagePercent: 50 },
        cpuLoad: [0.5, 0.3, 0.1],
        nodeVersion: 'v20.0.0',
        platform: 'win32',
        hostname: 'test-server',
        pid: 12345,
      };
      mockSystemService.getDetailedHealth.mockResolvedValue(detailed);

      const result = await controller.detailedHealth();

      expect(result).toEqual(detailed);
      expect(result.status).toBe('ok');
      expect(mockSystemService.getDetailedHealth).toHaveBeenCalled();
    });

    it('TC-SYC-011: should return degraded status when checks have warnings', async () => {
      mockSystemService.getDetailedHealth.mockResolvedValue({
        status: 'degraded' as const,
        checks: { memory: { status: 'warn', message: 'Low memory', latencyMs: 1 } },
        uptime: 100,
        memory: { total: 1000, free: 100, used: 900, usagePercent: 90 },
        cpuLoad: [2.0, 1.5, 1.0],
        nodeVersion: 'v20.0.0',
        platform: 'linux',
        hostname: 'prod-server',
        pid: 9999,
      });

      const result = await controller.detailedHealth();

      expect(result.status).toBe('degraded');
    });
  });

  // ==================== liveness ====================
  describe('GET /system/health/liveness', () => {
    it('TC-SYC-020: should return ok status for K8s liveness probe', () => {
      const result = controller.liveness();

      expect(result).toEqual({ status: 'ok' });
    });
  });

  // ==================== readiness ====================
  describe('GET /system/health/readiness', () => {
    it('TC-SYC-030: should return ok status with checks for K8s readiness probe', () => {
      const result = controller.readiness();

      expect(result).toEqual({ status: 'ok', checks: ['database', 'memory'] });
    });
  });

  // ==================== info ====================
  describe('GET /system/info', () => {
    it('TC-SYC-040: should return system info', () => {
      const sysInfo = {
        appName: 'ss-data-server',
        version: '1.0.0',
        buildTime: '2026-06-04T08:00:00Z',
        nodeVersion: 'v20.0.0',
        platform: 'win32',
        arch: 'x64',
        cpus: 8,
        cpuModel: 'Intel Core i7',
        totalMem: 16000000,
        freeMem: 8000000,
        networkInterfaces: {},
        pid: 12345,
        uptime: 3600,
        env: 'production',
        timezone: 'Asia/Shanghai',
        startTime: '2026-06-04T11:00:00.000Z',
      };
      mockSystemService.getInfo.mockReturnValue(sysInfo);

      const result = controller.info();

      expect(result).toEqual(sysInfo);
      expect(result.appName).toBe('ss-data-server');
      expect(mockSystemService.getInfo).toHaveBeenCalled();
    });
  });

  // ==================== getErrorLogs ====================
  describe('GET /system/errors', () => {
    it('TC-SYC-050: should return error logs with default limit', async () => {
      const logs = [
        { id: 'err-001', level: 'error', message: 'DB connection failed', createdAt: new Date() },
      ];
      mockErrorLogRepo.find.mockResolvedValue(logs);

      const result = await controller.getErrorLogs();

      expect(result).toEqual(logs);
      expect(mockErrorLogRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('TC-SYC-051: should filter error logs by level', async () => {
      mockErrorLogRepo.find.mockResolvedValue([]);

      await controller.getErrorLogs('critical');

      expect(mockErrorLogRepo.find).toHaveBeenCalledWith({
        where: { level: 'critical' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('TC-SYC-052: should apply custom limit', async () => {
      mockErrorLogRepo.find.mockResolvedValue([]);

      await controller.getErrorLogs(undefined, '10');

      expect(mockErrorLogRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });

    it('TC-SYC-053: should combine level filter and limit', async () => {
      mockErrorLogRepo.find.mockResolvedValue([]);

      await controller.getErrorLogs('warning', '25');

      expect(mockErrorLogRepo.find).toHaveBeenCalledWith({
        where: { level: 'warning' },
        order: { createdAt: 'DESC' },
        take: 25,
      });
    });
  });

  // ==================== deleteErrorLog ====================
  describe('DELETE /system/errors/:id', () => {
    it('TC-SYC-060: should delete error log and return ok', async () => {
      mockErrorLogRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await controller.deleteErrorLog('err-001');

      expect(result).toEqual({ ok: true });
      expect(mockErrorLogRepo.delete).toHaveBeenCalledWith('err-001');
    });
  });

  // ==================== getConfigs ====================
  describe('GET /system/configs', () => {
    it('TC-SYC-070: should return all system configs', async () => {
      const configs = [
        { key: 'max_connections', value: '100', type: 'number' },
        { key: 'app_name', value: 'SS-V7', type: 'string' },
      ];
      mockConfigRepo.find.mockResolvedValue(configs);

      const result = await controller.getConfigs();

      expect(result).toEqual(configs);
      expect(mockConfigRepo.find).toHaveBeenCalled();
    });
  });

  // ==================== getConfig ====================
  describe('GET /system/configs/:key', () => {
    it('TC-SYC-080: should return config by key', async () => {
      const config = { key: 'max_connections', value: '100', type: 'number' };
      mockConfigRepo.findOne.mockResolvedValue(config);

      const result = await controller.getConfig('max_connections');

      expect(result).toEqual(config);
      expect(mockConfigRepo.findOne).toHaveBeenCalledWith({ where: { key: 'max_connections' } });
    });

    it('TC-SYC-081: should return null when config key not found', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);

      const result = await controller.getConfig('unknown_key');

      expect(result).toBeNull();
    });
  });

  // ==================== setConfig ====================
  describe('POST /system/configs', () => {
    it('TC-SYC-090: should create new config when key does not exist', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);
      const newConfig = { key: 'new_key', value: 'new_value', type: 'string' };
      mockConfigRepo.create.mockReturnValue(newConfig);
      mockConfigRepo.save.mockResolvedValue(newConfig);

      const result = await controller.setConfig({ key: 'new_key', value: 'new_value' });

      expect(result).toEqual(newConfig);
      expect(mockConfigRepo.create).toHaveBeenCalledWith({ key: 'new_key', value: 'new_value' });
      expect(mockConfigRepo.save).toHaveBeenCalled();
    });

    it('TC-SYC-091: should update existing config when key exists', async () => {
      const existing = { key: 'existing_key', value: 'old_value', type: 'string' };
      mockConfigRepo.findOne.mockResolvedValue(existing);
      const updated = { ...existing, value: 'new_value', updatedAt: expect.any(Date) };
      mockConfigRepo.save.mockResolvedValue(updated);

      await controller.setConfig({ key: 'existing_key', value: 'new_value' });

      expect(existing.value).toBe('new_value');
      expect(mockConfigRepo.save).toHaveBeenCalledWith(existing);
    });

    it('TC-SYC-092: should update description and type when provided for existing config', async () => {
      const existing: any = { key: 'key1', value: 'v1', type: 'string' };
      mockConfigRepo.findOne.mockResolvedValue(existing);
      mockConfigRepo.save.mockResolvedValue(existing);

      await controller.setConfig({
        key: 'key1',
        value: 'v2',
        description: 'updated desc',
        type: 'number',
      });

      expect(existing.description).toBe('updated desc');
      expect(existing.type).toBe('number');
      expect(mockConfigRepo.save).toHaveBeenCalled();
    });
  });

  // ==================== deleteConfig ====================
  describe('DELETE /system/configs/:key', () => {
    it('TC-SYC-100: should delete config by key and return ok', async () => {
      mockConfigRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await controller.deleteConfig('obsolete_key');

      expect(result).toEqual({ ok: true });
      expect(mockConfigRepo.delete).toHaveBeenCalledWith({ key: 'obsolete_key' });
    });
  });

  // ==================== getOperationLogs ====================
  describe('GET /system/operation-logs', () => {
    it('TC-SYC-110: should return paginated operation logs with default page size', async () => {
      const logs = [
        { id: 'op-001', action: 'GET /api/v1/projects', userId: 'user-001', createdAt: new Date() },
      ];
      mockOperationLogRepo.findAndCount.mockResolvedValue([logs, 1]);

      const result = await controller.getOperationLogs();

      expect(result).toEqual({ items: logs, total: 1, page: 1, pageSize: 20 });
      expect(mockOperationLogRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('TC-SYC-111: should filter operation logs by action', async () => {
      mockOperationLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await controller.getOperationLogs(undefined, undefined, 'GET');

      expect(mockOperationLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { action: expect.objectContaining({ _type: 'like' }) },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('TC-SYC-112: should filter operation logs by userId', async () => {
      mockOperationLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await controller.getOperationLogs(undefined, undefined, undefined, 'user-001');

      expect(mockOperationLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-001' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('TC-SYC-113: should apply custom page size to operation logs', async () => {
      mockOperationLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await controller.getOperationLogs(undefined, '50');

      expect(mockOperationLogRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('TC-SYC-114: should combine action, userId, and pagination', async () => {
      mockOperationLogRepo.findAndCount.mockResolvedValue([[], 0]);

      await controller.getOperationLogs('2', '25', 'GET', 'user-001');

      expect(mockOperationLogRepo.findAndCount).toHaveBeenCalledWith({
        where: { action: expect.objectContaining({ _type: 'like' }), userId: 'user-001' },
        order: { createdAt: 'DESC' },
        skip: 25, // (page 2 - 1) * 25
        take: 25,
      });
    });
  });
});
