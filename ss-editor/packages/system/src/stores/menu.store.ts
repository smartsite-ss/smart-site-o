// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SystemMenuItem, SystemRole } from '../config/system-menu.config';
import client from '../api/client';

export const useMenuStore = defineStore('system-menu', () => {
  // DB 唯一数据源：初始为空数组，由 loadMenu() 从后端加载
  const items = ref<SystemMenuItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  /** 标记是否已加载过远程菜单 */
  const loaded = ref(false);
  /** 当前子系统标识，从 window.__SUBSYSTEM__ 读取 */
  const currentSubsystem = ref<string | null>(
    (typeof window !== 'undefined' && (window as any).__SUBSYSTEM__) || null
  );

  /** 设置当前子系统 */
  function setSubsystem(subsystem: string | null) {
    currentSubsystem.value = subsystem;
  }

  /**
   * 加载远程菜单（异步，成功则填充 items）
   * 兼容 TransformInterceptor 包装格式：{ code, data, message, timestamp }
   * DB 唯一数据源方案：加载失败时保持空数组，不再 fallback 到本地默认值
   */
  async function loadMenu() {
    loading.value = true;
    error.value = null;
    try {
      const params: Record<string, string> = {};
      if (currentSubsystem.value) {
        params.subsystem = currentSubsystem.value;
      }
      const response = await client.get('/system/menu', { params });
      // TransformInterceptor 包装：response.data = { code, data: [...], message, timestamp }
      // 非包装格式（raw array）：response.data = [...]
      const menuData: unknown = response.data?.data ?? response.data;
      if (Array.isArray(menuData)) {
        items.value = menuData as SystemMenuItem[];
      }
      loaded.value = true;
    } catch (e: any) {
      error.value = e.message || '菜单加载失败';
      // 保持空数组，不 fallback
    } finally {
      loading.value = false;
    }
  }

  /**
   * 根据角色过滤可见菜单
   * @param menu 菜单列表
   * @param role 当前用户角色，null/undefined 表示未登录用户
   * @returns 过滤后的菜单列表，递归处理子菜单
   * @deprecated v7.1 起改用 filterByMenuIds。仅保留供测试与回滚参考，业务代码不应再调用。
   */
  function filterByRole(menu: SystemMenuItem[], role?: SystemRole | null): SystemMenuItem[] {
    if (!role) {
      // 未登录用户只看无角色限制的菜单
      return menu.filter(item => !item.roles || item.roles.length === 0);
    }

    return menu
      .filter(item => !item.roles || item.roles.length === 0 || item.roles.includes(role))
      .map(item => ({
        ...item,
        children: item.children ? filterByRole(item.children, role) : undefined,
      }));
  }

  /**
   * 按角色 menuIds 过滤可见菜单（v7.1 新机制，替代 filterByRole）
   *
   * 规则：
   * - admin（isAdmin=true）：返回全部菜单
   * - 非 admin：只保留 menuIds 中存在的项
   * - 父菜单自身未勾选但有子菜单被勾选：作为容器保留，仅展示被勾选的子项
   * - 父菜单自身勾选：保留，其子菜单也按 menuIds 过滤（过滤后为空则 children 为 undefined）
   * - menuIds 为空/undefined：返回空数组
   *
   * @param menu 完整菜单树
   * @param ids 当前角色 menuIds 列表
   * @param isAdmin 是否为 admin（bypass 过滤）
   */
  function filterByMenuIds(
    menu: SystemMenuItem[],
    ids: string[] | undefined | null,
    isAdmin: boolean,
  ): SystemMenuItem[] {
    if (isAdmin) return menu;

    const idSet = new Set(ids || []);
    const result: SystemMenuItem[] = [];

    for (const item of menu) {
      const selfSelected = idSet.has(item.id);
      // 递归过滤子菜单（子层固定非 admin，避免误判）
      const filteredChildren = item.children?.length
        ? filterByMenuIds(item.children, ids, false)
        : undefined;

      if (selfSelected) {
        // 自身被勾选：保留，附带过滤后的子菜单（为空则置 undefined，作为叶子节点）
        result.push({
          ...item,
          children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : undefined,
        });
      } else if (filteredChildren && filteredChildren.length > 0) {
        // 自身未勾选但有子菜单被勾选：作为容器保留
        result.push({ ...item, children: filteredChildren });
      }
      // 否则丢弃
    }
    return result;
  }

  return { items, loading, loaded, error, currentSubsystem, setSubsystem, loadMenu, filterByRole, filterByMenuIds };
});