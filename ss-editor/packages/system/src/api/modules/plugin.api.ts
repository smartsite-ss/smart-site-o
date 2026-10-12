// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';
import type {
  PluginInfo,
  PluginStatusInfo,
  PluginConnectionSchema,
  PluginUpdateCheck,
  PluginHealthCheck,
  PluginActiveDevices,
  DeviceStats,
  PluginMonitorData,
  PluginRuntimeConfig,
} from '../types/plugin';

export const pluginApi = {
  list(params?: { status?: string; category?: string }): Promise<ApiResponse<PluginInfo[]>> {
    return client.get('/plugins', { params }).then((res) => res.data);
  },

  discover(): Promise<ApiResponse<void>> {
    return client.post('/plugins/discover').then((res) => res.data);
  },

  getByProtocol(protocol: string): Promise<ApiResponse<PluginInfo>> {
    return client.get(`/plugins/${protocol}`).then((res) => res.data);
  },

  activate(protocol: string): Promise<ApiResponse<PluginInfo>> {
    return client.post(`/plugins/${protocol}/activate`).then((res) => res.data);
  },

  deactivate(protocol: string): Promise<ApiResponse<PluginInfo>> {
    return client.post(`/plugins/${protocol}/deactivate`).then((res) => res.data);
  },

  getStatus(protocol: string): Promise<ApiResponse<PluginStatusInfo>> {
    return client.get(`/plugins/${protocol}/status`).then((res) => res.data);
  },

  getSchema(protocol: string): Promise<ApiResponse<PluginConnectionSchema>> {
    return client.get(`/plugins/${protocol}/schema`).then((res) => res.data);
  },

  checkUpdate(protocol: string): Promise<ApiResponse<PluginUpdateCheck>> {
    return client.get(`/plugins/${protocol}/check-update`).then((res) => res.data);
  },

  update(protocol: string): Promise<ApiResponse<PluginInfo>> {
    return client.post(`/plugins/${protocol}/update`).then((res) => res.data);
  },

  rollback(protocol: string): Promise<ApiResponse<PluginInfo>> {
    return client.post(`/plugins/${protocol}/rollback`).then((res) => res.data);
  },

  health(): Promise<ApiResponse<PluginHealthCheck>> {
    return client.get('/plugins/health').then((res) => res.data);
  },

  /** 校验通道配置 */
  validateChannelConfig(protocol: string, config: Record<string, any>): Promise<ApiResponse<{ valid: boolean; errors: Array<{ field: string; message: string }> }>> {
    return client.post(`/plugins/${protocol}/validate`, config).then((res) => res.data);
  },

  /** 获取插件正在采集的活跃设备列表 */
  getActiveDevices(protocol: string): Promise<ApiResponse<PluginActiveDevices>> {
    return client.get(`/plugins/${protocol}/active-devices`).then((res) => res.data);
  },

  /** 获取所有插件的设备统计（在线/离线数量） */
  getDeviceStats(): Promise<ApiResponse<Record<string, DeviceStats>>> {
    return client.get('/plugins/device-stats').then((res) => res.data);
  },

  /** 获取插件运行监控数据（内存/CPU + 采集日志） */
  getMonitor(protocol: string): Promise<ApiResponse<PluginMonitorData>> {
    return client.get(`/plugins/${protocol}/monitor`).then((res) => res.data);
  },

  /** 清空插件采集日志 */
  clearMonitorLogs(protocol: string): Promise<ApiResponse<{ cleared: boolean }>> {
    return client.delete(`/plugins/${protocol}/monitor/logs`).then((res) => res.data);
  },

  // -----------------------------------------------------------------------
  //  运行时配置持久化
  // -----------------------------------------------------------------------

  /** 获取插件运行时配置 */
  getPluginConfig(protocol: string): Promise<ApiResponse<PluginRuntimeConfig>> {
    return client.get(`/plugins/${protocol}/config`).then((res) => res.data);
  },

  /** 更新插件运行时配置（如隔离模式） */
  updatePluginConfig(
    protocol: string,
    config: { isolationMode?: string },
  ): Promise<ApiResponse<PluginRuntimeConfig>> {
    return client.put(`/plugins/${protocol}/config`, config).then((res) => res.data);
  },

  /** 重启插件（用于隔离模式等配置变更后重载 executor） */
  restartPlugin(protocol: string): Promise<ApiResponse<{ protocol: string; isolationMode: string; elapsed: number }>> {
    return client.post(`/plugins/${protocol}/restart`).then((res) => res.data);
  },
};