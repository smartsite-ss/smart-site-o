// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MigrationRunner } from '../migration-runner';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('MigrationRunner', () => {
  let runner: MigrationRunner;
  let tempDir: string;
  let mockDb: any;

  beforeEach(() => {
    runner = new MigrationRunner();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-device-migration-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createMockDb() {
    const executedMigrations: string[] = [];
    const tables: string[] = [];
    const migrationRecords: Array<{ name: string; executedAt: string }> = [];

    return {
      exec: jest.fn((sql: string, callback: Function) => {
        // Simulate table creation - capture all table names
        const tableMatches = sql.matchAll(/TABLE\s+IF NOT EXISTS\s+"([^"]+)"/g);
        for (const match of tableMatches) {
          if (match[1]) tables.push(match[1]);
        }
        callback(null);
      }),
      run: jest.fn((sql: string, params: any[], callback: Function) => {
        if (sql.includes('INSERT INTO "_migrations"')) {
          executedMigrations.push(params[0]);
          migrationRecords.push({ name: params[0], executedAt: new Date().toISOString() });
        }
        callback(null);
      }),
      all: jest.fn((sql: string, params: any[], callback: Function) => {
        if (sql.includes('"_migrations"')) {
          const name = params[0];
          const count = migrationRecords.filter((r) => r.name === name).length;
          callback(null, [{ count }]);
        } else {
          callback(null, []);
        }
      }),
      _getExecutedMigrations: () => executedMigrations,
      _getTables: () => tables,
      _getMigrationRecords: () => migrationRecords,
    };
  }

  describe('runMigrations', () => {
    it('TC-DEV-MIG-001: should skip when migrations directory does not exist', async () => {
      mockDb = createMockDb();
      const nonExistentDir = path.join(tempDir, 'nonexistent');

      await runner.runMigrations(nonExistentDir, mockDb);

      expect(mockDb.exec).not.toHaveBeenCalled();
    });

    it('TC-DEV-MIG-002: should handle empty migrations directory', async () => {
      mockDb = createMockDb();
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);

      await runner.runMigrations(emptyDir, mockDb);

      // No migration files, so no migration table creation needed
      // Should not throw error
      expect(mockDb._getExecutedMigrations()).toHaveLength(0);
    });

    it('TC-DEV-MIG-003: should execute migration files in sorted order', async () => {
      mockDb = createMockDb();
      const migrationsDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsDir);

      fs.writeFileSync(
        path.join(migrationsDir, '002-add-index.sql'),
        'CREATE INDEX IF NOT EXISTS "idx_test" ON "dev_devices"("status");',
      );
      fs.writeFileSync(
        path.join(migrationsDir, '001-initial.sql'),
        'CREATE TABLE IF NOT EXISTS "dev_devices" ("id" TEXT PRIMARY KEY);',
      );

      await runner.runMigrations(migrationsDir, mockDb);

      const executed = mockDb._getExecutedMigrations();
      // Should be executed in sorted order: 001 first, then 002
      expect(executed[0]).toBe('001-initial.sql');
      expect(executed[1]).toBe('002-add-index.sql');
    });

    it('TC-DEV-MIG-004: should skip already executed migrations', async () => {
      mockDb = createMockDb();
      const migrationsDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsDir);

      fs.writeFileSync(
        path.join(migrationsDir, '001-initial.sql'),
        'CREATE TABLE IF NOT EXISTS "dev_devices" ("id" TEXT PRIMARY KEY);',
      );

      // First run
      await runner.runMigrations(migrationsDir, mockDb);
      expect(mockDb._getExecutedMigrations()).toContain('001-initial.sql');

      // Second run with fresh mock that has the migration already recorded
      const mockDb2 = createMockDb();
      // Pre-populate migration records to simulate already executed
      jest
        .spyOn(mockDb2, 'all')
        .mockImplementation((sql: string, params: any[], callback: Function) => {
          if (sql.includes('"_migrations"')) {
            callback(null, [{ count: 1 }]);
          } else {
            callback(null, []);
          }
        });

      const _execSpy = jest.spyOn(mockDb2, 'exec');
      await runner.runMigrations(migrationsDir, mockDb2);

      // exec should only be called for migration table creation, not for the already-run migration
      const migrationExecCalls = mockDb2.exec.mock.calls.filter((call: any[]) =>
        call[0]?.includes('CREATE TABLE IF NOT EXISTS "dev_devices"'),
      );
      expect(migrationExecCalls).toHaveLength(0);
    });

    it('TC-DEV-MIG-005: should create _migrations tracking table', async () => {
      mockDb = createMockDb();
      const migrationsDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsDir);

      fs.writeFileSync(
        path.join(migrationsDir, '001-initial.sql'),
        'CREATE TABLE IF NOT EXISTS "dev_devices" ("id" TEXT PRIMARY KEY);',
      );

      await runner.runMigrations(migrationsDir, mockDb);

      const tables = mockDb._getTables();
      expect(tables).toContain('_migrations');
    });

    it('TC-DEV-MIG-006: should throw error on invalid SQL', async () => {
      mockDb = createMockDb();
      mockDb.exec = jest.fn((sql: string, callback: Function) => {
        if (sql.includes('invalid')) {
          callback(new Error('SQL syntax error'));
        } else {
          callback(null);
        }
      });

      const migrationsDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsDir);

      fs.writeFileSync(
        path.join(migrationsDir, '001-invalid.sql'),
        'CREATE TABLE invalid syntax error;',
      );

      await expect(runner.runMigrations(migrationsDir, mockDb)).rejects.toThrow('SQL syntax error');
    });

    it('TC-DEV-MIG-007: should handle multiple SQL statements in one file', async () => {
      mockDb = createMockDb();
      const migrationsDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsDir);

      const multiSql = `
        CREATE TABLE IF NOT EXISTS "dev_devices" ("id" TEXT PRIMARY KEY);
        CREATE INDEX IF NOT EXISTS "idx_dev_devices_tid" ON "dev_devices"("tid");
        CREATE TABLE IF NOT EXISTS "dev_device_groups" ("id" TEXT PRIMARY KEY);
      `;
      fs.writeFileSync(path.join(migrationsDir, '001-multi.sql'), multiSql);

      await runner.runMigrations(migrationsDir, mockDb);

      const tables = mockDb._getTables();
      expect(tables).toContain('dev_devices');
      expect(tables).toContain('dev_device_groups');
    });

    it('TC-DEV-MIG-008: should only execute .sql files', async () => {
      mockDb = createMockDb();
      const migrationsDir = path.join(tempDir, 'migrations');
      fs.mkdirSync(migrationsDir);

      fs.writeFileSync(
        path.join(migrationsDir, '001-initial.sql'),
        'CREATE TABLE IF NOT EXISTS "dev_devices" ("id" TEXT PRIMARY KEY);',
      );
      fs.writeFileSync(path.join(migrationsDir, 'README.txt'), 'This is a readme file');

      await runner.runMigrations(migrationsDir, mockDb);

      const executed = mockDb._getExecutedMigrations();
      expect(executed).toContain('001-initial.sql');
      expect(executed).not.toContain('README.txt');
    });
  });
});
