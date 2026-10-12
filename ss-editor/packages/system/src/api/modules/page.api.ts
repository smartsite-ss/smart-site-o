// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

export interface PageFileInfo {
  name: string;
  fileName: string;
  filePath: string;
  updatedAt: string;
}

export interface PageListResult {
  success: boolean;
  projectName: string;
  pages: PageFileInfo[];
}

export interface GroupInfo {
  name: string;
  path: string;
  pageCount: number;
  createdAt: string;
}

export interface GroupListResult {
  success: boolean;
  projectName: string;
  groups: GroupInfo[];
}

// ── 请求级 Promise 缓存：相同参数的请求在 5 秒内共享同一个 Promise ──
const CACHE_TTL_MS = 5000;

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
}

const listGroupsCache = new Map<string, CacheEntry<ApiResponse<GroupListResult>>>();
const listPagesCache = new Map<string, CacheEntry<ApiResponse<PageListResult>>>();
const readPageCache = new Map<string, CacheEntry<ApiResponse<{ success: boolean; data: Record<string, any> }>>>();

function getCacheKey(projectId: string, extra?: string): string {
  return extra ? `${projectId}::${extra}` : projectId;
}

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): Promise<T> | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.promise;
  }
  cache.delete(key);
  return undefined;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, promise: Promise<T>): void {
  cache.set(key, { promise, timestamp: Date.now() });
  // 清理过期条目
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (now - v.timestamp > CACHE_TTL_MS) cache.delete(k);
  }
}

