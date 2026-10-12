// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { SystemMenuItem } from '../../config/system-menu.config';

export interface SystemMenuButton {
  id: string;
  menuId: string;
  labelKey: string;
  permissionCode: string;
  sortOrder: number;
}

/** 菜单国际化条目 */
export interface MenuI18nItem {
  labelKey: string;
  label: string;
  sortOrder: number;
  description: string;
}

/** 菜单国际化表 */
export interface MenuI18nTable {
  menuId: string;
  menuName: string;
  category: string;
  description: string;
  version: string;
  sortOrder: number;
  items: MenuI18nItem[];
}

export const menuApi = {
  /** 获取菜单树 */
  getMenu(subsystem?: string): Promise<SystemMenuItem[]> {
    return client.get('/system/menu/', { params: subsystem ? { subsystem } : {} })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 批量更新菜单树 */
  updateMenu(menus: SystemMenuItem[]): Promise<{ ok: boolean }> {
    return client.put('/system/menu/', { menus }).then((res) => res.data);
  },

  /** 创建单个菜单项 */
  createMenuItem(item: SystemMenuItem, parentId?: string): Promise<{ ok: boolean }> {
    return client.post('/system/menu/item', { item, parentId }).then((res) => res.data);
  },

  /** 更新单个菜单项 */
  updateMenuItem(id: string, item: SystemMenuItem, parentId?: string): Promise<{ ok: boolean }> {
    return client.put(`/system/menu/item/${id}`, { item, parentId }).then((res) => res.data);
  },

  /** 删除菜单项 */
  deleteMenuItem(id: string): Promise<{ ok: boolean }> {
    return client.delete(`/system/menu/${id}`).then((res) => res.data);
  },

  /** 获取所有菜单按钮 */
  getButtons(): Promise<SystemMenuButton[]> {
    return client.get('/system/menu/buttons').then((res) => res.data?.data ?? res.data);
  },

  /** 获取指定菜单的按钮 */
  getButtonsByMenu(menuId: string): Promise<SystemMenuButton[]> {
    return client.get(`/system/menu/${menuId}/buttons`).then((res) => res.data?.data ?? res.data);
  },

  /** 批量更新按钮 */
  updateButtons(buttons: SystemMenuButton[]): Promise<{ ok: boolean }> {
    return client.put('/system/menu/buttons', { buttons }).then((res) => res.data);
  },

  /** 创建单个按钮 */
  createButton(btn: SystemMenuButton): Promise<{ ok: boolean }> {
    return client.post('/system/menu/buttons', btn).then((res) => res.data);
  },

  /** 删除按钮 */
  deleteButton(id: string): Promise<{ ok: boolean }> {
    return client.delete(`/system/menu/buttons/${id}`).then((res) => res.data);
  },

  /** 获取菜单国际化数据 */
  getMenuI18n(locale?: string, menuId?: string): Promise<MenuI18nTable | MenuI18nTable[]> {
    const params: Record<string, string> = {};
    if (locale) params.locale = locale;
    if (menuId) params.menuId = menuId;
    return client.get('/system/menu/i18n', { params }).then((res) => res.data?.data ?? res.data);
  },

  /** 批量更新菜单国际化条目 */
  updateMenuI18nItems(locale: string, menuId: string, items: MenuI18nItem[]): Promise<{ ok: boolean }> {
    return client.put('/system/menu/i18n/items', { locale, menuId, items }).then((res) => res.data);
  },

  /** 同步菜单国际化数据到 locale JSON 文件 */
  syncMenuI18n(locale: string): Promise<{ synced: number; errors: string[] }> {
    return client.post('/system/menu/i18n/sync', { locale }).then((res) => res.data);
  },

  /** 获取支持的语言列表 */
  getMenuI18nLocales(): Promise<string[]> {
    return client.get('/system/menu/i18n/locales').then((res) => res.data?.data ?? res.data);
  },
};
