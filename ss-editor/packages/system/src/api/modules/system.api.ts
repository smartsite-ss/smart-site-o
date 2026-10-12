// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type {
  ApiResponse,
  SystemConfig,
  SystemHealth,
  SystemInfo,
  ErrorLog,
  LogEntry,
  ConfigMetadata,
  OperationLog,
  ConfigItemView,
  ConfigUpdateResult,
  RestartState,
  SecurityAuditLogEntry,
} from '../types/api';

export const systemApi = {
  getHealth(): Promise<ApiResponse<SystemHealth>> {
    return client.get('/system/health').then((res) => res.data);
  },

  getHealthDetails(): Promise<ApiResponse<SystemHealth>> {
    return client.get('/health/detailed').then((res) => res.data);
  },

  getDiskInfo(): Promise<ApiResponse<any>> {
    return client.get('/health/disk-info').then((res) => res.data);
  },

  getInfo(): Promise<ApiResponse<SystemInfo>> {
    return client.get('/system/info').then((res) => res.data);
  },

  getConfigs(): Promise<ApiResponse<SystemConfig[]>> {
    return client.get('/system/configs').then((res) => res.data);
  },

  getConfig(key: string): Promise<ApiResponse<SystemConfig>> {
    return client.get(`/system/configs/${key}`).then((res) => res.data);
  },

  saveConfig(key: string, value: string, description?: string): Promise<ApiResponse<SystemConfig>> {
    return client.post('/system/configs', { key, value, description }).then((res) => res.data);
  },

  deleteConfig(key: string): Promise<void> {
    return client.delete(`/system/configs/${key}`);
  },

  getOperationLogs(params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    status?: string;
    username?: string;
    userId?: string;
    resource?: string;
    startTime?: string;
    endTime?: string;
  }): Promise<ApiResponse<{ items: OperationLog[]; total: number; page: number; pageSize: number }>> {
    return client.get('/system/operation-logs', { params }).then((res) => res.data);
  },

  /** 清理过期操作日志（清理超过指定天数的日志） */
  cleanExpiredOperationLogs(days: number): Promise<ApiResponse<{ deleted: number }>> {
    return client.delete(`/system/operation-logs/expired?days=${days}`).then((res) => res.data);
  },

  /** 清空全部操作日志 */
  cleanAllOperationLogs(): Promise<ApiResponse<{ deleted: number }>> {
    return client.delete('/system/operation-logs/all').then((res) => res.data);
  },

  // ==================== 错误日志 ====================

  /** 查询错误日志（分页） */
  getErrorLogs(params?: {
    level?: string;
    module?: string;
    startTime?: string;
    endTime?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ data: ErrorLog[]; total: number; page: number; pageSize: number }>> {
    return client.get('/system/error-logs', { params }).then((res) => res.data);
  },

  /** 错误日志统计 */
  getErrorStats(): Promise<
    ApiResponse<{
      total: number;
      byLevel: { level: string; count: number }[];
      byModule: { module: string; count: number }[];
      recentErrors: ErrorLog[];
    }>
  > {
    return client.get('/system/error-logs/stats').then((res) => res.data);
  },

  /** 删除单条错误日志 */
  deleteErrorLog(id: string): Promise<ApiResponse<{ ok: boolean }>> {
    return client.delete(`/system/error-logs/${id}`).then((res) => res.data);
  },

  /** 清理过期错误日志 */
  cleanupErrorLogs(days: number): Promise<ApiResponse<{ ok: boolean; deleted: number }>> {
    return client.delete(`/system/error-logs/cleanup/${days}`).then((res) => res.data);
  },

  // ==================== 应用运行日志 ====================

  /** 查询历史日志 */
  getAppLogs(params?: {
    level?: string;
    module?: string;
    keyword?: string;
    lines?: number;
  }): Promise<ApiResponse<LogEntry[]>> {
    return client.get('/system/logs', { params }).then((res) => res.data);
  },

  /** 获取日志文件列表 */
  getLogFiles(): Promise<ApiResponse<string[]>> {
    return client.get('/system/logs/files').then((res) => res.data);
  },

  /** 下载日志文件（返回下载 URL，filename 通过 query 传递以支持子目录路径） */
  getLogDownloadUrl(filename: string): string {
    return `/system/logs/download?filename=${encodeURIComponent(filename)}`;
  },

  // ==================== Phase 5: 系统配置管理 ====================

  /** 获取所有配置项元数据（含分类信息和配置项列表） */
  getConfigMetadata(): Promise<
    ApiResponse<{
      categories: Record<string, ConfigMetadata[]>;
      items: ConfigMetadata[];
    }>
  > {
    return client.get('/system/configs/metadata').then((res) => res.data);
  },

  /** 获取所有配置项（含元数据 + 当前值 + 来源） */
  getAllWithMeta(): Promise<ApiResponse<ConfigItemView[]>> {
    return client.get('/system/configs/full').then((res) => res.data);
  },

  /** 更新配置项（支持热更新标识、env 文件写入、描述） */
  updateConfigWithMeta(
    key: string,
    value: string,
    options?: { writeEnv?: boolean; description?: string },
  ): Promise<ApiResponse<ConfigUpdateResult>> {
    return client
      .patch(`/system/configs/${key}`, {
        value,
        writeEnv: options?.writeEnv ?? false,
        description: options?.description,
      })
      .then((res) => res.data);
  },

  /** 获取待重启配置项列表 */
  getRestartRequired(): Promise<ApiResponse<{ keys: string[]; count: number }>> {
    return client.get('/system/configs/restart-required/list').then((res) => res.data);
  },

  /** 清空待重启列表 */
  clearRestartRequired(): Promise<ApiResponse<void>> {
    return client.post('/system/configs/restart-required/clear').then((res) => res.data);
  },

  // ==================== Phase 5: 系统重启 ====================

  /** 触发系统重启 */
  triggerRestart(): Promise<ApiResponse<RestartState>> {
    return client.post('/system/restart').then((res) => res.data);
  },

  /** 获取重启状态 */
  getRestartStatus(): Promise<ApiResponse<RestartState>> {
    return client.get('/system/restart/status').then((res) => res.data);
  },

  /** 清除重启标记文件 */
  clearRestartMarker(): Promise<ApiResponse<void>> {
    return client.post('/system/restart/clear-marker').then((res) => res.data);
  },

  // ==================== 安全审计日志（S-M02） ====================

  /** 查询安全审计日志（分页，支持多维筛选） */
  getSecurityAuditLogs(params?: {
    date?: string;
    type?: string;
    severity?: string;
    userId?: string;
    username?: string;
    page?: number;
    pageSize?: number;
  }): Promise<
    ApiResponse<{
      items: SecurityAuditLogEntry[];
      total: number;
      page: number;
      pageSize: number;
      date: string;
    }>
  > {
    return client.get('/system/audit-logs', { params }).then((res) => res.data);
  },

  /** 验证审计日志哈希链完整性（防篡改检测） */
  verifyAuditChain(date?: string): Promise<
    ApiResponse<{
      valid: boolean;
      totalEntries: number;
      brokenAtIndex: number | null;
      brokenReason?: string;
      date: string;
    }>
  > {
    return client
      .get('/system/audit-logs/verify', { params: { date } })
      .then((res) => res.data);
  },

  /** 获取审计日志统计概览（含哈希链完整性状态） */
  getAuditStats(date?: string): Promise<
    ApiResponse<{
      total: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
      chainValid: boolean;
      date: string;
    }>
  > {
    return client
      .get('/system/audit-logs/stats', { params: { date } })
      .then((res) => res.data);
  },
};