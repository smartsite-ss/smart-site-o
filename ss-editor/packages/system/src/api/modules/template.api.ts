// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, PaginationInfo } from '../types/api';

export interface DeviceTemplateVariable {
  /** 不可变唯一标识（UUID v4） */
  guid: string;
  order: number;
  name: string;
  description?: string;
  address: string;
  dataType: string;
  direction?: 'read' | 'write' | 'read-write';
  byteOrder?: 'big-endian' | 'little-endian';
  registerCount?: number;
  scanRate?: number;
  timeout?: number;
  retryCount?: number;
  priority?: string;
  enabled?: boolean;
  scale?: number;
  offset?: number;
  conversionType?: string;
  conversionConfig?: Record<string, any> | null;
  unit?: string;
  displayFormat?: string;
  minValue?: number | null;
  maxValue?: number | null;
  engMinValue?: number | null;
  engMaxValue?: number | null;
  deadbandMode?: string;
  deadbandValue?: number;
  deadbandPercent?: number;
  deadbandTime?: number;
  alarmEnabled?: boolean;
  alarmHighHigh?: number | null;
  alarmHigh?: number | null;
  alarmLow?: number | null;
  alarmLowLow?: number | null;
  alarmDeviation?: number | null;
  qualityCheckEnabled?: boolean;
  maxAge?: number;
  archiveEnabled?: boolean;
  archiveInterval?: number;
  retentionDays?: number;
  category?: string;
  tags?: string[];
}

