// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @nestjs/swagger decorators
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const deco = (): any => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  const propDeco = (): any => () => {};
  return {
    ApiTags: (..._tags: string[]) => deco(),
    ApiBearerAuth: () => deco(),
    ApiOperation: (_opts: any) => deco(),
    ApiParam: (_opts: any) => deco(),
    ApiQuery: (_opts: any) => deco(),
    ApiProperty: (_opts?: any) => propDeco(),
    ApiPropertyOptional: (_opts?: any) => propDeco(),
    ApiBody: (_opts?: any) => deco(),
    ApiResponse: (_opts?: any) => deco(),
    PartialType: (cls: any) => cls,
    OmitType: (cls: any, _keys: string[]) => cls,
    PickType: (cls: any, _keys: string[]) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

// ============================================================
// Mock @ss-node/ss-core guards
// ============================================================
jest.mock('@ss-node/ss-core', () => {
  const noopDeco = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  class MockJwtAuthGuard {
    canActivate = () => true;
  }
  class MockRolesGuard {
    canActivate = () => true;
  }
  return {
    JwtAuthGuard: MockJwtAuthGuard,
    RolesGuard: MockRolesGuard,
    Roles: (..._roles: any[]) => noopDeco(),
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
  };
});

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { DbConnectionController } from '../controllers/db-connection.controller';
import { DbConnectionService } from '../services/db-connection.service';
import { NotFoundException } from '@nestjs/common';

// ============================================================
// Mock DbConnectionService
// ============================================================
const mockDbConnectionService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  test: jest.fn(),
  getTables: jest.fn(),
  getColumns: jest.fn(),
  executeQuery: jest.fn(),
};

