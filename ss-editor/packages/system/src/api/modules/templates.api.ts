// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, DataTag } from '../types/api';

export interface TagGroup {
  id: string;
  projectId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  parent?: TagGroup;
  children?: TagGroup[];
  level?: number;
  createdAt: string;
}

export interface CreateTagDto {
  name: string;
  address: string;
  dataType: string;
  deviceId: string;
  projectId: string;
  description?: string;
  unit?: string;
  displayFormat?: string;
  decimalPlaces?: number;
  minValue?: number;
  maxValue?: number;
  engMinValue?: number;
  engMaxValue?: number;
  scale?: number;
  offset?: number;
  scanRate?: number;
  timeout?: number;
  retryCount?: number;
  enabled?: boolean;
  priority?: string;
  deadbandMode?: string;
  deadbandValue?: number;
  deadbandPercent?: number;
  deadbandTime?: number;
  conversionType?: string;
  conversionConfig?: ConversionConfigDto;
  alarmHighHigh?: number;
  alarmHigh?: number;
  alarmLow?: number;
  alarmLowLow?: number;
  alarmDeviation?: number;
  alarmEnabled?: boolean;
  qualityCheckEnabled?: boolean;
  maxAge?: number;
  archiveEnabled?: boolean;
  archiveInterval?: number;
  archiveDeadband?: number;
  retentionDays?: number;
  groupId?: string;
  category?: string;
  tags?: string[];
  simulationEnabled?: boolean;
  simulationConfig?: Record<string, any>;
}

export interface ConversionConfigDto {
  type?: string;
  scale?: number;
  offset?: number;
  coefficients?: number[];
  points?: Array<{ raw: number; eng: number }>;
  script?: string;
}

export interface UpdateTagDto {
  name?: string;
  address?: string;
  dataType?: string;
  description?: string;
  unit?: string;
  displayFormat?: string;
  decimalPlaces?: number;
  minValue?: number;
  maxValue?: number;
  engMinValue?: number;
  engMaxValue?: number;
  scale?: number;
  offset?: number;
  scanRate?: number;
  timeout?: number;
  retryCount?: number;
  enabled?: boolean;
  priority?: string;
  deadbandMode?: string;
  deadbandValue?: number;
  deadbandPercent?: number;
  deadbandTime?: number;
  conversionType?: string;
  conversionConfig?: ConversionConfigDto;
  alarmHighHigh?: number;
  alarmHigh?: number;
  alarmLow?: number;
  alarmLowLow?: number;
  alarmDeviation?: number;
  alarmEnabled?: boolean;
  qualityCheckEnabled?: boolean;
  maxAge?: number;
  archiveEnabled?: boolean;
  archiveInterval?: number;
  archiveDeadband?: number;
  retentionDays?: number;
  groupId?: string;
  category?: string;
  tags?: string[];
  simulationEnabled?: boolean;
  simulationConfig?: Record<string, any>;
}

export interface TagQueryParams {
  q?: string;
  deviceId?: string;
  groupId?: string;
  dataType?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TagListResult {
  data: DataTag[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchCreateResult {
  success: DataTag[];
  errors: Array<{ index: number; message: string }>;
}

export interface TagImportResult {
  valid: boolean;
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; column: string; message: string }>;
  warnings: Array<{ row: number; column: string; message: string }>;
}

export interface CreateGroupDto {
  name: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateGroupDto {
  name?: string;
  parentId?: string;
  sortOrder?: number;
}

const buildUrl = (projectId: string, path: string) =>
  `/projects/${projectId}/datatags${path}`;

export const templatesApi = {
  list(projectId: string, params?: TagQueryParams): Promise<ApiResponse<TagListResult>> {
    return client.get(buildUrl(projectId, ''), { params }).then((res) => res.data);
  },

  getById(projectId: string, tagId: string): Promise<ApiResponse<DataTag>> {
    return client.get(buildUrl(projectId, `/${tagId}`)).then((res) => res.data);
  },

  create(projectId: string, dto: CreateTagDto): Promise<ApiResponse<DataTag>> {
    return client.post(buildUrl(projectId, ''), dto).then((res) => res.data);
  },

  update(projectId: string, tagId: string, dto: UpdateTagDto): Promise<ApiResponse<DataTag>> {
    return client.patch(buildUrl(projectId, `/${tagId}`), dto).then((res) => res.data);
  },

  delete(projectId: string, tagId: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/${tagId}`));
  },

  batchCreate(projectId: string, tags: CreateTagDto[]): Promise<ApiResponse<BatchCreateResult>> {
    return client.post(buildUrl(projectId, '/batch'), { tags }).then((res) => res.data);
  },

  batchDelete(projectId: string, ids: string[]): Promise<ApiResponse<{ deleted: number }>> {
    return client.delete(buildUrl(projectId, '/batch'), { data: { ids } }).then((res) => res.data);
  },

  importTags(projectId: string, tags: any[], deviceId?: string, options?: { overwrite?: boolean; skipErrors?: boolean }): Promise<ApiResponse<TagImportResult>> {
    return client.post(buildUrl(projectId, '/import'), { tags, deviceId, options }).then((res) => res.data);
  },

  exportTags(projectId: string, deviceId: string): Promise<ApiResponse<object>> {
    return client.get(buildUrl(projectId, `/export/${deviceId}`)).then((res) => res.data);
  },

  listGroups(projectId: string): Promise<ApiResponse<TagGroup[]>> {
    return client.get(buildUrl(projectId, '/groups')).then((res) => res.data);
  },

  getGroupTree(projectId: string): Promise<ApiResponse<TagGroup[]>> {
    return client.get(buildUrl(projectId, '/groups/tree')).then((res) => res.data);
  },

  getGroupById(projectId: string, groupId: string): Promise<ApiResponse<TagGroup>> {
    return client.get(buildUrl(projectId, `/groups/${groupId}`)).then((res) => res.data);
  },

  createGroup(projectId: string, dto: CreateGroupDto): Promise<ApiResponse<TagGroup>> {
    return client.post(buildUrl(projectId, '/groups'), dto).then((res) => res.data);
  },

  updateGroup(projectId: string, groupId: string, dto: UpdateGroupDto): Promise<ApiResponse<TagGroup>> {
    return client.patch(buildUrl(projectId, `/groups/${groupId}`), dto).then((res) => res.data);
  },

  deleteGroup(projectId: string, groupId: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/groups/${groupId}`));
  },
};