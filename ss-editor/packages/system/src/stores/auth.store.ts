// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api/modules/auth.api';
import {
  setToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  persistRefreshToken,
} from '../api/client';
import type { UserInfo, LoginDto, RegisterDto } from '../types/api';
import { DEBUG_USER, getDebugToken } from '../utils/debug';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null);
  /**
   * S-C03: token 改为内存标记（不再从 localStorage 读取）
   *
   * 值为 'httpOnly' 表示通过 HttpOnly Cookie 认证（JS 不可读取真实 Token）。
   * 值为 debug token 字符串表示调试模式（不走 Cookie）。
   * null 表示未认证。
   */
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const loading = ref(false);
  /** v6.0: 当前用户的权限码列表（从角色中解析） */
  const permissions = ref<string[]>([]);
  /** v7.1: 当前用户可见菜单 ID 列表（从角色 menuIds 加载） */
  const menuIds = ref<string[]>([]);
  /**
   * S-C03: 会话恢复标记，防止重复调用 restoreSession
   *
   * - 应用初始化和路由守卫可能并发触发 restoreSession，用此标记保证只调一次
   * - login/register 成功后置为 true（已认证，无需再 restore）
   * - logout 后重置为 false（下次访问需要重新 restore）
   */
  const sessionRestored = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  /** v7.1: 是否为 admin 角色（bypass 菜单过滤，显示全部菜单） */
  const isAdmin = computed<boolean>(
    () => user.value?.role === 'admin' || (user.value as any)?.roleEntity?.code === 'admin',
  );

  function initDebugSession() {
    const debugToken = getDebugToken();
    token.value = debugToken;
    setToken(debugToken);
    user.value = DEBUG_USER as UserInfo;
    permissions.value = ['*:*'];
    // debug 用户为 admin，menuIds 留空（filterByMenuIds 会因 isAdmin=true 全量返回）
    menuIds.value = [];
    // debug 模式已认证，标记会话已恢复
    sessionRestored.value = true;
  }

  /**
   * 加载用户权限码与 menuIds（v8.0：DB 为唯一数据源，不再 fallback 硬编码）
   *
   * @param profileOverride 调用方已获取的 profile（如 restoreSession 已调 getProfile），
   *                        传入可避免重复请求；login/register 不传则内部自动获取
   */
  async function loadPermissions(profileOverride?: any) {
    try {
      const { roleApi } = await import('../api/modules/role.api');
      const { userApi } = await import('../api/modules/user.api');
      // 优先使用调用方传入的 profile，避免重复请求
      let profile: any = profileOverride;
      if (!profile) {
        const profileRes = await userApi.getProfile();
        profile = (profileRes as any)?.data || profileRes;
      }
      // 同步刷新 user，让 roleEntity 等字段对模板和 isAdmin computed 可见
      if (profile) user.value = profile as UserInfo;

      // 主路径：profile.roleEntity 为完整 Role 对象（含 menuIds）
      if (profile?.roleEntity) {
        // 即使 permissions 为 null/undefined，也设置为空数组（比保持旧值更安全）
        permissions.value = profile.roleEntity.permissions || [];
        // 加载 menuIds（defensive copy）
        menuIds.value = Array.isArray(profile.roleEntity.menuIds)
          ? [...profile.roleEntity.menuIds]
          : [];
        // admin 兜底：roleEntity 存在但 permissions 为空/null 时补 *:*
        if (isAdmin.value && (!permissions.value.length || !permissions.value.includes('*:*'))) {
          permissions.value = ['*:*'];
        }
        return;
      }
      // fallback: 尝试通过 role 快照字段获取
      if (profile?.roleId) {
        const roleRes = await roleApi.getRole(profile.roleId);
        const role: any = (roleRes as any)?.data || roleRes;
        permissions.value = role?.permissions || [];
        menuIds.value = Array.isArray(role?.menuIds) ? [...role.menuIds] : [];
        return;
      }
    } catch {
      /* ignore */
    }
    // v8.0 降级：不再使用 ROLE_PERMISSIONS 硬编码映射
    // 如果所有 DB 路径均失败，尝试从 user.value 中已有的 roleEntity 数据兜底
    const roleEntity = (user.value as any)?.roleEntity;
    if (roleEntity) {
      permissions.value = roleEntity.permissions || [];
      menuIds.value = Array.isArray(roleEntity.menuIds) ? [...roleEntity.menuIds] : [];
      return;
    }
    // 最终兜底：admin 角色硬编码 *:* 保证超管的导航不受 DB 异常影响
    if (isAdmin.value) {
      permissions.value = ['*:*'];
      menuIds.value = [];
      return;
    }
    // 完全无法获取权限时，清空以确保安全
    permissions.value = [];
    menuIds.value = [];
  }

  async function login(dto: LoginDto) {
    loading.value = true;
    try {
      const res = await authApi.login(dto);
      const data = res.data || (res as any);
      if (data.accessToken) {
        // Bearer 模式（桌面端 Tauri，跨站 Cookie 不可用）：
        // token 由响应体下发，存内存走 Authorization 头，refreshToken 持久化供重启恢复
        token.value = data.accessToken;
        refreshToken.value = data.refreshToken || null;
        setToken(data.accessToken);
        if (data.refreshToken) {
          setRefreshToken(data.refreshToken);
          persistRefreshToken(data.refreshToken);
        }
      } else {
        // S-C03: Cookie 模式（Web，同源），前端仅标记认证状态
        token.value = 'httpOnly';
        refreshToken.value = 'httpOnly';
        setToken('httpOnly');
      }
      user.value = data.user;
      await loadPermissions();
      // 登录成功后会话已建立，标记为已恢复避免后续重复 restore
      sessionRestored.value = true;
      return true;
    } finally {
      loading.value = false;
    }
  }

  async function register(dto: RegisterDto) {
    loading.value = true;
    try {
      const res = await authApi.register(dto);
      const data = res.data || (res as any);
      if (data.accessToken) {
        // Bearer 模式（桌面端 Tauri），同 login
        token.value = data.accessToken;
        refreshToken.value = data.refreshToken || null;
        setToken(data.accessToken);
        if (data.refreshToken) {
          setRefreshToken(data.refreshToken);
          persistRefreshToken(data.refreshToken);
        }
      } else {
        // S-C03: Cookie 模式（Web，同源）
        token.value = 'httpOnly';
        refreshToken.value = 'httpOnly';
        setToken('httpOnly');
      }
      user.value = data.user;
      await loadPermissions();
      sessionRestored.value = true;
      return true;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      // Cookie 模式：refreshToken 通过 Cookie 自动传输；
      // Bearer 模式（桌面端）：显式通过 body 传入以撤销服务端刷新令牌
      const bearerRefreshToken = getRefreshToken();
      await authApi.logout(
        bearerRefreshToken && bearerRefreshToken !== 'httpOnly' ? bearerRefreshToken : undefined,
      );
    } catch {
      /* ignore */
    } finally {
      user.value = null;
      token.value = null;
      refreshToken.value = null;
      permissions.value = [];
      menuIds.value = [];
      // 登出后重置会话标记，下次访问需重新 restore
      sessionRestored.value = false;
      clearTokens();
      persistRefreshToken(null);
    }
  }

  /**
   * 微信扫码登录：扫码确认后后端已通过 HttpOnly Cookie 下发 Token，
   * 前端只需加载用户 profile 和权限即可完成登录态建立。
   *
   * @param wechatUser confirmed 状态下后端返回的用户信息
   */
  async function loginWithWechat(wechatUser: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    avatar?: string;
  }): Promise<boolean> {
    loading.value = true;
    try {
      // S-C03: Token 通过 HttpOnly Cookie 设置，前端仅标记认证状态
      token.value = 'httpOnly';
      refreshToken.value = 'httpOnly';
      setToken('httpOnly');
      // 先填充扫码返回的基本用户信息，loadPermissions 内部会获取完整 profile（含 roleEntity）
      user.value = wechatUser as UserInfo;
      await loadPermissions();
      // 登录成功后会话已建立，标记为已恢复避免后续重复 restore
      sessionRestored.value = true;
      return true;
    } finally {
      loading.value = false;
    }
  }

  /**
   * S-C03: 恢复会话
   *
   * Token 不再从 localStorage 读取，而是直接尝试通过 Cookie 获取用户 profile。
   * Cookie 有效则认证成功，Cookie 无效则后端返回 401 → 清除状态。
   *
   * 使用 sessionRestored 标记 + in-flight Promise 锁，保证并发的调用方（应用初始化、
   * 多次路由切换）只触发一次后端 profile 请求，其他调用方共享同一个 Promise 结果。
   */
  let restoreInFlight: Promise<boolean> | null = null;

  async function restoreSession(): Promise<boolean> {
    // 已恢复过会话：直接返回当前认证状态
    if (sessionRestored.value) {
      return !!token.value;
    }
    // 已有 restore 进行中：复用同一个 Promise 避免重复请求
    if (restoreInFlight) {
      return restoreInFlight;
    }

    restoreInFlight = (async () => {
      try {
        const { userApi } = await import('../api/modules/user.api');
        const res = await userApi.getProfile();
        const profile = res.data || (res as any);
        user.value = profile;
        // Cookie 认证成功，标记认证状态
        token.value = 'httpOnly';
        refreshToken.value = 'httpOnly';
        setToken('httpOnly');
        // 传入已获取的 profile，避免 loadPermissions 内部重复请求
        await loadPermissions(profile);
        return true;
      } catch {
        clearTokens();
        // 会话恢复失败（含桌面端持久化 refreshToken 过期），清除持久化凭证
        persistRefreshToken(null);
        token.value = null;
        refreshToken.value = null;
        permissions.value = [];
        menuIds.value = [];
        return false;
      } finally {
        // 无论成功失败，本次恢复过程已结束
        sessionRestored.value = true;
        restoreInFlight = null;
      }
    })();

    return restoreInFlight;
  }

  return {
    user,
    token,
    refreshToken,
    loading,
    permissions,
    menuIds,
    sessionRestored,
    isAdmin,
    isAuthenticated,
    initDebugSession,
    login,
    register,
    logout,
    loginWithWechat,
    restoreSession,
  };
});
