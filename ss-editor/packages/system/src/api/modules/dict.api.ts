// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

export interface DictItem {
  value: string;
  label: string;
  sortOrder: number;
  description: string;
}

export interface DictTable {
  dictId: string;
  dictName: string;
  category: string;
  description: string;
  version: string;
  sortOrder: number;
  items: DictItem[];
}

export interface DictCategory {
  category: string;
  tables: DictTable[];
}

export const dictApi = {
  /** 获取字典分类树（按分类分组） */
  getCategories(locale?: string): Promise<ApiResponse<DictCategory[]>> {
    return client.get('/dicts', { params: { locale } }).then((r) => r.data);
  },

  /** 获取所有字典表（平铺列表） */
  getAll(locale?: string): Promise<ApiResponse<DictTable[]>> {
    return client.get('/dicts/all', { params: { locale } }).then((r) => r.data);
  },

  /** 根据 dictId 获取字典表详情 */
  getDict(dictId: string, locale?: string): Promise<ApiResponse<DictTable | null>> {
    return client.get(`/dicts/${dictId}`, { params: { locale } }).then((r) => r.data);
  },

  /** 创建分类 */
  createCategory(locale: string, name: string): Promise<ApiResponse<null>> {
    return client.post('/dicts/categories', { locale, name }).then((r) => r.data);
  },

  /** 重命名分类 */
  renameCategory(locale: string, oldName: string, newName: string): Promise<ApiResponse<null>> {
    return client.patch('/dicts/categories', { locale, oldName, newName }).then((r) => r.data);
  },

  /** 删除分类 */
  deleteCategory(locale: string, name: string): Promise<ApiResponse<null>> {
    return client.delete('/dicts/categories', { data: { locale, name } }).then((r) => r.data);
  },

  /** 创建字典表 */
  createTable(locale: string, category: string, table: DictTable): Promise<ApiResponse<null>> {
    return client.post('/dicts/tables', { locale, category, table }).then((r) => r.data);
  },

  /** 更新字典表 */
  updateTable(locale: string, category: string, dictId: string, table: Partial<DictTable>): Promise<ApiResponse<null>> {
    return client.put(`/dicts/tables/${dictId}`, { table }, { params: { locale, category } }).then((r) => r.data);
  },

  /** 删除字典表 */
  deleteTable(locale: string, category: string, dictId: string): Promise<ApiResponse<null>> {
    return client.delete(`/dicts/tables/${dictId}`, { data: { locale, category } }).then((r) => r.data);
  },

  /** 导出字典表（返回完整 JSON） */
  exportTable(dictId: string, locale: string, category: string): Promise<ApiResponse<DictTable>> {
    return client.get(`/dicts/tables/${dictId}/export`, { params: { locale, category } }).then((r) => r.data);
  },

  /** 导入字典表 */
  importTable(locale: string, category: string, dictId: string, table: DictTable): Promise<ApiResponse<null>> {
    return client.post('/dicts/tables/import', { locale, category, dictId, table }).then((r) => r.data);
  },

  /** 热重载所有字典 */
  reload(): Promise<ApiResponse<{ locales: string[]; count: number }>> {
    return client.post('/dicts/reload').then((r) => r.data);
  },
};