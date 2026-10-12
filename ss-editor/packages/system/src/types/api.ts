// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ApiResponse<T = any> {
  data: T;
  message: string;
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: Array<{ field: string; message: string }>;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  message: string;
  timestamp: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  email: string;
  displayName?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user' | 'viewer';
}

/**
 * S-C03: Token 通过 HttpOnly Cookie 传输，accessToken/refreshToken 可选
 * （Cookie 模式下响应体仅返回 user；Bearer Header 模式下返回完整 token 对）
 */
export interface AuthResult {
  accessToken?: string;
  refreshToken?: string;
  user: UserInfo;
}

export interface RefreshResult {
  accessToken?: string;
  refreshToken?: string;
}

/** 项目资源状态 */
export interface ResourceStatus {
  status: 'ok' | 'missing' | 'error' | 'empty';
  path: string;
  size?: number;
}

/** 资源诊断集合 */
export interface DiagnoseResources {
  projectinfo?: ResourceStatus;
  dbDir?: ResourceStatus;
  rtdbDir?: ResourceStatus;
  pagesDir?: ResourceStatus;
  templateDir?: ResourceStatus;
  systemDb?: ResourceStatus;
  eventDb?: ResourceStatus;
}

/** 项目诊断结果 */
export interface DiagnoseResult {
  projectName: string;
  projectId: string;
  /** 多租户预留（当前 = projectId） */
  tenantId: string;
  resources: DiagnoseResources;
  health: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  dbMode: string;
}

export interface Project {
  /** 项目代码（后台 projectId 字段，变量命名格式，不含中文） */
  projectId: string;
  /** tenantId 多租户预留字段（当前 = projectId，为以后扩展多租户预置） */
  tenantId: string;
  /** 项目显示名称 */
  projectName: string;
  description?: string;
  version?: string;
  config?: any;
  createdBy?: string;
  updatedBy?: string;
  pages?: Page[];
  createdAt?: string;
  updatedAt?: string;
  /** 工程位置（项目目录绝对路径） */
  projectPath?: string;
  /** 数据库位置（项目数据库目录绝对路径） */
  databasePath?: string;
  /** 项目地址 */
  address?: string;
  /** 经度（十进制字符串） */
  longitude?: string;
  /** 纬度（十进制字符串） */
  latitude?: string;
  /** 负责人 */
  owner?: string;
  /** 项目封面图片相对路径（如 images/cover-1234567890.png） */
  image?: string;
  /**
   * 项目启用状态（true=启用，false=停用）。
   * 停用的项目不采集数据、不在设备树/设备监控显示、不计入首页统计。
   * 默认 false（新建项目默认停用，需手动启用后才开始采集）。
   */
  enabled?: boolean;
  /** 页面数量（运行时计算，不入 projectinfo.json） */
  pageCount?: number;
  /** 项目目录总大小（字节，运行时计算，不入 projectinfo.json） */
  folderSize?: number;
}

export interface Page {
  id: string;
  name: string;
  order: number;
  config?: any;
  graphics?: any[];
  projectId: string;
}

export type DeviceType = 'modbus_tcp' | 'modbus_rtu' | 'opc_ua' | 'mqtt';

export type DeviceStatus = 'offline' | 'connecting' | 'online' | 'degraded' | 'error';

export type TagDataType = 'boolean' | 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64' | 'string';

export interface Device {
  id: string;
  /** 设备编码（项目内唯一的设备标识符） */
  deviceCode: string;
  deviceName: string;
  nameAlias?: string;
  description?: string;
  type: DeviceType;
  driver?: string;
  config?: Record<string, any>;
  connection?: Record<string, any>;
  status: DeviceStatus;
  projectId: string;
  tags?: DataTag[];
  templateId?: string;
  templateVersion?: string;
  templateAppliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  lastOnlineAt?: string;
  lastDataAt?: string;
  errorCount?: number;
  lastErrorAt?: string;
  lastErrorMsg?: string;
  scanRate?: number;
  offlinePeriod?: number;
  groupId?: string;
  /** 运行时采集诊断数据（DeviceStateManager 推送） */
  _diagnostics?: {
    retryCount?: number;
    circuitState?: 'closed' | 'open' | 'half-open';
    consecutiveFailures?: number;
    lastErrorAt?: number;
  };
}

