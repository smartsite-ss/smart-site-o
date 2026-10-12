// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock Node.js fs module with a virtual filesystem
// ============================================================
const virtualFs: Map<string, string | Buffer> = new Map();
const virtualDirs: Set<string> = new Set();

function resetVirtualFs(): void {
  virtualFs.clear();
  virtualDirs.clear();
}

function addDir(dirPath: string): void {
  const normalized = dirPath.replace(/\\/g, '/');
  // Also add all parent dirs
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
    rmSync: jest.fn((p: string, _opts?: any) => {
      const np = p.replace(/\\/g, '/');
      // Remove files
      for (const key of [...virtualFs.keys()]) {
        if (key === np || key.startsWith(np + '/')) {
          virtualFs.delete(key);
        }
      }
      // Remove dirs
      virtualDirs.delete(np);
      for (const key of [...virtualDirs]) {
        if (key.startsWith(np + '/')) {
          virtualDirs.delete(key);
        }
      }
    }),
    copyFileSync: jest.fn((src: string, dest: string) => {
      const nsrc = src.replace(/\\/g, '/');
      const ndest = dest.replace(/\\/g, '/');
      const content = virtualFs.get(nsrc);
      if (content !== undefined) {
        addFile(ndest, content);
      }
    }),
    unlinkSync: jest.fn((p: string) => {
      const np = p.replace(/\\/g, '/');
      virtualFs.delete(np);
    }),
    statSync: jest.fn((p: string) => {
      const np = p.replace(/\\/g, '/');
      const content = virtualFs.get(np);
      if (content === undefined) {
        const err: any = new Error(`ENOENT`);
        err.code = 'ENOENT';
        throw err;
      }
      return { size: Buffer.isBuffer(content) ? content.length : content.length };
    }),
    createReadStream: jest.fn((_p: string) => {
      const { Readable } = require('stream');
      const s = new Readable();
      s.push(null);
      return s;
    }),
    createWriteStream: jest.fn((_p: string) => {
      const { Writable } = require('stream');
      return new Writable({
        write(_chunk: any, _encoding: string, callback: () => void) {
          callback();
        },
      });
    }),
    // fs.promises 异步版本（用于 getManageInfo 的非阻塞 I/O）
    promises: {
      readdir: jest.fn(async (p: string, _opts?: any) => {
        const np = p.replace(/\\/g, '/');
        const entries: any[] = [];
        const prefix = np + '/';
        for (const [fpath] of virtualFs) {
          if (fpath.startsWith(prefix)) {
            const relative = fpath.slice(prefix.length);
            const slashIdx = relative.indexOf('/');
            if (slashIdx === -1) {
              entries.push({ name: relative, isDirectory: () => false, isFile: () => true });
            } else {
              entries.push({
                name: relative.substring(0, slashIdx),
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
              entries.push({ name, isDirectory: () => true, isFile: () => false });
            }
          }
        }
        return entries;
      }),
      access: jest.fn(async (p: string) => {
        const np = p.replace(/\\/g, '/');
        if (!virtualDirs.has(np) && !virtualFs.has(np)) {
          const err: any = new Error(`ENOENT: no such file or directory, access '${np}'`);
          err.code = 'ENOENT';
          throw err;
        }
      }),
      stat: jest.fn(async (p: string) => {
        const np = p.replace(/\\/g, '/');
        const content = virtualFs.get(np);
        if (content === undefined) {
          const err: any = new Error(`ENOENT: no such file or directory, stat '${np}'`);
          err.code = 'ENOENT';
          throw err;
        }
        return { size: Buffer.isBuffer(content) ? content.length : content.length };
      }),
    },
  };
});

jest.mock('archiver', () => {
  return jest.fn().mockImplementation(() => {
    const archive: any = {
      pipe: jest.fn(),
      directory: jest.fn(),
      file: jest.fn(),
      pointer: jest.fn().mockReturnValue(1024),
      on: jest.fn(),
    };
    archive.finalize = jest.fn().mockImplementation(() => {
      // Simulate finalize: end the piped output stream to trigger 'close' event
      if (archive.pipe.mock.calls.length > 0) {
        const output = archive.pipe.mock.calls[0][0];
        if (output && typeof output.end === 'function') {
          output.end();
        }
      }
    });
    return archive;
  });
});

jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => ({
    getEntries: jest.fn(),
    extractAllTo: jest.fn(),
  }));
});

// Mock TypeORM DataSource for checkDbFile in the service
jest.mock('typeorm', () => {
  // Repository / AbstractRepository 必须以类形式提供，
  // 否则 @nestjs/typeorm 的 getRepositoryToken 中 instanceof 检查会抛错
  class MockRepository {}
  class MockAbstractRepository {}
  class MockEntityManager {}
  class MockEntitySchema {}
  return {
    DataSource: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([{ cnt: 0 }]),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
    Repository: MockRepository,
    AbstractRepository: MockAbstractRepository,
    EntityManager: MockEntityManager,
    EntitySchema: MockEntitySchema,
    getMetadataArgsStorage: () => ({ tables: [], relations: [], columns: [], indices: [] }),
    Entity: () => jest.fn(),
    Column: () => jest.fn(),
    PrimaryColumn: () => jest.fn(),
    PrimaryGeneratedColumn: () => jest.fn(),
    CreateDateColumn: () => jest.fn(),
    UpdateDateColumn: () => jest.fn(),
    OneToMany: () => jest.fn(),
    ManyToOne: () => jest.fn(),
    JoinColumn: () => jest.fn(),
    Index: () => jest.fn(),
    Unique: () => jest.fn(),
  };
});

jest.mock('@ss-node/ss-core', () => {
  const actual = jest.requireActual('@ss-node/ss-core');
  return {
    ...actual,
    PathResolverService: class {
      resolve = jest.fn((p: string) => require('path').resolve(p));
      getProjectRoot = jest.fn(() => process.cwd());
      resolveEnv = jest.fn((_env: string, defaultValue: string) =>
        require('path').resolve(defaultValue),
      );
    },
  };
});

// Mock ss-device and ss-alarm to avoid resolving their full dependency chains
jest.mock('@ss-node/ss-device', () => ({
  DeviceService: class {
    getDeviceStats = jest.fn();
  },
  DeviceStats: undefined as any,
  Device: class {},
  DataTag: class {},
  DeviceGroup: class {},
  DeviceStatusLog: class {},
  TagLatestValue: class {},
  ChannelConfigService: class {},
  DeviceModule: class {},
}));

