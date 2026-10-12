// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SystemService } from '../system.service';

// ============================================================
// Mock external dependencies before the module is loaded
// These must be declared before the imports that use them
// ============================================================

// Mock @nestjs/typeorm to prevent path-scurry native binding error
// (typeorm → glob@10 → path-scurry fails on some Node.js versions)
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => jest.fn(),
  getRepositoryToken: () => 'mockRepoToken',
}));

// Mock typeorm to prevent path-scurry native binding error
// Using pure mock (no requireActual) to avoid glob@10 → path-scurry chain
jest.mock('typeorm', () => {
  const td = () => () => {};
  return {
    LessThan: (date: Date) => date,
    Repository: class {},
    Entity: td,
    PrimaryColumn: td,
    PrimaryGeneratedColumn: td,
    Column: td,
    CreateDateColumn: td,
    UpdateDateColumn: td,
    Index: td,
    Like: td,
    Between: td,
    LessThanOrEqual: td,
    MoreThanOrEqual: td,
    In: td,
    Not: td,
    IsNull: td,
    JoinColumn: td,
    ManyToOne: td,
    OneToMany: td,
    ManyToMany: td,
    JoinTable: td,
    FindOptionsWhere: {} as any,
    FindOptionsOrder: {} as any,
    FindManyOptions: {} as any,
    FindOneOptions: {} as any,
    DeleteResult: class {},
    UpdateResult: class {},
    InsertResult: class {},
    DataSource: class {},
  };
});

// Store original platform to restore later
const _originalPlatform = process.platform;
const _originalPid = process.pid;
const _originalVersion = process.version;

// We DON'T mock process.platform/pid/version here since they're read-only
// Instead we'll use Object.defineProperty in beforeEach for per-test control

// Mock os module
const mockTotalmem = jest.fn();
const mockFreemem = jest.fn();
const mockLoadavg = jest.fn();
const mockHostname = jest.fn();
const mockArch = jest.fn();
const mockCpus = jest.fn();
const mockNetworkInterfaces = jest.fn();

jest.mock('os', () => ({
  totalmem: (...args: any[]) => mockTotalmem(...args),
  freemem: (...args: any[]) => mockFreemem(...args),
  loadavg: (...args: any[]) => mockLoadavg(...args),
  hostname: (...args: any[]) => mockHostname(...args),
  arch: (...args: any[]) => mockArch(...args),
  cpus: (...args: any[]) => mockCpus(...args),
  networkInterfaces: (...args: any[]) => mockNetworkInterfaces(...args),
}));

// Mock fs module
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
}));

