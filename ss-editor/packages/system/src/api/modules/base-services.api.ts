// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

/** 服务名称（字符串类型，支持自定义第三方服务） */
export type BaseServiceName = string;

/** 服务运行状态 */
export type ServiceRunStatus = 'running' | 'stopped' | 'error' | 'unknown';

/** 服务状态信息 */
export interface ServiceStatus {
  id: string;
  name: BaseServiceName;
  displayName: string;
  status: ServiceRunStatus;
  pid?: number;
  port?: number;
  portReachable: boolean;
  processRunning: boolean;
  startedAt?: string;
  uptimeSeconds?: number;
  binaryExists: boolean;
  configExists: boolean;
  dataDirExists: boolean;
  logDirExists: boolean;
  autoStart: boolean;
  processGuard: boolean;
  errorMessage?: string;
}

/** 服务操作结果 */
export interface ServiceActionResult {
  success: boolean;
  action: 'start' | 'stop' | 'restart';
  name: BaseServiceName;
  message: string;
  pid?: number;
  durationMs: number;
}

/** 服务配置实体 */
export interface BaseServiceConfig {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  binaryPath?: string;
  startArgs?: string;
  configPath?: string;
  logDir?: string;
  dataDir?: string;
  processName?: string;
  port?: number;
  startScript?: string;
  stopScript?: string;
  enabled: boolean;
  autoStart: boolean;
  processGuard: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 创建服务 DTO */
export interface CreateBaseServiceDto {
  name: string;
  displayName: string;
  description?: string;
  binaryPath?: string;
  startArgs?: string;
  configPath?: string;
  logDir?: string;
  dataDir?: string;
  processName?: string;
  port?: number;
  startScript?: string;
  stopScript?: string;
  enabled?: boolean;
  autoStart?: boolean;
  processGuard?: boolean;
  sortOrder?: number;
}

/** 更新服务 DTO */
export type UpdateBaseServiceDto = Partial<CreateBaseServiceDto>

/** 配置文件信息 */
export interface ServiceConfig {
  content: string;
  path: string;
  size: number;
  updatedAt?: string;
}

/** 保存配置结果 */
export interface SaveConfigResult {
  success: boolean;
  path: string;
  backupPath?: string;
}

/** 日志条目 */
export interface ServiceLogEntry {
  filename: string;
  size: number;
  modifiedAt?: string;
  lines: string[];
  totalLines: number;
}

/** 清理日志结果 */
export interface ClearLogsResult {
  cleared: string[];
}

/** InfluxDB Setup 状态 */
export interface InfluxSetupStatus {
  reachable: boolean;
  initialized: boolean;
  tokenConfigured: boolean;
}

/** InfluxDB Setup 结果 */
export interface InfluxSetupResult {
  success: boolean;
  message: string;
  token?: string;
  org?: string;
  bucket?: string;
  details?: Record<string, any>;
}

/** InfluxDB 健康状态 */
export interface InfluxHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  commit?: string;
  responseTimeMs?: number;
  error?: string;
}

/** InfluxDB Bucket */
export interface InfluxBucket {
  id: string;
  name: string;
  orgID?: string;
  description?: string;
  retentionPeriodHrs?: number;
  storageBytes?: number;
  createdAt?: string;
  updatedAt?: string;
  /** measurement 数量 */
  measurementCount?: number;
  /** 最后写入时间（ISO 字符串） */
  lastWriteAt?: string;
  /** 数据点总数（近似） */
  dataPointCount?: number;
}

/** InfluxDB 环境配置 */
export interface InfluxConfig {
  url: string;
  org: string;
  bucket: string;
  tokenConfigured: boolean;
  tokenMasked: string;
}

/** NanoMQ 健康状态 */
export interface NanomqHealthStatus {
  reachable: boolean;
  responseTimeMs?: number;
  error?: string;
}

