// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MysqlAdapter } from '../mysql.adapter';

// ============================================================
// Mock mysql2/promise
// NOTE: Use var for variables referenced by jest.mock factory.
// Jest hoists jest.mock above const/let (TDZ), but var is hoisted
// with undefined. The mock implementation captures the variable
// reference and accesses it lazily when called.
// ============================================================
// eslint-disable-next-line no-var
var mockConn: any;

jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn().mockImplementation(async () => mockConn),
}));

import { createConnection } from 'mysql2/promise';

describe('MysqlAdapter', () => {
  let adapter: MysqlAdapter;

  beforeEach(() => {
    // Override fake timers from setup.ts so Date.now() works for latency calc
    jest.useRealTimers();
    jest.clearAllMocks();
    mockConn = {
      execute: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
    };
    (createConnection as jest.Mock).mockResolvedValue(mockConn);
    adapter = new MysqlAdapter();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  // ==================== testConnection ====================
  describe('testConnection', () => {
    const config = {
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'pass',
      database: 'test_db',
    };

    it('should return success=true when SELECT 1 succeeds', async () => {
      mockConn.execute.mockResolvedValue([[{ '1': 1 }], []]);

      const result = await adapter.testConnection(config);

      expect(result.success).toBe(true);
      expect(typeof result.latency).toBe('number');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should call createConnection with correct parameters', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.testConnection(config);

      expect(createConnection).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'pass',
        database: 'test_db',
        connectTimeout: 10000,
      });
    });

    it('should default port to 3306 when not provided', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.testConnection({
        host: 'localhost',
        username: 'root',
        password: '',
        database: 'db',
      });

      expect(createConnection).toHaveBeenCalledWith(expect.objectContaining({ port: 3306 }));
    });

    it('should execute SELECT 1 query', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.testConnection(config);

      expect(mockConn.execute).toHaveBeenCalledWith('SELECT 1');
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.testConnection(config);

      expect(mockConn.end).toHaveBeenCalled();
    });

    it('should return success=false with error when createConnection fails', async () => {
      (createConnection as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await adapter.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
      expect(typeof result.latency).toBe('number');
    });

    it('should return success=false when execute throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('Query failed'));

      const result = await adapter.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });

    it('should still close connection when execute fails', async () => {
      mockConn.execute.mockRejectedValue(new Error('fail'));

      await adapter.testConnection(config);

      expect(mockConn.end).toHaveBeenCalled();
    });
  });

  // ==================== getTables ====================
  describe('getTables', () => {
    const config = { database: 'test_db' };

    it('should return uppercase TABLE_NAME rows', async () => {
      mockConn.execute.mockResolvedValue([[{ TABLE_NAME: 'users' }, { TABLE_NAME: 'orders' }], []]);

      const result = await adapter.getTables(config);

      expect(result).toEqual(['users', 'orders']);
    });

    it('should handle lowercase table_name field', async () => {
      mockConn.execute.mockResolvedValue([[{ table_name: 'lower_users' }], []]);

      const result = await adapter.getTables(config);

      expect(result).toEqual(['lower_users']);
    });

    it('should query information_schema.tables with database as parameter', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.getTables({ database: 'my_db' });

      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.tables'),
        ['my_db'],
      );
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.getTables(config);

      expect(mockConn.end).toHaveBeenCalled();
    });

    it('should close connection when query throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('query error'));

      await expect(adapter.getTables(config)).rejects.toThrow('query error');
      expect(mockConn.end).toHaveBeenCalled();
    });

    it('should return empty array when no tables exist', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      const result = await adapter.getTables(config);

      expect(result).toEqual([]);
    });
  });

  // ==================== getColumns ====================
  describe('getColumns', () => {
    const config = { database: 'test_db' };

    it('should map uppercase column fields to ColumnInfo', async () => {
      mockConn.execute.mockResolvedValue([
        [
          {
            COLUMN_NAME: 'id',
            DATA_TYPE: 'int',
            IS_NULLABLE: 'NO',
            CHARACTER_MAXIMUM_LENGTH: null,
          },
          {
            COLUMN_NAME: 'name',
            DATA_TYPE: 'varchar',
            IS_NULLABLE: 'YES',
            CHARACTER_MAXIMUM_LENGTH: 255,
          },
        ],
        [],
      ]);

      const result = await adapter.getColumns(config, 'users');

      expect(result).toEqual([
        { name: 'id', type: 'int', nullable: false, length: undefined },
        { name: 'name', type: 'varchar', nullable: true, length: 255 },
      ]);
    });

    it('should map lowercase column fields to ColumnInfo', async () => {
      mockConn.execute.mockResolvedValue([
        [
          {
            column_name: 'email',
            data_type: 'varchar',
            is_nullable: 'YES',
            character_maximum_length: 100,
          },
        ],
        [],
      ]);

      const result = await adapter.getColumns(config, 'users');

      expect(result[0]).toEqual({
        name: 'email',
        type: 'varchar',
        nullable: true,
        length: 100,
      });
    });

    it('should pass database and tableName as parameters', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.getColumns({ database: 'mydb' }, 'orders');

      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.columns'),
        ['mydb', 'orders'],
      );
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.getColumns(config, 'users');

      expect(mockConn.end).toHaveBeenCalled();
    });

    it('should close connection when query throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('failed'));

      await expect(adapter.getColumns(config, 'users')).rejects.toThrow('failed');
      expect(mockConn.end).toHaveBeenCalled();
    });

    it('should return empty array when table has no columns', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      const result = await adapter.getColumns(config, 'empty_table');

      expect(result).toEqual([]);
    });
  });

  // ==================== executeQuery ====================
  describe('executeQuery', () => {
    const config = { database: 'test_db' };

    it('should execute SQL and return rows', async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      mockConn.execute.mockResolvedValue([rows, []]);

      const result = await adapter.executeQuery(config, 'SELECT * FROM users');

      expect(result).toEqual(rows);
      expect(mockConn.execute).toHaveBeenCalledWith('SELECT * FROM users');
    });

    it('should return empty array when query returns no rows', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      const result = await adapter.executeQuery(config, 'SELECT * FROM empty');

      expect(result).toEqual([]);
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue([[], []]);

      await adapter.executeQuery(config, 'SELECT 1');

      expect(mockConn.end).toHaveBeenCalled();
    });

    it('should close connection when query throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('syntax error'));

      await expect(adapter.executeQuery(config, 'BAD SQL')).rejects.toThrow('syntax error');
      expect(mockConn.end).toHaveBeenCalled();
    });
  });
});
