// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { DataMigrationService } from '../services/data-migration.service';

// Virtual filesystem for mocking
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
  };
});

describe('DataMigrationService', () => {
  let service: DataMigrationService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    resetVirtualFs();

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'PROJECTS_DIR') return './data/projects';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DataMigrationService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<DataMigrationService>(DataMigrationService);
  });

  describe('TC-DATMIG-001: migrateProjectFromGlobal', () => {
    it('should migrate data from global to project database', async () => {
      const mockGlobalDs = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'dev1', name: 'Device 1', projectId: 'test-project' }])
          .mockResolvedValueOnce([{ id: 'dev2', name: 'Device 2', projectId: 'test-project' }]),
        options: { database: '/path/to/global.db' },
      } as any;

      const mockProjectDs = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ name: 'dev_devices' }]) // table exists
          .mockResolvedValueOnce([{ name: 'id' }, { name: 'name' }, { name: 'projectId' }]) // PRAGMA table_info
          .mockResolvedValue([{ name: 'dev_devices' }]) // table exists
          .mockResolvedValueOnce([{ name: 'id' }, { name: 'name' }, { name: 'projectId' }]), // PRAGMA table_info
      } as any;

      const result = await service.migrateProjectFromGlobal(
        mockGlobalDs,
        mockProjectDs,
        'test-project',
        [
          { tableName: 'dev_devices', entityName: 'Device' },
          { tableName: 'dev_data_tags', entityName: 'DataTag', projectIdField: 'project_id' },
        ],
      );

      expect(result.projectName).toBe('test-project');
      expect(result.entities.length).toBe(2);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should skip tables that do not exist in project database', async () => {
      const mockGlobalDs = {
        query: jest.fn(),
        options: { database: '/path/to/global.db' },
      } as any;

      const mockProjectDs = {
        query: jest.fn().mockResolvedValue([]), // table does not exist
      } as any;

      const result = await service.migrateProjectFromGlobal(
        mockGlobalDs,
        mockProjectDs,
        'skip-project',
        [{ tableName: 'nonexistent', entityName: 'NonExistent' }],
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('不存在于项目数据库中');
    });

    it('should handle empty source data', async () => {
      const mockGlobalDs = {
        query: jest.fn().mockResolvedValue([]), // no rows
        options: { database: '/path/to/global.db' },
      } as any;

      const mockProjectDs = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ name: 'dev_devices' }]) // table exists
          .mockResolvedValueOnce([{ name: 'id' }, { name: 'name' }]), // PRAGMA table_info
      } as any;

      const result = await service.migrateProjectFromGlobal(
        mockGlobalDs,
        mockProjectDs,
        'empty-project',
        [{ tableName: 'dev_devices', entityName: 'Device' }],
      );

      expect(result.entities[0].rowCount).toBe(0);
    });

    it('should use custom whereCondition if provided', async () => {
      const mockGlobalDs = {
        query: jest.fn().mockResolvedValue([{ id: 'd1', name: 'Device 1' }]),
        options: { database: '/path/to/global.db' },
      } as any;

      const mockProjectDs = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ name: 'dev_devices' }])
          .mockResolvedValueOnce([{ name: 'id' }, { name: 'name' }]),
      } as any;

      await service.migrateProjectFromGlobal(mockGlobalDs, mockProjectDs, 'custom-where', [
        { tableName: 'dev_devices', entityName: 'Device', whereCondition: 'status = "active"' },
      ]);

      // Should use custom WHERE clause
      const selectCalls = mockGlobalDs.query.mock.calls.filter(
        (call: any) => call[0] && call[0].includes('SELECT'),
      );
      expect(selectCalls.length).toBeGreaterThan(0);
      expect(selectCalls[0][0]).toContain('WHERE status = "active"');
    });
  });

  describe('TC-DATMIG-002: backupGlobalDatabase', () => {
    it('should copy global database to backup directory', async () => {
      const dbPath = '/fake/path/global.db';
      addFile(dbPath, 'database content');

      const mockGlobalDs = {
        query: jest.fn(),
        options: { database: dbPath },
      } as any;

      const backupDir = '/fake/backups';
      const backupPath = await service.backupGlobalDatabase(mockGlobalDs, backupDir);

      expect(backupPath).toContain('ss-data_backup_');
      expect(backupPath).toContain('.db');
      expect(fs.existsSync(backupPath)).toBe(true);
    });

    it('should throw if database file does not exist', async () => {
      const mockGlobalDs = {
        options: { database: '/nonexistent/path.db' },
      } as any;

      await expect(service.backupGlobalDatabase(mockGlobalDs, '/backups')).rejects.toThrow(
        '全局数据库文件不存在',
      );
    });
  });

  describe('TC-DATMIG-003: getProjectDataStats', () => {
    it('should return statistics for each table', async () => {
      const mockGlobalDs = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ count: 5 }]) // dev_devices
          .mockResolvedValueOnce([{ count: 20 }]) // dev_data_tags
          .mockResolvedValueOnce([{ count: 3 }]), // alm_alarm_rules
      } as any;

      const stats = await service.getProjectDataStats(mockGlobalDs, 'stats-project', [
        'dev_devices',
        'dev_data_tags',
        'alm_alarm_rules',
      ]);

      expect(stats.dev_devices).toBe(5);
      expect(stats.dev_data_tags).toBe(20);
      expect(stats.alm_alarm_rules).toBe(3);
    });

    it('should return -1 for tables that fail to query', async () => {
      const mockGlobalDs = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ count: 3 }])
          .mockRejectedValueOnce(new Error('Table does not exist')),
      } as any;

      const stats = await service.getProjectDataStats(mockGlobalDs, 'error-project', [
        'dev_devices',
        'bad_table',
      ]);

      expect(stats.dev_devices).toBe(3);
      expect(stats.bad_table).toBe(-1);
    });
  });
});
