// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import { resolveBackendResourceUrl } from '../../utils/resource-url';
import type { ApiResponse, PaginatedApiResponse, PaginationParams, Project } from '../types/api';

export interface CreateProjectDto {
  projectName: string;
  /** tenantId 多租户预留字段（当前 = projectId），不传则自动等于 projectId */
  tenantId?: string;
  /** 项目代码（projectId，变量命名格式，不含中文），不传则按名称拼音首字母自动生成 */
  projectId?: string;
  description?: string;
  /** 项目版本号，不传后端默认 1.0.0 */
  version?: string;
  config?: Record<string, any>;
  /** 项目地址 */
  address?: string;
  /** 经度（十进制字符串） */
  longitude?: string;
  /** 纬度（十进制字符串） */
  latitude?: string;
  /** 负责人 */
  owner?: string;
  /** 项目封面图片相对路径 */
  image?: string;
  /**
   * 项目启用状态（true=启用，false=停用）。不传默认 false（停用）。
   * 启用后才开始数据采集；停用会立即停止采集并从设备树/设备监控中隐藏。
   */
  enabled?: boolean;
}

export interface UpdateProjectDto {
  description?: string;
  version?: string;
  config?: Record<string, any>;
  address?: string;
  longitude?: string;
  latitude?: string;
  owner?: string;
  /** 项目封面图片相对路径 */
  image?: string;
  /**
   * 项目启用状态（true=启用，false=停用）。
   * 切换会动态启停采集：启用 → 加载设备并注册任务；停用 → 立即停止采集并清理状态。
   */
  enabled?: boolean;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  project: {
    name: string;
    description?: string;
    config?: Record<string, any>;
    pages: Array<{
      name: string;
      order: number;
      config?: Record<string, any>;
      graphics?: any[];
    }>;
  };
}

/** 聚合设备统计 */
export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  connecting: number;
  degraded: number;
  error: number;
  totalTags: number;
}

/** 聚合报警统计 */
export interface AggregatedAlarmStats {
  total: number;
  active: number;
  acknowledged: number;
  cleared: number;
  shelved: number;
}

/** 系统概览统计 */
export interface SystemOverview {
  projectCount: number;
  totalDbSize: number;
  totalPageCount: number;
  deviceStats: DeviceStats;
  alarmStats: AggregatedAlarmStats;
}