describe('DbConnectionController', () => {
  let controller: DbConnectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DbConnectionController],
      providers: [{ provide: DbConnectionService, useValue: mockDbConnectionService }],
    }).compile();

    controller = module.get<DbConnectionController>(DbConnectionController);
    jest.clearAllMocks();
  });

  // ==================== POST /projects/:projectId/db-connections ====================
  describe('POST /projects/:projectId/db-connections', () => {
    const dto = {
      name: 'MySQL Connection',
      dbType: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test_db',
      username: 'root',
      password: 'secret',
    };

    it('should create connection and assign projectId', async () => {
      const saved = { id: 'conn-001', ...dto, projectId: 'project-001' };
      mockDbConnectionService.create.mockResolvedValue(saved);

      const result = await controller.create('project-001', dto as any);

      expect(result).toEqual(saved);
      expect(mockDbConnectionService.create).toHaveBeenCalledWith('project-001', dto);
    });
  });

  // ==================== GET /projects/:projectId/db-connections ====================
  describe('GET /projects/:projectId/db-connections', () => {
    it('should return all connections for project', async () => {
      const connections = [
        { id: 'conn-001', name: 'Conn A', projectId: 'project-001' },
        { id: 'conn-002', name: 'Conn B', projectId: 'project-001' },
      ];
      mockDbConnectionService.findAll.mockResolvedValue(connections);

      const result = await controller.findAll('project-001');

      expect(result).toEqual(connections);
      expect(mockDbConnectionService.findAll).toHaveBeenCalledWith('project-001');
    });

    it('should return empty array when no connections', async () => {
      mockDbConnectionService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== GET /projects/:projectId/db-connections/:id ====================
  describe('GET /projects/:projectId/db-connections/:id', () => {
    it('should return connection by id', async () => {
      const conn = { id: 'conn-001', name: 'Test', projectId: 'project-001' };
      mockDbConnectionService.findOne.mockResolvedValue(conn);

      const result = await controller.findOne('project-001', 'conn-001');

      expect(result).toEqual(conn);
      expect(mockDbConnectionService.findOne).toHaveBeenCalledWith('project-001', 'conn-001');
    });

    it('should propagate NotFoundException', async () => {
      mockDbConnectionService.findOne.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findOne('project-001', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== PATCH /projects/:projectId/db-connections/:id ====================
  describe('PATCH /projects/:projectId/db-connections/:id', () => {
    it('should update connection fields', async () => {
      const updated = { id: 'conn-001', name: 'Updated', projectId: 'project-001' };
      mockDbConnectionService.update.mockResolvedValue(updated);

      const result = await controller.update('project-001', 'conn-001', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
      expect(mockDbConnectionService.update).toHaveBeenCalledWith('project-001', 'conn-001', {
        name: 'Updated',
      });
    });

    it('should propagate NotFoundException', async () => {
      mockDbConnectionService.update.mockRejectedValue(new NotFoundException('Not found'));

      await expect(
        controller.update('project-001', 'non-existent', { name: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== DELETE /projects/:projectId/db-connections/:id ====================
  describe('DELETE /projects/:projectId/db-connections/:id', () => {
    it('should delete connection', async () => {
      mockDbConnectionService.remove.mockResolvedValue(undefined);

      await controller.remove('project-001', 'conn-001');

      expect(mockDbConnectionService.remove).toHaveBeenCalledWith('project-001', 'conn-001');
    });

    it('should propagate NotFoundException', async () => {
      mockDbConnectionService.remove.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.remove('project-001', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== POST /projects/:projectId/db-connections/:id/test ====================
  describe('POST /projects/:projectId/db-connections/:id/test', () => {
    it('should test connection and return result wrapped in data', async () => {
      const testResult = { success: true, latency: 45 };
      mockDbConnectionService.test.mockResolvedValue(testResult);

      const result = await controller.test('project-001', 'conn-001');

      expect(result).toEqual({ data: testResult });
      expect(mockDbConnectionService.test).toHaveBeenCalledWith('project-001', 'conn-001');
    });

    it('should return failure result wrapped in data', async () => {
      const testResult = { success: false, latency: 0, error: 'Connection refused' };
      mockDbConnectionService.test.mockResolvedValue(testResult);

      const result = await controller.test('project-001', 'conn-001');

      expect(result).toEqual({ data: testResult });
      expect(result.data.success).toBe(false);
    });
  });

  // ==================== GET /projects/:projectId/db-connections/:id/tables ====================
  describe('GET /projects/:projectId/db-connections/:id/tables', () => {
    it('should return table names wrapped in data', async () => {
      const tables = ['users', 'orders', 'products'];
      mockDbConnectionService.getTables.mockResolvedValue(tables);

      const result = await controller.getTables('project-001', 'conn-001');

      expect(result).toEqual({ data: tables });
      expect(mockDbConnectionService.getTables).toHaveBeenCalledWith('project-001', 'conn-001');
    });

    it('should return empty data when no tables', async () => {
      mockDbConnectionService.getTables.mockResolvedValue([]);

      const result = await controller.getTables('project-001', 'conn-001');

      expect(result).toEqual({ data: [] });
    });
  });

  // ==================== GET /projects/:projectId/db-connections/:id/tables/:tableName/columns ====================
  describe('GET /projects/:projectId/db-connections/:id/tables/:tableName/columns', () => {
    it('should return column info wrapped in data', async () => {
      const columns = [
        { name: 'id', type: 'int' },
        { name: 'name', type: 'varchar' },
      ];
      mockDbConnectionService.getColumns.mockResolvedValue(columns);

      const result = await controller.getColumns('project-001', 'conn-001', 'users');

      expect(result).toEqual({ data: columns });
      expect(mockDbConnectionService.getColumns).toHaveBeenCalledWith(
        'project-001',
        'conn-001',
        'users',
      );
    });
  });

  // ==================== POST /projects/:projectId/db-connections/:id/query ====================
  describe('POST /projects/:projectId/db-connections/:id/query', () => {
    it('should execute SELECT query and return results', async () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      mockDbConnectionService.executeQuery.mockResolvedValue(rows);

      const result = await controller.executeQuery('project-001', 'conn-001', {
        sql: 'SELECT * FROM users',
      });

      expect(result).toEqual({ data: rows });
      expect(mockDbConnectionService.executeQuery).toHaveBeenCalledWith(
        'project-001',
        'conn-001',
        'SELECT * FROM users LIMIT 100',
      );
    });

    it('should reject non-SELECT queries', async () => {
      const result = await controller.executeQuery('project-001', 'conn-001', {
        sql: 'DELETE FROM users',
      });

      expect(result).toEqual({ data: [], error: 'Only SELECT queries are allowed' });
      expect(mockDbConnectionService.executeQuery).not.toHaveBeenCalled();
    });

    it('should reject INSERT queries', async () => {
      const result = await controller.executeQuery('project-001', 'conn-001', {
        sql: 'INSERT INTO users VALUES (1, "test")',
      });

      expect(result).toEqual({ data: [], error: 'Only SELECT queries are allowed' });
    });

    it('should reject UPDATE queries', async () => {
      const result = await controller.executeQuery('project-001', 'conn-001', {
        sql: 'UPDATE users SET name = "test"',
      });

      expect(result).toEqual({ data: [], error: 'Only SELECT queries are allowed' });
    });

    it('should handle empty SQL string', async () => {
      const result = await controller.executeQuery('project-001', 'conn-001', { sql: '  ' });

      expect(result).toEqual({ data: [], error: 'Only SELECT queries are allowed' });
    });

    it('should handle SELECT with trailing semicolon', async () => {
      mockDbConnectionService.executeQuery.mockResolvedValue([]);

      await controller.executeQuery('project-001', 'conn-001', {
        sql: 'SELECT * FROM users;',
      });

      expect(mockDbConnectionService.executeQuery).toHaveBeenCalledWith(
        'project-001',
        'conn-001',
        'SELECT * FROM users LIMIT 100',
      );
    });

    it('should handle case-insensitive SELECT', async () => {
      mockDbConnectionService.executeQuery.mockResolvedValue([]);

      await controller.executeQuery('project-001', 'conn-001', {
        sql: 'select * from users',
      });

      expect(mockDbConnectionService.executeQuery).toHaveBeenCalledWith(
        'project-001',
        'conn-001',
        'select * from users LIMIT 100',
      );
    });
  });
});