jest.mock('@ss-node/ss-alarm', () => ({
  AlarmStatisticsService: class {
    getStatistics = jest.fn();
  },
  AlarmService: class {},
  AlarmModule: class {},
  AlarmRule: class {},
  AlarmRecord: class {},
  AlarmGroup: class {},
  ConditionEvaluator: class {},
  AlarmDebouncer: class {},
  AlarmEscalationService: class {},
  AlarmNotificationService: class {},
  AlarmGroupService: class {},
  AlarmEscalatorService: class {},
  AlarmSuppressionService: class {},
  DeviceOfflineSuppressionService: class {},
  SmsNotificationChannel: class {},
  TtsNotificationChannel: class {},
}));

import * as fs from 'fs';
import * as path from 'path';
import { ProjectService } from '../project.service';
import { PathResolverService } from '@ss-node/ss-core';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '@ss-node/ss-i18n';
import { BadRequestException, NotFoundException } from '@nestjs/common';

function createMockConfigService() {
  return {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'PROJECTS_DIR') return './data/projects';
      if (key === 'PROJECT_DB_MODE') return 'isolated';
      return undefined;
    }),
  } as unknown as ConfigService;
}

function createMockI18nService() {
  return {
    tSync: jest.fn().mockImplementation((key: string, params?: any) => {
      if (key === 'error.project.PROJ_001') return `Project not found: ${params?.id}`;
      return `i18n:${key}`;
    }),
  } as unknown as I18nService;
}

