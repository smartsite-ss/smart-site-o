// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OracleAdapter } from '../oracle.adapter';

// ============================================================
// Mock oracledb
// NOTE: Use var for variables referenced by jest.mock factory.
// Jest hoists jest.mock above const/let (TDZ), but var is hoisted
// with undefined. The mock implementation captures the variable
// reference and accesses it lazily when called.
// ============================================================
// eslint-disable-next-line no-var
var mockConn: any;

jest.mock('oracledb', () => ({
  getConnection: jest.fn().mockImplementation(async () => mockConn),
  OUT_FORMAT_OBJECT: 100,
}));

import { getConnection, OUT_FORMAT_OBJECT } from 'oracledb';

describe('OracleAdapter', () => {
  let adapter: OracleAdapter;

  const baseConfig = {
    host: 'localhost',
    port: 1521,
    database: 'ORCL',
    username: 'sys',
    password: 'pass',
  };

  beforeEach(() => {
    // Override fake timers from setup.ts so Date.now() works for latency calc
    jest.useRealTimers();
    jest.clearAllMocks();
    mockConn = {
      execute: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (getConnection as jest.Mock).mockResolvedValue(mockConn);
    adapter = new OracleAdapter();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  // ==================== testConnection ====================
  describe('testConnection', () => {
    it('should return success=true when SELECT 1 FROM DUAL succeeds', async () => {
      mockConn.execute.mockResolvedValue({ rows: [[1]] });

      const result = await adapter.testConnection(baseConfig);

      expect(result.success).toBe(true);
      expect(typeof result.latency).toBe('number');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
      expect(mockConn.execute).toHaveBeenCalledWith('SELECT 1 FROM DUAL');
    });

    it('should build connectString with host:port/database format', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      await adapter.testConnection(baseConfig);

      expect(getConnection).toHaveBeenCalledWith({
        connectString: 'localhost:1521/ORCL',
        user: 'sys',
        password: 'pass',
      });
    });

    it('should default port to 1521 when not provided', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      await adapter.testConnection({
        host: 'remote',
        database: 'XE',
        username: 'user',
        password: 'pass',
      });

      expect(getConnection).toHaveBeenCalledWith(
        expect.objectContaining({ connectString: 'remote:1521/XE' }),
      );
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      await adapter.testConnection(baseConfig);

      expect(mockConn.close).toHaveBeenCalled();
    });

    it('should return success=false with error when getConnection fails', async () => {
      (getConnection as jest.Mock).mockRejectedValue(new Error('ORA-12541: TNS:no listener'));

      const result = await adapter.testConnection(baseConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ORA-12541: TNS:no listener');
      expect(typeof result.latency).toBe('number');
    });

    it('should return success=false when execute throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('ORA-00900: invalid SQL'));

      const result = await adapter.testConnection(baseConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ORA-00900: invalid SQL');
    });

    it('should still close connection when execute fails', async () => {
      mockConn.execute.mockRejectedValue(new Error('fail'));

      await adapter.testConnection(baseConfig);

      expect(mockConn.close).toHaveBeenCalled();
    });
  });

  // ==================== getTables ====================
  describe('getTables', () => {
    it('should return table names from user_tables', async () => {
      mockConn.execute.mockResolvedValue({ rows: [['USERS'], ['ORDERS']] });

      const result = await adapter.getTables(baseConfig);

      expect(result).toEqual(['USERS', 'ORDERS']);
      expect(mockConn.execute).toHaveBeenCalledWith(expect.stringContaining('user_tables'));
    });

    it('should handle TABLE_NAME object field format', async () => {
      mockConn.execute.mockResolvedValue({ rows: [{ TABLE_NAME: 'PRODUCTS' }] });

      const result = await adapter.getTables(baseConfig);

      expect(result).toEqual(['PRODUCTS']);
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      await adapter.getTables(baseConfig);

      expect(mockConn.close).toHaveBeenCalled();
    });

    it('should close connection when query throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('failed'));

      await expect(adapter.getTables(baseConfig)).rejects.toThrow('failed');
      expect(mockConn.close).toHaveBeenCalled();
    });

    it('should return empty array when no tables exist', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      const result = await adapter.getTables(baseConfig);

      expect(result).toEqual([]);
    });
  });

  // ==================== getColumns ====================
  describe('getColumns', () => {
    it('should map array format rows to ColumnInfo', async () => {
      mockConn.execute.mockResolvedValue({
        rows: [
          ['ID', 'NUMBER', 'N', 22],
          ['NAME', 'VARCHAR2', 'Y', 255],
        ],
      });

      const result = await adapter.getColumns(baseConfig, 'users');

      expect(result).toEqual([
        { name: 'ID', type: 'NUMBER', nullable: false, length: 22 },
        { name: 'NAME', type: 'VARCHAR2', nullable: true, length: 255 },
      ]);
    });

    it('should map object format rows with uppercase fields', async () => {
      mockConn.execute.mockResolvedValue({
        rows: [
          {
            COLUMN_NAME: 'EMAIL',
            DATA_TYPE: 'VARCHAR2',
            NULLABLE: 'Y',
            DATA_LENGTH: 100,
          },
        ],
      });

      const result = await adapter.getColumns(baseConfig, 'users');

      expect(result[0]).toEqual({
        name: 'EMAIL',
        type: 'VARCHAR2',
        nullable: true,
        length: 100,
      });
    });

    it('should uppercase tableName when passing as bind variable', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      await adapter.getColumns(baseConfig, 'users');

      expect(mockConn.execute).toHaveBeenCalledWith(expect.stringContaining('user_tab_columns'), {
        tableName: 'USERS',
      });
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      await adapter.getColumns(baseConfig, 'users');

      expect(mockConn.close).toHaveBeenCalled();
    });

    it('should close connection when query throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('failed'));

      await expect(adapter.getColumns(baseConfig, 'users')).rejects.toThrow('failed');
      expect(mockConn.close).toHaveBeenCalled();
    });
  });

  // ==================== executeQuery ====================
  describe('executeQuery', () => {
    it('should execute SQL and return rows', async () => {
      const rows = [{ ID: 1 }, { ID: 2 }];
      mockConn.execute.mockResolvedValue({ rows });

      const result = await adapter.executeQuery(baseConfig, 'SELECT * FROM users');

      expect(result).toEqual(rows);
      expect(mockConn.execute).toHaveBeenCalledWith('SELECT * FROM users', [], {
        outFormat: OUT_FORMAT_OBJECT,
      });
    });

    it('should return empty array when rows is undefined', async () => {
      mockConn.execute.mockResolvedValue({ rows: undefined });

      const result = await adapter.executeQuery(baseConfig, 'SELECT * FROM empty');

      expect(result).toEqual([]);
    });

    it('should return empty array when rows is null', async () => {
      mockConn.execute.mockResolvedValue({ rows: null });

      const result = await adapter.executeQuery(baseConfig, 'SELECT * FROM empty');

      expect(result).toEqual([]);
    });

    it('should close connection on success', async () => {
      mockConn.execute.mockResolvedValue({ rows: [] });

      await adapter.executeQuery(baseConfig, 'SELECT 1 FROM DUAL');

      expect(mockConn.close).toHaveBeenCalled();
    });

    it('should close connection when query throws', async () => {
      mockConn.execute.mockRejectedValue(new Error('ORA-00900'));

      await expect(adapter.executeQuery(baseConfig, 'BAD SQL')).rejects.toThrow('ORA-00900');
      expect(mockConn.close).toHaveBeenCalled();
    });
  });
});
