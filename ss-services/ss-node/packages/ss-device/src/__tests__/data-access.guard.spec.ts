// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataAccessGuard } from '../data/data-access.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

function createMockContext(overrides: {
  user?: any;
  method?: string;
  params?: Record<string, string>;
  body?: any;
  handler?: any;
  classRef?: any;
}): ExecutionContext {
  const request = {
    user: overrides.user,
    method: overrides.method || 'POST',
    params: overrides.params || {},
    body: overrides.body || {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => overrides.handler || jest.fn(),
    getClass: () => overrides.classRef || class {},
  } as any;
}

describe('DataAccessGuard (3.6 设备权限)', () => {
  let guard: DataAccessGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockAuthService: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    } as any;

    mockAuthService = {
      checkProjectPermission: jest.fn(),
      checkDevicePermission: jest.fn(),
      checkDeviceGroupPermission: jest.fn(),
    };

    guard = new DataAccessGuard(reflector, mockAuthService);
  });

  // ==================== 基础场景 ====================
  describe('基础放行场景', () => {
    it('TC-PERM-001: 未登录用户应抛出 ForbiddenException', async () => {
      const ctx = createMockContext({ user: null });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('TC-PERM-002: admin 角色应直接放行', async () => {
      const ctx = createMockContext({ user: { role: 'admin', id: 'u1' } });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('TC-PERM-003: 无 @DataAccess 装饰器时应放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const ctx = createMockContext({ user: { role: 'user', id: 'u1' } });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('TC-PERM-004: GET 请求应放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(['project']);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1' },
        method: 'GET',
        params: { projectId: 'proj-001' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('TC-PERM-005: HEAD 请求应放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(['project']);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1' },
        method: 'HEAD',
        params: { projectId: 'proj-001' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });

  // ==================== 项目级权限 ====================
  describe('项目级资源权限', () => {
    it('TC-PERM-010: 有项目写权限应放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(['project']);
      mockAuthService.checkProjectPermission.mockResolvedValue(true);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: { projectId: 'proj-001' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockAuthService.checkProjectPermission).toHaveBeenCalledWith(
        'role-001',
        'proj-001',
        'write',
      );
    });

    it('TC-PERM-011: 无项目写权限应抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(['project']);
      mockAuthService.checkProjectPermission.mockResolvedValue(false);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: { projectId: 'proj-001' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ==================== 设备级权限 ====================
  describe('设备级资源权限', () => {
    it('TC-PERM-020: 有设备写权限应放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(['device']);
      mockAuthService.checkDevicePermission.mockResolvedValue(true);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: { projectId: 'proj-001', deviceId: 'dev-001' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockAuthService.checkDevicePermission).toHaveBeenCalledWith(
        'role-001',
        'proj-001',
        'dev-001',
        'write',
      );
    });

    it('TC-PERM-021: 无设备写权限应抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(['device']);
      mockAuthService.checkDevicePermission.mockResolvedValue(false);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: { projectId: 'proj-001', deviceId: 'dev-001' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('TC-PERM-022: 缺少 projectId 应抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(['device']);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: { deviceId: 'dev-001' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ==================== 分组级权限 ====================
  describe('设备分组级资源权限', () => {
    it('TC-PERM-030: 有分组写权限应放行', async () => {
      reflector.getAllAndOverride.mockReturnValue(['deviceGroup']);
      mockAuthService.checkDeviceGroupPermission.mockResolvedValue(true);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: { projectId: 'proj-001', groupId: 'grp-001' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockAuthService.checkDeviceGroupPermission).toHaveBeenCalledWith(
        'role-001',
        'proj-001',
        'grp-001',
        'write',
      );
    });

    it('TC-PERM-031: 无分组写权限应抛出 ForbiddenException', async () => {
      reflector.getAllAndOverride.mockReturnValue(['deviceGroup']);
      mockAuthService.checkDeviceGroupPermission.mockResolvedValue(false);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: { projectId: 'proj-001', groupId: 'grp-001' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ==================== 回退场景 ====================
  describe('authService 不可用时的回退', () => {
    it('TC-PERM-040: 无 authService 且无 @Roles 装饰器应放行', async () => {
      guard = new DataAccessGuard(reflector, undefined as any);
      reflector.getAllAndOverride.mockReturnValue(['project']);
      reflector.get.mockReturnValue([]);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1' },
        params: { projectId: 'proj-001' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('TC-PERM-041: 无 authService 且 @Roles 包含用户角色应放行', async () => {
      guard = new DataAccessGuard(reflector, undefined as any);
      reflector.getAllAndOverride.mockReturnValue(['project']);
      reflector.get.mockReturnValue(['user']);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1' },
        params: { projectId: 'proj-001' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('TC-PERM-042: 无 authService 且 @Roles 不包含用户角色应拒绝', async () => {
      guard = new DataAccessGuard(reflector, undefined as any);
      reflector.getAllAndOverride.mockReturnValue(['project']);
      reflector.get.mockReturnValue(['admin']);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1' },
        params: { projectId: 'proj-001' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ==================== body 参数回退 ====================
  describe('从 body 获取资源 ID', () => {
    it('TC-PERM-050: params 无 projectId 但 body 有时应正常检查', async () => {
      reflector.getAllAndOverride.mockReturnValue(['project']);
      mockAuthService.checkProjectPermission.mockResolvedValue(true);
      const ctx = createMockContext({
        user: { role: 'user', id: 'u1', roleId: 'role-001' },
        params: {},
        body: { projectId: 'proj-from-body' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockAuthService.checkProjectPermission).toHaveBeenCalledWith(
        'role-001',
        'proj-from-body',
        'write',
      );
    });
  });
});
