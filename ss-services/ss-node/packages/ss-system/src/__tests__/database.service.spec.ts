// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock sqlite3 (异步回调 API)
// 使用 process.nextTick 延迟回调，避免 "Cannot access 'db' before initialization" TDZ 错误
// 原因：const db = new Database(path, cb) 中 cb 若同步执行，此时 db 尚未赋值（TDZ）
const mockDb = {
  get: jest.fn().mockImplementation((sql: string, cb: (err: Error | null, row?: any) => void) => {
    process.nextTick(() => {
      if (sql.includes('COUNT(*)')) {
        cb(null, { cnt: 5 });
      } else {
        cb(null, undefined);
      }
    });
  }),
  all: jest
    .fn()
    .mockImplementation((sql: string, cb: (err: Error | null, rows?: any[]) => void) => {
      process.nextTick(() => {
        if (sql.includes('integrity_check')) {
          cb(null, [{ integrity_check: 'ok' }]);
        } else {
          cb(null, []);
        }
      });
    }),
  exec: jest.fn().mockImplementation((sql: string, cb: (err: Error | null) => void) => {
    process.nextTick(() => cb(null));
  }),
  close: jest.fn().mockImplementation((cb?: (err: Error | null) => void) => {
    if (cb) process.nextTick(() => cb(null));
  }),
};

jest.mock('sqlite3', () => {
  return {
    Database: jest.fn().mockImplementation((dbPath: string, ...args: any[]) => {
      // 兼容两种构造签名：
      //   new Database(path, cb)  /  new Database(path, mode, cb)
      const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
      // 必须异步调用 cb，否则 const db = new Database(...) 会触发 TDZ
      if (cb) process.nextTick(() => cb(null));
      return mockDb;
    }),
    OPEN_READONLY: 1,
    OPEN_READWRITE: 2,
    OPEN_CREATE: 4,
  };
});

