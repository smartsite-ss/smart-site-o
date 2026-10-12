// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
  timestamp?: string;
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

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface Project {
  /** 项目代码（后台 projectId 字段，变量命名格式，不含中文） */
  projectId: string;
  /** tenantId 多租户预留字段（当前 = projectId，为以后扩展多租户预置） */
  tenantId: string;
  projectName: string;
  description?: string;
  version?: string;
  config?: any;
  createdById?: string;
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

export type DeadbandMode = 'none' | 'absolute' | 'percent' | 'time';

export type ConversionType = 'linear' | 'polynomial' | 'lookup_table' | 'script' | 'none';

export type QualityCode = 'good' | 'uncertain' | 'bad' | 'stale' | 'disconnected';

export interface DataTag {
  id: string;
  name: string;
  address: string;
  dataType: TagDataType;
  config?: Record<string, any>;
  scale?: number;
  offset?: number;
  scanRate?: number;
  enabled?: boolean;
  deviceId: string;
  description?: string;
  unit?: string;
  decimalPlaces?: number;
  minValue?: number;
  maxValue?: number;
  deadbandMode?: DeadbandMode;
  deadbandValue?: number;
  deadbandPercent?: number;
  deadbandTime?: number;
  conversionType?: ConversionType;
  conversionConfig?: Record<string, any>;
  alarmHighHigh?: number;
  alarmHigh?: number;
  alarmLow?: number;
  alarmLowLow?: number;
  qualityCheckEnabled?: boolean;
  maxAge?: number;
  archiveEnabled?: boolean;
  archiveInterval?: number;
  retentionDays?: number;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
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
  deviceName: string;
  type: DeviceType;
  status: DeviceStatus;
}

export interface DeviceTree {
  group: {
    id: string;
    name: string;
    sortOrder: number;
  };
  children: DeviceTree[];
  devices: DeviceSummary[];
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

// ==================== 系统配置管理（Phase 5） ====================

export type ConfigValueType = 'string' | 'number' | 'boolean' | 'enum' | 'password';

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

export interface ConfigValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

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
  validation?: ConfigValidation;
}

export interface ConfigCategoryInfo {
  label: string;
  icon: string;
  order: number;
}

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

export interface ConfigUpdateResult {
  key: string;
  value: string;
  restartRequired: boolean;
  hotReloadable: boolean;
  envFileUpdated: boolean;
  addedToPendingRestart: boolean;
}

export type RestartStatus = 'idle' | 'pending' | 'restarting' | 'exited' | 'ready' | 'failed';

export interface RestartState {
  status: RestartStatus;
  triggeredBy?: string;
  triggeredAt?: number;
  oldPid?: number;
  newPid?: number;
  errorMessage?: string;
  markerPath: string;
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
  details?: string;
  status: 'success' | 'error';
  createdAt: string;
}

export interface OperationLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  username: string;
  ip: string;
  userAgent: string;
  details?: string;
  status: 'success' | 'error';
  createdAt: string;
}

export interface ErrorLog {
  id: string;
  level: string;
  message: string;
  stack?: string;
  context?: string;
  url?: string;
  method?: string;
  userId?: string;
  ip?: string;
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  raw: string;
}

// ==================== 安全审计日志（S-M02） ====================

export interface SecurityAuditLogEntry {
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  prevHash: string;
  hash: string;
}

// ==================== 事件日志（EventLog） ====================

/** 订阅者处理记录 — 嵌入在 EventLogItem.subscribers 数组中 */
export interface SubscriberRecord {
  /** 订阅者类名（如 'DeviceConfigWatcher'） */
  name: string;
  /** 处理状态 */
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'skipped';
  /** 开始处理时间（ISO 字符串） */
  startedAt?: string;
  /** 完成时间（ISO 字符串） */
  completedAt?: string;
  /** 处理耗时（ms） */
  duration?: number;
  /** 错误信息（status=failed 时填充） */
  error?: string;
  /** 业务效果（如 { connectionId, tagsLoaded, tasksRegistered }） */
  result?: Record<string, any>;
}

/** 事件日志状态 */
export type EventLogStatus =
  | 'emitted'
  | 'processing'
  | 'processed'
  | 'partial'
  | 'failed'
  | 'no_subscribers';

/** 事件日志条目（与后端 EventLog 实体对齐） */
export interface EventLogItem {
  id: string;
  eventType: string;
  projectId?: string | null;
  payload: Record<string, any>;
  emittedBy?: string | null;
  source: string;
  eventTimestamp: string;
  subscribers: SubscriberRecord[];
  status: EventLogStatus;
  successRatio?: string | null;
  errorMessage?: string | null;
  traceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 事件日志查询参数 */
export interface EventLogQueryParams {
  projectId?: string;
  eventType?: string;
  status?: EventLogStatus;
  emittedBy?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
  hasSubscribers?: boolean;
}