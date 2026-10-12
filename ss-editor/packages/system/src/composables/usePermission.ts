// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import {
  PermissionCodes,
  type PermissionCode,
  type SystemRole,
} from '../config/system-menu.config';

/**
 * 按钮/操作级权限组合式函数
 *
 * 使用方式 — 角色级别：
 *   const { canEdit, canDelete, isAtLeast, role } = usePermission();
 *   <button v-if="canDelete" @click="handleDelete">删除</button>
 *
 * 使用方式 — 权限码级别：
 *   const { hasPermission, hasAnyPermission } = usePermission();
 *   <button v-if="hasPermission(PermissionCodes.PROJECT_CREATE)">新建</button>
 */
export function usePermission() {
  const authStore = useAuthStore();

  /** 当前用户角色 */
  const role = computed<SystemRole | null>(() => {
    return (authStore.user?.role as SystemRole) || null;
  });

  /** 角色权重映射 */
  const ROLE_WEIGHT: Record<SystemRole, number> = {
    viewer: 0,
    user: 1,
    admin: 2,
  };

  /** 判断当前用户是否至少达到指定角色级别 */
  function isAtLeast(requiredRole: SystemRole): boolean {
    if (!role.value) return false;
    return ROLE_WEIGHT[role.value] >= ROLE_WEIGHT[requiredRole];
  }

  /** 是否为管理员 */
  const isAdmin = computed(() => role.value === 'admin');

  /** 是否可编辑（至少为 user） */
  const canEdit = computed(() => isAtLeast('user'));

  /** 是否可删除（仅 admin） */
  const canDelete = computed(() => isAtLeast('admin'));

  /** 是否可管理（仅 admin） */
  const canManage = computed(() => isAtLeast('admin'));

  /** 是否只读（viewer） */
  const isReadonly = computed(() => role.value === 'viewer');

  // ──────── 权限码级别（v8.0：从 authStore.permissions 动态读取，DB 为唯一数据源） ────────

  /** 获取当前用户的所有权限码（从数据库角色加载） */
  function getUserPermissions(): PermissionCode[] {
    return (authStore.permissions as PermissionCode[]) || [];
  }

  /** 检查是否拥有某个权限码 */
  function hasPermission(code: PermissionCode): boolean {
    const perms = getUserPermissions();
    return perms.includes(PermissionCodes.ALL as PermissionCode) || perms.includes(code);
  }

  /** 检查是否拥有所有指定权限码 */
  function hasAllPermissions(...codes: PermissionCode[]): boolean {
    return codes.every((code) => hasPermission(code));
  }

  /** 检查是否拥有任一指定权限码 */
  function hasAnyPermission(...codes: PermissionCode[]): boolean {
    return codes.some((code) => hasPermission(code));
  }

  // ──────── 数据权限辅助（v7.0 新增） ────────

  /**
   * 检查当前用户是否可访问某个设备分组
   * 注：实际数据权限由后端 DataAccessGuard + AuthorizationService 控制，
   *     此方法提供前端辅助过滤（双重保险）
   */
  function canAccessDeviceGroup(): boolean {
    return hasAnyPermission(
      PermissionCodes.DEVICE_GROUP_VIEW as PermissionCode,
      PermissionCodes.DEVICE_GROUP_CREATE as PermissionCode,
      PermissionCodes.DEVICE_GROUP_EDIT as PermissionCode,
      PermissionCodes.DEVICE_GROUP_DELETE as PermissionCode,
    );
  }

  /**
   * 检查当前用户是否可访问某个设备
   * 注：实际数据权限由后端 DataAccessGuard + AuthorizationService 控制，
   *     此方法提供前端辅助过滤（双重保险）
   */
  function canAccessDevice(): boolean {
    return hasAnyPermission(
      PermissionCodes.DEVICE_VIEW as PermissionCode,
      PermissionCodes.DEVICE_CREATE as PermissionCode,
    );
  }

  return {
    role,
    isAdmin,
    canEdit,
    canDelete,
    canManage,
    isReadonly,
    isAtLeast,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    getUserPermissions,
    canAccessDeviceGroup,
    canAccessDevice,
  };
}