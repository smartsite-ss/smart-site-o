// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { DbMigrationService } from '../services/db-migration.service';
import { PathResolverService } from '@ss-node/ss-core';

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
    readdirSync: jest.fn((p: string) => {
      const np = p.replace(/\\/g, '/');
      const entries: string[] = [];
      const prefix = np + '/';
      for (const [fpath] of virtualFs) {
        if (fpath.startsWith(prefix)) {
          const relative = fpath.slice(prefix.length);
          const slashIdx = relative.indexOf('/');
          if (slashIdx === -1) {
            entries.push(relative);
          }
        }
      }
      for (const dpath of virtualDirs) {
        if (dpath.startsWith(prefix) && dpath !== np) {
          const relative = dpath.slice(prefix.length);
          const slashIdx = relative.indexOf('/');
          const name = slashIdx === -1 ? relative : relative.substring(0, slashIdx);
          if (!entries.includes(name)) {
            entries.push(name);
          }
        }
      }
      return entries;
    }),
  };
});

describe('DbMigrationService', () => {
  let service: DbMigrationService;
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
      providers: [
        DbMigrationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PathResolverService, useValue: new (PathResolverService as any)() },
      ],
    }).compile();

    service = module.get<DbMigrationService>(DbMigrationService);
  });

  describe('TC-MIG-001: scanMigrations', () => {
    it('should return empty array when migration dir does not exist', () => {
      const migrations = service.scanMigrations('no-migration-project');
      expect(migrations).toEqual([]);
    });

    it('should scan and parse valid migration files', () => {
      const migrationDir = service.getMigrationDir('scan-project');
      addFile(path.join(migrationDir, '001_system_init.sql'), 'CREATE TABLE test (id TEXT);');
      addFile(
        path.join(migrationDir, '002_system_add_column.sql'),
        'ALTER TABLE test ADD COLUMN name TEXT;',
      );

      const migrations = service.scanMigrations('scan-project');

      expect(migrations.length).toBe(2);
      expect(migrations[0].name).toBe('001_system_init.sql');
      expect(migrations[0].version).toBe(1);
      expect(migrations[0].targetDb).toBe('system');
      expect(migrations[1].name).toBe('002_system_add_column.sql');
      expect(migrations[1].version).toBe(2);
      expect(migrations[1].targetDb).toBe('system');
    });

    it('should skip invalid migration file names', () => {
      const migrationDir = service.getMigrationDir('invalid-scan-project');
      addFile(path.join(migrationDir, 'invalid_file.sql'), 'SELECT 1;');
      addFile(path.join(migrationDir, '001_system_valid.sql'), 'CREATE TABLE test (id TEXT);');

      const migrations = service.scanMigrations('invalid-scan-project');

      expect(migrations.length).toBe(1);
      expect(migrations[0].name).toBe('001_system_valid.sql');
    });
  });

  describe('TC-MIG-002: getExecutedMigrations', () => {
    it('should return empty array when projectinfo.json does not exist', () => {
      const executed = service.getExecutedMigrations('no-info-project');
      expect(executed).toEqual([]);
    });

    it('should return executed migrations from projectinfo.json', () => {
      const projectInfo = JSON.stringify({
        dbMigrations: ['001_system_init.sql', '002_system_add_column.sql'],
      });
      // We need to add projectinfo.json to the virtual filesystem
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      addFile(path.join(projectsDir, 'executed-project', 'projectinfo.json'), projectInfo);

      const executed = service.getExecutedMigrations('executed-project');
      expect(executed).toEqual(['001_system_init.sql', '002_system_add_column.sql']);
    });

    it('should return empty array if projectinfo.json has no dbMigrations', () => {
      const projectInfo = JSON.stringify({ name: 'test' });
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      addFile(path.join(projectsDir, 'no-migrations-project', 'projectinfo.json'), projectInfo);

      const executed = service.getExecutedMigrations('no-migrations-project');
      expect(executed).toEqual([]);
    });
  });

  describe('TC-MIG-003: recordMigration', () => {
    it('should record a new migration', () => {
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      const infoPath = path.join(projectsDir, 'record-project', 'projectinfo.json');
      addFile(infoPath, JSON.stringify({ name: 'record-project' }));

      service.recordMigration('record-project', '001_system_init.sql');

      const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      expect(raw.dbMigrations).toContain('001_system_init.sql');
    });

    it('should not duplicate existing migration', () => {
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      const infoPath = path.join(projectsDir, 'dup-project', 'projectinfo.json');
      addFile(infoPath, JSON.stringify({ dbMigrations: ['001_system_init.sql'] }));

      service.recordMigration('dup-project', '001_system_init.sql');

      const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      expect(raw.dbMigrations).toEqual(['001_system_init.sql']);
    });
  });

  describe('TC-MIG-004: getDbSchemaVersion / setDbSchemaVersion', () => {
    it('should return 0 when no projectinfo.json', () => {
      expect(service.getDbSchemaVersion('no-schema-version')).toBe(0);
    });

    it('should get and set schema version', () => {
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      const infoPath = path.join(projectsDir, 'version-project', 'projectinfo.json');
      addFile(infoPath, JSON.stringify({ name: 'version-project' }));

      service.setDbSchemaVersion('version-project', 3);
      expect(service.getDbSchemaVersion('version-project')).toBe(3);
    });

    it('should return 0 when dbSchemaVersion is not set', () => {
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      const infoPath = path.join(projectsDir, 'no-version-project', 'projectinfo.json');
      addFile(infoPath, JSON.stringify({ name: 'no-version-project' }));

      expect(service.getDbSchemaVersion('no-version-project')).toBe(0);
    });
  });

  describe('TC-MIG-005: migrateProject', () => {
    it('should return 0 when no migration files exist', async () => {
      const mockDs = { query: jest.fn() } as any;
      const count = await service.migrateProject('empty-project', mockDs);
      expect(count).toBe(0);
    });

    it('should execute pending migrations', async () => {
      // Setup project info with existing migrations
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      addFile(
        path.join(projectsDir, 'migrate-project', 'projectinfo.json'),
        JSON.stringify({ name: 'migrate-project', dbMigrations: ['001_system_init.sql'] }),
      );

      // Setup migration files
      const migrationDir = service.getMigrationDir('migrate-project');
      addFile(path.join(migrationDir, '001_system_init.sql'), 'CREATE TABLE devices (id TEXT);');
      addFile(
        path.join(migrationDir, '002_system_add_col.sql'),
        'ALTER TABLE devices ADD COLUMN name TEXT;',
      );

      const mockDs = { query: jest.fn().mockResolvedValue(undefined) } as any;
      const count = await service.migrateProject('migrate-project', mockDs);

      expect(count).toBe(1);
      expect(mockDs.query).toHaveBeenCalledWith('ALTER TABLE devices ADD COLUMN name TEXT;');
    });

    it('should execute migrations on system database', async () => {
      const projectsDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'projects');
      addFile(
        path.join(projectsDir, 'target-db-project', 'projectinfo.json'),
        JSON.stringify({ name: 'target-db-project' }),
      );

      const migrationDir = service.getMigrationDir('target-db-project');
      addFile(path.join(migrationDir, '001_system_init.sql'), 'CREATE TABLE devices (id TEXT);');
      addFile(
        path.join(migrationDir, '002_system_add_col.sql'),
        'ALTER TABLE devices ADD COLUMN name TEXT;',
      );

      const systemDs = { query: jest.fn().mockResolvedValue(undefined) } as any;

      await service.migrateProject('target-db-project', systemDs);

      expect(systemDs.query).toHaveBeenCalled();
    });
  });

  describe('TC-MIG-006: createMigrationFile', () => {
    it('should create a new migration file with correct naming', () => {
      const migrationDir = service.getMigrationDir('create-project');
      // Pre-create some existing migrations
      addFile(path.join(migrationDir, '001_system_init.sql'), '-- test');

      const filePath = service.createMigrationFile(
        'create-project',
        'add alarm priority',
        'system',
      );

      expect(filePath).toContain('002_system_add_alarm_priority.sql');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('-- Migration: add alarm priority');
      expect(content).toContain('-- Target: system.db');
    });

    it('should create directory if not exists', () => {
      const filePath = service.createMigrationFile('new-dir-project', 'init', 'system');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
