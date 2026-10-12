// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';
import { UserRole } from '../../../user/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(mockReflector);
  });

  /** 构造模拟 ExecutionContext，注入 user 对象 */
  function createMockContext(user: any): ExecutionContext {
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

  /** ReadRoles 等价：[ADMIN, USER, VIEWER] */
  const READ_ROLES = [UserRole.ADMIN, UserRole.USER, UserRole.VIEWER];
  /** WriteRoles 等价：[ADMIN, USER] */
  const WRITE_ROLES = [UserRole.ADMIN, UserRole.USER];

  describe('canActivate - 无角色要求', () => {
    it('requiredRoles 为 undefined 时放行', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const ctx = createMockContext({ id: 'u1', role: 'user' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('requiredRoles 为空数组时放行', () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const ctx = createMockContext({ id: 'u1', role: 'user' });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('canActivate - 标准角色（按角色 code 检查）', () => {
    it('admin + ReadRoles 放行', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext({ id: 'u1', role: UserRole.ADMIN });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('user + ReadRoles 放行', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext({ id: 'u1', role: UserRole.USER });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('viewer + ReadRoles 放行', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext({ id: 'u1', role: UserRole.VIEWER });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('viewer + WriteRoles（不含 viewer）拒绝', () => {
      mockReflector.getAllAndOverride.mockReturnValue(WRITE_ROLES);
      const ctx = createMockContext({ id: 'u1', role: UserRole.VIEWER });
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('canActivate - 自建角色兜底（v7.2 新增）', () => {
    it('自建角色 + ReadRoles + permissions 非空 → 放行（读操作）', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext({
        id: 'u1',
        role: 'test',
        roleEntity: { permissions: ['project:view', 'device:view'] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('自建角色 + ReadRoles + permissions 含 *:* → 放行（admin 级别）', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext({
        id: 'u1',
        role: 'test',
        roleEntity: { permissions: ['*:*'] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('自建角色 + ReadRoles + permissions 空 → 拒绝（未授权）', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext({
        id: 'u1',
        role: 'test',
        roleEntity: { permissions: [] },
      });
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('自建角色 + ReadRoles + roleEntity 缺失 → 拒绝（兜底为空 permissions）', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext({ id: 'u1', role: 'test' });
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('自建角色 + WriteRoles + 无 *:* → 拒绝（写操作需 admin 级别）', () => {
      mockReflector.getAllAndOverride.mockReturnValue(WRITE_ROLES);
      const ctx = createMockContext({
        id: 'u1',
        role: 'test',
        roleEntity: { permissions: ['project:view', 'device:view'] },
      });
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('自建角色 + WriteRoles + *:* → 放行（admin 级别）', () => {
      mockReflector.getAllAndOverride.mockReturnValue(WRITE_ROLES);
      const ctx = createMockContext({
        id: 'u1',
        role: 'test',
        roleEntity: { permissions: ['*:*'] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('自建角色 + AdminRoles（仅 admin）+ *:* → 放行', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const ctx = createMockContext({
        id: 'u1',
        role: 'test',
        roleEntity: { permissions: ['*:*'] },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('自建角色 + AdminRoles（仅 admin）+ 无 *:* → 拒绝', () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const ctx = createMockContext({
        id: 'u1',
        role: 'test',
        roleEntity: { permissions: ['project:view'] },
      });
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('canActivate - 边界情况', () => {
    it('user 对象缺失时拒绝', () => {
      mockReflector.getAllAndOverride.mockReturnValue(READ_ROLES);
      const ctx = createMockContext(null);
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });
});