export interface DataTag {
  id: string;
  name: string;
  description?: string;
  address: string;
  dataType: TagDataType;
  direction?: 'read' | 'write' | 'read-write';
  config?: Record<string, any>;
  scale?: number;
  offset?: number;
  scanRate?: number;
  enabled?: boolean;
  deviceId: string;
  createdAt?: string;
  updatedAt?: string;
  // 显示与报警相关字段（与后端 DataTag 实体保持一致）
  unit?: string;
  displayFormat?: string;
  alarmHigh?: number;
  alarmLow?: number;
  alarmHighHigh?: number;
  alarmLowLow?: number;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  parentId?: string;
  sortOrder?: number;
  parent?: DeviceGroup;
  children?: DeviceGroup[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceSummary {
  id: string;
  /** 设备编码（项目内唯一的设备标识符） */
  deviceCode: string;
  deviceName: string;
  type: DeviceType;
  status: DeviceStatus;
}

export interface DeviceTree {
  group: {
    id: string;
    name: string;
    sortOrder: number;
    parentId?: string;
  };
  children: DeviceTree[];
  devices: DeviceSummary[];
}

/** 项目设备树（包含分组树和未分组的根设备） */
export interface ProjectDeviceTree {
  projectId: string;
  projectName: string;
  groups: DeviceTree[];
  rootDevices: DeviceSummary[];
}

export interface DeviceDiagnosticResult {
  deviceId: string;
  timestamp: string;
  reachable: boolean;
  latencyMs: number;
  protocolStatus: 'ok' | 'warning' | 'error';
  details: Record<string, any>;
  suggestions: string[];
}

export interface PingResult {
  reachable: boolean;
  latencyMs: number;
}

export type AlarmLevel = 'info' | 'warning' | 'error' | 'critical';

export type AlarmStatus = 'active' | 'acknowledged' | 'cleared' | 'shelved';

export type AlarmCondition = 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte' | 'range_in' | 'range_out';

export interface AlarmRule {
  id: string;
  name: string;
  description?: string;
  level: AlarmLevel;
  condition: AlarmCondition;
  conditionValue: string;
  enabled: boolean;
  debounceMs: number;
  alarmType?: string;
  /** 值恢复后是否自动清除告警（Phase 5） */
  autoClear?: boolean;
  projectId: string;
  tagId: string;
  tag?: { id: string; name: string; address: string };
  createdAt: string;
  updatedAt: string;
}

export interface AlarmRecord {
  id: string;
  ruleId: string;
  rule?: AlarmRule;
  deviceId?: string;
  deviceName?: string;
  tagId?: string;
  tagName?: string;
  message: string;
  triggerValue: number;
  level: AlarmLevel;
  status: AlarmStatus;
  alarmType?: string;
  dispositionType?: string;
  /** 是否实时告警（Phase 5）：true=实时(未恢复) / false=历史(已清除) */
  isActive?: boolean;
  /** 清除原因（Phase 5）：auto=条件自动恢复 / manual=人工清除 / rule_disabled=规则禁用 */
  clearReason?: string;
  /** 自动恢复时间（Phase 5）：仅 clearReason='auto' 时有值 */
  recoveredAt?: string;
  /** 自动恢复时的采集值（Phase 5） */
  recoveredValue?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  clearedAt?: string;
  clearedBy?: string;
  shelvedAt?: string;
  shelvedBy?: string;
  shelveReason?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlarmStatistics {
  total: number;
  active: number;
  acknowledged: number;
  cleared: number;
  shelved: number;
  byStatus: Record<string, number>;
  byLevel: Record<string, number>;
}

export interface AlarmTrend {
  date: string;
  count: number;
  level: string;
}

export interface AlarmTopRule {
  ruleId: string;
  ruleName: string;
  count: number;
  lastTriggered: string;
}

export interface DeviceStats {
  deviceId: string;
  deviceName: string;
  count: number;
}

export interface TagStats {
  tagId: string;
  tagName: string;
  count: number;
}

export interface AlarmSuppressionRule {
  id: string;
  type: string;
  targetIds: string[];
  enabled: boolean;
  startTime?: string;
  endTime?: string;
}

export interface AlarmEscalationRule {
  id: string;
  name: string;
  delayMs: number;
  fromLevel: string;
  toLevel: string;
  channels: string[];
}

export type ScriptStatus = 'draft' | 'active' | 'paused' | 'error';

export type ScriptTriggerType = 'manual' | 'scheduled' | 'event' | 'pipeline';

export interface Script {
  id: string;
  name: string;
  description?: string;
  code: string;
  status: ScriptStatus;
  triggerType: ScriptTriggerType;
  triggerConfig?: Record<string, any>;
  allowNetwork?: boolean;
  allowFileSystem?: boolean;
  timeoutMs?: number;
  memoryLimitMb?: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptExecution {
  id: string;
  scriptId: string;
  trigger: string;
  status: string;
  result?: string;
  error?: string;
  durationMs: number;
  memoryUsedMb: number;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
}

export interface SystemConfig {
  id?: string;
  key: string;
  value: string;
  description?: string;
  type?: string;
  updatedAt?: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'error';
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface SystemInfo {
  appName: string;
  version: string;
  buildTime: string;
  nodeVersion: string;
  platform: string;
  cpuCores: number;
  totalMemory: string;
  pid: number;
  uptime: string;
  timezone: string;
  apiUrl: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  username: string;
  ip: string;
  userAgent: string;
  details?: Record<string, any>;
  status: 'success' | 'failure';
  createdAt: string;
}

// ==================== 系统配置管理 ====================

/** 配置分类 */
export type ConfigCategory =
  | 'application'
  | 'database'
  | 'security'
  | 'collection'
  | 'communication'
  | 'storage'
  | 'logging'
  | 'i18n'
  | 'monitoring';

/** 配置值类型 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'enum' | 'password';

/** 配置元数据 */
export interface ConfigMetadata {
  key: string;
  category: ConfigCategory;
  description: string;
  defaultValue?: string;
  type: ConfigValueType;
  enumValues?: string[];
  sensitive: boolean;
  editable: boolean;
  hotReloadable: boolean;
  restartRequired: boolean;
  envFile: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/** 配置项展示视图（含元数据 + 当前值） */
export interface ConfigItemView {
  key: string;
  category: ConfigCategory;
  categoryLabel: string;
  description: string;
  defaultValue?: string;
  type: string;
  enumValues?: string[];
  sensitive: boolean;
  editable: boolean;
  hotReloadable: boolean;
  restartRequired: boolean;
  envFile: boolean;
  validation?: { min?: number; max?: number; pattern?: string };
  value: string;
  source: 'env' | 'db' | 'default' | 'null';
}

/** 配置更新结果 */
export interface ConfigUpdateResult {
  key: string;
  value: string;
  restartRequired: boolean;
  hotReloadable: boolean;
  envFileUpdated: boolean;
  addedToPendingRestart: boolean;
}

/** 重启状态 */
export type RestartStatus = 'idle' | 'pending' | 'restarting' | 'exited' | 'ready' | 'failed';

/** 重启状态信息 */
export interface RestartState {
  status: RestartStatus;
  triggeredBy?: string;
  triggeredAt?: number;
  oldPid?: number;
  newPid?: number;
  errorMessage?: string;
  markerPath: string;
}
