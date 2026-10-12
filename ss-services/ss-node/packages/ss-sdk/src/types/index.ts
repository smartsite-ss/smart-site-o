// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
}

export enum DataQuality {
  GOOD = 'good',
  BAD = 'bad',
  UNCERTAIN = 'uncertain',
  COMM_ERROR = 'comm_error',
  CONFIG_ERROR = 'config_error',
  OUT_OF_RANGE = 'out_of_range',
  STALE = 'stale',
  MANUAL = 'manual',
  SIMULATED = 'simulated',
  INITIALIZING = 'initializing',
}

export enum DeviceStatus {
  OFFLINE = 'offline',
  CONNECTING = 'connecting',
  ONLINE = 'online',
  DEGRADED = 'degraded',
  ERROR = 'error',
}

export enum DeviceType {
  MODBUS_TCP = 'modbus_tcp',
  MODBUS_RTU = 'modbus_rtu',
  OPC_UA = 'opc_ua',
  MQTT = 'mqtt',
  SIEMENS_S7 = 'siemens_s7',
  VIRTUAL = 'virtual',
}

export enum AlarmLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlarmStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  CLEARED = 'cleared',
  SHELVED = 'shelved',
}

export enum AlarmCondition {
  GT = 'gt',
  LT = 'lt',
  EQ = 'eq',
  NEQ = 'neq',
  GTE = 'gte',
  LTE = 'lte',
  RANGE_IN = 'range_in',
  RANGE_OUT = 'range_out',
  /** 变化检测：值发生变化时触发 */
  CHANGED = 'changed',
  /** 变化率检测：变化率超过阈值时触发 */
  RATE = 'rate',
  /** @deprecated Use RANGE_IN or RANGE_OUT */
  RANGE = 'range',
}

export enum TagType {
  ANALOG = 'analog',
  DIGITAL = 'digital',
  STRING = 'string',
  COUNTER = 'counter',
}