export const projectApi = {
  /** 获取系统概览统计 */
  getOverview(): Promise<SystemOverview> {
    return client.get('/projects/overview').then((res) => {
      const d = res.data;
      return (d && d.data) || d;
    });
  },

  list(
    params: PaginationParams,
    /** 是否包含停用项目（管理页查看全部时传 true，首页统计/设备树等场景默认 false） */
    includeDisabled?: boolean,
  ): Promise<PaginatedApiResponse<Project>> {
    const query = includeDisabled ? { ...params, includeDisabled: 'true' } : params;
    return client.get('/projects', { params: query }).then((res) => res.data);
  },

  getById(projectId: string): Promise<ApiResponse<Project>> {
    return client.get(`/projects/${projectId}`).then((res) => res.data);
  },

  create(dto: CreateProjectDto): Promise<ApiResponse<Project>> {
    return client.post('/projects', dto).then((res) => res.data);
  },

  update(projectId: string, dto: UpdateProjectDto): Promise<ApiResponse<Project>> {
    return client.patch(`/projects/${projectId}`, dto).then((res) => res.data);
  },

  delete(projectId: string): Promise<void> {
    return client.delete(`/projects/${projectId}`);
  },

  exportProjectZip(
    projectId: string,
    options?: { includePages?: boolean; includeProjectDb?: boolean; includeRtdb?: boolean },
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (options) {
      if (options.includePages !== undefined) params.set('includePages', String(options.includePages));
      if (options.includeProjectDb !== undefined) params.set('includeProjectDb', String(options.includeProjectDb));
      if (options.includeRtdb !== undefined) params.set('includeRtdb', String(options.includeRtdb));
    }
    const query = params.toString();
    const url = query ? `/projects/${projectId}/export?${query}` : `/projects/${projectId}/export`;
    return client.post(url, null, {
      responseType: 'blob',
      timeout: 0, // 导出可能耗时较长（VACUUM + 压缩 + 大文件传输），禁用超时
    }).then((res) => res.data);
  },

  importProjectZip(file: File, overwrite: boolean = false): Promise<ApiResponse<Project>> {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/projects/import?overwrite=${overwrite}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0, // 导入可能耗时较长（解压 + 复制大文件 + 数据库初始化），禁用超时
    }).then((res) => res.data);
  },

  checkProjectExists(projectId: string): Promise<boolean> {
    return client.get(`/projects/${projectId}`).then(() => true).catch(() => false);
  },

  savePages(projectId: string, pages: Array<Record<string, any>>): Promise<ApiResponse<any>> {
    return client.post(`/projects/${projectId}/pages/save`, { pages }).then((res) => res.data);
  },

  getProjectsDir(projectId: string): Promise<ApiResponse<{ projectsDir: string; exists: boolean }>> {
    return client.get(`/projects/${projectId}/pages/projects-dir`).then((res) => res.data);
  },

  /** 导出项目所有页面为 ZIP */
  exportPagesZip(projectId: string): Promise<Blob> {
    return client.post(`/projects/${projectId}/pages/export`, null, {
      responseType: 'blob',
      timeout: 0, // 页面导出可能包含大量文件，禁用超时
    }).then((res) => res.data);
  },

  /** 导入页面到项目（ZIP 文件） */
  importPagesZip(projectId: string, file: File, overwrite: boolean = false): Promise<ApiResponse<{ importedCount: number; warnings: string[] }>> {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/projects/${projectId}/pages/import?overwrite=${overwrite}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },

  /** 诊断项目资源完整性 */
  diagnose(projectId: string): Promise<DiagnoseResult> {
    return client.post<ApiResponse<DiagnoseResult>>(`/projects/${projectId}/diagnose`).then((res) => res.data.data);
  },

  /** 获取项目管理信息 */
  getManageInfo(projectId: string): Promise<ManageInfo> {
    return client.get<ApiResponse<ManageInfo>>(`/projects/${projectId}/manage-info`).then((res) => res.data.data);
  },

  /** 初始化项目缺失资源 */
  initResources(projectId: string, resources?: string[]): Promise<{
    initialized: string[];
    skipped: string[];
    warnings: string[];
    healthAfter?: string;
  }> {
    const body: Record<string, any> = {};
    if (resources && resources.length > 0) {
      body.resources = resources;
    }
    return client.post<ApiResponse<{
      initialized: string[];
      skipped: string[];
      warnings: string[];
      healthAfter?: string;
    }>>(`/projects/${projectId}/init-resources`, body).then((res) => res.data.data);
  },

  /** 获取默认项目配置 */
  getDefaultProject(): Promise<ApiResponse<{ projectId: string | null }>> {
    return client.get<ApiResponse<{ projectId: string | null }>>('/projects/default-config').then((res) => res.data);
  },

  /** 设置默认项目 */
  setDefaultProject(projectId: string): Promise<ApiResponse<{ success: boolean; projectId: string }>> {
    return client.put<ApiResponse<{ success: boolean; projectId: string }>>('/projects/default-config', { projectId }).then((res) => res.data);
  },

  /** 清除默认项目 */
  clearDefaultProject(): Promise<ApiResponse<{ success: boolean }>> {
    return client.delete<ApiResponse<{ success: boolean }>>('/projects/default-config').then((res) => res.data);
  },

  /** 上传项目封面图片（multipart/form-data） */
  uploadImage(projectId: string, file: File): Promise<ApiResponse<{ success: boolean; image: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/projects/${projectId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },

  /** 获取项目封面图片 URL（可直接用于 <img :src>，后端 @Public 无需鉴权） */
  getImageUrl(projectId: string): string {
    // <img> 不走 fetch/XHR 拦截器，桌面端需改写为后端绝对地址（详见 resource-url.ts）
    return resolveBackendResourceUrl(`/api/v1/projects/${projectId}/image`);
  },
};

import type { DiagnoseResult } from '../../types/api';

/** 项目管理信息 */
export interface ManageInfo {
  projectName: string;
  /** 多租户预留（当前 = projectId） */
  tenantId: string;
  projectId: string;
  version: string;
  description: string;
  projectPath: string;
  databasePath: string;
  rtdbPath: string;
  pageCount: number;
  dbSize: number;
  rtdbSize: number;
  dbMode: string;
  image?: string;
  address?: string;
  longitude?: string;
  latitude?: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}