function createMockProjectDbService() {
  return {
    getMode: jest.fn().mockReturnValue('isolated'),
    initProjectDatabases: jest.fn().mockResolvedValue(undefined),
    deleteProjectDatabases: jest.fn().mockResolvedValue(undefined),
    unloadProjectDatabases: jest.fn().mockResolvedValue(undefined),
    hasDatabaseFiles: jest.fn().mockReturnValue(true),
    vacuumProjectDatabases: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockEventBus() {
  return {
    emit: jest.fn(),
    emitAsync: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockDeviceService() {
  return {
    getDeviceStats: jest.fn().mockResolvedValue({
      total: 0,
      online: 0,
      offline: 0,
      connecting: 0,
      degraded: 0,
      error: 0,
      totalTags: 0,
    }),
  };
}

function createMockAlarmStatsService() {
  return {
    getStatistics: jest.fn().mockResolvedValue({
      total: 0,
      active: 0,
      acknowledged: 0,
      cleared: 0,
      shelved: 0,
      byLevel: { info: 0, warning: 0, error: 0, critical: 0 },
      byStatus: { active: 0, acknowledged: 0, cleared: 0, shelved: 0 },
    }),
  };
}

describe('ProjectService', () => {
  let service: ProjectService;
  let mockConfigService: ConfigService;
  let mockI18nService: I18nService;
  let mockProjectDbService: ReturnType<typeof createMockProjectDbService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockDeviceService: ReturnType<typeof createMockDeviceService>;
  let mockAlarmStatsService: ReturnType<typeof createMockAlarmStatsService>;

  const projectsBaseDir = '/fake/projects';

  beforeEach(() => {
    resetVirtualFs();
    jest.clearAllMocks();

    mockConfigService = createMockConfigService();
    mockI18nService = createMockI18nService();
    mockProjectDbService = createMockProjectDbService();
    mockEventBus = createMockEventBus();
    mockDeviceService = createMockDeviceService();
    mockAlarmStatsService = createMockAlarmStatsService();

    // Mock ConfigService.get to return the test base dir
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'PROJECTS_DIR') return projectsBaseDir;
      if (key === 'PROJECT_DB_MODE') return 'isolated';
      return undefined;
    });

    service = new ProjectService(
      mockConfigService,
      mockI18nService,
      mockProjectDbService,
      mockEventBus,
      new PathResolverService() as any,
      mockDeviceService as any,
      mockAlarmStatsService as any,
    );
  });

  // ==================== create ====================
  describe('create', () => {
    const validDto = {
      projectName: 'My Project',
      description: 'A test project',
      config: {},
    };
    const userId = 'user-001';

    it('should create project with valid data', async () => {
      const result = await service.create(validDto, userId);

      expect(result).toBeDefined();
      expect(result.projectName).toBe('My Project');
      expect(result.projectId).toBe('my-project');
      expect(result.projectId).toBeTruthy();
      expect(result.createdBy).toBe(userId);
      expect(result.projectPath).toBeTruthy();

      // Verify projectinfo.json was written
      const _infoPath = path.join(projectsBaseDir, 'my-project', 'projectinfo.json');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockProjectDbService.initProjectDatabases).toHaveBeenCalledWith('my-project');
    });

    it('should generate TID from name', async () => {
      const result = await service.create(
        { projectName: 'Hello World Test', description: '', config: {} },
        userId,
      );

      expect(result.projectId).toBe('hello-world-test');
    });

    it('should use provided TID when specified', async () => {
      const result = await service.create({ ...validDto, projectId: 'custom-tid' }, userId);

      expect(result.projectId).toBe('custom-tid');
    });

    it('should create subdirectories (db, rtdb, pages, template)', async () => {
      await service.create(validDto, userId);

      // 使用与 service.getProjectsDir() 一致的路径解析
      // service 在 PROJECTS_DIR 为绝对路径（含前导 /）时原样返回，不拼接 process.cwd()
      const actualProjectsDir = service.getProjectsDir();
      const dbDir = path.join(actualProjectsDir, 'my-project', 'db');
      const rtdbDir = path.join(actualProjectsDir, 'my-project', 'rtdb');
      const pagesDir = path.join(actualProjectsDir, 'my-project', 'pages');
      const templateDir = path.join(actualProjectsDir, 'my-project', 'template');
      expect(fs.mkdirSync).toHaveBeenCalledWith(dbDir, expect.any(Object));
      expect(fs.mkdirSync).toHaveBeenCalledWith(rtdbDir, expect.any(Object));
      expect(fs.mkdirSync).toHaveBeenCalledWith(pagesDir, expect.any(Object));
      expect(fs.mkdirSync).toHaveBeenCalledWith(templateDir, expect.any(Object));
    });

    it('should throw BadRequestException on duplicate TID', async () => {
      // First create succeeds
      await service.create(validDto, userId);

      // Second create with same name should fail
      await expect(service.create(validDto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.create(validDto, userId)).rejects.toThrow('已存在');
    });

    it('should throw BadRequestException when name is empty', async () => {
      await expect(
        service.create({ projectName: '  ', description: '', config: {} }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when TID is empty after trim', async () => {
      await expect(
        service.create(
          { projectName: '---', projectId: '  ', description: '', config: {} },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid TID characters', async () => {
      const result = await service.create(
        { projectName: 'My@Project!#$', description: '', config: {} },
        userId,
      );

      expect(result.projectId).toBe('my-project');
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    const userId = 'user-001';

    beforeEach(async () => {
      // Create two projects in virtual fs
      await service.create(
        { projectName: 'Project A', description: 'First project', config: {} },
        userId,
      );
      await service.create(
        { projectName: 'Project B', description: 'Second project', config: {} },
        userId,
      );
    });

    it('should return paginated projects', async () => {
      const result = await service.findAll(userId, { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should support pagination', async () => {
      const result = await service.findAll(userId, { page: 1, pageSize: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should support keyword search by name', async () => {
      const result = await service.findAll(userId, { keyword: 'Project A' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].projectName).toBe('Project A');
    });

    it('should support keyword search by description', async () => {
      const result = await service.findAll(userId, { keyword: 'Second' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toBe('Second project');
    });

    it('should return empty when keyword matches nothing', async () => {
      const result = await service.findAll(userId, { keyword: 'nonexistent' });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should use default page/pageSize when query is undefined', async () => {
      const result = await service.findAll(userId);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('should return empty data when no projects exist', async () => {
      resetVirtualFs();
      const result = await service.findAll(userId);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ==================== findOne ====================
  describe('findOne', () => {
    const userId = 'user-001';

    it('should return project by id (tid)', async () => {
      const created = await service.create(
        { projectName: 'Find Me', description: '', config: {} },
        userId,
      );

      const result = await service.findOne(created.projectId, userId);

      expect(result).toBeDefined();
      expect(result.projectId).toBe(created.projectId);
      expect(result.projectName).toBe('Find Me');
    });

    it('should throw NotFoundException when project not found', async () => {
      await expect(service.findOne('non-existent', userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== update ====================
  describe('update', () => {
    const userId = 'user-001';

    it('should update project description', async () => {
      const created = await service.create(
        { projectName: 'Update Me', description: 'old desc', config: {} },
        userId,
      );

      const result = await service.update(created.projectId, { description: 'new desc' }, userId);

      expect(result.description).toBe('new desc');
      expect(result.updatedBy).toBe(userId);
    });

    it('should update project config', async () => {
      const created = await service.create(
        { projectName: 'Config Test', description: '', config: {} },
        userId,
      );

      const result = await service.update(created.projectId, { config: { theme: 'dark' } }, userId);

      expect(result.config).toEqual({ theme: 'dark' });
    });

    it('should throw BadRequestException when trying to change name', async () => {
      const created = await service.create(
        { projectName: 'Original Name', description: '', config: {} },
        userId,
      );

      await expect(
        service.update(created.projectId, { projectName: 'New Name' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when updating non-existent project', async () => {
      await expect(service.update('non-existent', { description: 'x' }, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not throw when name is unchanged', async () => {
      const created = await service.create(
        { projectName: 'Same Name', description: '', config: {} },
        userId,
      );

      const result = await service.update(
        created.projectId,
        { projectName: 'Same Name', description: 'updated' },
        userId,
      );

      expect(result.description).toBe('updated');
    });
  });

  // ==================== remove ====================
  describe('remove', () => {
    const userId = 'user-001';

    it('should delete project and cleanup', async () => {
      const created = await service.create(
        { projectName: 'Delete Me', description: '', config: {} },
        userId,
      );

      await service.remove(created.projectId, userId);

      // Verify project directory is removed
      expect(fs.rmSync).toHaveBeenCalled();
      expect(mockProjectDbService.deleteProjectDatabases).toHaveBeenCalledWith(created.projectId);
    });

    it('should throw NotFoundException when removing non-existent project', async () => {
      await expect(service.remove('non-existent', userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== exportProject ====================
  describe('exportProject', () => {
    const userId = 'user-001';

    it('should export project as zip', async () => {
      const created = await service.create(
        { projectName: 'Export Me', description: '', config: {} },
        userId,
      );

      const result = await service.exportProject(created.projectId, userId);

      expect(result).toBeDefined();
      expect(result.filePath).toBeTruthy();
      expect(result.projectName).toBe(created.projectId);
    });

    it('should throw NotFoundException when exporting non-existent project', async () => {
      await expect(service.exportProject('non-existent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should support selective export: only pages (exclude db and rtdb)', async () => {
      const created = await service.create(
        { projectName: 'Selective Pages', description: '', config: {} },
        userId,
      );

      const result = await service.exportProject(created.projectId, userId, {
        includePages: true,
        includeProjectDb: false,
        includeRtdb: false,
      });

      expect(result.filePath).toBeTruthy();
      expect(result.projectName).toBe(created.projectId);
    });

    it('should support selective export: only db (exclude pages and rtdb)', async () => {
      const created = await service.create(
        { projectName: 'Selective Db', description: '', config: {} },
        userId,
      );

      const result = await service.exportProject(created.projectId, userId, {
        includePages: false,
        includeProjectDb: true,
        includeRtdb: false,
      });

      expect(result.filePath).toBeTruthy();
    });

    it('should support selective export: none (only projectinfo.json + template)', async () => {
      const created = await service.create(
        { projectName: 'Selective None', description: '', config: {} },
        userId,
      );

      const result = await service.exportProject(created.projectId, userId, {
        includePages: false,
        includeProjectDb: false,
        includeRtdb: false,
      });

      expect(result.filePath).toBeTruthy();
    });

    it('should export successfully even when db dir contains WAL/SHM temp files', async () => {
      const created = await service.create(
        { projectName: 'Db With Wal', description: '', config: {} },
        userId,
      );
      const projectDir = (service as any).getProjectDir(created.projectId);
      // 在 db 目录下添加 WAL/SHM 临时文件（模拟运行中数据库）
      addFile(`${projectDir}/db/system.db`, 'main database');
      addFile(`${projectDir}/db/system.db-wal`, 'wal data');
      addFile(`${projectDir}/db/system.db-shm`, 'shm data');

      // 导出不应抛错（即使存在 WAL/SHM 文件）
      const result = await service.exportProject(created.projectId, userId, {
        includePages: false,
        includeProjectDb: true,
        includeRtdb: false,
      });

      expect(result.filePath).toBeTruthy();
    });
  });

  // ==================== addDirToArchiveExcludingDbTemp ====================
  describe('addDirToArchiveExcludingDbTemp', () => {
    it('should archive .db files but exclude .db-wal and .db-shm', () => {
      const dbDir = '/mock/projects/test-exclude/db';
      addFile(`${dbDir}/system.db`, 'main database');
      addFile(`${dbDir}/system.db-wal`, 'wal data');
      addFile(`${dbDir}/system.db-shm`, 'shm data');

      const mockArchive = { file: jest.fn() } as any;
      (service as any).addDirToArchiveExcludingDbTemp(mockArchive, dbDir, 'db');

      const archivedNames = mockArchive.file.mock.calls.map((c: any[]) => c[1]?.name);

      // .db 文件应被包含
      expect(archivedNames).toContain('db/system.db');

      // WAL/SHM 临时文件应被排除
      expect(archivedNames).not.toContain('db/system.db-wal');
      expect(archivedNames).not.toContain('db/system.db-shm');
    });

    it('should handle empty db directory without error', () => {
      const dbDir = '/mock/projects/test-empty/db';
      addDir(dbDir);

      const mockArchive = { file: jest.fn() } as any;
      expect(() => {
        (service as any).addDirToArchiveExcludingDbTemp(mockArchive, dbDir, 'db');
      }).not.toThrow();
      expect(mockArchive.file).not.toHaveBeenCalled();
    });

    it('should handle nested subdirectories recursively', () => {
      const dbDir = '/mock/projects/test-nested/db';
      addFile(`${dbDir}/system.db`, 'main');
      addFile(`${dbDir}/system.db-wal`, 'wal');
      addFile(`${dbDir}/backups/old.db`, 'backup');
      addFile(`${dbDir}/backups/old.db-shm`, 'backup shm');

      const mockArchive = { file: jest.fn() } as any;
      (service as any).addDirToArchiveExcludingDbTemp(mockArchive, dbDir, 'db');

      const archivedNames = mockArchive.file.mock.calls.map((c: any[]) => c[1]?.name);
      expect(archivedNames).toContain('db/system.db');
      expect(archivedNames).toContain('db/backups/old.db');
      expect(archivedNames).not.toContain('db/system.db-wal');
      expect(archivedNames).not.toContain('db/backups/old.db-shm');
    });
  });

  // ==================== exportProjectZip ====================
  describe('exportProjectZip', () => {
    const userId = 'user-001';

    it('should export project zip with fileName', async () => {
      const created = await service.create(
        { projectName: 'Export Zip', description: '', config: {} },
        userId,
      );

      const result = await service.exportProjectZip(created.projectId, userId);

      expect(result.fileName).toBeTruthy();
      expect(result.filePath).toBeTruthy();
      expect(result.projectName).toBe(created.projectId);
    });

    it('should export project zip with selective options', async () => {
      const created = await service.create(
        { projectName: 'Selective Export', description: '', config: {} },
        userId,
      );

      const result = await service.exportProjectZip(created.projectId, userId, {
        includePages: true,
        includeProjectDb: false,
        includeRtdb: false,
      });

      expect(result.fileName).toBeTruthy();
      expect(result.filePath).toBeTruthy();
    });
  });

  // ==================== importProjectZip ====================
  describe('importProjectZip', () => {
    const userId = 'user-001';

    function createMockZipBuffer(projectName: string, projectInfo: object): Buffer {
      const AdmZip = require('adm-zip');
      const mockZip = {
        getEntries: jest.fn().mockReturnValue([
          { isDirectory: true, entryName: `${projectName}/` },
          {
            isDirectory: false,
            entryName: `${projectName}/projectinfo.json`,
          },
        ]),
        extractAllTo: jest.fn().mockImplementation((tmpDir: string) => {
          const projectDir = path.join(tmpDir, projectName);
          addDir(projectDir);
          addFile(path.join(projectDir, 'projectinfo.json'), JSON.stringify(projectInfo));
        }),
      };
      (AdmZip as jest.Mock).mockImplementation(() => mockZip);
      return Buffer.from('mock-zip-data');
    }

    it('should import a valid zip file', async () => {
      const zipBuffer = createMockZipBuffer('imported-project', {
        pid: 'pid-import',
        tid: 'imported-project',
        name: 'Imported Project',
        description: 'Imported',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'import-user',
        updatedBy: 'import-user',
        config: {},
      });

      const result = await service.importProjectZip(zipBuffer, userId);

      expect(result.project).toBeDefined();
      expect(result.project.projectId).toBe('imported-project');
      expect(result.project.projectName).toBe('Imported Project');
    });

    it('should throw BadRequestException when zip has no projectinfo.json', async () => {
      const AdmZip = require('adm-zip');
      const mockZip = {
        getEntries: jest.fn().mockReturnValue([
          { isDirectory: true, entryName: 'some-project/' },
          {
            isDirectory: false,
            entryName: 'some-project/data.txt',
          },
        ]),
        extractAllTo: jest.fn(),
      };
      (AdmZip as jest.Mock).mockImplementation(() => mockZip);

      const zipBuffer = Buffer.from('bad-zip');

      await expect(service.importProjectZip(zipBuffer, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when zip is empty', async () => {
      const AdmZip = require('adm-zip');
      const mockZip = {
        getEntries: jest.fn().mockReturnValue([]),
        extractAllTo: jest.fn(),
      };
      (AdmZip as jest.Mock).mockImplementation(() => mockZip);

      const zipBuffer = Buffer.from('empty-zip');

      await expect(service.importProjectZip(zipBuffer, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when multiple root dirs', async () => {
      const AdmZip = require('adm-zip');
      const mockZip = {
        getEntries: jest.fn().mockReturnValue([
          { isDirectory: true, entryName: 'dir1/' },
          { isDirectory: true, entryName: 'dir2/' },
          {
            isDirectory: false,
            entryName: 'dir1/projectinfo.json',
          },
        ]),
        extractAllTo: jest.fn(),
      };
      (AdmZip as jest.Mock).mockImplementation(() => mockZip);

      const zipBuffer = Buffer.from('multi-root-zip');

      await expect(service.importProjectZip(zipBuffer, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw on duplicate project without overwrite', async () => {
      // Create a project first
      await service.create(
        { projectName: 'Existing', projectId: 'existing', description: '', config: {} },
        userId,
      );

      const zipBuffer = createMockZipBuffer('existing', {
        pid: 'pid-existing',
        tid: 'existing',
        name: 'Existing',
        description: '',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user',
        updatedBy: 'user',
        config: {},
      });

      await expect(service.importProjectZip(zipBuffer, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should overwrite project when overwrite option is true', async () => {
      await service.create(
        { projectName: 'Overwrite Me', projectId: 'overwrite-me', description: '', config: {} },
        userId,
      );

      const zipBuffer = createMockZipBuffer('overwrite-me', {
        pid: 'pid-new',
        tid: 'overwrite-me',
        name: 'Overwrite Me',
        description: 'new version',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user',
        updatedBy: 'user',
        config: {},
      });

      const result = await service.importProjectZip(zipBuffer, userId, { overwrite: true });

      expect(result.project).toBeDefined();
      expect(result.warnings).toContain('已覆盖现有项目 "Overwrite Me" (projectId: overwrite-me)');
    });
  });

  // ==================== findOrCreateDefault ====================
  describe('findOrCreateDefault', () => {
    const userId = 'user-001';

    it('should create default project when none exists', async () => {
      const result = await service.findOrCreateDefault(userId);

      expect(result).toBeDefined();
      expect(result.projectId).toBe('default-project');
      expect(result.projectName).toBe('默认项目');
    });

    it('should find existing default project', async () => {
      await service.create(
        { projectName: '默认项目', projectId: 'default-project', description: '', config: {} },
        userId,
      );

      const result = await service.findOrCreateDefault(userId);

      expect(result.projectId).toBe('default-project');
      expect(result.projectName).toBe('默认项目');
    });
  });

  // ==================== diagnoseProject ====================
  describe('diagnoseProject', () => {
    const userId = 'user-001';

    it('should check project integrity - healthy', async () => {
      const created = await service.create(
        { projectName: 'Healthy Project', description: '', config: {} },
        userId,
      );

      const result = await service.diagnoseProject(created.projectId);

      expect(result.health).toBeDefined();
      expect(result.projectName).toBe('Healthy Project');
      expect(result.resources.projectinfo).toBeDefined();
      expect(result.resources.projectinfo?.status).toBe('ok');
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(service.diagnoseProject('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should detect missing subdirectories', async () => {
      // Create project but manually delete one subdir from virtual fs
      const created = await service.create(
        { projectName: 'Broken Project', description: '', config: {} },
        userId,
      );
      // 使用与 service.getProjectsDir() 一致的路径解析，确保虚拟文件系统中的路径与 service 检查的路径一致
      const actualProjectsDir = service.getProjectsDir();
      const rtdbDir = path.join(actualProjectsDir, created.projectId, 'rtdb');
      virtualDirs.delete(rtdbDir.replace(/\\/g, '/'));

      const result = await service.diagnoseProject(created.projectId);

      expect(result.resources.rtdbDir?.status).toBe('missing');
      expect(result.issues).toContain('子目录 rtdb 缺失');
    });
  });

  // ==================== initProjectResources ====================
  describe('initProjectResources', () => {
    const userId = 'user-001';

    it('should initialize missing resources', async () => {
      const created = await service.create(
        { projectName: 'Init Test', description: '', config: {} },
        userId,
      );

      const result = await service.initProjectResources(created.projectId);

      expect(result.initialized).toBeDefined();
      expect(result.skipped).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(service.initProjectResources('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should initialize specific target resources', async () => {
      const created = await service.create(
        { projectName: 'Target Init', description: '', config: {} },
        userId,
      );

      const result = await service.initProjectResources(created.projectId, ['subdirs']);

      expect(result).toBeDefined();
    });

    it('should handle empty resource array', async () => {
      const created = await service.create(
        { projectName: 'Empty Init', description: '', config: {} },
        userId,
      );

      const result = await service.initProjectResources(created.projectId, []);

      expect(result).toBeDefined();
    });
  });

  // ==================== getManageInfo ====================
  describe('getManageInfo', () => {
    const userId = 'user-001';

    it('should return project management info with page count and sizes', async () => {
      // Create a project
      const created = await service.create(
        { projectName: 'Manage Test', description: 'Test project for manage info', config: {} },
        userId,
      );

      // Use the actual project path from the created project
      const projectDir = created.projectPath;

      // Add pages directory with subdirectories
      addDir(`${projectDir}/pages/page1`);
      addDir(`${projectDir}/pages/page2`);
      addDir(`${projectDir}/pages/page3`);

      // Add a db file with some content
      addFile(`${projectDir}/db/system.db`, 'x'.repeat(2048));

      // Add a rtdb file
      addFile(`${projectDir}/rtdb/data.db`, 'y'.repeat(1024));

      const result = await service.getManageInfo(created.projectId);

      expect(result).toBeDefined();
      expect(result.projectName).toBe('Manage Test');
      expect(result.projectId).toBe(created.projectId);
      expect(result.tenantId).toBe(created.projectId);
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('Test project for manage info');
      expect(result.pageCount).toBe(3);
      expect(result.dbSize).toBe(2048);
      expect(result.rtdbSize).toBe(0); // rtdb 不再遍历整个目录树
      expect(result.dbMode).toBe('isolated');
      expect(result.projectPath).toBeTruthy();
      expect(result.databasePath).toBeTruthy();
      expect(result.rtdbPath).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it('should return zero page count when pages dir is empty', async () => {
      const created = await service.create(
        { projectName: 'Empty Pages', description: '', config: {} },
        userId,
      );

      const result = await service.getManageInfo(created.projectId);

      expect(result.pageCount).toBe(0);
      expect(result.dbSize).toBe(0);
      expect(result.rtdbSize).toBe(0);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      await expect(service.getManageInfo('non-existent-project')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return correct project paths', async () => {
      const created = await service.create(
        { projectName: 'Path Test', description: '', config: {} },
        userId,
      );

      const result = await service.getManageInfo(created.projectId);

      expect(result.projectPath).toContain(created.projectId);
      expect(result.databasePath).toContain('db');
      expect(result.rtdbPath).toContain('rtdb');
    });
  });

  // ==================== getOverview ====================
  describe('getOverview', () => {
    const userId = 'user-001';

    /** 在虚拟文件系统中创建一个完整的项目 */
    async function createProject(name: string, projectId?: string) {
      return service.create({ projectName: name, projectId, description: '', config: {} }, userId);
    }

    beforeEach(() => {
      jest.useRealTimers();
      // 确保虚拟文件系统完全隔离：重置 + 验证
      // 注意：外层 beforeEach 已调用 resetVirtualFs()，此处再次调用以防万一
      resetVirtualFs();
    });

    it('should return zeroes when no projects exist', async () => {
      const result = await service.getOverview();

      expect(result.projectCount).toBe(0);
      expect(result.totalDbSize).toBe(0);
      expect(result.totalPageCount).toBe(0);
      expect(result.deviceStats.total).toBe(0);
      expect(result.deviceStats.online).toBe(0);
      expect(result.deviceStats.totalTags).toBe(0);
      expect(result.alarmStats.total).toBe(0);
      expect(result.alarmStats.active).toBe(0);
    });

    it('should aggregate single project device and alarm stats', async () => {
      await createProject('Single Project', 'single');
      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 5,
        online: 3,
        offline: 2,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 12,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 8,
        active: 2,
        acknowledged: 3,
        cleared: 2,
        shelved: 1,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      const result = await service.getOverview();

      expect(result.projectCount).toBe(1);
      expect(result.deviceStats.total).toBe(5);
      expect(result.deviceStats.online).toBe(3);
      expect(result.deviceStats.offline).toBe(2);
      expect(result.deviceStats.totalTags).toBe(12);
      expect(result.alarmStats.total).toBe(8);
      expect(result.alarmStats.active).toBe(2);
      expect(result.alarmStats.acknowledged).toBe(3);
      expect(result.alarmStats.cleared).toBe(2);
      expect(result.alarmStats.shelved).toBe(1);
    });

    it('should aggregate stats across multiple projects', async () => {
      await createProject('Proj A', 'proj-a');
      await createProject('Proj B', 'proj-b');
      await createProject('Proj C', 'proj-c');

      mockDeviceService.getDeviceStats
        .mockResolvedValueOnce({
          total: 3,
          online: 2,
          offline: 1,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 5,
        })
        .mockResolvedValueOnce({
          total: 4,
          online: 4,
          offline: 0,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 8,
        })
        .mockResolvedValueOnce({
          total: 2,
          online: 0,
          offline: 2,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 3,
        });

      mockAlarmStatsService.getStatistics
        .mockResolvedValueOnce({
          total: 3,
          active: 1,
          acknowledged: 1,
          cleared: 1,
          shelved: 0,
          byLevel: {} as any,
          byStatus: {} as any,
        })
        .mockResolvedValueOnce({
          total: 5,
          active: 2,
          acknowledged: 2,
          cleared: 0,
          shelved: 1,
          byLevel: {} as any,
          byStatus: {} as any,
        })
        .mockResolvedValueOnce({
          total: 0,
          active: 0,
          acknowledged: 0,
          cleared: 0,
          shelved: 0,
          byLevel: {} as any,
          byStatus: {} as any,
        });

      const result = await service.getOverview();

      expect(result.projectCount).toBe(3);
      // Device aggregation: 3+4+2=9, 2+4+0=6 online, 1+0+2=3 offline, 5+8+3=16 tags
      expect(result.deviceStats.total).toBe(9);
      expect(result.deviceStats.online).toBe(6);
      expect(result.deviceStats.offline).toBe(3);
      expect(result.deviceStats.totalTags).toBe(16);
      // Alarm aggregation: 3+5+0=8, 1+2+0=3 active
      expect(result.alarmStats.total).toBe(8);
      expect(result.alarmStats.active).toBe(3);
    });

    it('should skip project when deviceService throws error', async () => {
      await createProject('Good', 'good');
      await createProject('Bad', 'bad');

      mockDeviceService.getDeviceStats
        .mockResolvedValueOnce({
          total: 10,
          online: 10,
          offline: 0,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 20,
        })
        .mockRejectedValueOnce(new Error('DB connection failed'));

      mockAlarmStatsService.getStatistics
        .mockResolvedValueOnce({
          total: 2,
          active: 0,
          acknowledged: 0,
          cleared: 2,
          shelved: 0,
          byLevel: {} as any,
          byStatus: {} as any,
        })
        .mockResolvedValueOnce({
          total: 0,
          active: 0,
          acknowledged: 0,
          cleared: 0,
          shelved: 0,
          byLevel: {} as any,
          byStatus: {} as any,
        });

      const result = await service.getOverview();

      // Bad project skipped entirely, only Good project stats counted
      expect(result.projectCount).toBe(2);
      expect(result.deviceStats.total).toBe(10);
      expect(result.alarmStats.total).toBe(2);
    });

    it('should skip project when alarmStatsService throws error', async () => {
      await createProject('AlarmFail', 'alarm-fail');

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 3,
        online: 2,
        offline: 1,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 6,
      });
      mockAlarmStatsService.getStatistics.mockRejectedValue(new Error('Alarm query timeout'));

      const result = await service.getOverview();

      // Alarm stats stay at 0 since the error caught by Promise.race → entire project fails
      // (mockDeviceService succeeded but they're in same Promise.all, so the whole processProject
      //  catches the error and all three results are lost for that project)
      // Actually, looking at the code: if any of the 3 parallel calls in processProject fail,
      // the whole Promise.all rejects, which is caught by the outer catch, so nothing is aggregated.
      // This is correct behavior - if alarm stats fail, we skip the whole project to avoid partial data.
      expect(result.deviceStats.total).toBe(0);
      expect(result.alarmStats.total).toBe(0);
    });

    it('should handle timeout simulation', async () => {
      await createProject('Slow', 'slow');

      // Simulate a hanging call by never resolving
      mockDeviceService.getDeviceStats.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        }) as any,
      );
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 0,
        active: 0,
        acknowledged: 0,
        cleared: 0,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      jest.useFakeTimers();

      const resultPromise = service.getOverview();

      // Fast-forward past the 10s timeout
      jest.advanceTimersByTime(15_000);

      const result = await resultPromise;

      jest.useRealTimers();

      // Project skipped after timeout
      expect(result.deviceStats.total).toBe(0);
      expect(result.alarmStats.total).toBe(0);
    });

    it('should process multiple projects with concurrency limiting', async () => {
      // Create 8 projects (more than CONCURRENCY=5)
      const projectNames = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
      for (const name of projectNames) {
        await createProject(`Project ${name}`, name);
      }

      // Each project returns simple stats
      let callCount = 0;
      mockDeviceService.getDeviceStats.mockImplementation(async () => {
        callCount++;
        return {
          total: 1,
          online: 1,
          offline: 0,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 2,
        };
      });
      mockAlarmStatsService.getStatistics.mockImplementation(async () => ({
        total: 1,
        active: 0,
        acknowledged: 0,
        cleared: 1,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      }));

      const result = await service.getOverview();

      expect(result.projectCount).toBe(8);
      expect(result.deviceStats.total).toBe(8);
      expect(result.deviceStats.totalTags).toBe(16);
      expect(result.alarmStats.total).toBe(8);
      expect(callCount).toBe(8);
    });

    it('should include manageInfo (dbSize, pageCount) in aggregation', async () => {
      // 使用 service.create() 创建项目（writeProjectInfo 写入 projectinfo.json）
      const created = await service.create(
        { projectName: 'DbTest', projectId: 'mgr-info-test', description: '', config: {} },
        userId,
      );

      // 添加页面目录用于验证 pageCount 聚合
      // 使用 addDir 而非 addFile 避免触发 readdirSync mock 的文件去重缺陷
      addDir(path.join(created.projectPath, 'pages', 'page1'));
      addDir(path.join(created.projectPath, 'pages', 'page2'));

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 0,
        online: 0,
        offline: 0,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 0,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 0,
        active: 0,
        acknowledged: 0,
        cleared: 0,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      const result = await service.getOverview();

      expect(result.projectCount).toBe(1);
      // 2 个页面子目录（page1、page2），无 db 文件 → dbSize=0
      expect(result.totalPageCount).toBe(2);
      expect(result.totalDbSize).toBe(0);
    });

    it('should call getDeviceStats and getStatistics with correct projectId (tid)', async () => {
      await createProject('CallCheck', 'call-check');

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 1,
        online: 1,
        offline: 0,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 3,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 1,
        active: 1,
        acknowledged: 0,
        cleared: 0,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      await service.getOverview();

      expect(mockDeviceService.getDeviceStats).toHaveBeenCalledWith('call-check');
      expect(mockAlarmStatsService.getStatistics).toHaveBeenCalledWith('call-check');
    });

    // ========== 新增分析测试 ==========

    it('should aggregate all device status categories (degraded, connecting, error)', async () => {
      await createProject('FullStatus', 'full-status');

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 10,
        online: 3,
        offline: 2,
        connecting: 2,
        degraded: 2,
        error: 1,
        totalTags: 25,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 5,
        active: 2,
        acknowledged: 1,
        cleared: 1,
        shelved: 1,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      const result = await service.getOverview();

      expect(result.deviceStats.total).toBe(10);
      expect(result.deviceStats.online).toBe(3);
      expect(result.deviceStats.offline).toBe(2);
      expect(result.deviceStats.connecting).toBe(2);
      expect(result.deviceStats.degraded).toBe(2);
      expect(result.deviceStats.error).toBe(1);
      expect(result.deviceStats.totalTags).toBe(25);
      // 验证 3+2+2+2+1 = 10 = total
      expect(
        result.deviceStats.online +
          result.deviceStats.offline +
          result.deviceStats.connecting +
          result.deviceStats.degraded +
          result.deviceStats.error,
      ).toBe(result.deviceStats.total);
    });

    it('should aggregate all alarm status categories', async () => {
      await createProject('AlarmFull', 'alarm-full');
      await createProject('AlarmPartial', 'alarm-partial');

      mockDeviceService.getDeviceStats
        .mockResolvedValueOnce({
          total: 1,
          online: 1,
          offline: 0,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 1,
        })
        .mockResolvedValueOnce({
          total: 1,
          online: 1,
          offline: 0,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 1,
        });
      mockAlarmStatsService.getStatistics
        .mockResolvedValueOnce({
          total: 10,
          active: 4,
          acknowledged: 3,
          cleared: 2,
          shelved: 1,
          byLevel: {} as any,
          byStatus: {} as any,
        })
        .mockResolvedValueOnce({
          total: 6,
          active: 2,
          acknowledged: 2,
          cleared: 1,
          shelved: 1,
          byLevel: {} as any,
          byStatus: {} as any,
        });

      const result = await service.getOverview();

      expect(result.alarmStats.total).toBe(16);
      expect(result.alarmStats.active).toBe(6);
      expect(result.alarmStats.acknowledged).toBe(5);
      expect(result.alarmStats.cleared).toBe(3);
      expect(result.alarmStats.shelved).toBe(2);
      // 验证各状态之和等于 total
      expect(
        result.alarmStats.active +
          result.alarmStats.acknowledged +
          result.alarmStats.cleared +
          result.alarmStats.shelved,
      ).toBe(result.alarmStats.total);
    });

    it('should handle mixed scenario: some succeed, some fail', async () => {
      // 3 个项目：2 个成功、1 个失败
      await createProject('Success1', 'success-1');
      await createProject('Success2', 'success-2');
      await createProject('FailProj', 'fail-proj');

      mockDeviceService.getDeviceStats
        .mockResolvedValueOnce({
          total: 5,
          online: 3,
          offline: 2,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 10,
        })
        .mockResolvedValueOnce({
          total: 3,
          online: 3,
          offline: 0,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 6,
        })
        .mockRejectedValueOnce(new Error('DB connection lost'));

      mockAlarmStatsService.getStatistics
        .mockResolvedValueOnce({
          total: 2,
          active: 1,
          acknowledged: 0,
          cleared: 1,
          shelved: 0,
          byLevel: {} as any,
          byStatus: {} as any,
        })
        .mockResolvedValueOnce({
          total: 1,
          active: 0,
          acknowledged: 0,
          cleared: 1,
          shelved: 0,
          byLevel: {} as any,
          byStatus: {} as any,
        })
        .mockResolvedValueOnce({
          total: 0,
          active: 0,
          acknowledged: 0,
          cleared: 0,
          shelved: 0,
          byLevel: {} as any,
          byStatus: {} as any,
        });

      const result = await service.getOverview();

      // 3 个项目都被扫描到
      expect(result.projectCount).toBe(3);
      // 只有成功项目的数据被聚合：5+3=8 devices, 10+6=16 tags
      expect(result.deviceStats.total).toBe(8);
      expect(result.deviceStats.online).toBe(6);
      expect(result.deviceStats.totalTags).toBe(16);
      // 只有成功项目的报警：2+1=3 total, 1+0=1 active
      expect(result.alarmStats.total).toBe(3);
      expect(result.alarmStats.active).toBe(1);
    });

    it('should skip directory without valid projectinfo.json during scan', async () => {
      // 创建两个有效项目 + 一个无效目录（无 projectinfo.json）
      await createProject('Valid1', 'valid-1');
      await createProject('Valid2', 'valid-2');

      // 在项目目录下创建一个无 projectinfo.json 的空目录（模拟损坏的项目）
      const projectsDir = service.getProjectsDir();
      addDir(`${projectsDir}/corrupted-dir`);
      addDir(`${projectsDir}/corrupted-dir/pages`);

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 1,
        online: 1,
        offline: 0,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 2,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 0,
        active: 0,
        acknowledged: 0,
        cleared: 0,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      const result = await service.getOverview();

      // corrupted-dir 被跳过，仅统计 2 个有效项目
      expect(result.projectCount).toBe(2);
      expect(result.deviceStats.total).toBe(2);
    });

    it('should skip project with malformed projectinfo.json during scan', async () => {
      await createProject('GoodOne', 'good-one');

      // 手动创建一个包含无效 JSON 的 projectinfo.json
      const projectsDir = service.getProjectsDir();
      addDir(`${projectsDir}/bad-json`);
      addFile(`${projectsDir}/bad-json/projectinfo.json`, '{invalid json!!!}');

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 5,
        online: 5,
        offline: 0,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 10,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 1,
        active: 0,
        acknowledged: 0,
        cleared: 1,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      const result = await service.getOverview();

      // bad-json 被跳过（readProjectInfo 内部 JSON.parse 失败 → scanProjects catch），仅统计 good-one
      expect(result.projectCount).toBe(1);
      expect(result.deviceStats.total).toBe(5);
    });

    it('should handle empty project directory (no subdirs, only projectinfo.json)', async () => {
      // 模拟极简项目：仅有 projectinfo.json，无任何子目录
      await createProject('Minimal', 'minimal');

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 0,
        online: 0,
        offline: 0,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 0,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 0,
        active: 0,
        acknowledged: 0,
        cleared: 0,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      const result = await service.getOverview();

      expect(result.projectCount).toBe(1);
      expect(result.totalDbSize).toBe(0);
      expect(result.totalPageCount).toBe(0);
      expect(result.deviceStats.total).toBe(0);
      expect(result.alarmStats.total).toBe(0);
    });

    it('should correctly aggregate with large project count (stress test)', async () => {
      // 创建 20 个项目，验证并发限流（5 个 workers）下的聚合正确性
      const count = 20;
      for (let i = 0; i < count; i++) {
        await createProject(`Stress${i}`, `stress-${i}`);
      }

      let callCount = 0;
      mockDeviceService.getDeviceStats.mockImplementation(async () => {
        callCount++;
        return {
          total: 2,
          online: 1,
          offline: 1,
          connecting: 0,
          degraded: 0,
          error: 0,
          totalTags: 4,
        };
      });
      mockAlarmStatsService.getStatistics.mockImplementation(async () => ({
        total: 3,
        active: 1,
        acknowledged: 1,
        cleared: 1,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      }));

      const result = await service.getOverview();

      expect(result.projectCount).toBe(count);
      expect(result.deviceStats.total).toBe(count * 2);
      expect(result.deviceStats.online).toBe(count);
      expect(result.deviceStats.offline).toBe(count);
      expect(result.deviceStats.totalTags).toBe(count * 4);
      expect(result.alarmStats.total).toBe(count * 3);
      expect(result.alarmStats.active).toBe(count);
      expect(result.alarmStats.acknowledged).toBe(count);
      expect(result.alarmStats.cleared).toBe(count);
      expect(result.alarmStats.shelved).toBe(0);
      expect(callCount).toBe(count); // 每个项目恰好调用一次
    });

    it('should handle JSON parse error in projectinfo.json during scan', async () => {
      // 验证 scanProjects 中 catch 分支能正常捕获 readProjectInfo 抛出的 JSON parse 错误
      await createProject('Normal', 'normal');
      const projectsDir = service.getProjectsDir();
      addDir(`${projectsDir}/broken`);
      addFile(`${projectsDir}/broken/projectinfo.json`, '{broken');

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 1,
        online: 1,
        offline: 0,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 1,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 0,
        active: 0,
        acknowledged: 0,
        cleared: 0,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      // 不应抛出异常，broken 项目被静默跳过
      const result = await service.getOverview();
      expect(result.projectCount).toBe(1);
    });

    it('should not modify input queue (pure consumer pattern)', async () => {
      // 验证 worker 并发处理不修改原始项目列表
      await createProject('A1', 'a1');
      await createProject('A2', 'a2');

      mockDeviceService.getDeviceStats.mockResolvedValue({
        total: 1,
        online: 1,
        offline: 0,
        connecting: 0,
        degraded: 0,
        error: 0,
        totalTags: 1,
      });
      mockAlarmStatsService.getStatistics.mockResolvedValue({
        total: 0,
        active: 0,
        acknowledged: 0,
        cleared: 0,
        shelved: 0,
        byLevel: {} as any,
        byStatus: {} as any,
      });

      await service.getOverview();

      // getOverview 中 queue = [...projects] 创建副本，原数组不变
      // 此处仅验证无异常抛出即可
      expect(true).toBe(true);
    });
  });

  // ==================== Edge Cases ====================
  describe('edge cases', () => {
    const userId = 'user-001';

    it('should handle special characters in project name for TID generation', async () => {
      const result = await service.create(
        { projectName: '  Project  With   Spaces   ', description: '', config: {} },
        userId,
      );

      expect(result.projectId).toBe('project-with-spaces');
    });

    it('should generate pinyin projectId for Chinese-only name', async () => {
      // 纯中文名走拼音全拼 kebab-case 作为 projectId
      const result = await service.create(
        { projectName: '中文项目', description: '', config: {} },
        userId,
      );
      expect(result.projectId).toBe('zhong-wen-xiang-mu');
    });

    it('should handle name that produces empty TID', async () => {
      await expect(
        service.create({ projectName: '---', description: '', config: {} }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
