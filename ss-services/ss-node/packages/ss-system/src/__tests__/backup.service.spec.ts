// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PathResolverService } from '@ss-node/ss-core';
import { BackupService } from '../backup/backup.service';
import { BackupLog } from '../entities/system.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => jest.fn(),
  CronExpression: { EVERY_DAY_AT_3AM: '0 0 3 * * *' },
  SchedulerRegistry: class {
    constructor() {
      this.jobs = new Map();
    }
    addCronJob(name, cronTime, fn) {
      this.jobs.set(name, { cronTime, fn, running: false });
      return { start: jest.fn(), stop: jest.fn() };
    }
    deleteCronJob(name) {
      if (!this.jobs.has(name)) throw new Error(`Job ${name} not found`);
      this.jobs.delete(name);
    }
    getCronJob(name) {
      return this.jobs.get(name) || null;
    }
  },
}));

describe('BackupService', () => {
  let service: BackupService;
  let mockDataSource: any;
  let mockConfigService: any;
  let mockBackupLogRepo: any;
  let tempDir: string;
  let systemDbPath: string;
  let projectsDir: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `backup-test-${Date.now()}`);

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

    process.env.BACKUP_DIR = path.join(tempDir, 'backups');
    process.env.PROJECTS_DIR = projectsDir;
  });

  afterAll(() => {
    delete process.env.BACKUP_DIR;
    delete process.env.PROJECTS_DIR;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    mockDataSource = {
      options: { type: 'sqlite' },
      query: jest.fn().mockResolvedValue([]),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return systemDbPath;
        if (key === 'PROJECTS_DIR') return projectsDir;
        return undefined;
      }),
    };

    mockBackupLogRepo = {
      save: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(BackupLog), useValue: mockBackupLogRepo },
        { provide: PathResolverService, useValue: { resolve: jest.fn((p: string) => path.resolve(p)), getProjectRoot: jest.fn().mockReturnValue(tempDir) } },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
    jest.clearAllMocks();
  });

  // ==================== 备份配置（拆分结构） ====================

  describe('getBackupConfig / saveBackupConfig', () => {
    it('TC-BKP-001: should return default split config', () => {
      const config = service.getBackupConfig();

      expect(config.system).toBeDefined();
      expect(config.project).toBeDefined();
      expect(config.system.enabled).toBe(true);
      expect(config.project.enabled).toBe(false);
      expect(config.system.cronExpression).toBeDefined();
      expect(config.system.retentionDays).toBeGreaterThan(0);
    });

    it('TC-BKP-002: should save system config independently', () => {
      const updated = service.saveBackupConfig({
        system: { retentionDays: 60, enabled: false } as any,
      });

      expect(updated.system.retentionDays).toBe(60);
      expect(updated.system.enabled).toBe(false);
      expect(updated.project.enabled).toBe(false);

      const current = service.getBackupConfig();
      expect(current.system.retentionDays).toBe(60);
    });

    it('TC-BKP-003: should save project config independently', () => {
      const updated = service.saveBackupConfig({
        project: { enabled: true, retentionDays: 15 } as any,
      });

      expect(updated.project.enabled).toBe(true);
      expect(updated.project.retentionDays).toBe(15);
    });

    it('TC-BKP-004: should merge partial config without overwriting unspecified fields', () => {
      // 先重置为默认配置，确保 system.enabled = true
      service.saveBackupConfig({
        system: { enabled: true, retentionDays: 60 } as any,
      });
      // 再只更新 project，system 不应被重置
      const updated = service.saveBackupConfig({
        project: { enabled: true, maxSizeMb: 500 } as any,
      });

      expect(updated.system.retentionDays).toBe(60);
      expect(updated.system.enabled).toBe(true);
      expect(updated.project.enabled).toBe(true);
      expect(updated.project.maxSizeMb).toBe(500);
    });

    it('TC-BKP-005: should handle empty config object', () => {
      const config = service.getBackupConfig();
      const updated = service.saveBackupConfig({});

      expect(updated.system.enabled).toBe(config.system.enabled);
      expect(updated.system.retentionDays).toBe(config.system.retentionDays);
      expect(updated.project.enabled).toBe(config.project.enabled);
    });
  });

  // ==================== 系统数据库备份 ====================

  describe('createSystemBackup', () => {
    it('TC-BKP-010: should create a manual system backup with ISO date', async () => {
      const result = await service.createSystemBackup('manual');

      expect(result.status).toBe('success');
      expect(result.dbType).toBe('system');
      expect(result.type).toBe('manual');
      expect(result.filename).toContain('system-backup');
      expect(result.size).toBeGreaterThan(0);
      // createdAt 应为 ISO 格式字符串
      expect(typeof result.createdAt).toBe('string');
      expect(new Date(result.createdAt).getTime()).not.toBeNaN();
    });

    it('TC-BKP-011: should create an auto system backup', async () => {
      const result = await service.createSystemBackup('auto');

      expect(result.status).toBe('success');
      expect(result.type).toBe('auto');
      expect(result.dbType).toBe('system');
    });

    it('TC-BKP-012: should record backup log to database', async () => {
      await service.createSystemBackup('manual', 'tester');

      expect(mockBackupLogRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockBackupLogRepo.save.mock.calls[0][0];
      expect(saved.dbType).toBe('system');
      expect(saved.backupType).toBe('manual');
      expect(saved.triggeredBy).toBe('tester');
      expect(saved.status).toBe('success');
    });

    it('TC-BKP-013: should fail when system database not found', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return path.join(tempDir, 'nonexistent', 'db.sqlite');
        return undefined;
      });

      await expect(service.createSystemBackup('manual')).rejects.toThrow('not found');

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DATABASE_PATH') return systemDbPath;
        return undefined;
      });
    });
  });

  // ==================== 项目数据库备份 ====================

  describe('createProjectBackup', () => {
    it('TC-BKP-020: should create a project database backup', async () => {
      const result = await service.createProjectBackup('test-project', 'manual');

      expect(result.status).toBe('success');
      expect(result.dbType).toBe('project');
      expect(result.projectName).toBe('test-project');
      expect(result.filename).toContain('project-test-project');
      expect(typeof result.createdAt).toBe('string');
    });

    it('TC-BKP-021: should throw for non-existent project', async () => {
      await expect(service.createProjectBackup('nonexistent-project', 'manual')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('backupAllProjects', () => {
    it('TC-BKP-022: should backup all projects', async () => {
      const results = await service.backupAllProjects('manual');

      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.status).toBe('success');
        expect(r.dbType).toBe('project');
        expect(typeof r.createdAt).toBe('string');
      });
    });
  });

  describe('backupSelectedProjects', () => {
    it('TC-BKP-023: should backup selected projects', async () => {
      const results = await service.backupSelectedProjects(['test-project'], 'manual', 'tester');

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('success');
      expect(results[0].projectName).toBe('test-project');
    });

    it('TC-BKP-024: should record failed log for non-existent project', async () => {
      const results = await service.backupSelectedProjects(['nonexistent'], 'manual', 'tester');

      expect(results.length).toBe(0);
      expect(mockBackupLogRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockBackupLogRepo.save.mock.calls[0][0];
      expect(saved.status).toBe('failed');
      expect(saved.projectName).toBe('nonexistent');
    });
  });

  // ==================== 备份列表 ====================

  describe('listBackups', () => {
    it('TC-BKP-030: should list all backups with ISO dates', async () => {
      await service.createSystemBackup('manual');
      const list = await service.listBackups();

      expect(list.length).toBeGreaterThan(0);
      expect(list[0].filename).toBeDefined();
      expect(list[0].size).toBeGreaterThan(0);
      expect(list[0].dbType).toBeDefined();
      // createdAt 应为 ISO 格式字符串
      expect(typeof list[0].createdAt).toBe('string');
      expect(new Date(list[0].createdAt).getTime()).not.toBeNaN();
    });

    it('TC-BKP-031: should filter by dbType', async () => {
      await service.createSystemBackup('manual');
      const list = await service.listBackups('system');

      expect(list.length).toBeGreaterThan(0);
      list.forEach((b) => expect(b.dbType).toBe('system'));
    });

    it('TC-BKP-032: should return empty list for no backups', async () => {
      const root = process.env.BACKUP_DIR!;
      for (const sub of ['system', 'project']) {
        const dir = path.join(root, sub);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter((f) => f.endsWith('.gz'));
          files.forEach((f) => fs.unlinkSync(path.join(dir, f)));
        }
      }

      const list = await service.listBackups();
      expect(list).toEqual([]);
    });
  });

  // ==================== 备份统计 ====================

  describe('getBackupStats', () => {
    it('TC-BKP-033: should return backup stats with ISO date strings', async () => {
      await service.createSystemBackup('manual');
      const stats = await service.getBackupStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.systemCount).toBeGreaterThan(0);
      expect(stats.totalSizeFormatted).toBeDefined();
      expect(stats.backupDir).toBeDefined();
      // oldestAt/newestAt 应为 ISO 格式字符串
      if (stats.oldestAt) {
        expect(typeof stats.oldestAt).toBe('string');
        expect(new Date(stats.oldestAt).getTime()).not.toBeNaN();
      }
      if (stats.newestAt) {
        expect(typeof stats.newestAt).toBe('string');
        expect(new Date(stats.newestAt).getTime()).not.toBeNaN();
      }
    });
  });

  // ==================== 备份日志查询 ====================

  describe('getBackupLogs', () => {
    it('TC-BKP-035: should query backup logs with filters', async () => {
      await service.getBackupLogs({ dbType: 'system', limit: 10 });

      expect(mockBackupLogRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 下载 ====================

  describe('getBackupPath', () => {
    it('TC-BKP-040: should return backup file path in subdirectory', async () => {
      const backup = await service.createSystemBackup('manual');
      const filePath = service.getBackupPath(backup.filename);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('TC-BKP-041: should throw for non-existent backup', () => {
      expect(() => service.getBackupPath('nonexistent.gz')).toThrow();
    });
  });

  // ==================== 删除 ====================

  describe('deleteBackup', () => {
    it('TC-BKP-050: should delete a backup in subdirectory', async () => {
      const backup = await service.createSystemBackup('manual');
      await service.deleteBackup(backup.filename);

      const systemDir = path.join(process.env.BACKUP_DIR!, 'system');
      const filePath = path.join(systemDir, backup.filename);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  // ==================== 恢复 ====================

  describe('restoreBackup', () => {
    it('TC-BKP-060: should restore system database from backup', async () => {
      const backup = await service.createSystemBackup('manual');
      const result = await service.restoreBackup(backup.filename);

      expect(result).toBe(true);
    });

    it('TC-BKP-061: should throw for non-existent backup', async () => {
      await expect(service.restoreBackup('nonexistent.gz')).rejects.toThrow();
    });
  });

  describe('restoreProjectBackup', () => {
    it('TC-BKP-062: should restore project database from backup', async () => {
      const backup = await service.createProjectBackup('test-project', 'manual');
      const result = await service.restoreProjectBackup(backup.filename, 'test-project');

      expect(result).toBe(true);
    });

    it('TC-BKP-063: should throw for non-existent backup', async () => {
      await expect(
        service.restoreProjectBackup('nonexistent.gz', 'test-project'),
      ).rejects.toThrow();
    });
  });

  // ==================== 清理（按类型） ====================

  describe('cleanupExpired', () => {
    it('TC-BKP-070: should cleanup expired system backups', async () => {
      const count = await service.cleanupExpired('system', 365);

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('TC-BKP-071: should not delete emergency backups', async () => {
      const systemDir = path.join(process.env.BACKUP_DIR!, 'system');
      if (!fs.existsSync(systemDir)) fs.mkdirSync(systemDir, { recursive: true });
      const emergencyPath = path.join(systemDir, 'emergency-test.db.gz');
      fs.writeFileSync(emergencyPath, 'test');

      const _count = await service.cleanupExpired('system', 0);

      expect(fs.existsSync(emergencyPath)).toBe(true);
      fs.unlinkSync(emergencyPath);
    });

    it('TC-BKP-072: should delete expired project backups', async () => {
      const count = await service.cleanupExpired('project', 365);

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanupBySize', () => {
    it('TC-BKP-073: should cleanup backups exceeding max size', async () => {
      // 设置一个非常小的上限，触发清理
      const count = await service.cleanupBySize('system', 1);

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('TC-BKP-074: should not delete emergency backups during size cleanup', async () => {
      const systemDir = path.join(process.env.BACKUP_DIR!, 'system');
      if (!fs.existsSync(systemDir)) fs.mkdirSync(systemDir, { recursive: true });
      const emergencyPath = path.join(systemDir, 'emergency-size-test.db.gz');
      fs.writeFileSync(emergencyPath, 'test');

      const _count2 = await service.cleanupBySize('system', 1);

      expect(fs.existsSync(emergencyPath)).toBe(true);
      fs.unlinkSync(emergencyPath);
    });

    it('TC-BKP-075: should not throw when backup dir is empty', async () => {
      const projectDir = path.join(process.env.BACKUP_DIR!, 'project');
      const files = fs.existsSync(projectDir)
        ? fs.readdirSync(projectDir).filter((f) => f.endsWith('.gz'))
        : [];

      // 如果目录为空，cleanupBySize 应该返回 0
      if (files.length === 0) {
        const count = await service.cleanupBySize('project', 1024 * 1024);
        expect(count).toBe(0);
      }
    });
  });

  // ==================== Cron 状态 ====================

  describe('getCronJobStatus', () => {
    it('TC-BKP-080: should return split cron status', () => {
      const status = service.getCronJobStatus();

      expect(status.system).toBeDefined();
      expect(status.project).toBeDefined();
      expect(status.system).toHaveProperty('enabled');
      expect(status.project).toHaveProperty('enabled');
    });
  });
});
