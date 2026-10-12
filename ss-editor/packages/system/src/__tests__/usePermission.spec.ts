// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../stores/auth.store';

// Mock usePermission depends on useAuthStore — we test its functions via authStore state
import { usePermission } from '../composables/usePermission';
import type { PermissionCode } from '../config/system-menu.config';

vi.mock('../api/modules/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../api/modules/user.api', () => ({
  userApi: {
    getProfile: vi.fn(),
  },
}));

describe('usePermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  describe('role-level helpers', () => {
    it('should return null role when not authenticated', () => {
      const { role } = usePermission();
      expect(role.value).toBeNull();
    });

    it('should return admin role after debug session', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();

      const { role } = usePermission();
      expect(role.value).toBe('admin');
    });

    it('isAdmin should be true for admin', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();

      const { isAdmin } = usePermission();
      expect(isAdmin.value).toBe(true);
    });

    it('canEdit should be true for admin', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();

      const { canEdit } = usePermission();
      expect(canEdit.value).toBe(true);
    });

    it('canDelete should be true for admin', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();

      const { canDelete } = usePermission();
      expect(canDelete.value).toBe(true);
    });

    it('canManage should be true for admin', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();

      const { canManage } = usePermission();
      expect(canManage.value).toBe(true);
    });

    it('isReadonly should be false for admin', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();

      const { isReadonly } = usePermission();
      expect(isReadonly.value).toBe(false);
    });

    it('isAtLeast should work correctly', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession(); // admin

      const { isAtLeast } = usePermission();
      expect(isAtLeast('viewer')).toBe(true);
      expect(isAtLeast('user')).toBe(true);
      expect(isAtLeast('admin')).toBe(true);
    });

    it('isAtLeast should return false when not authenticated', () => {
      const { isAtLeast } = usePermission();
      expect(isAtLeast('viewer')).toBe(false);
      expect(isAtLeast('admin')).toBe(false);
    });
  });

  describe('permission-code helpers', () => {
    function setPermissions(perms: string[]) {
      const authStore = useAuthStore();
      authStore.initDebugSession();
      authStore.permissions = perms;
    }

    it('hasPermission should return true for exact match', () => {
      setPermissions(['device:view', 'device:create']);
      const { hasPermission } = usePermission();
      expect(hasPermission('device:view' as PermissionCode)).toBe(true);
      expect(hasPermission('device:create' as PermissionCode)).toBe(true);
    });

    it('hasPermission should return false for missing code', () => {
      setPermissions(['device:view']);
      const { hasPermission } = usePermission();
      expect(hasPermission('device:delete' as PermissionCode)).toBe(false);
    });

    it('hasPermission should return true for *:* (admin bypass)', () => {
      setPermissions(['*:*']);
      const { hasPermission } = usePermission();
      expect(hasPermission('device:delete' as PermissionCode)).toBe(true);
      expect(hasPermission('system:user:create' as PermissionCode)).toBe(true);
      expect(hasPermission('nonexistent:action' as PermissionCode)).toBe(true);
    });

    it('hasAllPermissions should return true when all match', () => {
      setPermissions(['device:view', 'device:create', 'device:edit']);
      const { hasAllPermissions } = usePermission();
      expect(hasAllPermissions('device:view' as PermissionCode, 'device:create' as PermissionCode)).toBe(true);
    });

    it('hasAllPermissions should return false when any missing', () => {
      setPermissions(['device:view']);
      const { hasAllPermissions } = usePermission();
      expect(hasAllPermissions('device:view' as PermissionCode, 'device:delete' as PermissionCode)).toBe(false);
    });

    it('hasAllPermissions should return true for admin', () => {
      setPermissions(['*:*']);
      const { hasAllPermissions } = usePermission();
      expect(hasAllPermissions('device:view' as PermissionCode, 'system:admin' as PermissionCode)).toBe(true);
    });

    it('hasAnyPermission should return true when any match', () => {
      setPermissions(['device:view']);
      const { hasAnyPermission } = usePermission();
      expect(hasAnyPermission('device:view' as PermissionCode, 'device:delete' as PermissionCode)).toBe(true);
    });

    it('hasAnyPermission should return false when none match', () => {
      setPermissions(['device:view']);
      const { hasAnyPermission } = usePermission();
      expect(hasAnyPermission('device:create' as PermissionCode, 'device:delete' as PermissionCode)).toBe(false);
    });

    it('hasAnyPermission should return true for admin', () => {
      setPermissions(['*:*']);
      const { hasAnyPermission } = usePermission();
      expect(hasAnyPermission('nonexistent:action' as PermissionCode)).toBe(true);
    });

    it('getUserPermissions should return current permissions', () => {
      setPermissions(['device:view', 'alarm:view']);
      const { getUserPermissions } = usePermission();
      expect(getUserPermissions()).toEqual(['device:view', 'alarm:view']);
    });

    it('getUserPermissions should return empty when no permissions', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();
      authStore.permissions = [];
      const { getUserPermissions } = usePermission();
      expect(getUserPermissions()).toEqual([]);
    });
  });

  describe('data permission helpers (v7.0)', () => {
    function setPermissions(perms: string[]) {
      const authStore = useAuthStore();
      authStore.initDebugSession();
      authStore.permissions = perms;
    }

    it('canAccessDeviceGroup should return true with device_group:view', () => {
      setPermissions(['device_group:view']);
      const { canAccessDeviceGroup } = usePermission();
      expect(canAccessDeviceGroup()).toBe(true);
    });

    it('canAccessDeviceGroup should return true with device_group:create', () => {
      setPermissions(['device_group:create']);
      const { canAccessDeviceGroup } = usePermission();
      expect(canAccessDeviceGroup()).toBe(true);
    });

    it('canAccessDeviceGroup should return false without device_group codes', () => {
      setPermissions(['device:view']);
      const { canAccessDeviceGroup } = usePermission();
      expect(canAccessDeviceGroup()).toBe(false);
    });

    it('canAccessDeviceGroup should return true for admin', () => {
      setPermissions(['*:*']);
      const { canAccessDeviceGroup } = usePermission();
      expect(canAccessDeviceGroup()).toBe(true);
    });

    it('canAccessDevice should return true with device:view', () => {
      setPermissions(['device:view']);
      const { canAccessDevice } = usePermission();
      expect(canAccessDevice()).toBe(true);
    });

    it('canAccessDevice should return true with device:create', () => {
      setPermissions(['device:create']);
      const { canAccessDevice } = usePermission();
      expect(canAccessDevice()).toBe(true);
    });

    it('canAccessDevice should return false without device codes', () => {
      setPermissions(['alarm:view']);
      const { canAccessDevice } = usePermission();
      expect(canAccessDevice()).toBe(false);
    });

    it('canAccessDevice should return true for admin', () => {
      setPermissions(['*:*']);
      const { canAccessDevice } = usePermission();
      expect(canAccessDevice()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty permissions array', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();
      authStore.permissions = [];
      const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

      expect(hasPermission('device:view' as PermissionCode)).toBe(false);
      expect(hasAnyPermission('device:view' as PermissionCode)).toBe(false);
      expect(hasAllPermissions('device:view' as PermissionCode)).toBe(false);
    });

    it('should handle viewer role permissions', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();
      authStore.user!.role = 'viewer';
      authStore.permissions = ['device:view', 'system:info'];

      const { role, isReadonly, canEdit, canDelete, hasPermission } = usePermission();
      expect(role.value).toBe('viewer');
      expect(isReadonly.value).toBe(true);
      expect(canEdit.value).toBe(false);
      expect(canDelete.value).toBe(false);
      expect(hasPermission('device:view' as PermissionCode)).toBe(true);
      expect(hasPermission('device:create' as PermissionCode)).toBe(false);
    });

    it('should handle user role permissions', () => {
      const authStore = useAuthStore();
      authStore.initDebugSession();
      authStore.user!.role = 'user';
      authStore.permissions = ['device:view', 'device:create'];

      const { role, canEdit, canDelete, hasPermission } = usePermission();
      expect(role.value).toBe('user');
      expect(canEdit.value).toBe(true);
      expect(canDelete.value).toBe(false);
      expect(hasPermission('device:view' as PermissionCode)).toBe(true);
    });
  });
});