export const pageApi = {
  listGroups(projectId: string): Promise<ApiResponse<GroupListResult>> {
    const key = getCacheKey(projectId);
    const cached = getCached(listGroupsCache, key);
    if (cached) return cached;

    const promise = client.get(`/projects/${projectId}/pages/groups`).then((res) => res.data);
    setCache(listGroupsCache, key, promise);
    return promise;
  },

  createGroup(projectId: string, groupName: string): Promise<ApiResponse<any>> {
    // 写操作：清除相关缓存
    listGroupsCache.delete(getCacheKey(projectId));
    return client.post(`/projects/${projectId}/pages/groups`, { groupName }).then((res) => res.data);
  },

  deleteGroup(projectId: string, groupName: string): Promise<void> {
    listGroupsCache.delete(getCacheKey(projectId));
    listPagesCache.delete(getCacheKey(projectId));
    listPagesCache.delete(getCacheKey(projectId, groupName));
    return client.delete(`/projects/${projectId}/pages/groups/${encodeURIComponent(groupName)}`);
  },

  listPages(projectId: string, groupName?: string): Promise<ApiResponse<PageListResult>> {
    const key = getCacheKey(projectId, groupName ?? '__root__');
    const cached = getCached(listPagesCache, key);
    if (cached) return cached;

    const params = groupName ? { group: groupName } : {};
    const promise = client.get(`/projects/${projectId}/pages`, { params }).then((res) => res.data);
    setCache(listPagesCache, key, promise);
    return promise;
  },

  readPage(projectId: string, pageName: string, groupName?: string): Promise<ApiResponse<{ success: boolean; data: Record<string, any> }>> {
    const key = getCacheKey(projectId, `${pageName}::${groupName ?? ''}`);
    const cached = getCached(readPageCache, key);
    if (cached) return cached;

    const params = groupName ? { group: groupName } : {};
    const promise = client.get(`/projects/${projectId}/pages/${encodeURIComponent(pageName)}`, { params }).then((res) => res.data);
    setCache(readPageCache, key, promise);
    return promise;
  },

  saveAllPages(projectId: string, pages: Array<Record<string, any>>, options?: { groupName?: string; previewPageName?: string; previewPageId?: string; preview?: File | Blob; previewSmall?: File | Blob }): Promise<ApiResponse<any>> {
    const hasPreview = !!(options?.preview || options?.previewSmall);
    const params = options?.groupName ? { group: options.groupName } : {};

    // 写操作：清除列表缓存
    listPagesCache.delete(getCacheKey(projectId, options?.groupName ?? '__root__'));
    listPagesCache.delete(getCacheKey(projectId));

    if (!hasPreview) {
      // 纯 JSON 路径：保持向后兼容
      return client.post(
        `/projects/${projectId}/pages/save`,
        { pages },
        { params }
      ).then((res) => res.data)
        .catch((err) => {
          if (import.meta.env.DEV) console.error('[pageApi.saveAllPages] JSON path failed:', err?.response?.status, err?.response?.data);
          throw err;
        });
    }
    // multipart 路径：pages 转 JSON 字符串 + 文件 + 关联的 pageName
    // 注意：必须由浏览器/axios 自动生成 Content-Type: multipart/form-data; boundary=xxx
    // 手动设置 Content-Type 而不带 boundary 会让 multer 无法解析
    const pagesJson = JSON.stringify(pages);
    const formData = new FormData();
    formData.append('pagesJson', pagesJson);
    if (options.previewPageName) {
      formData.append('previewPageName', options.previewPageName);
    }
    if (options.previewPageId) {
      formData.append('previewPageId', options.previewPageId);
    }
    if (options.preview) {
      formData.append('preview', options.preview);
    }
    if (options.previewSmall) {
      formData.append('previewSmall', options.previewSmall);
    }
    return client.post(
      `/projects/${projectId}/pages/save`,
      formData,
      { params }
    ).then((res) => res.data)
      .catch((err) => {
        if (import.meta.env.DEV) console.error('[pageApi.saveAllPages] multipart path failed:', err?.response?.status, err?.response?.data);
        throw err;
      });
  },

  savePage(projectId: string, pageName: string, page: Record<string, any>, groupName?: string, preview?: File | Blob, previewSmall?: File | Blob): Promise<ApiResponse<any>> {
    // 写操作：清除相关缓存
    listPagesCache.delete(getCacheKey(projectId, groupName ?? '__root__'));
    listPagesCache.delete(getCacheKey(projectId));
    readPageCache.delete(getCacheKey(projectId, `${pageName}::${groupName ?? ''}`));

    const formData = new FormData();
    formData.append('page', JSON.stringify(page));
    if (preview) {
      formData.append('preview', preview);
    }
    if (previewSmall) {
      formData.append('previewSmall', previewSmall);
    }
    const params = groupName ? { group: groupName } : {};
    return client.post(
      `/projects/${projectId}/pages/save/${encodeURIComponent(pageName)}`,
      formData,
      { params }
    ).then((res) => res.data);
  },

  deletePage(projectId: string, pageName: string, groupName?: string): Promise<void> {
    // 写操作：清除相关缓存
    listPagesCache.delete(getCacheKey(projectId, groupName ?? '__root__'));
    listPagesCache.delete(getCacheKey(projectId));
    readPageCache.delete(getCacheKey(projectId, `${pageName}::${groupName ?? ''}`));

    const params = groupName ? { group: groupName } : {};
    return client.delete(`/projects/${projectId}/pages/${encodeURIComponent(pageName)}`, { params });
  },

  renamePage(projectId: string, oldPageName: string, newPageName: string, groupName?: string): Promise<ApiResponse<any>> {
    // 写操作：清除相关缓存
    listPagesCache.delete(getCacheKey(projectId, groupName ?? '__root__'));
    listPagesCache.delete(getCacheKey(projectId));
    readPageCache.delete(getCacheKey(projectId, `${oldPageName}::${groupName ?? ''}`));
    readPageCache.delete(getCacheKey(projectId, `${newPageName}::${groupName ?? ''}`));

    const params = groupName ? { group: groupName } : {};
    return client.patch(
      `/projects/${projectId}/pages/${encodeURIComponent(oldPageName)}/rename`,
      { newName: newPageName },
      { params }
    ).then((res) => res.data);
  },

  movePage(projectId: string, pageName: string, fromGroupName?: string, toGroupName?: string): Promise<ApiResponse<any>> {
    // 写操作：清除相关缓存
    listPagesCache.delete(getCacheKey(projectId, fromGroupName ?? '__root__'));
    listPagesCache.delete(getCacheKey(projectId, toGroupName ?? '__root__'));
    listPagesCache.delete(getCacheKey(projectId));
    readPageCache.delete(getCacheKey(projectId, `${pageName}::${fromGroupName ?? ''}`));
    readPageCache.delete(getCacheKey(projectId, `${pageName}::${toGroupName ?? ''}`));

    const params: Record<string, string> = {};
    if (fromGroupName) params.fromGroup = fromGroupName;
    return client.patch(
      `/projects/${projectId}/pages/${encodeURIComponent(pageName)}/move`,
      { toGroup: toGroupName },
      { params }
    ).then((res) => res.data);
  },

  getProjectsDir(projectId: string): Promise<ApiResponse<{ projectsDir: string; exists: boolean }>> {
    return client.get(`/projects/${projectId}/pages/projects-dir`).then((res) => res.data);
  },

  /** 获取项目页面大纲（轻量级，不含 page.json 数据），用于编辑器按需加载 */
  getProjectOutline(projectId: string): Promise<ApiResponse<{
    success: boolean;
    projectName: string;
    rootPages: Array<{
      id?: string;
      name: string;
      updatedAt: string;
      previewSmallUrl?: string;
      backgroundColor?: string;
      backgroundImage?: string;
      width?: number;
      height?: number;
    }>;
    groups: Array<{
      name: string;
      pages: Array<{
        id?: string;
        name: string;
        updatedAt: string;
        previewSmallUrl?: string;
        backgroundColor?: string;
        backgroundImage?: string;
        width?: number;
        height?: number;
      }>;
    }>;
    totalPageCount: number;
  }>> {
    return client.get(`/projects/${projectId}/pages/outline`).then((res) => res.data);
  },

  /** P3: 获取项目所有页面完整数据（含分组，已去重），一次调用替代 (listGroups + N*listPages + M*readPage） */
  readAllPages(projectId: string): Promise<ApiResponse<{ success: boolean; projectName: string; pages: Array<{ name: string; data: Record<string, any> | null; groupName?: string }> }>> {
    return client.get(`/projects/${projectId}/pages/all/data`).then((res) => res.data);
  },

  /** P2: 批量读取指定页面数据（同一分组下），替代 N 次串行 readPage */
  batchReadPages(projectId: string, names: string[], groupName?: string): Promise<ApiResponse<{ success: boolean; projectName: string; pages: Array<{ name: string; data: Record<string, any> | null; groupName?: string }> }>> {
    return client.post(`/projects/${projectId}/pages/batch-read`, { names, groupName }).then((res) => res.data);
  },

  uploadBackground(projectId: string, pageName: string, file: File, groupName?: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    const params = groupName ? { group: groupName } : {};
    return client.post(
      `/projects/${projectId}/pages/${encodeURIComponent(pageName)}/background`,
      formData,
      { params }
    ).then((res) => res.data);
  },

  uploadPreview(projectId: string, pageName: string, file: File | Blob, smallFile?: File | Blob, groupName?: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    if (smallFile) {
      formData.append('smallFile', smallFile);
    }
    const params = groupName ? { group: groupName } : {};
    return client.post(
      `/projects/${projectId}/pages/${encodeURIComponent(pageName)}/preview`,
      formData,
      { params }
    ).then((res) => res.data);
  },
};