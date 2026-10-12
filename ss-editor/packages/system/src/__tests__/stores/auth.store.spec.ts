// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../stores/auth.store';

/**
 * S-C03: HttpOnly Cookie 认证模式测试
 *
 * Token 通过 HttpOnly Cookie 由后端管理，前端仅维护认证状态标记：
 * - store.token === 'httpOnly' 表示已认证（Cookie 模式）
 * - store.token === 'debug-mock-token' 表示调试模式
 * - store.token === null 表示未认证
 *
 * sessionRestored 标记防止重复调用 restoreSession。
 */

vi.mock('../../api/modules/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../api/modules/user.api', () => ({
  userApi: {
    getProfile: vi.fn(),
  },
}));

vi.mock('../../api/modules/role.api', () => ({
  roleApi: {
    getRole: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // 清除 mock 调用计数与 once 队列，避免跨测试累积
    // （loadPermissions 内部也会调用 userApi.getProfile，影响计数断言）
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null user initially', () => {
      const store = useAuthStore();
      expect(store.user).toBeNull();
    });

    it('should have null token initially', () => {
      const store = useAuthStore();
      expect(store.token).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const store = useAuthStore();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should have loading as false initially', () => {
      const store = useAuthStore();
      expect(store.loading).toBe(false);
    });

    it('should have sessionRestored as false initially', () => {
      const store = useAuthStore();
      expect(store.sessionRestored).toBe(false);
    });
  });

  describe('initDebugSession', () => {
    it('should set debug user and token', () => {
      const store = useAuthStore();
      store.initDebugSession();

      expect(store.isAuthenticated).toBe(true);
      expect(store.user?.username).toBe('debug');
      expect(store.user?.role).toBe('admin');
      expect(store.token).toBe('debug-mock-token');
    });

    it('should mark sessionRestored true after initDebugSession', () => {
      const store = useAuthStore();
      store.initDebugSession();
      expect(store.sessionRestored).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear user, token, and refresh token', async () => {
      const store = useAuthStore();
      store.initDebugSession();
      expect(store.isAuthenticated).toBe(true);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should reset sessionRestored after logout', async () => {
      const store = useAuthStore();
      store.initDebugSession();
      expect(store.sessionRestored).toBe(true);

      await store.logout();
      expect(store.sessionRestored).toBe(false);
    });
  });

  describe('login', () => {
    it('should set loading to true during login', async () => {
      const { authApi } = await import('../../api/modules/auth.api');
      (authApi.login as any).mockResolvedValueOnce({
        data: { user: { id: '1', username: 'test', role: 'user' } },
      });

      const store = useAuthStore();
      const promise = store.login({ username: 'test', password: 'test' });
      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });

    it('should set user and httpOnly flag on successful login', async () => {
      const { authApi } = await import('../../api/modules/auth.api');
      (authApi.login as any).mockResolvedValueOnce({
        data: { user: { id: '1', username: 'testuser', role: 'admin' } },
      });

      const store = useAuthStore();
      const result = await store.login({ username: 'testuser', password: 'password123' });

      expect(result).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.user?.username).toBe('testuser');
      // S-C03: token 标记为 'httpOnly'（真实 Token 在 Cookie 中，JS 不可读）
      expect(store.token).toBe('httpOnly');
      expect(store.refreshToken).toBe('httpOnly');
    });

    it('should mark sessionRestored true after successful login', async () => {
      const { authApi } = await import('../../api/modules/auth.api');
      (authApi.login as any).mockResolvedValueOnce({
        data: { user: { id: '1', username: 'testuser', role: 'admin' } },
      });

      const store = useAuthStore();
      await store.login({ username: 'testuser', password: 'password123' });

      expect(store.sessionRestored).toBe(true);
    });
  });

  describe('register', () => {
    it('should set user and httpOnly flag on successful registration', async () => {
      const { authApi } = await import('../../api/modules/auth.api');
      (authApi.register as any).mockResolvedValueOnce({
        data: { user: { id: '3', username: 'newuser', role: 'user' } },
      });

      const store = useAuthStore();
      const result = await store.register({ username: 'newuser', password: 'newpw', email: 'new@test.com' });

      expect(result).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.user?.username).toBe('newuser');
      expect(store.token).toBe('httpOnly');
    });
  });

  describe('restoreSession', () => {
    it('should return true and set httpOnly flag when profile loads successfully', async () => {
      const { userApi } = await import('../../api/modules/user.api');
      (userApi.getProfile as any).mockResolvedValueOnce({
        data: { id: '4', username: 'existing', email: 'existing@test.com', role: 'viewer' },
      });

      const store = useAuthStore();
      const result = await store.restoreSession();

      expect(result).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.user?.username).toBe('existing');
      expect(store.user?.role).toBe('viewer');
      expect(store.token).toBe('httpOnly');
      expect(store.sessionRestored).toBe(true);
    });

    it('should clear tokens and return false when restore fails', async () => {
      const { userApi } = await import('../../api/modules/user.api');
      (userApi.getProfile as any).mockRejectedValueOnce(new Error('Token expired'));

      const store = useAuthStore();
      const result = await store.restoreSession();

      expect(result).toBe(false);
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.sessionRestored).toBe(true);
    });

    it('should not call getProfile again after sessionRestored is true', async () => {
      const { userApi } = await import('../../api/modules/user.api');
      (userApi.getProfile as any).mockResolvedValueOnce({
        data: { id: '4', username: 'existing', role: 'viewer' },
      });

      const store = useAuthStore();
      await store.restoreSession();
      // 第二次调用：sessionRestored 已为 true，应直接返回而不发起请求
      const result = await store.restoreSession();
      expect(result).toBe(true);
      expect(userApi.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should share in-flight Promise across concurrent calls', async () => {
      const { userApi } = await import('../../api/modules/user.api');
      (userApi.getProfile as any).mockResolvedValueOnce({
        data: { id: '4', username: 'existing', role: 'viewer' },
      });

      const store = useAuthStore();
      // 并发调用两次 restoreSession
      const [r1, r2] = await Promise.all([store.restoreSession(), store.restoreSession()]);
      expect(r1).toBe(true);
      expect(r2).toBe(true);
      // 只应发起一次后端请求
      expect(userApi.getProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('menuIds & isAdmin', () => {
    it('initial menuIds 应为空数组', () => {
      const store = useAuthStore();
      expect(store.menuIds).toEqual([]);
    });

    it('initial isAdmin 应为 false（user 为 null）', () => {
      const store = useAuthStore();
      expect(store.isAdmin).toBe(false);
    });

    it('initDebugSession 后 isAdmin 应为 true（DEBUG_USER.role=admin）且 menuIds 为空', () => {
      const store = useAuthStore();
      store.initDebugSession();
      expect(store.isAdmin).toBe(true);
      expect(store.menuIds).toEqual([]);
    });

    it('login 后应从 profile.roleEntity.menuIds 加载 menuIds', async () => {
      const { authApi } = await import('../../api/modules/auth.api');
      const { userApi } = await import('../../api/modules/user.api');
      (authApi.login as any).mockResolvedValueOnce({
        data: { user: { id: '1', username: 'u', role: 'user' } },
      });
      // loadPermissions 内部会调 getProfile，返回带 roleEntity 的完整 profile
      (userApi.getProfile as any).mockResolvedValueOnce({
        data: {
          id: '1', username: 'u', role: 'user',
          roleEntity: { id: 'r1', code: 'user', permissions: ['device:view'], menuIds: ['device', 'alarm'] },
        },
      });

      const store = useAuthStore();
      await store.login({ username: 'u', password: 'p' });

      expect(store.menuIds).toEqual(['device', 'alarm']);
      expect(store.isAdmin).toBe(false);
    });

    it('admin 用户登录后 isAdmin 应为 true（基于 roleEntity.code）', async () => {
      const { authApi } = await import('../../api/modules/auth.api');
      const { userApi } = await import('../../api/modules/user.api');
      (authApi.login as any).mockResolvedValueOnce({
        data: { user: { id: '1', username: 'a', role: 'admin' } },
      });
      (userApi.getProfile as any).mockResolvedValueOnce({
        data: {
          id: '1', username: 'a', role: 'admin',
          roleEntity: { id: 'r0', code: 'admin', permissions: ['*:*'], menuIds: [] },
        },
      });

      const store = useAuthStore();
      await store.login({ username: 'a', password: 'p' });

      expect(store.isAdmin).toBe(true);
      expect(store.menuIds).toEqual([]);
    });

    it('logout 后 menuIds 应清空', async () => {
      const store = useAuthStore();
      store.initDebugSession();
      expect(store.menuIds).toEqual([]);

      await store.logout();
      expect(store.menuIds).toEqual([]);
      expect(store.isAdmin).toBe(false);
    });

    it('restoreSession 失败后 menuIds 应清空', async () => {
      const { userApi } = await import('../../api/modules/user.api');
      (userApi.getProfile as any).mockRejectedValueOnce(new Error('expired'));

      const store = useAuthStore();
      await store.restoreSession();

      expect(store.menuIds).toEqual([]);
      expect(store.isAdmin).toBe(false);
    });
  });
});
