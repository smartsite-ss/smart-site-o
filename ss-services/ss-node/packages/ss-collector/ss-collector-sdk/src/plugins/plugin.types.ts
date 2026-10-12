// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 采集插件元数据 — 描述一个采集插件的能力、配置和依赖信息
 */
export interface CollectorPluginMeta {
  /** 插件唯一标识（与 DeviceType 对应） */
  protocol: string;

  /** 显示名称 */
  displayName: string;

  /** 语义化版本 */
  version: string;

  /** 插件描述 */
  description: string;

  /** 作者/组织 */
  author?: string;

  /** 协议分类 */
  category: PluginCategory;

  /** 传输层类型 */
  transport: 'tcp' | 'serial' | 'ws' | 'tls' | 'other';

  /** 配置 JSON Schema（通道连接配置的校验规则） */
  connectionSchema: Record<string, any>;

  /** 默认连接配置 */
  defaultConnection: Record<string, any>;

  /** 支持的标签数据类型 */
  supportedDataTypes: string[];

  /** 依赖的其他 npm 包 */
  dependencies?: Record<string, string>;

  /** 图标（可选，base64 或 URL） */
  icon?: string;

  /** 标签列表（用于前端展示） */
  tags?: string[];

  /** 是否默认启用 */
  enabledByDefault: boolean;

  /**
   * 隔离模式（新增，默认 in_process）
   *
   * 决定该插件的 adapter 在什么环境中运行。
   * - in_process:   适配器在主线程内直接调用（默认，性能最优）
   * - worker_thread:适配器在独立 Worker 线程中执行（崩溃隔离）
   * - child_process:适配器在独立子进程中执行（完全隔离）
   */
  isolationMode?: IsolationMode;

  /**
   * 隔离配置（仅 worker_thread / child_process 模式下生效）
   */
  isolation?: IsolationConfig;
}

/** 采集插件隔离模式 */
export enum IsolationMode {
  /** 进程内模式：适配器在主线程内直接调用（默认，性能最优） */
  IN_PROCESS = 'in_process',
  /** Worker 线程模式：适配器在独立 Worker 线程中执行（崩溃隔离，内存开销小） */
  WORKER_THREAD = 'worker_thread',
  /** 子进程模式：适配器在独立子进程中执行（完全隔离，最安全） */
  CHILD_PROCESS = 'child_process',
}

/** 隔离配置 */
export interface IsolationConfig {
  /** 最大并行请求数（默认 50） */
  maxParallel?: number;
  /** 单次请求超时 ms（默认 10000） */
  requestTimeoutMs?: number;
  /** 崩溃后自动重启（默认 true） */
  autoRestart?: boolean;
  /** 启动超时 ms（默认 30000） */
  startupTimeoutMs?: number;
  /** 空闲多久后回收（0 = 永不回收，默认 300000 = 5 分钟） */
  idleTimeoutMs?: number;
  /** 最大重启次数（0 = 不限，默认 5） */
  maxRestarts?: number;
  /** 子进程入口脚本路径（仅 child_process，不填则自动推断） */
  entryScript?: string;
}

/** 插件分类枚举 */
export enum PluginCategory {
  INDUSTRIAL_BUS = 'industrial_bus',
  IOT = 'iot',
  POWER = 'power',
  BUILDING = 'building',
  CUSTOM = 'custom',
}

/** 注册后的插件实例 */
export interface RegisteredPlugin {
  meta: CollectorPluginMeta;
  adapter: any;
  status: PluginStatus;
  registeredAt: Date;
  activatedAt?: Date;
  metrics: PluginMetrics;
  errorMessage?: string;
}

/** 插件状态 */
export type PluginStatus = 'discovered' | 'registered' | 'active' | 'inactive' | 'error';

/** 插件运行指标 */
export interface PluginMetrics {
  totalConnections: number;
  activeConnections: number;
  totalReads: number;
  totalErrors: number;
  avgResponseTime: number;
  uptime: number;
  lastActivity: Date | null;
}

/** 插件筛选条件 */
export interface PluginFilter {
  status?: PluginStatus;
  category?: PluginCategory;
}

/** 发现到的插件 */
export interface DiscoveredPlugin {
  meta: CollectorPluginMeta;
  packageName: string;
  packageVersion: string;
  module?: any;
  adapter?: any;
  status: PluginStatus;
  error?: string;
}

/** PluginModule 配置选项 */
export interface PluginModuleOptions {
  autoDiscover?: boolean;
  scanExternal?: boolean;
}

export interface ActiveDeviceInfo {
  deviceId: string;
  deviceName: string;
  projectId: string;
  projectName: string;
  status: 'online' | 'offline' | 'connecting' | 'error';
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

/** 插件关联设备的统计信息 */
export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  other: number;
}

/** 活跃设备追踪器 — 由采集启动层注入，供插件详情接口查询 */
export const ACTIVE_DEVICE_TRACKER = 'ACTIVE_DEVICE_TRACKER';

export interface IActiveDeviceTracker {
  /** 获取某个协议下的活跃采集设备ID列表 */
  getActiveDeviceIds(protocol: string): string[];
  /** 获取活跃设备详情 */
  getActiveDeviceInfo(deviceId: string): ActiveDeviceInfo | undefined;
  /** 获取某个协议关联的设备统计（在线/离线/其他） */
  getDeviceStats(protocol: string): DeviceStats;
}

// ---------------------------------------------------------------------------
// 提供者扫描器 — 解耦 @nestjs/core DiscoveryService，避免 pnpm 重复包导致 DI 令牌不匹配
// ---------------------------------------------------------------------------

/** 提供者扫描器令牌 */
export const PROVIDER_SCANNER = 'PROVIDER_SCANNER';

/** 拆解后的 ProviderWrapper（最小化接口，不含外部类引用） */
export interface IProviderWrapper {
  instance: unknown;
  metatype: unknown;
}

/** 提供者扫描器接口 */
export interface IProviderScanner {
  getProviders(): IProviderWrapper[];
}
