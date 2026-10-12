// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DbConnectionService } from '../services/db-connection.service';
import { DbConnection, DbType } from '../entities/db-connection.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRepo(): MockRepository<DbConnection> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
}

function makeDbConnection(overrides: Partial<DbConnection> = {}): DbConnection {
  return {
    id: 'conn-001',
    projectId: 'project-001',
    name: 'Test Connection',
    dbType: 'mysql' as DbType,
    host: 'localhost',
    port: 3306,
    database: 'test_db',
    username: 'root',
    password: 'password',
    options: JSON.stringify({ charset: 'utf8' }),
    enabled: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockAdapterFactory() {
  return {
    getAdapter: jest.fn(),
  };
}

function createMockAdapter() {
  return {
    testConnection: jest.fn(),
    getTables: jest.fn(),
    getColumns: jest.fn(),
    executeQuery: jest.fn(),
  };
}

describe('DbConnectionService', () => {
  let service: DbConnectionService;
  let mockRepo: MockRepository<DbConnection>;
  let mockAdapterFactory: ReturnType<typeof createMockAdapterFactory>;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    mockAdapterFactory = createMockAdapterFactory();
    mockAdapter = createMockAdapter();
    mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter);

    service = new DbConnectionService(mockRepo as any, mockAdapterFactory as any);
  });

  // ==================== create ====================
  describe('create', () => {
    const baseDto = {
      name: 'MySQL Connection',
      dbType: 'mysql' as DbType,
      host: '192.168.1.1',
      port: 3306,
      database: 'mydb',
      username: 'admin',
      password: 'secret',
      enabled: true,
    };

    it('should save connection with projectId', async () => {
      const entity = makeDbConnection({ ...baseDto, projectId: 'project-001' });
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create('project-001', baseDto as any);

      expect(result).toBeDefined();
      expect(result.projectId).toBe('project-001');
      expect(result.name).toBe('MySQL Connection');
      expect(mockRepo.create).toHaveBeenCalledWith({ ...baseDto, projectId: 'project-001' });
      expect(mockRepo.save).toHaveBeenCalledWith(entity);
    });

    it('should save connection with optional options', async () => {
      const dto = { ...baseDto, options: JSON.stringify({ ssl: true }) };
      const entity = makeDbConnection({ ...dto, projectId: 'project-001' });
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create('project-001', dto as any);

      expect(result.options).toBe(JSON.stringify({ ssl: true }));
    });

    it('should save connection with sqlite type', async () => {
      const dto = {
        name: 'SQLite DB',
        dbType: 'sqlite' as DbType,
        database: '/path/to/db.sqlite',
        enabled: true,
      };
      const entity = makeDbConnection({ ...dto, projectId: 'project-001' });
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create('project-001', dto as any);

      expect(result.dbType).toBe('sqlite');
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    it('should return connections for project ordered by createdAt DESC', async () => {
      const connections = [
        makeDbConnection({ id: 'conn-001', name: 'Conn A', projectId: 'project-001' }),
        makeDbConnection({ id: 'conn-002', name: 'Conn B', projectId: 'project-001' }),
      ];
      mockRepo.find.mockResolvedValue(connections);

      const result = await service.findAll('project-001');

      expect(result).toEqual(connections);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'project-001' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no connections exist', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.findAll('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== findOne ====================
  describe('findOne', () => {
    it('should return connection by id and projectId', async () => {
      const conn = makeDbConnection({ id: 'conn-001', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);

      const result = await service.findOne('project-001', 'conn-001');

      expect(result).toEqual(conn);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'conn-001', projectId: 'project-001' },
      });
    });

    it('should throw NotFoundException when connection not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('project-001', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== update ====================
  describe('update', () => {
    it('should update connection fields', async () => {
      const existing = makeDbConnection({
        id: 'conn-001',
        name: 'Old Name',
        projectId: 'project-001',
      });
      mockRepo.findOne.mockResolvedValue(existing);
      const updated = { ...existing, name: 'New Name', host: '10.0.0.1' };
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update('project-001', 'conn-001', {
        name: 'New Name',
        host: '10.0.0.1',
      } as any);

      expect(result.name).toBe('New Name');
      expect(result.host).toBe('10.0.0.1');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent connection', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('project-001', 'non-existent', { name: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== remove ====================
  describe('remove', () => {
    it('should delete connection', async () => {
      const conn = makeDbConnection({ id: 'conn-001', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockRepo.remove.mockResolvedValue(conn);

      await service.remove('project-001', 'conn-001');

      expect(mockRepo.remove).toHaveBeenCalledWith(conn);
    });

    it('should throw NotFoundException when removing non-existent connection', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('project-001', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== testConnection ====================
  describe('testConnection', () => {
    it('should test connection and return status', async () => {
      const conn = makeDbConnection({
        id: 'conn-001',
        dbType: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test_db',
        username: 'root',
        password: 'secret',
        options: null,
        projectId: 'project-001',
      });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.testConnection.mockResolvedValue({ success: true, latency: 45 });

      const result = await service.test('project-001', 'conn-001');

      expect(result.success).toBe(true);
      expect(result.latency).toBe(45);
      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('mysql');
      expect(mockAdapter.testConnection).toHaveBeenCalled();
    });

    it('should return failure when connection fails', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'mysql', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.testConnection.mockResolvedValue({
        success: false,
        latency: 0,
        error: 'Connection refused',
      });

      const result = await service.test('project-001', 'conn-001');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should throw NotFoundException when connection not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.test('project-001', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== getTables ====================
  describe('getTables', () => {
    it('should return table names', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'mysql', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.getTables.mockResolvedValue(['users', 'orders', 'products']);

      const result = await service.getTables('project-001', 'conn-001');

      expect(result).toEqual(['users', 'orders', 'products']);
      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('mysql');
      expect(mockAdapter.getTables).toHaveBeenCalled();
    });

    it('should return empty array when no tables', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'sqlite', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.getTables.mockResolvedValue([]);

      const result = await service.getTables('project-001', 'conn-001');

      expect(result).toEqual([]);
    });
  });

  // ==================== getColumns ====================
  describe('getColumns', () => {
    it('should return column info for a table', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'mysql', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.getColumns.mockResolvedValue([
        { name: 'id', type: 'int', nullable: false },
        { name: 'name', type: 'varchar', nullable: true, length: 255 },
        { name: 'email', type: 'varchar', nullable: false, length: 100 },
      ]);

      const result = await service.getColumns('project-001', 'conn-001', 'users');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'id', type: 'int' });
      expect(result[1]).toEqual({ name: 'name', type: 'varchar' });
      expect(mockAdapter.getColumns).toHaveBeenCalledWith(expect.any(Object), 'users');
    });

    it('should return empty array when table has no columns', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'mysql', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.getColumns.mockResolvedValue([]);

      const result = await service.getColumns('project-001', 'conn-001', 'empty_table');

      expect(result).toEqual([]);
    });
  });

  // ==================== executeQuery ====================
  describe('executeQuery', () => {
    it('should execute SQL and return results', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'mysql', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      mockAdapter.executeQuery.mockResolvedValue(rows);

      const result = await service.executeQuery('project-001', 'conn-001', 'SELECT * FROM users');

      expect(result).toEqual(rows);
      expect(mockAdapter.executeQuery).toHaveBeenCalledWith(
        expect.any(Object),
        'SELECT * FROM users',
      );
    });

    it('should return empty array when query returns no rows', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'mysql', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.executeQuery.mockResolvedValue([]);

      const result = await service.executeQuery(
        'project-001',
        'conn-001',
        'SELECT * FROM empty_table',
      );

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when connection not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.executeQuery('project-001', 'non-existent', 'SELECT 1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== toAdapterConfig (via test) ====================
  describe('toAdapterConfig', () => {
    it('should convert entity to adapter config', async () => {
      const conn = makeDbConnection({
        id: 'conn-001',
        dbType: 'mysql',
        host: 'db.example.com',
        port: 3307,
        database: 'production',
        username: 'prod_user',
        password: 'prod_pass',
        options: JSON.stringify({ poolSize: 10 }),
        projectId: 'project-001',
      });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.getTables.mockResolvedValue([]);

      await service.getTables('project-001', 'conn-001');

      // Verify the adapter received the correct config
      expect(mockAdapter.getTables).toHaveBeenCalledWith({
        host: 'db.example.com',
        port: 3307,
        database: 'production',
        username: 'prod_user',
        password: 'prod_pass',
        options: { poolSize: 10 },
      });
    });

    it('should handle null options', async () => {
      const conn = makeDbConnection({
        id: 'conn-001',
        dbType: 'sqlite',
        host: '',
        port: 0,
        database: 'file.db',
        username: '',
        password: '',
        options: null,
        projectId: 'project-001',
      });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.getTables.mockResolvedValue([]);

      await service.getTables('project-001', 'conn-001');

      expect(mockAdapter.getTables).toHaveBeenCalledWith({
        host: '',
        port: 0,
        database: 'file.db',
        username: '',
        password: '',
        options: undefined,
      });
    });
  });

  // ==================== Edge Cases ====================
  describe('edge cases', () => {
    it('should handle oracle adapter type', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'oracle', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.testConnection.mockResolvedValue({ success: true, latency: 10 });

      await service.test('project-001', 'conn-001');

      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('oracle');
    });

    it('should handle postgresql adapter type', async () => {
      const conn = makeDbConnection({
        id: 'conn-001',
        dbType: 'postgresql',
        projectId: 'project-001',
      });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.testConnection.mockResolvedValue({ success: true, latency: 10 });

      await service.test('project-001', 'conn-001');

      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('postgresql');
    });

    it('should handle mssql adapter type', async () => {
      const conn = makeDbConnection({ id: 'conn-001', dbType: 'mssql', projectId: 'project-001' });
      mockRepo.findOne.mockResolvedValue(conn);
      mockAdapter.testConnection.mockResolvedValue({ success: true, latency: 10 });

      await service.test('project-001', 'conn-001');

      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledWith('mssql');
    });

    it('should handle connection with special characters in name', async () => {
      const entity = makeDbConnection({
        name: 'Test!@#$% Connection',
        projectId: 'project-001',
      });
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create('project-001', {
        name: 'Test!@#$% Connection',
        dbType: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'user',
        password: 'pass',
        enabled: true,
      } as any);

      expect(result.name).toBe('Test!@#$% Connection');
    });
  });
});
