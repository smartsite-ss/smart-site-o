// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../permissions.guard';
import { Role } from '../../../user/entities/role.entity';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockRoleRepository: { findOne: jest.Mock };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockRoleRepository = {
      findOne: jest.fn(),
    } as any;

    guard = new PermissionsGuard(mockReflector, mockRoleRepository as any);
  });

  function createMockContext(user?: any): ExecutionContext {
    const mockRequest: any = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  describe('canActivate - no permissions required', () => {
    it('should return true when no permissions are required (undefined)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const ctx = createMockContext({ id: 'user-1', role: 'user' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockRoleRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return true when required permissions array is empty', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const ctx = createMockContext({ id: 'user-1', role: 'user' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  describe('canActivate - user missing', () => {
    it('should return false when no user is attached to the request', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['project:create']);

      const ctx = createMockContext(undefined);
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });
  });

  describe('canActivate - DB role lookup', () => {
    it('should allow access when user role has the required permission (from DB)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['project:create']);
      const mockRole: Role = {
        id: 'role-1',
        name: 'Editor',
        code: 'editor',
        description: '',
        permissions: ['project:create', 'project:view'],
        menuIds: [],
        isSystem: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      const ctx = createMockContext({ id: 'user-1', role: 'user', roleId: 'role-1' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });

    it('should deny access when user role lacks the required permission (from DB)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['project:delete']);
      const mockRole: Role = {
        id: 'role-1',
        name: 'Viewer',
        code: 'viewer',
        description: '',
        permissions: ['project:view'],
        menuIds: [],
        isSystem: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      const ctx = createMockContext({ id: 'user-1', role: 'user', roleId: 'role-1' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });

    it('should grant all access when role permissions contain "*:*"', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['project:delete', 'system:config']);
      const mockRole: Role = {
        id: 'role-admin',
        name: 'Admin',
        code: 'admin',
        description: '',
        permissions: ['*:*'],
        menuIds: [],
        isSystem: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      const ctx = createMockContext({ id: 'user-1', role: 'admin', roleId: 'role-admin' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should deny access when DB role has empty permissions (v8.0: no hardcoded fallback)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['device:view']);
      const mockRole: Role = {
        id: 'role-1',
        name: 'Empty',
        code: 'empty',
        description: '',
        permissions: [],
        menuIds: [],
        isSystem: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      // v8.0: empty permissions → denied, no hardcoded fallback
      const ctx = createMockContext({ id: 'user-1', role: 'viewer', roleId: 'role-1' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });

    it('should deny access when DB lookup returns null (v8.0: no hardcoded fallback)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['device:view']);
      mockRoleRepository.findOne.mockResolvedValue(null);

      const ctx = createMockContext({ id: 'user-1', role: 'viewer', roleId: 'role-1' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });

    it('should deny access when DB lookup throws (v8.0: no hardcoded fallback)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['device:view']);
      mockRoleRepository.findOne.mockRejectedValue(new Error('DB error'));

      const ctx = createMockContext({ id: 'user-1', role: 'viewer', roleId: 'role-1' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });
  });

  describe('canActivate - v8.0: DB unavailable denies all (no hardcoded fallback)', () => {
    it('should deny admin without roleId when DB is unavailable', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['project:delete', 'system:config']);
      // No roleId → no DB lookup → empty permissions → denied
      const ctx = createMockContext({ id: 'user-1', role: 'admin' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
      expect(mockRoleRepository.findOne).not.toHaveBeenCalled();
    });

    it('should deny viewer view permission without roleId', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['device:view']);
      const ctx = createMockContext({ id: 'user-1', role: 'viewer' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });

    it('should deny unknown role without roleId', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['device:view']);
      const ctx = createMockContext({ id: 'user-1', role: 'unknown-role' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });
  });

  describe('canActivate - multiple required permissions (OR semantics)', () => {
    it('should allow access if user has any one of the required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['project:delete', 'device:view']);
      // DB lookup returns viewer-like permissions
      const mockRole: Role = {
        id: 'role-1',
        name: 'Viewer',
        code: 'viewer',
        description: '',
        permissions: ['device:view', 'device:group:view'],
        menuIds: [],
        isSystem: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      const ctx = createMockContext({ id: 'user-1', role: 'viewer', roleId: 'role-1' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should deny access if user has none of the required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['project:delete', 'system:config']);
      const mockRole: Role = {
        id: 'role-1',
        name: 'Viewer',
        code: 'viewer',
        description: '',
        permissions: ['device:view'],
        menuIds: [],
        isSystem: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      const ctx = createMockContext({ id: 'user-1', role: 'viewer', roleId: 'role-1' });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(false);
    });
  });

  describe('canActivate - without roleRepository injected', () => {
    it('should deny access when roleRepository is undefined (v8.0: no hardcoded fallback)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['device:view']);
      const guardWithoutRepo = new PermissionsGuard(mockReflector, undefined as any);

      const ctx = createMockContext({ id: 'user-1', role: 'viewer', roleId: 'role-1' });
      const result = await guardWithoutRepo.canActivate(ctx);

      expect(result).toBe(false);
    });
  });
});
