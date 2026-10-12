// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import { EventCleanupService } from '../services/event-cleanup.service';
import { ProjectDatabaseService, PathResolverService, SystemEventService } from '@ss-node/ss-core';

// Jest rootDir = ss-services/ss-node. Resolve paths relative to this root.
const jestRoot = path.resolve(__dirname, '..', '..', '..', '..');

jest.mock('@ss-node/ss-core', () => {
  const actual = jest.requireActual('@ss-node/ss-core');
  const path = require('path');
  return {
    ...actual,
    PathResolverService: class {
      resolve = jest.fn((p: string) => path.resolve(jestRoot, p));
      getProjectRoot = jest.fn(() => jestRoot);
      resolveEnv = jest.fn((_env: string, defaultValue: string) =>
        path.resolve(jestRoot, defaultValue),
      );
    },
  };
});

// Mock fs for virtual filesystem
const virtualFs = new Map<string, string>();
const virtualDirs = new Set<string>();

function resetVirtualFs(): void {
  virtualFs.clear();
  virtualDirs.clear();
}

function addDir(dirPath: string): void {
  const normalized = dirPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  for (let i = 1; i <= parts.length; i++) {
    virtualDirs.add(parts.slice(0, i).join('/'));
  }
}

function addFile(filePath: string, content: string): void {
  const normalized = filePath.replace(/\\/g, '/');
  const dir = normalized.substring(0, normalized.lastIndexOf('/'));
  addDir(dir);
  virtualFs.set(normalized, content);
}

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn((p: string) => {
      const np = p.replace(/\\/g, '/');
      return virtualDirs.has(np) || virtualFs.has(np);
    }),
    mkdirSync: jest.fn((p: string, _opts?: any) => {
      addDir(p);
    }),
    readFileSync: jest.fn((p: string, _encoding?: string) => {
      const np = p.replace(/\\/g, '/');
      const content = virtualFs.get(np);
      if (content === undefined) {
        const err: any = new Error(`ENOENT: no such file or directory, open '${np}'`);
        err.code = 'ENOENT';
        throw err;
      }
      return content;
    }),
    writeFileSync: jest.fn((p: string, data: string) => {
      addFile(p, data);
    }),
    readdirSync: jest.fn((p: string, _opts?: any) => {
      const np = p.replace(/\\/g, '/');
      const entries: any[] = [];
      const prefix = np + '/';
      for (const [fpath] of virtualFs) {
        if (fpath.startsWith(prefix)) {
          const relative = fpath.slice(prefix.length);
          const slashIdx = relative.indexOf('/');
          if (slashIdx === -1) {
            entries.push({
              name: relative,
              isDirectory: () => false,
              isFile: () => true,
            });
          } else {
            const dirName = relative.substring(0, slashIdx);
            entries.push({
              name: dirName,
              isDirectory: () => true,
              isFile: () => false,
            });
          }
        }
      }
      for (const dpath of virtualDirs) {
        if (dpath.startsWith(prefix) && dpath !== np) {
          const relative = dpath.slice(prefix.length);
          const slashIdx = relative.indexOf('/');
          const name = slashIdx === -1 ? relative : relative.substring(0, slashIdx);
          if (!entries.some((e: any) => e.name === name)) {
            entries.push({
              name,
              isDirectory: () => true,
              isFile: () => false,
            });
          }
        }
      }
      return entries;
    }) as any,
    statSync: jest.fn((p: string) => {
      const np = p.replace(/\\/g, '/');
      const content = virtualFs.get(np);
      if (content === undefined) {
        const err: any = new Error('ENOENT');
        err.code = 'ENOENT';
        throw err;
      }
      return { size: content.length };
    }),
  };
});