export interface DeviceTemplate {
  id: string;
  name: string;
  description: string;
  deviceType: string;
  deviceModel?: string;
  industry?: string;
  category?: string;
  protocolType?: string;
  version: string;
  status: 'draft' | 'published' | 'deprecated';
  isDefault: boolean;
  variables: DeviceTemplateVariable[];
  authorId: string;
  tags: string[];
  linkedDevices: number;
  variableCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceTemplateDto {
  name: string;
  description?: string;
  deviceType: string;
  industry?: string;
  category?: string;
  version?: string;
  variables?: DeviceTemplateVariable[];
  tags?: string[];
}

export interface UpdateDeviceTemplateDto {
  name?: string;
  description?: string;
  industry?: string;
  category?: string;
  variables?: DeviceTemplateVariable[];
  status?: 'draft' | 'published' | 'deprecated';
  isDefault?: boolean;
  tags?: string[];
}

export interface ApplyTemplateDto {
  /** 项目ID（必填，用于定位项目数据库） */
  projectId: string;
  deviceId: string;
  replaceExisting?: boolean;
}

export interface SyncTemplateDto {
  /** 项目ID（指定 deviceIds 时必填） */
  projectId?: string;
  deviceIds?: string[];
  forceOverwrite?: boolean;
}

export interface ApplyTemplateResult {
  deviceId: string;
  templateVersion: string;
  created: number;
  skipped: number;
  errors: Array<{ name: string; message: string }>;
}

export interface SyncTemplateResult {
  totalDevices: number;
  synced: number;
  skipped: number;
  errors: Array<{ deviceId: string; message: string }>;
}

export interface DeviceTemplateQuery {
  page?: number;
  pageSize?: number;
  deviceType?: string;
  status?: string;
  keyword?: string;
  industry?: string;
  category?: string;
  protocol?: string;
  locale?: string;  // ✨ 新增：语言代码
}

export interface TemplateIndex {
  schemaVersion: string;
  lastUpdated: string;
  totalTemplates: number;
  industries: Array<{
    id: string;
    name: string;
    description?: string;
    templateCount: number;
    categories: Array<{
      id: string;
      name: string;
      templateCount: number;
      templates: Array<{
        id: string;
        name: string;
        filePath: string;
        deviceType: string;
        version: string;
        status: string;
        variableCount: number;
      }>;
    }>;
  }>;
  protocols: Array<{
    id: string;
    name: string;
    description?: string;
    templateCount: number;
  }>;
}

export interface DeviceTemplateListResult {
  data: DeviceTemplate[];
  pagination: PaginationInfo;
}

export interface LinkedDevice {
  id: string;
  name: string;
  type: string;
  status: string;
}

export const templatesBase = '/templates';

export const templateApi = {
  list(params?: DeviceTemplateQuery): Promise<ApiResponse<DeviceTemplateListResult>> {
    return client.get(templatesBase, { params }).then((res) => res.data);
  },

  /** ✨ 获取模板详情（支持 locale 参数） */
  getById(templateId: string, locale?: string): Promise<ApiResponse<DeviceTemplate>> {
    return client.get(`${templatesBase}/${templateId}`, {
      params: locale ? { locale } : undefined,
    }).then((res) => res.data);
  },

  getLinkedDevices(templateId: string): Promise<ApiResponse<LinkedDevice[]>> {
    return client.get(`${templatesBase}/${templateId}/devices`).then((res) => res.data);
  },

  create(dto: CreateDeviceTemplateDto): Promise<ApiResponse<DeviceTemplate>> {
    return client.post(templatesBase, dto).then((res) => res.data);
  },

  update(templateId: string, dto: UpdateDeviceTemplateDto, locale?: string): Promise<ApiResponse<DeviceTemplate>> {
    return client.patch(`${templatesBase}/${templateId}`, dto, {
      params: locale ? { locale } : undefined,
    }).then((res) => res.data);
  },

  delete(templateId: string): Promise<void> {
    return client.delete(`${templatesBase}/${templateId}`);
  },

  publish(templateId: string): Promise<ApiResponse<DeviceTemplate>> {
    return client.patch(`${templatesBase}/${templateId}/publish`).then((res) => res.data);
  },

  deprecate(templateId: string): Promise<ApiResponse<DeviceTemplate>> {
    return client.patch(`${templatesBase}/${templateId}/deprecate`).then((res) => res.data);
  },

  clone(templateId: string): Promise<ApiResponse<DeviceTemplate>> {
    return client.post(`${templatesBase}/${templateId}/clone`).then((res) => res.data);
  },

  apply(templateId: string, dto: ApplyTemplateDto): Promise<ApiResponse<ApplyTemplateResult>> {
    return client.post(`${templatesBase}/${templateId}/apply`, dto).then((res) => res.data);
  },

  sync(templateId: string, dto: SyncTemplateDto): Promise<ApiResponse<SyncTemplateResult>> {
    return client.post(`${templatesBase}/${templateId}/sync`, dto).then((res) => res.data);
  },

  getAllTags(): Promise<ApiResponse<string[]>> {
    return client.get(`${templatesBase}/tags/all`).then((res) => res.data);
  },

  /** ✨ 获取索引（支持 locale 参数） */
  getIndex(locale?: string): Promise<ApiResponse<TemplateIndex>> {
    return client.get(`${templatesBase}/index`, {
      params: locale ? { locale } : undefined,
    }).then((res) => res.data);
  },

  /** ✨ 获取已加载模板（支持 locale 参数） */
  getLoaded(locale?: string): Promise<ApiResponse<any[]>> {
    return client.get(`${templatesBase}/loaded`, {
      params: locale ? { locale } : undefined,
    }).then((res) => res.data);
  },

  /** ✨ 导入模板（支持 locale 参数） */
  importTemplate(data: Record<string, any>, locale?: string): Promise<ApiResponse<DeviceTemplate>> {
    return client.post(`${templatesBase}/import`, data, {
      params: locale ? { locale } : undefined,
    }).then((res) => res.data);
  },

  /** ✨ 重新加载模板缓存（返回各语言加载信息） */
  reload(): Promise<ApiResponse<{ locales: string[]; loaded: number }>> {
    return client.post(`${templatesBase}/reload`).then((res) => res.data);
  },

  // ===== 索引文件管理（目录结构操作）=====
  getIndexStructure(): Promise<ApiResponse<any[]>> {
    return client.get(`${templatesBase}/index/structure`).then((res) => res.data);
  },

  rebuildIndex(): Promise<ApiResponse<any>> {
    return client.post(`${templatesBase}/index/rebuild`).then((res) => res.data);
  },

  createCategory(dto: { industryName: string; categoryName: string }): Promise<ApiResponse<any>> {
    return client.post(`${templatesBase}/index/directory/category`, dto).then((res) => res.data);
  },

  renameCategory(dto: { industryName: string; oldCategoryName: string; newCategoryName: string }): Promise<ApiResponse<any>> {
    return client.patch(`${templatesBase}/index/directory/category`, dto).then((res) => res.data);
  },

  deleteCategory(industryName: string, categoryName: string): Promise<ApiResponse<any>> {
    return client.delete(`${templatesBase}/index/directory/category`, { params: { industryName, categoryName } }).then((res) => res.data);
  },
};