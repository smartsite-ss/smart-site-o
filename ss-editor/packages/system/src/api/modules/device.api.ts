// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type {
  ApiResponse,
  PaginatedApiResponse,
  PaginationParams,
  Device,
  DataTag,
  DeviceGroup,
  DeviceTree,
  DeviceDiagnosticResult,
  PingResult,
} from '../types/api';

export interface CreateDeviceDto {
  deviceCode: string;
  deviceName: string;
  nameAlias?: string;
  description?: string;
  type?: string;                           // 设备类型（从模板推导，不再手动选择）
  templateId: string;                     // 设备模板ID（必填）
  templateVersion?: string;               // 模板版本号，默认最新
  driver: string;                         // 采集驱动插件（必填，ss-collector 插件名）
  connection: Record<string, any>;        // 通道差异化配置（必填）
  scanRate?: number;
  offlinePeriod?: number;
  heartbeatInterval?: number;
  groupId?: string;
}

export interface UpdateDeviceDto {
  deviceCode?: string;
  deviceName?: string;
  nameAlias?: string;
  description?: string;
  type?: string;
  templateId?: string;
  driver?: string;
  config?: Record<string, any>;
  connection?: Record<string, any>;
  scanRate?: number;
  offlinePeriod?: number;
  groupId?: string;
}

export interface CreateDataTagDto {
  name: string;
  address: string;
  dataType: string;
  deviceId?: string;
  projectId?: string;
  scale?: number;
  offset?: number;
  scanRate?: number;
  config?: Record<string, unknown>;
}

export interface UpdateDataTagDto {
  name?: string;
  address?: string;
  dataType?: string;
  scale?: number;
  offset?: number;
  scanRate?: number;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface CreateDeviceGroupDto {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateDeviceGroupDto {
  name?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  connecting: number;
  degraded: number;
  error: number;
  totalTags: number;
}

const buildUrl = (projectId: string, path: string) =>
  `/projects/${projectId}/devices${path}`;

export const deviceApi = {
  /** 获取设备统计信息（总数、各状态数量、标签总数） */
  getDeviceStats(projectId: string): Promise<ApiResponse<DeviceStats>> {
    return client.get(buildUrl(projectId, '/stats')).then((res) => res.data);
  },

  list(projectId: string, params?: PaginationParams): Promise<PaginatedApiResponse<Device>> {
    const queryParams = params ? {
      page: params.page,
      pageSize: params.pageSize,
      search: params.keyword,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    } : undefined;
    return client.get(buildUrl(projectId, ''), { params: queryParams }).then((res) => res.data);
  },

  getById(projectId: string, deviceId: string): Promise<ApiResponse<Device>> {
    return client.get(buildUrl(projectId, `/${deviceId}`)).then((res) => res.data);
  },

  create(projectId: string, dto: CreateDeviceDto): Promise<ApiResponse<Device>> {
    return client.post(buildUrl(projectId, ''), dto).then((res) => res.data);
  },

  update(projectId: string, deviceId: string, dto: UpdateDeviceDto): Promise<ApiResponse<Device>> {
    return client.patch(buildUrl(projectId, `/${deviceId}`), dto).then((res) => res.data);
  },

  delete(projectId: string, deviceId: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/${deviceId}`));
  },

  addTag(projectId: string, deviceId: string, dto: CreateDataTagDto): Promise<ApiResponse<DataTag>> {
    return client.post(buildUrl(projectId, `/${deviceId}/tags`), dto).then((res) => res.data);
  },

  updateTag(projectId: string, deviceId: string, tagId: string, dto: UpdateDataTagDto): Promise<ApiResponse<DataTag>> {
    return client.patch(buildUrl(projectId, `/${deviceId}/tags/${tagId}`), dto).then((res) => res.data);
  },

  deleteTag(projectId: string, deviceId: string, tagId: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/${deviceId}/tags/${tagId}`));
  },

  /**
   * 按设备查询标签列表（管理端与移动端共用的唯一权威入口，详见架构设计 07-接口设计规范 §3.3）。
   * 路由：GET /projects/:projectId/devices/:deviceId/tags
   * 替代旧实现中误读 deviceApi.getById().tags（后端 findOne 未关联 tags，取到 undefined）。
   */
  listTagsByDevice(
    projectId: string,
    deviceId: string,
    params?: { page?: number; pageSize?: number; keyword?: string; dataType?: string; enabled?: boolean },
  ): Promise<PaginatedApiResponse<DataTag>> {
    return client.get(buildUrl(projectId, `/${deviceId}/tags`), { params }).then((res) => res.data);
  },