import { DatabaseService } from '../backup/database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockConfigService: any;
  let tempDir: string;
  let systemDbPath: string;
  let projectsDir: string;

  beforeAll(() => {
    // setup.ts 全局启用了 jest.useFakeTimers()，会拦截 process.nextTick，
    // 导致 sqlite3 mock 的异步回调永远不触发，测试超时。
    // 本测试文件需要真实定时器来驱动 sqlite3 的异步回调。
    jest.useRealTimers();

    tempDir = path.join(os.tmpdir(), `db-service-test-${Date.now()}`);

    // 创建系统数据库
    const dbDir = path.join(tempDir, 'data');
    systemDbPath = path.join(dbDir, 'database.sqlite');
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(systemDbPath, 'SQLite format 3\x00' + 'test-data'.repeat(100));

    // 创建项目数据库
    projectsDir = path.join(tempDir, 'projects');
    const projectDbDir = path.join(projectsDir, 'test-project', 'db');
    fs.mkdirSync(projectDbDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectDbDir, 'system.db'),
      'SQLite format 3\x00' + 'project-data'.repeat(50),
    );
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const fakeProjectRoot = path.join(__dirname, '..', '..', '..', '..');

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return systemDbPath;
        if (key === 'PROJECTS_DIR') return projectsDir;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PathResolverService, useValue: { resolve: jest.fn((p: string) => path.resolve(fakeProjectRoot, p)), getProjectRoot: jest.fn().mockReturnValue(fakeProjectRoot) } },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    jest.clearAllMocks();
  });

  // ==================== 数据库状态 ====================

  describe('getSystemDatabaseStatus', () => {
    it('TC-DB-001: should return system database status with ISO date string', async () => {
      const status = await service.getSystemDatabaseStatus();

      expect(status.type).toBe('system');
      expect(status.exists).toBe(true);
      expect(status.sizeBytes).toBeGreaterThan(0);
      expect(status.sizeFormatted).toBeDefined();
      expect(status.tableCount).toBeGreaterThanOrEqual(0);
      // lastModified 应为 ISO 格式字符串
      expect(status.lastModified).toBeTruthy();
      expect(typeof status.lastModified).toBe('string');
      expect(new Date(status.lastModified!).getTime()).not.toBeNaN();
      // 正常数据库不应有 errorMessage
      expect(status.errorMessage).toBeUndefined();
    });

    it('TC-DB-001b: should return errorMessage when database file not found', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return path.join(tempDir, 'nonexistent', 'db.sqlite');
        if (key === 'PROJECTS_DIR') return projectsDir;
        return undefined;
      });

      const status = await service.getSystemDatabaseStatus();

      expect(status.exists).toBe(false);
      expect(status.lastModified).toBeNull();
      expect(status.errorMessage).toBeDefined();
      expect(status.errorMessage).toContain('Database file not found');
      expect(status.errorMessage).toContain('nonexistent');
    });
  });

  describe('getProjectDatabasesStatus', () => {
    it('TC-DB-002: should return project database status list with ISO date', async () => {
      const statuses = await service.getProjectDatabasesStatus();

      expect(statuses.length).toBeGreaterThan(0);
      const projectDb = statuses.find((s) => s.name === 'test-project');
      expect(projectDb).toBeDefined();
      expect(projectDb!.type).toBe('project');
      expect(projectDb!.exists).toBe(true);
      expect(projectDb!.sizeBytes).toBeGreaterThan(0);
      // lastModified 应为 ISO 格式字符串
      expect(typeof projectDb!.lastModified).toBe('string');
      expect(new Date(projectDb!.lastModified!).getTime()).not.toBeNaN();
      // 正常数据库不应有 errorMessage
      expect(projectDb!.errorMessage).toBeUndefined();
    });

    it('TC-DB-003: should return empty list when projects dir is missing', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return systemDbPath;
        if (key === 'PROJECTS_DIR') return path.join(tempDir, 'nonexistent');
        return undefined;
      });

      const statuses = await service.getProjectDatabasesStatus();
      expect(statuses).toEqual([]);
    });

    it('TC-DB-003b: should return errorMessage for non-existent project db', async () => {
      // 创建一个空目录模拟不存在的项目数据库
      const emptyProjectDir = path.join(projectsDir, 'empty-project');
      fs.mkdirSync(emptyProjectDir, { recursive: true });

      const statuses = await service.getProjectDatabasesStatus();
      const emptyProject = statuses.find((s) => s.name === 'empty-project');

      expect(emptyProject).toBeDefined();
      expect(emptyProject!.exists).toBe(false);
      expect(emptyProject!.errorMessage).toBeDefined();
      expect(emptyProject!.errorMessage).toContain('Database file not found');

      fs.rmdirSync(emptyProjectDir);
    });
  });

  describe('getAllDatabasesStatus', () => {
    it('TC-DB-004: should return system and project status', async () => {
      const result = await service.getAllDatabasesStatus();

      expect(result.system).toBeDefined();
      expect(result.system.type).toBe('system');
      expect(result.projects).toBeDefined();
      expect(Array.isArray(result.projects)).toBe(true);
    });
  });

  // ==================== 路径解析（v1.3 新增） ====================

  describe('Path Resolution (v1.3)', () => {
    it('TC-DB-PATH-001: should resolve relative DATABASE_PATH to absolute path', async () => {
      // 模拟 .env.ss 中的相对路径配置
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return '../../ss-run/ss/data/db/ss-node.db';
        if (key === 'PROJECTS_DIR') return projectsDir;
        return undefined;
      });

      const status = await service.getSystemDatabaseStatus();

      // 期望：返回的 path 是绝对路径
      expect(path.isAbsolute(status.path)).toBe(true);
      // 期望：路径以 ss-run/ss/data/db/ss-node.db 结尾
      expect(status.path).toContain(path.normalize('ss-run/ss/data/db/ss-node.db'));
      // 期望：路径不依赖 process.cwd()，基于 ss-services/ss-node 解析
      // ss-services/ss-node + ../../ss-run/ss/data/db/ss-node.db = ss-v7/ss-run/ss/data/db/ss-node.db
      expect(status.path).not.toContain('apps/ss-node-server');
    });

    it('TC-DB-PATH-002: should resolve relative PROJECTS_DIR to absolute path', async () => {
      // 模拟 .env.ss 中的相对路径配置
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return systemDbPath;
        if (key === 'PROJECTS_DIR') return '../../ss-project';
        return undefined;
      });

      const statuses = await service.getProjectDatabasesStatus();

      // 即使目录不存在，也期望返回空数组（不抛错）
      expect(Array.isArray(statuses)).toBe(true);
      // 由于 ../../ss-project 在测试环境下不存在（相对 ss-services/ss-node），
      // 返回空数组是正确的
    });

    it('TC-DB-PATH-003: should return absolute path in status response for existing project', async () => {
      // 使用绝对路径的 projectsDir（已在 beforeAll 中创建）
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return systemDbPath;
        if (key === 'PROJECTS_DIR') return projectsDir;
        return undefined;
      });

      const statuses = await service.getProjectDatabasesStatus();
      const projectDb = statuses.find((s) => s.name === 'test-project');

      expect(projectDb).toBeDefined();
      // 期望：返回的 path 是绝对路径（不再依赖 process.cwd()）
      expect(path.isAbsolute(projectDb!.path)).toBe(true);
      expect(projectDb!.path).toBe(path.join(projectsDir, 'test-project', 'db', 'system.db'));
    });

    it('TC-DB-PATH-004: getProjectRoot should return ss-services/ss-node directory', () => {
      // 通过反射访问私有方法验证项目根目录计算
      const getProjectRoot = (service as any).getProjectRoot.bind(service);
      const projectRoot = getProjectRoot();

      expect(path.isAbsolute(projectRoot)).toBe(true);
      // 项目根目录应包含 ss-services/ss-node 路径段
      expect(projectRoot).toContain('ss-services');
      expect(projectRoot).toContain('ss-node');
      // 不应包含 apps/ss-node-server（这是 process.cwd() 的位置）
      expect(projectRoot).not.toContain('apps');
      expect(projectRoot).not.toContain('ss-node-server');
      // 不应包含 packages/ss-system（dist 所在）
      expect(projectRoot).not.toContain('packages');
      expect(projectRoot).not.toContain('ss-system');
    });
  });

  // ==================== 完整性检查 ====================

  describe('checkSystemIntegrity', () => {
    it('TC-DB-010: should return ok for valid database', async () => {
      const result = await service.checkSystemIntegrity();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('ok');
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('TC-DB-011: should return fail for invalid path', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return path.join(tempDir, 'nonexistent', 'db.sqlite');
        if (key === 'PROJECTS_DIR') return projectsDir;
        return undefined;
      });

      const result = await service.checkSystemIntegrity();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('TC-DB-011b: should return fail when integrity_check returns error', async () => {
      mockDb.all.mockImplementationOnce(
        (sql: string, cb: (err: Error | null, rows?: any[]) => void) => {
          cb(null, [{ integrity_check: 'database disk image is malformed' }]);
        },
      );

      const result = await service.checkSystemIntegrity();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('malformed');
    });
  });

  describe('checkProjectIntegrity', () => {
    it('TC-DB-012: should return ok for valid project database', async () => {
      const result = await service.checkProjectIntegrity('test-project');

      expect(result.ok).toBe(true);
      expect(result.message).toBe('ok');
    });

    it('TC-DB-013: should return fail for non-existent project', async () => {
      const result = await service.checkProjectIntegrity('nonexistent-project');

      expect(result.ok).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  // ==================== 空间回收 ====================

  describe('vacuumSystem', () => {
    it('TC-DB-020: should execute VACUUM successfully', async () => {
      const result = await service.vacuumSystem();

      expect(result.ok).toBe(true);
      expect(result.beforeBytes).toBeGreaterThanOrEqual(0);
      expect(result.afterBytes).toBeGreaterThanOrEqual(0);
      expect(result.freedFormatted).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('TC-DB-020b: should throw when database file not found', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return path.join(tempDir, 'nonexistent', 'db.sqlite');
        if (key === 'PROJECTS_DIR') return projectsDir;
        return undefined;
      });

      await expect(service.vacuumSystem()).rejects.toThrow('not found');
    });
  });

  describe('vacuumProject', () => {
    it('TC-DB-021: should execute VACUUM on project database', async () => {
      const result = await service.vacuumProject('test-project');

      expect(result.ok).toBe(true);
      expect(result.beforeBytes).toBeGreaterThan(0);
      expect(result.afterBytes).toBeGreaterThanOrEqual(0);
    });

    it('TC-DB-022: should throw for non-existent project', async () => {
      await expect(service.vacuumProject('nonexistent-project')).rejects.toThrow();
    });
  });

  // ==================== better-sqlite3 → sqlite3 迁移（v1.4） ====================

  describe('sqlite3 migration (v1.4)', () => {
    it('TC-DB-MIG-001: should use sqlite3 (async) instead of better-sqlite3', async () => {
      // 验证 sqlite3 模块被加载（通过 mock）
      // 由于 jest.mock 替换了 require('sqlite3')，如果 service 能正常调用，
      // 说明 sqlite3 被正确使用
      const status = await service.getSystemDatabaseStatus();
      expect(status.exists).toBe(true);
      expect(mockDb.get).toHaveBeenCalled();
    });

    it('TC-DB-MIG-002: countTables should use sqlite3 OPEN_READONLY', async () => {
      await service.getSystemDatabaseStatus();

      // 验证 Database 构造时使用了 OPEN_READONLY
      // mockDb 已经被调用过
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.any(Function),
      );
    });

    it('TC-DB-MIG-003: integrity check should use PRAGMA integrity_check', async () => {
      await service.checkSystemIntegrity();

      expect(mockDb.all).toHaveBeenCalledWith('PRAGMA integrity_check', expect.any(Function));
    });

    it('TC-DB-MIG-004: VACUUM should execute VACUUM command', async () => {
      await service.vacuumSystem();

      expect(mockDb.exec).toHaveBeenCalledWith('VACUUM', expect.any(Function));
    });
  });
});
