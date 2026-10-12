// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  DiskUsageChecker,
  MemoryUsageChecker,
  CpuUsageChecker,
  SystemResourceThresholds,
} from '../system-resource-checker';

// ============================================================
// Mocks (jest.mock is hoisted — use inline factories)
// ============================================================
jest.mock('os', () => ({
  totalmem: jest.fn(),
  freemem: jest.fn(),
  cpus: jest.fn(),
  loadavg: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Lazy accessors for mock functions (resolved after hoisting)
const mockOs = {
  get totalmem() {
    return jest.requireMock('os').totalmem as jest.Mock;
  },
  get freemem() {
    return jest.requireMock('os').freemem as jest.Mock;
  },
  get cpus() {
    return jest.requireMock('os').cpus as jest.Mock;
  },
  get loadavg() {
    return jest.requireMock('os').loadavg as jest.Mock;
  },
};

const mockExecSync = {
  get execSync() {
    return jest.requireMock('child_process').execSync as jest.Mock;
  },
};

// ============================================================
// Helpers
// ============================================================
function createThresholds(
  overrides: Partial<SystemResourceThresholds> = {},
): SystemResourceThresholds {
  return {
    diskUsagePercent: 90,
    memoryUsagePercent: 90,
    cpuUsagePercent: 90,
    ...overrides,
  };
}

// ============================================================
// DiskUsageChecker
// ============================================================
describe('DiskUsageChecker', () => {
  let checker: DiskUsageChecker;

  beforeEach(() => {
    jest.clearAllMocks();
    checker = new DiskUsageChecker(createThresholds());
  });

  describe('check', () => {
    it('TC-HC-DISK-001: should return healthy when disk usage is below threshold', async () => {
      mockExecSync.execSync.mockReturnValue(
        'Node,FreeSpace,Size\nDESKTOP,500000000000,1000000000000',
      ); // 50% used

      const result = await checker.check();

      expect(result.name).toBe('disk-usage');
      expect(result.status).toBe('healthy');
      expect(result.error).toBeUndefined();
      expect(result.details).toEqual({
        total: '931.3 GB',
        free: '465.7 GB',
        usedPercent: 50,
        threshold: 90,
      });
    });

    it('TC-HC-DISK-002: should return unhealthy when disk usage exceeds threshold', async () => {
      mockExecSync.execSync.mockReturnValue(
        'Node,FreeSpace,Size\nDESKTOP,50000000000,1000000000000',
      ); // 95% used

      const result = await checker.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('95%');
      expect(result.details!.usedPercent).toBe(95);
    });

    it('TC-HC-DISK-003: should return healthy when disk check fails', async () => {
      mockExecSync.execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await checker.check();

      expect(result.status).toBe('healthy');
      expect(result.details).toEqual({
        message: 'Disk check skipped (platform not supported or command failed)',
      });
    });

    it('TC-HC-DISK-004: should return healthy when wmic returns invalid data', async () => {
      mockExecSync.execSync.mockReturnValue('Node,FreeSpace,Size\nDESKTOP,invalid,invalid');

      const result = await checker.check();

      expect(result.status).toBe('healthy');
    });

    it('TC-HC-DISK-005: should respect custom threshold', async () => {
      const customChecker = new DiskUsageChecker(createThresholds({ diskUsagePercent: 80 }));
      mockExecSync.execSync.mockReturnValue(
        'Node,FreeSpace,Size\nDESKTOP,150000000000,1000000000000',
      ); // 85% used

      const result = await customChecker.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('85%');
      expect(result.error).toContain('80%');
    });
  });
});

// ============================================================
// MemoryUsageChecker
// ============================================================
describe('MemoryUsageChecker', () => {
  let checker: MemoryUsageChecker;

  beforeEach(() => {
    jest.clearAllMocks();
    checker = new MemoryUsageChecker(createThresholds());
  });

  describe('check', () => {
    it('TC-HC-MEM-001: should return healthy when memory usage is below threshold', async () => {
      mockOs.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16 GB
      mockOs.freemem.mockReturnValue(10 * 1024 * 1024 * 1024); // 10 GB free → 37.5% used

      const result = await checker.check();

      expect(result.name).toBe('memory-usage');
      expect(result.status).toBe('healthy');
      expect(result.error).toBeUndefined();
      expect(result.details!.total).toBe('16.0 GB');
      expect(result.details!.free).toBe('10.0 GB');
    });

    it('TC-HC-MEM-002: should return unhealthy when memory usage exceeds threshold', async () => {
      mockOs.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16 GB
      mockOs.freemem.mockReturnValue(0.5 * 1024 * 1024 * 1024); // 0.5 GB free → 96.9% used

      const result = await checker.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('96.9%');
      expect(result.details!.usedPercent).toBeCloseTo(96.9, 0);
    });

    it('TC-HC-MEM-003: should return unhealthy when exactly at threshold', async () => {
      mockOs.totalmem.mockReturnValue(1000);
      mockOs.freemem.mockReturnValue(100); // 90% used

      const result = await checker.check();

      expect(result.status).toBe('unhealthy');
    });

    it('TC-HC-MEM-004: should respect custom threshold', async () => {
      const customChecker = new MemoryUsageChecker(createThresholds({ memoryUsagePercent: 50 }));
      mockOs.totalmem.mockReturnValue(1000);
      mockOs.freemem.mockReturnValue(400); // 60% used

      const result = await customChecker.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('60%');
      expect(result.error).toContain('50%');
    });
  });
});

// ============================================================
// CpuUsageChecker
// ============================================================
describe('CpuUsageChecker', () => {
  let checker: CpuUsageChecker;

  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllMocks();
    checker = new CpuUsageChecker(createThresholds());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('check', () => {
    it('TC-HC-CPU-001: should return healthy when CPU usage is below threshold', async () => {
      mockOs.cpus
        .mockReturnValueOnce([
          { times: { user: 5, nice: 0, sys: 3, idle: 90, irq: 2 } },
          { times: { user: 5, nice: 0, sys: 3, idle: 90, irq: 2 } },
        ])
        .mockReturnValueOnce([
          { times: { user: 10, nice: 0, sys: 3, idle: 180, irq: 7 } },
          { times: { user: 10, nice: 0, sys: 3, idle: 180, irq: 7 } },
        ]);

      mockOs.loadavg.mockReturnValue([0.5, 0.3, 0.2]);

      const resultPromise = checker.check();
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;

      expect(result.name).toBe('cpu-usage');
      expect(result.status).toBe('healthy');
      expect(result.error).toBeUndefined();
      expect(result.details!.cores).toBe(2);
      expect(result.details!.usedPercent).toBe(10);
    });

    it('TC-HC-CPU-002: should return unhealthy when CPU usage exceeds threshold', async () => {
      mockOs.cpus
        .mockReturnValueOnce([
          { times: { user: 5, nice: 0, sys: 3, idle: 90, irq: 2 } },
          { times: { user: 5, nice: 0, sys: 3, idle: 90, irq: 2 } },
        ])
        .mockReturnValueOnce([
          { times: { user: 100, nice: 0, sys: 3, idle: 95, irq: 2 } },
          { times: { user: 100, nice: 0, sys: 3, idle: 95, irq: 2 } },
        ]);

      mockOs.loadavg.mockReturnValue([8, 6, 4]);

      const resultPromise = checker.check();
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('95%');
      expect(result.details!.usedPercent).toBe(95);
    });

    it('TC-HC-CPU-003: should return unhealthy when CPU usage equals exactly threshold', async () => {
      mockOs.cpus
        .mockReturnValueOnce([
          { times: { user: 5, nice: 0, sys: 3, idle: 90, irq: 2 } },
          { times: { user: 5, nice: 0, sys: 3, idle: 90, irq: 2 } },
        ])
        .mockReturnValueOnce([
          { times: { user: 95, nice: 0, sys: 3, idle: 100, irq: 2 } },
          { times: { user: 95, nice: 0, sys: 3, idle: 100, irq: 2 } },
        ]);

      const resultPromise = checker.check();
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;

      expect(result.status).toBe('unhealthy');
      expect(result.details!.usedPercent).toBe(90);
    });

    it('TC-HC-CPU-004: should respect custom threshold', async () => {
      const customChecker = new CpuUsageChecker(createThresholds({ cpuUsagePercent: 50 }));

      mockOs.cpus
        .mockReturnValueOnce([{ times: { user: 10, nice: 0, sys: 5, idle: 80, irq: 5 } }])
        .mockReturnValueOnce([{ times: { user: 70, nice: 0, sys: 5, idle: 120, irq: 5 } }]);

      mockOs.loadavg.mockReturnValue([1, 1, 1]);

      const resultPromise = customChecker.check();
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('60%');
      expect(result.error).toContain('50%');
    });

    it('TC-HC-CPU-005: should handle single core CPU', async () => {
      mockOs.cpus
        .mockReturnValueOnce([{ times: { user: 5, nice: 0, sys: 3, idle: 90, irq: 2 } }])
        .mockReturnValueOnce([{ times: { user: 10, nice: 0, sys: 3, idle: 185, irq: 2 } }]);

      mockOs.loadavg.mockReturnValue([0.1, 0.1, 0.1]);

      const resultPromise = checker.check();
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;

      expect(result.status).toBe('healthy');
      expect(result.details!.cores).toBe(1);
    });
  });
});