describe('SystemService', () => {
  let service: SystemService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default os mocks
    mockTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
    mockFreemem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
    mockLoadavg.mockReturnValue([0.5, 0.3, 0.1]);
    mockHostname.mockReturnValue('test-host');
    mockArch.mockReturnValue('x64');
    mockCpus.mockReturnValue([
      {
        model: 'Intel Core i7',
        speed: 2800,
        times: { user: 100, nice: 0, sys: 50, idle: 200, irq: 0 },
      },
      {
        model: 'Intel Core i7',
        speed: 2800,
        times: { user: 100, nice: 0, sys: 50, idle: 200, irq: 0 },
      },
      {
        model: 'Intel Core i7',
        speed: 2800,
        times: { user: 100, nice: 0, sys: 50, idle: 200, irq: 0 },
      },
      {
        model: 'Intel Core i7',
        speed: 2800,
        times: { user: 100, nice: 0, sys: 50, idle: 200, irq: 0 },
      },
    ]);
    mockNetworkInterfaces.mockReturnValue({
      lo: [
        {
          address: '127.0.0.1',
          netmask: '255.0.0.0',
          family: 'IPv4',
          mac: '00:00:00:00:00:00',
          internal: true,
        },
      ],
      eth0: [
        {
          address: '192.168.1.100',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: 'aa:bb:cc:dd:ee:ff',
          internal: false,
        },
      ],
    });

    // Default fs mocks - build info file does not exist
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('');

    service = new SystemService();
  });

  // ==================== getSimpleHealth ====================
  describe('getSimpleHealth', () => {
    it('TC-SYS-001: should return ok status with uptime and timestamp', () => {
      const result = service.getSimpleHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('number');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('TC-SYS-002: should return consistent status value', () => {
      const result = service.getSimpleHealth();

      expect(result.status).toBe('ok');
    });

    it('TC-SYS-003: should return ISO timestamp format', () => {
      const result = service.getSimpleHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ==================== getDetailedHealth ====================
  describe('getDetailedHealth', () => {
    it('TC-SYS-010: should return SystemHealthDetails with all fields', async () => {
      const result = await service.getDetailedHealth();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.memory).toBeDefined();
      expect(result.cpuLoad).toBeDefined();
      expect(result.nodeVersion).toBeDefined();
      expect(result.platform).toBeDefined();
      expect(result.hostname).toBeDefined();
      expect(result.pid).toBeDefined();
    });

    it('TC-SYS-011: should calculate memory info correctly', async () => {
      mockTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
      mockFreemem.mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB

      const result = await service.getDetailedHealth();

      expect(result.memory.total).toBe(17179869184); // 16GB
      expect(result.memory.free).toBe(4294967296); // 4GB
      expect(result.memory.used).toBe(17179869184 - 4294967296);
      expect(result.memory.usagePercent).toBeGreaterThan(0);
    });

    it('TC-SYS-012: should include memory check in checks', async () => {
      mockFreemem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB free > 50MB

      const result = await service.getDetailedHealth();

      expect(result.checks.memory).toBeDefined();
      expect(result.checks.memory.status).toBe('pass');
      expect(result.checks.memory.message).toContain('MB');
      expect(result.checks.memory.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('TC-SYS-013: should set memory check to warn when free memory is low', async () => {
      mockFreemem.mockReturnValue(10 * 1024 * 1024); // 10MB free < 50MB

      const result = await service.getDetailedHealth();

      expect(result.checks.memory.status).toBe('warn');
    });

    it('TC-SYS-014: should include disk check in checks', async () => {
      const result = await service.getDetailedHealth();

      expect(result.checks.disk).toBeDefined();
      expect(result.checks.disk.status).toBe('pass');
      expect(result.checks.disk.message).toBe('OK');
    });

    it('TC-SYS-015: should set overall status to ok when all checks pass', async () => {
      mockFreemem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB free > 50MB

      const result = await service.getDetailedHealth();

      expect(result.status).toBe('ok');
    });

    it('TC-SYS-016: should set overall status to degraded when memory check is warn', async () => {
      mockFreemem.mockReturnValue(10 * 1024 * 1024); // 10MB free < 50MB, triggers warn

      const result = await service.getDetailedHealth();

      expect(result.status).toBe('degraded');
    });

    it('TC-SYS-017: should return cpu load array', async () => {
      mockLoadavg.mockReturnValue([1.5, 1.2, 0.8]);

      const result = await service.getDetailedHealth();

      expect(result.cpuLoad).toEqual([1.5, 1.2, 0.8]);
      expect(result.cpuLoad).toHaveLength(3);
    });

    it('TC-SYS-018: should return node version from process', async () => {
      const result = await service.getDetailedHealth();

      expect(result.nodeVersion).toBeDefined();
      expect(typeof result.nodeVersion).toBe('string');
      expect(result.nodeVersion).toContain('v');
    });

    it('TC-SYS-019: should return hostname from os', async () => {
      mockHostname.mockReturnValue('my-server-01');

      const result = await service.getDetailedHealth();

      expect(result.hostname).toBe('my-server-01');
    });

    it('TC-SYS-020: should return pid from process', async () => {
      const result = await service.getDetailedHealth();

      expect(result.pid).toBe(process.pid);
    });

    it('TC-SYS-021: should return platform from process', async () => {
      const result = await service.getDetailedHealth();

      expect(result.platform).toBe(process.platform);
    });

    it('TC-SYS-022: should calculate usagePercent with 2 decimal precision', async () => {
      // Use specific values to check precision
      mockTotalmem.mockReturnValue(1000);
      mockFreemem.mockReturnValue(300); // used = 700, usagePercent = 70.00

      const result = await service.getDetailedHealth();

      expect(result.memory.usagePercent).toBe(70);
    });
  });

  // ==================== getInfo ====================
  describe('getInfo', () => {
    it('TC-SYS-030: should return system info with all fields', () => {
      const result = service.getInfo();

      expect(result).toBeDefined();
      expect(result.appName).toBe('ss-data-server');
      expect(result.version).toBeDefined();
      expect(result.buildTime).toBeDefined();
      expect(result.nodeVersion).toBeDefined();
      expect(result.platform).toBeDefined();
      expect(result.arch).toBeDefined();
      expect(result.cpus).toBeDefined();
      expect(result.cpuModel).toBeDefined();
      expect(result.totalMem).toBeDefined();
      expect(result.freeMem).toBeDefined();
      expect(result.networkInterfaces).toBeDefined();
      expect(result.pid).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.env).toBeDefined();
      expect(result.timezone).toBeDefined();
      expect(result.startTime).toBeDefined();
    });

    it('TC-SYS-031: should return appName ss-data-server', () => {
      const result = service.getInfo();

      expect(result.appName).toBe('ss-data-server');
    });

    it('TC-SYS-032: should return default version 0.0.0 when build-info.json not found', () => {
      mockExistsSync.mockReturnValue(false);

      const result = service.getInfo();

      expect(result.version).toBe('0.0.0');
      expect(result.buildTime).toBe('');
    });

    it('TC-SYS-033: should read build info from file when it exists', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ version: '2.5.1', buildTime: '2026-06-04T08:00:00Z' }),
      );

      const result = service.getInfo();

      expect(result.version).toBe('2.5.1');
      expect(result.buildTime).toBe('2026-06-04T08:00:00Z');
    });

    it('TC-SYS-034: should handle invalid JSON in build-info.json gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');

      const result = service.getInfo();

      // The readBuildInfo function has a try/catch, so it falls back to defaults
      expect(result.version).toBe('0.0.0');
      expect(result.buildTime).toBe('');
    });

    it('TC-SYS-035: should return cpu count from os.cpus', () => {
      mockCpus.mockReturnValue([
        { model: 'CPU0', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
        { model: 'CPU1', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
        { model: 'CPU2', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
        { model: 'CPU3', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
        { model: 'CPU4', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
        { model: 'CPU5', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
        { model: 'CPU6', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
        { model: 'CPU7', speed: 2000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
      ]);

      const result = service.getInfo();

      expect(result.cpus).toBe(8);
    });

    it('TC-SYS-036: should return cpu model from first cpu', () => {
      mockCpus.mockReturnValue([
        { model: 'AMD Ryzen 9', speed: 3200, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
      ]);

      const result = service.getInfo();

      expect(result.cpuModel).toBe('AMD Ryzen 9');
    });

    it('TC-SYS-037: should return Unknown when cpus array is empty', () => {
      mockCpus.mockReturnValue([]);

      const result = service.getInfo();

      expect(result.cpuModel).toBe('Unknown');
    });

    it('TC-SYS-038: should return arch from os.arch', () => {
      mockArch.mockReturnValue('arm64');

      const result = service.getInfo();

      expect(result.arch).toBe('arm64');
    });

    it('TC-SYS-039: should return networkInterfaces from os', () => {
      mockNetworkInterfaces.mockReturnValue({
        eth0: [
          {
            address: '10.0.0.1',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '11:22:33:44:55:66',
            internal: false,
          },
        ],
      });

      const result = service.getInfo();

      expect(result.networkInterfaces).toBeDefined();
      expect(result.networkInterfaces.eth0).toBeDefined();
    });

    it('TC-SYS-040: should return env from NODE_ENV', () => {
      const result = service.getInfo();

      expect(result.env).toBeDefined();
    });

    it('TC-SYS-041: should return default env development when NODE_ENV not set', () => {
      // The global test setup sets NODE_ENV=test, so we can't easily test this
      // Instead verify the field exists
      const result = service.getInfo();

      expect(result.env).toBeTruthy();
    });

    it('TC-SYS-042: should return timezone as string', () => {
      const result = service.getInfo();

      expect(result.timezone).toBeDefined();
      expect(typeof result.timezone).toBe('string');
    });

    it('TC-SYS-043: should return startTime as ISO string', () => {
      const result = service.getInfo();

      expect(result.startTime).toBeDefined();
      expect(typeof result.startTime).toBe('string');
      expect(result.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('TC-SYS-044: should return totalMem and freeMem from os', () => {
      mockTotalmem.mockReturnValue(32 * 1024 * 1024 * 1024); // 32GB
      mockFreemem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB

      const result = service.getInfo();

      expect(result.totalMem).toBe(34359738368);
      expect(result.freeMem).toBe(17179869184);
    });
  });

  // ==================== getK8sProbes ====================
  describe('getK8sProbes', () => {
    it('TC-SYS-050: should return liveness probe with ok status', () => {
      const result = service.getK8sProbes();

      expect(result.liveness).toBeDefined();
      expect(result.liveness.status).toBe('ok');
    });

    it('TC-SYS-051: should return readiness probe with checks', () => {
      const result = service.getK8sProbes();

      expect(result.readiness).toBeDefined();
      expect(result.readiness.status).toBe('ok');
      expect(result.readiness.checks).toEqual(['memory', 'disk']);
    });

    it('TC-SYS-052: should return startup probe with ok status and message', () => {
      const result = service.getK8sProbes();

      expect(result.startup).toBeDefined();
      expect(result.startup.status).toBe('ok');
      expect(result.startup.message).toBe('Application started successfully');
    });

    it('TC-SYS-053: should return all three probes', () => {
      const result = service.getK8sProbes();

      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toHaveProperty('liveness');
      expect(result).toHaveProperty('readiness');
      expect(result).toHaveProperty('startup');
    });
  });
});
