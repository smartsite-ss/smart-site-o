// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type PluginCategory = 'industrial_bus' | 'iot' | 'power' | 'building' | 'custom';
export type PluginStatus = 'active' | 'inactive' | 'registered' | 'error' | 'unregistered';
export type PluginTransport = 'tcp' | 'serial' | 'ws' | 'tls' | 'other';

export interface PluginInfo {
  protocol: string;
  displayName: string;
  version: string;
  description?: string;
  category: PluginCategory;
  transport: PluginTransport;
  status: PluginStatus;
  isolationMode: string;
  supportedDataTypes: string[];
  defaultConnection: Record<string, any>;
  enabledByDefault: boolean;
  tags?: string[];
  registeredAt?: string;
  activatedAt?: string;
  metrics?: PluginMetrics;
  errorMessage?: string;
  /** 运行时进程名（child_process / in_process 模式） */
  processName?: string;
  /** 运行时进程 PID（child_process / in_process 模式） */
  processId?: number;
  /** 运行时线程 ID（仅 worker_thread 模式） */
  threadId?: number;
}

export interface PluginMetrics {
  totalConnections: number;
  activeConnections: number;
  totalReads: number;
  totalErrors: number;
  avgResponseTime: number;
  uptime: number;
}

export interface PluginStatusInfo {
  protocol: string;
  status: PluginStatus;
  uptime: number;
  activeConnections: number;
  totalReads: number;
  totalErrors: number;
  errorMessage?: string;
}

export interface PluginConnectionSchema {
  type: string;
  required: string[];
  properties: Record<string, {
    type: string;
    title: string;
    default?: any;
    minimum?: number;
    maximum?: number;
    description?: string;
  }>;
}

export interface PluginUpdateCheck {
  protocol: string;
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  updateAvailable: boolean;
}

export interface PluginHealthCheck {
  totalPlugins: number;
  activePlugins: number;
  inactivePlugins: number;
  errorPlugins: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

/** 活跃采集设备信息 */
export interface ActiveDeviceInfo {
  deviceId: string;
  deviceName: string;
  projectId: string;
  projectName: string;
  status: 'online' | 'offline' | 'connecting' | 'error';
  lastOnlineAt: string | null;
  lastOfflineAt: string | null;
}

/** 插件活跃设备列表响应 */
export interface PluginActiveDevices {
  protocol: string;
  count: number;
  devices: ActiveDeviceInfo[];
}

/** 插件关联设备统计 */
export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  other: number;
}

/** 进程性能指标 */
export interface ProcessMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  cpuUsage: number;
  uptime: number;
}

/** 插件监控数据 */
export interface PluginMonitorData {
  protocol: string;
  metrics: ProcessMetrics;
  /** 进程信息 */
  processName: string;
  processId: number;
  /** 线程 ID（仅 worker_thread 模式） */
  threadId?: number;
  isolationMode: string;
  logs: string[];
  logFilePath: string;
}

/** 插件运行时配置（持久化到 PLUGIN_CONFIG_DIR 下的 JSON 文件） */
export interface PluginRuntimeConfig {
  isolationMode?: string;
}