export const baseServicesApi = {
  /** 获取所有基础服务状态 */
  list(): Promise<ApiResponse<ServiceStatus[]>> {
    return client.get('/base-services').then((res) => res.data);
  },

  /** 获取所有服务配置列表 */
  listConfig(): Promise<ApiResponse<BaseServiceConfig[]>> {
    return client.get('/base-services/config/list').then((res) => res.data);
  },

  /** 新增服务 */
  create(dto: CreateBaseServiceDto): Promise<ApiResponse<BaseServiceConfig>> {
    return client.post('/base-services', dto).then((res) => res.data);
  },

  /** 更新服务配置 */
  update(name: string, dto: UpdateBaseServiceDto): Promise<ApiResponse<BaseServiceConfig>> {
    return client.put(`/base-services/${name}`, dto).then((res) => res.data);
  },

  /** 删除服务 */
  remove(name: string): Promise<ApiResponse<{ success: boolean }>> {
    return client.delete(`/base-services/${name}`).then((res) => res.data);
  },

  /** 获取单个服务状态 */
  getStatus(name: BaseServiceName): Promise<ApiResponse<ServiceStatus>> {
    return client.get(`/base-services/${name}/status`).then((res) => res.data);
  },

  /** 启动服务 */
  start(name: BaseServiceName): Promise<ApiResponse<ServiceActionResult>> {
    return client.post(`/base-services/${name}/start`).then((res) => res.data);
  },

  /** 停止服务 */
  stop(name: BaseServiceName): Promise<ApiResponse<ServiceActionResult>> {
    return client.post(`/base-services/${name}/stop`).then((res) => res.data);
  },

  /** 重启服务 */
  restart(name: BaseServiceName): Promise<ApiResponse<ServiceActionResult>> {
    return client.post(`/base-services/${name}/restart`).then((res) => res.data);
  },

  /** 读取配置文件 */
  getConfig(name: BaseServiceName): Promise<ApiResponse<ServiceConfig>> {
    return client.get(`/base-services/${name}/config`).then((res) => res.data);
  },

  /** 保存配置文件 */
  saveConfig(name: BaseServiceName, content: string): Promise<ApiResponse<SaveConfigResult>> {
    return client.put(`/base-services/${name}/config`, { content }).then((res) => res.data);
  },

  /** 获取日志 */
  getLogs(name: BaseServiceName, limit?: number): Promise<ApiResponse<ServiceLogEntry[]>> {
    const params = limit ? { limit } : {};
    return client.get(`/base-services/${name}/logs`, { params }).then((res) => res.data);
  },

  /** 清理日志 */
  clearLogs(name: BaseServiceName): Promise<ApiResponse<ClearLogsResult>> {
    return client.delete(`/base-services/${name}/logs`).then((res) => res.data);
  },

  // ==================== InfluxDB 初始化 ====================

  /** 检测 InfluxDB setup 状态 */
  checkInfluxSetup(): Promise<ApiResponse<InfluxSetupStatus>> {
    return client.get('/base-services/influxdb/setup/status').then((res) => res.data);
  },

  /** 检测 InfluxDB 运行健康状态 */
  checkInfluxHealth(): Promise<ApiResponse<InfluxHealthStatus>> {
    return client.get('/base-services/influxdb/health').then((res) => res.data);
  },

  /** 一键初始化 InfluxDB */
  setupInfluxDB(body?: { username?: string; password?: string; org?: string; bucket?: string }): Promise<ApiResponse<InfluxSetupResult>> {
    return client.post('/base-services/influxdb/setup', body).then((res) => res.data);
  },

  /** 获取 InfluxDB Bucket 列表 */
  listInfluxBuckets(): Promise<ApiResponse<InfluxBucket[]>> {
    return client.get('/base-services/influxdb/buckets').then((res) => res.data);
  },

  /** 导出 InfluxDB Bucket 数据为 CSV（返回 Blob，携带鉴权） */
  exportBucketData(bucketName: string, start?: string): Promise<Blob> {
    return client
      .get(`/base-services/influxdb/buckets/${encodeURIComponent(bucketName)}/export`, {
        params: { start },
        responseType: 'blob',
      })
      .then((res) => res.data);
  },

  /** 获取 InfluxDB 环境配置 */
  getInfluxConfig(): Promise<ApiResponse<InfluxConfig>> {
    return client.get('/base-services/influxdb/config').then((res) => res.data);
  },

  // ==================== NanoMQ 健康检测 ====================

  /** 检测 NanoMQ MQTT Broker 健康状态 */
  checkNanomqHealth(): Promise<ApiResponse<NanomqHealthStatus>> {
    return client.get('/base-services/nanomq/health').then((res) => res.data);
  },
};