describe('EventCleanupService', () => {
  let service: EventCleanupService;
  let mockConfigService: Partial<ConfigService>;
  let mockProjectDbService: Partial<ProjectDatabaseService>;

  const createMockDataSource = (queryImpl?: jest.Mock) =>
    ({
      query: queryImpl || jest.fn(),
      isInitialized: true,
      destroy: jest.fn().mockResolvedValue(undefined),
    }) as any;

  beforeEach(async () => {
    resetVirtualFs();
    jest.useFakeTimers();

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'PROJECTS_DIR') return './data/projects';
        if (key === 'PROJECT_DB_MODE') return 'isolated';
        return undefined;
      }),
    };

    mockProjectDbService = {
      getMode: jest.fn().mockReturnValue('isolated'),
      getLoadedSystemDb: jest.fn().mockReturnValue(createMockDataSource()),
      getProjectDbDir: jest.fn().mockReturnValue('/fake/projects/test-project/db'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCleanupService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProjectDatabaseService, useValue: mockProjectDbService },
        { provide: PathResolverService, useValue: new (PathResolverService as any)() },
      ],
    }).compile();

    service = module.get<EventCleanupService>(EventCleanupService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    service.stopScheduler();
  });

  // ==================== TC-CLEANUP-001: cleanupProjectEvents ====================
  describe('TC-CLEANUP-001: cleanupProjectEvents', () => {
    it('should skip if system.db not loaded', async () => {
      (mockProjectDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(undefined);

      const result = await service.cleanupProjectEvents('no-db-project');

      expect(result.results).toEqual([]);
      expect(result.projectName).toBe('no-db-project');
    });

    it('should cleanup tables with retention policy', async () => {
      const mockDs = createMockDataSource(
        jest
          .fn()
          // table existence check
          .mockResolvedValueOnce([{ name: 'alm_alarm_records' }])
          // DELETE
          .mockResolvedValueOnce(undefined)
          // changes()
          .mockResolvedValueOnce([{ count: 5 }])
          // VACUUM for policy
          .mockResolvedValueOnce(undefined)
          // VACUUM at end
          .mockResolvedValueOnce(undefined),
      );
      (mockProjectDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(mockDs);

      const result = await service.cleanupProjectEvents('cleanup-project');

      expect(result.projectName).toBe('cleanup-project');
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should handle table not existing gracefully', async () => {
      const mockDs = createMockDataSource(
        jest.fn().mockResolvedValue([]).mockResolvedValueOnce(undefined), // VACUUM
      );
      (mockProjectDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(mockDs);

      const result = await service.cleanupProjectEvents('empty-tables');

      expect(result.results.length).toBe(1);
      result.results.forEach((r) => {
        expect(r.deletedRows).toBe(0);
      });
    });
  });

  // ==================== TC-CLEANUP-002: manualCleanup ====================
  describe('TC-CLEANUP-002: manualCleanup', () => {
    it('should manually cleanup a specific table', async () => {
      const mockDs = createMockDataSource(
        jest
          .fn()
          .mockResolvedValueOnce([{ name: 'alm_alarm_records' }])
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce([{ count: 10 }])
          // VACUUM
          .mockResolvedValueOnce(undefined),
      );
      (mockProjectDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(mockDs);

      const result = await service.manualCleanup('manual-project', 'alm_alarm_records', 30);

      expect(result.tableName).toBe('alm_alarm_records');
      expect(result.deletedRows).toBe(10);
    });

    it('should throw if system.db not loaded', async () => {
      (mockProjectDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(undefined);

      await expect(service.manualCleanup('no-db', 'alm_alarm_records', 30)).rejects.toThrow(
        'system.db not loaded',
      );
    });
  });

  // ==================== TC-CLEANUP-003: getDatabaseSizeStats ====================
  describe('TC-CLEANUP-003: getDatabaseSizeStats', () => {
    it('should return size stats for database files', async () => {
      const dbDir =
        'F:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/packages/ss-project/src/__tests__/__fixtures__/size-project/db';
      (mockProjectDbService.getProjectDbDir as jest.Mock).mockReturnValue(dbDir);
      addFile(dbDir + '/system.db', 'x'.repeat(2048));

      const stats = await service.getDatabaseSizeStats('size-project');

      expect(stats.systemDbSize).toBe(2048);
      // parseFloat strips trailing zeros, so "2.00 KB" becomes "2 KB"
      expect(stats.systemDbSizeHuman).toContain('2');
      expect(stats.systemDbSizeHuman).toContain('KB');
    });

    it('should return 0 for missing files', async () => {
      const dbDir =
        'F:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/packages/ss-project/src/__tests__/__fixtures__/missing-files/db';
      (mockProjectDbService.getProjectDbDir as jest.Mock).mockReturnValue(dbDir);

      const stats = await service.getDatabaseSizeStats('missing-files');

      expect(stats.systemDbSize).toBe(0);
    });
  });

  // ==================== TC-CLEANUP-004: cleanupAllProjects ====================
  describe('TC-CLEANUP-004: cleanupAllProjects', () => {
    it('should skip in unified mode', async () => {
      (mockProjectDbService.getMode as jest.Mock).mockReturnValue('unified');

      await service.cleanupAllProjects();

      // Should not call getLoadedSystemDb
      expect(mockProjectDbService.getLoadedSystemDb).not.toHaveBeenCalled();
    });

    it('should cleanup all projects in isolated mode', async () => {
      // Setup mock for readdirSync to return project directories
      const mockReaddirSync = jest.fn().mockReturnValue([
        { name: 'project-a', isDirectory: () => true, isFile: () => false },
        { name: 'project-b', isDirectory: () => true, isFile: () => false },
      ]);

      const mockDs = createMockDataSource(
        jest.fn().mockResolvedValue([]).mockResolvedValueOnce(undefined), // VACUUM
      );
      (mockProjectDbService.getLoadedSystemDb as jest.Mock).mockReturnValue(mockDs);

      // Override readdirSync on the mock for this test
      const fs = require('fs');
      (fs.readdirSync as jest.Mock).mockImplementation(mockReaddirSync);

      // Ensure the projects directory exists in the virtual FS.
      // getProjectNames() uses pathResolver.resolve('./data/projects')
      // which resolves to jestRoot/data/projects = ss-node/data/projects
      // From test __dirname = .../ss-project/src/__tests__/:
      //   '..' → src/ → '..' → ss-project/ → '..' → packages/ → '..' → ss-node/ → data/projects
      const projectsDir = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..', // from __tests__/ → src/ → ss-project/ → packages/ → ss-node/
        'data',
        'projects',
      );
      addDir(projectsDir);

      await service.cleanupAllProjects();

      expect(mockProjectDbService.getLoadedSystemDb).toHaveBeenCalled();
    });
  });

  // ==================== TC-CLEANUP-005: Scheduler ====================
  describe('TC-CLEANUP-005: Scheduler', () => {
    it('should start and stop scheduler', () => {
      expect(service.isSchedulerRunning()).toBe(false);

      service.startScheduler({ intervalMs: 3600000, enabled: true });

      expect(service.isSchedulerRunning()).toBe(true);

      service.stopScheduler();

      expect(service.isSchedulerRunning()).toBe(false);
    });

    it('should not start if disabled', () => {
      service.startScheduler({ enabled: false });

      expect(service.isSchedulerRunning()).toBe(false);
    });

    it('should not start twice', () => {
      service.startScheduler({ intervalMs: 1000 });
      service.startScheduler({ intervalMs: 2000 });

      expect(service.isSchedulerRunning()).toBe(true);
    });

    it('should track scheduler status', () => {
      service.startScheduler({ intervalMs: 3600000 });

      const status = service.getSchedulerStatus();
      expect(status.running).toBe(true);
      expect(status.totalRuns).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== TC-CLEANUP-006: onModuleDestroy ====================
  describe('TC-CLEANUP-006: onModuleDestroy', () => {
    it('should stop scheduler on destroy', () => {
      service.startScheduler({ intervalMs: 3600000 });
      expect(service.isSchedulerRunning()).toBe(true);

      service.onModuleDestroy();

      expect(service.isSchedulerRunning()).toBe(false);
    });
  });

  // ==================== TC-CLEANUP-007: cleanupGlobalEvents (P1-6) ====================
  describe('TC-CLEANUP-007: cleanupGlobalEvents (P1-6)', () => {
    let mockSystemEventService: any;

    async function createServiceWithSystemEventService(sysEventSvc: any) {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EventCleanupService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: ProjectDatabaseService, useValue: mockProjectDbService },
          { provide: PathResolverService, useValue: new (PathResolverService as any)() },
          { provide: SystemEventService, useValue: sysEventSvc },
        ],
      }).compile();

      return module.get<EventCleanupService>(EventCleanupService);
    }

    it('TC-CLEANUP-007-001: should call SystemEventService.cleanupExpired with 90 days', async () => {
      mockSystemEventService = {
        cleanupExpired: jest.fn().mockResolvedValue(5),
      };
      const svc = await createServiceWithSystemEventService(mockSystemEventService);

      // Access private method via reflection
      await (svc as any).cleanupGlobalEvents();

      expect(mockSystemEventService.cleanupExpired).toHaveBeenCalledWith(90);
    });

    it('TC-CLEANUP-007-002: should update stats when cleanup succeeds', async () => {
      mockSystemEventService = {
        cleanupExpired: jest.fn().mockResolvedValue(10),
      };
      const svc = await createServiceWithSystemEventService(mockSystemEventService);

      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await (svc as any).cleanupGlobalEvents();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Global sys_events cleanup: 10 expired events removed',
      );
      expect((svc as any).cleanupStats.totalDeletedRows).toBe(10);
      loggerSpy.mockRestore();
    });

    it('TC-CLEANUP-007-003: should not log when no events deleted', async () => {
      mockSystemEventService = {
        cleanupExpired: jest.fn().mockResolvedValue(0),
      };
      const svc = await createServiceWithSystemEventService(mockSystemEventService);

      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await (svc as any).cleanupGlobalEvents();

      // Should not log the "removed" message
      const removedCalls = loggerSpy.mock.calls.filter(
        (c: any[]) => c[0] && typeof c[0] === 'string' && c[0].includes('expired events removed'),
      );
      expect(removedCalls.length).toBe(0);
      loggerSpy.mockRestore();
    });

    it('TC-CLEANUP-007-004: should handle errors gracefully', async () => {
      const error = new Error('DB connection failed');
      mockSystemEventService = {
        cleanupExpired: jest.fn().mockRejectedValue(error),
      };
      const svc = await createServiceWithSystemEventService(mockSystemEventService);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      await (svc as any).cleanupGlobalEvents();

      expect(loggerSpy).toHaveBeenCalledWith(`Global sys_events cleanup failed: ${error.message}`);
      expect((svc as any).cleanupStats.totalErrors).toBe(1);
      loggerSpy.mockRestore();
    });

    it('TC-CLEANUP-007-005: should skip if SystemEventService not available', async () => {
      // Re-create service without SystemEventService
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EventCleanupService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: ProjectDatabaseService, useValue: mockProjectDbService },
          { provide: PathResolverService, useValue: new (PathResolverService as any)() },
        ],
      }).compile();

      const svc = module.get<EventCleanupService>(EventCleanupService);
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');

      await (svc as any).cleanupGlobalEvents();

      expect(loggerSpy).toHaveBeenCalledWith(
        'SystemEventService not available, skip global events cleanup',
      );
      loggerSpy.mockRestore();
    });
  });
});
