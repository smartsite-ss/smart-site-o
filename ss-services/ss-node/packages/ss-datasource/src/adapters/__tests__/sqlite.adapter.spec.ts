// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SqliteAdapter } from '../sqlite.adapter';

// ============================================================
// Mock sqlite3
// NOTE: Use var for variables referenced by jest.mock factory.
// Jest hoists jest.mock above const/let (TDZ), but var is hoisted
// with undefined. The mock implementation captures the variable
// reference and accesses it lazily when called.
// ============================================================
// eslint-disable-next-line no-var
var mockDb: any;

jest.mock('sqlite3', () => {
  mockDb = {
    get: jest.fn(),
    all: jest.fn(),
    close: jest.fn(),
  };
  return {
    Database: jest.fn().mockImplementation(() => mockDb),
  };
});

import * as sqlite3 from 'sqlite3';

describe('SqliteAdapter', () => {
  let adapter: SqliteAdapter;

  beforeEach(() => {
    // Override fake timers from setup.ts so Date.now() works for latency calc
    jest.useRealTimers();
    // Reset call history and implementations for each test
    jest.clearAllMocks();
    mockDb.get = jest.fn();
    mockDb.all = jest.fn();
    mockDb.close = jest.fn();
    (sqlite3.Database as unknown as jest.Mock).mockImplementation(() => mockDb);
    adapter = new SqliteAdapter();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  // ==================== testConnection ====================
  describe('testConnection', () => {
    it('should return success=true when SELECT 1 succeeds', async () => {
      mockDb.get.mockImplementation((_sql: string, cb: (err: Error | null) => void) => cb(null));

      const result = await adapter.testConnection({ database: ':memory:' });

      expect(result.success).toBe(true);
      expect(typeof result.latency).toBe('number');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
      expect(mockDb.get).toHaveBeenCalledWith('SELECT 1', expect.any(Function));
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should return success=false with error when query fails', async () => {
      mockDb.get.mockImplementation((_sql: string, cb: (err: Error | null) => void) =>
        cb(new Error('disk I/O error')),
      );

      const result = await adapter.testConnection({ database: '/bad/path.db' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('disk I/O error');
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should use config.database as the file path', async () => {
      mockDb.get.mockImplementation((_sql: string, cb: (err: Error | null) => void) => cb(null));

      await adapter.testConnection({ database: '/path/to/db.sqlite' });

      expect(sqlite3.Database).toHaveBeenCalledWith('/path/to/db.sqlite');
    });

    it('should fall back to config.host when database is missing', async () => {
      mockDb.get.mockImplementation((_sql: string, cb: (err: Error | null) => void) => cb(null));

      await adapter.testConnection({ host: '/path/from/host' });

      expect(sqlite3.Database).toHaveBeenCalledWith('/path/from/host');
    });

    it('should default to :memory: when neither database nor host is set', async () => {
      mockDb.get.mockImplementation((_sql: string, cb: (err: Error | null) => void) => cb(null));

      await adapter.testConnection({});

      expect(sqlite3.Database).toHaveBeenCalledWith(':memory:');
    });
  });

  // ==================== getTables ====================
  describe('getTables', () => {
    it('should return table names from sqlite_master', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(null, [{ name: 'users' }, { name: 'orders' }]),
      );

      const result = await adapter.getTables({ database: ':memory:' });

      expect(result).toEqual(['users', 'orders']);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('sqlite_master'),
        [],
        expect.any(Function),
      );
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should reject with error when query fails', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(new Error('failed'), null),
      );

      await expect(adapter.getTables({ database: ':memory:' })).rejects.toThrow('failed');
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should exclude sqlite_% internal tables', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(null, []),
      );

      await adapter.getTables({ database: ':memory:' });

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining("name NOT LIKE 'sqlite_%'"),
        [],
        expect.any(Function),
      );
    });

    it('should return empty array when no tables exist', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(null, []),
      );

      const result = await adapter.getTables({ database: ':memory:' });

      expect(result).toEqual([]);
    });
  });

  // ==================== getColumns ====================
  describe('getColumns', () => {
    it('should return column info from PRAGMA table_info', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(null, [
            { name: 'id', type: 'INTEGER', notnull: 1 },
            { name: 'name', type: 'TEXT', notnull: 0 },
          ]),
      );

      const result = await adapter.getColumns({ database: ':memory:' }, 'users');

      expect(result).toEqual([
        { name: 'id', type: 'INTEGER', nullable: false, length: undefined },
        { name: 'name', type: 'TEXT', nullable: true, length: undefined },
      ]);
      expect(mockDb.all).toHaveBeenCalledWith('PRAGMA table_info(users)', [], expect.any(Function));
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should reject with error when PRAGMA fails', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(new Error('no such table'), null),
      );

      await expect(adapter.getColumns({ database: ':memory:' }, 'unknown')).rejects.toThrow(
        'no such table',
      );
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should return empty array when table has no columns', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(null, []),
      );

      const result = await adapter.getColumns({ database: ':memory:' }, 'empty');

      expect(result).toEqual([]);
    });
  });

  // ==================== executeQuery ====================
  describe('executeQuery', () => {
    it('should execute SQL and return rows', async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(null, rows),
      );

      const result = await adapter.executeQuery({ database: ':memory:' }, 'SELECT * FROM users');

      expect(result).toEqual(rows);
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM users', [], expect.any(Function));
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should reject with error when query fails', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(new Error('syntax error'), null),
      );

      await expect(adapter.executeQuery({ database: ':memory:' }, 'BAD SQL')).rejects.toThrow(
        'syntax error',
      );
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should return empty array when query returns no rows', async () => {
      mockDb.all.mockImplementation(
        (_sql: string, _params: any[], cb: (err: Error | null, rows: any[]) => void) =>
          cb(null, []),
      );

      const result = await adapter.executeQuery({ database: ':memory:' }, 'SELECT * FROM empty');

      expect(result).toEqual([]);
    });
  });
});