  listGroups(projectId: string): Promise<ApiResponse<DeviceGroup[]>> {
    return client.get(buildUrl(projectId, '/groups')).then((res) => res.data);
  },

  getGroupTree(projectId: string): Promise<ApiResponse<DeviceTree[]>> {
    return client.get(buildUrl(projectId, '/groups/tree')).then((res) => res.data);
  },

  getGroupById(projectId: string, groupId: string): Promise<ApiResponse<DeviceGroup>> {
    return client.get(buildUrl(projectId, `/groups/${groupId}`)).then((res) => res.data);
  },

  createGroup(projectId: string, dto: CreateDeviceGroupDto): Promise<ApiResponse<DeviceGroup>> {
    return client.post(buildUrl(projectId, '/groups'), dto).then((res) => res.data);
  },

  updateGroup(projectId: string, groupId: string, dto: UpdateDeviceGroupDto): Promise<ApiResponse<DeviceGroup>> {
    return client.patch(buildUrl(projectId, `/groups/${groupId}`), dto).then((res) => res.data);
  },

  deleteGroup(projectId: string, groupId: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/groups/${groupId}`));
  },

  getGroupPath(projectId: string, groupId: string): Promise<ApiResponse<DeviceGroup[]>> {
    return client.get(buildUrl(projectId, `/groups/${groupId}/path`)).then((res) => res.data);
  },

  moveDevice(projectId: string, deviceId: string, targetGroupId: string | null): Promise<ApiResponse<Device>> {
    return client.post(buildUrl(projectId, `/${deviceId}/move`), { targetGroupId }).then((res) => res.data);
  },

  diagnostic(projectId: string, deviceId: string): Promise<ApiResponse<DeviceDiagnosticResult>> {
    return client.post(buildUrl(projectId, `/${deviceId}/diagnostic`)).then((res) => res.data);
  },

  ping(projectId: string, deviceId: string, host: string, port?: number): Promise<ApiResponse<PingResult>> {
    return client.post(buildUrl(projectId, `/${deviceId}/ping`), null, { params: { host, port } }).then((res) => res.data);
  },

  // ===== 扩展方法：数据查询与模板操作 =====

  getLatestValues(projectId: string, deviceId: string): Promise<ApiResponse<Record<string, any>>> {
    return client.get(buildUrl(projectId, `/${deviceId}/data/latest`)).then((res) => res.data);
  },

  getHistory(projectId: string, deviceId: string, params: { tagId: string; start: string; end: string }): Promise<ApiResponse<any>> {
    return client.get(buildUrl(projectId, `/${deviceId}/data/history`), { params }).then((res) => res.data);
  },

  writeTagValue(projectId: string, deviceId: string, body: { tagId: string; value: any }): Promise<ApiResponse<any>> {
    return client.post(buildUrl(projectId, `/${deviceId}/data/write`), body).then((res) => res.data);
  },

  /** 反控写入设备标签值（通过协议适配器写入真实设备） */
  controlWriteTag(projectId: string, deviceId: string, tagId: string, body: { value: any; reason?: string }): Promise<ApiResponse<any>> {
    return client.post(buildUrl(projectId, `/${deviceId}/tags/${tagId}/write`), body).then((res) => res.data);
  },

  /** 查询反控操作日志（分页 + 筛选，单设备） */
  queryControlLogs(projectId: string, deviceId: string, params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
  }): Promise<PaginatedApiResponse<any>> {
    return client.get(buildUrl(projectId, `/${deviceId}/control-logs`), { params }).then((res) => res.data);
  },

  /** 查询项目级反控操作日志（分页 + 筛选，跨设备） */
  queryProjectControlLogs(projectId: string, params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
    deviceName?: string;
  }): Promise<PaginatedApiResponse<any>> {
    return client.get(buildUrl(projectId, `/control-logs`), { params }).then((res) => res.data);
  },

  applyTemplate(projectId: string, deviceId: string, templateId: string): Promise<ApiResponse<any>> {
    return client.post(buildUrl(projectId, `/${deviceId}/templates/${templateId}/apply`)).then((res) => res.data);
  },

  syncTemplate(projectId: string, deviceId: string, templateId: string): Promise<ApiResponse<any>> {
    return client.post(buildUrl(projectId, `/${deviceId}/templates/${templateId}/sync`)).then((res) => res.data);
  },

  exportSnapshot(projectId: string): Promise<ApiResponse<any>> {
    return client.get(buildUrl(projectId, '/data/snapshot')).then((res) => res.data);
  },

  /** 直接 Ping 一个主机地址（不依赖设备对象） */
  pingDevice(host: string, port?: number): Promise<ApiResponse<PingResult>> {
    return client.post('/devices/ping', { host, port }).then((res) => res.data);
  },
};