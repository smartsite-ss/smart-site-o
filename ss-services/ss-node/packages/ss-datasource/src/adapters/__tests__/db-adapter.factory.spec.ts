// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DbAdapterFactory } from '../db-adapter.factory';
import { MysqlAdapter } from '../mysql.adapter';
import { SqliteAdapter } from '../sqlite.adapter';
import { OracleAdapter } from '../oracle.adapter';
import { DbAdapter } from '../db-adapter.interface';

describe('DbAdapterFactory', () => {
  let factory: DbAdapterFactory;
  let mockMysqlAdapter: DbAdapter;
  let mockSqliteAdapter: DbAdapter;
  let mockOracleAdapter: DbAdapter;

  beforeEach(() => {
    mockMysqlAdapter = {
      testConnection: jest.fn(),
      getTables: jest.fn(),
      getColumns: jest.fn(),
      executeQuery: jest.fn(),
    };
    mockSqliteAdapter = {
      testConnection: jest.fn(),
      getTables: jest.fn(),
      getColumns: jest.fn(),
      executeQuery: jest.fn(),
    };
    mockOracleAdapter = {
      testConnection: jest.fn(),
      getTables: jest.fn(),
      getColumns: jest.fn(),
      executeQuery: jest.fn(),
    };

    factory = new DbAdapterFactory(
      mockMysqlAdapter as unknown as MysqlAdapter,
      mockSqliteAdapter as unknown as SqliteAdapter,
      mockOracleAdapter as unknown as OracleAdapter,
    );
  });

  // ==================== getAdapter ====================
  describe('getAdapter', () => {
    it('should return mysql adapter for "mysql" type', () => {
      const result = factory.getAdapter('mysql');
      expect(result).toBe(mockMysqlAdapter);
    });

    it('should return sqlite adapter for "sqlite" type', () => {
      const result = factory.getAdapter('sqlite');
      expect(result).toBe(mockSqliteAdapter);
    });

    it('should return oracle adapter for "oracle" type', () => {
      const result = factory.getAdapter('oracle');
      expect(result).toBe(mockOracleAdapter);
    });

    it('should throw error for unsupported "postgresql" type', () => {
      expect(() => factory.getAdapter('postgresql')).toThrow(
        'Unsupported database type: postgresql',
      );
    });

    it('should throw error for unsupported "mssql" type', () => {
      expect(() => factory.getAdapter('mssql')).toThrow('Unsupported database type: mssql');
    });

    it('should throw error for unknown type', () => {
      expect(() => factory.getAdapter('unknown' as any)).toThrow(
        'Unsupported database type: unknown',
      );
    });

    it('should throw error for empty string type', () => {
      expect(() => factory.getAdapter('' as any)).toThrow('Unsupported database type: ');
    });

    it('should return same adapter instance each time for same type', () => {
      const result1 = factory.getAdapter('mysql');
      const result2 = factory.getAdapter('mysql');

      expect(result1).toBe(result2);
    });

    it('should return adapters for all supported types in sequence', () => {
      expect(factory.getAdapter('mysql')).toBe(mockMysqlAdapter);
      expect(factory.getAdapter('sqlite')).toBe(mockSqliteAdapter);
      expect(factory.getAdapter('oracle')).toBe(mockOracleAdapter);
    });
  });
});
