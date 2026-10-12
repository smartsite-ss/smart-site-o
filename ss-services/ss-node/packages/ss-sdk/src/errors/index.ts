// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataQuality } from '../types';

// ==================== 错误码映射 ====================

/** 错误码到 HTTP 状态码的映射 */
export const ERROR_CODE_HTTP_STATUS: Record<string, number> = {
  // 数据采集错误
  DATA_001: 500,
  DATA_002: 504,
  DATA_003: 500,
  DATA_004: 422,

  // 设备错误
  DEV_001: 500,
  DEV_002: 503,
  DEV_003: 502,

  // 告警错误
  ALM_001: 500,
  ALM_002: 500,

  // 系统错误
  SYS_001: 500,
  SYS_002: 500,
  SYS_003: 500,

  // 认证错误
  AUTH_001: 401,
  AUTH_002: 403,
  AUTH_003: 401,

  // 通用错误
  VALIDATION_001: 400,
  NOT_FOUND_001: 404,
};

/** 错误码到多语言消息 key 的映射 */
export const ERROR_CODE_I18N_KEY: Record<string, string> = {
  DATA_001: 'error.data.acquisition_failed',
  DATA_002: 'error.data.protocol_timeout',
  DATA_003: 'error.data.persistence_failed',
  DATA_004: 'error.data.quality_issue',
  DEV_001: 'error.device.error',
  DEV_002: 'error.device.offline',
  DEV_003: 'error.device.read_error',
  ALM_001: 'error.alarm.error',
  ALM_002: 'error.alarm.notification_failed',
  SYS_001: 'error.system.internal',
  SYS_002: 'error.system.config_error',
  SYS_003: 'error.system.storage_error',
  AUTH_001: 'error.auth.unauthorized',
  AUTH_002: 'error.auth.forbidden',
  AUTH_003: 'error.auth.token_expired',
  VALIDATION_001: 'error.validation.invalid_input',
  NOT_FOUND_001: 'error.not_found',
};

// ==================== 基础错误类 ====================

export abstract class ScadaError extends Error {
  abstract readonly code: string;
  abstract readonly category: string;
  abstract readonly severity: string;
  abstract readonly recoverable: boolean;
  readonly timestamp: string = new Date().toISOString();

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  /** 获取对应的 HTTP 状态码 */
  getHttpStatus(): number {
    return ERROR_CODE_HTTP_STATUS[this.code] ?? 500;
  }

  /** 获取对应的 i18n key */
  getI18nKey(): string {
    return ERROR_CODE_I18N_KEY[this.code] ?? 'error.unknown';
  }

  /** 序列化为 JSON */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      name: this.name,
    };
  }
}

// ==================== 业务异常基类 ====================

export class BusinessException extends ScadaError {
  readonly code: string;
  readonly category: string;
  readonly severity: string;
  readonly recoverable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options?: {
      category?: string;
      severity?: string;
      recoverable?: boolean;
      details?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.code = code;
    this.category = options?.category ?? 'business';
    this.severity = options?.severity ?? 'error';
    this.recoverable = options?.recoverable ?? true;
    this.details = options?.details;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

// ==================== 预定义业务异常 ====================

/** 认证异常 */
export class AuthenticationException extends BusinessException {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_001', message, { category: 'auth', severity: 'error' });
  }
}

/** 权限异常 */
export class ForbiddenException extends BusinessException {
  constructor(message: string = 'Access denied') {
    super('AUTH_002', message, { category: 'auth', severity: 'warn' });
  }
}

/** Token 过期异常 */
export class TokenExpiredException extends BusinessException {
  constructor(message: string = 'Token expired') {
    super('AUTH_003', message, { category: 'auth', severity: 'warn' });
  }
}

/** 校验异常 */
export class ValidationException extends BusinessException {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super('VALIDATION_001', message, {
      category: 'validation',
      severity: 'warn',
      details,
    });
  }
}

/** 资源未找到异常 */
export class NotFoundException extends BusinessException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super('NOT_FOUND_001', message, { category: 'resource', severity: 'warn' });
  }
}

// ── Data Acquisition Errors ──

export class DataAcquisitionError extends ScadaError {
  readonly code: string = 'DATA_001';
  readonly category: string = 'data';
  readonly severity: string = 'error';
  readonly recoverable: boolean = true;
}

export class ProtocolTimeoutError extends DataAcquisitionError {
  readonly code: string = 'DATA_002';
  constructor(protocol: string, timeout: number) {
    super(`Protocol ${protocol} timed out after ${timeout}ms`);
  }
}

export class DataPersistenceError extends DataAcquisitionError {
  readonly code: string = 'DATA_003';
  readonly severity: string = 'fatal';
  readonly recoverable = false;
  constructor(storage: string, detail: string) {
    super(`Data persistence failed on ${storage}: ${detail}`);
  }
}

export class DataQualityError extends DataAcquisitionError {
  readonly code: string = 'DATA_004';
  readonly severity: string = 'warn';
  constructor(tagId: string, quality: DataQuality) {
    super(`Data quality issue for tag ${tagId}: ${quality}`);
  }
}

// ── Device Errors ──

export class DeviceError extends ScadaError {
  readonly code: string = 'DEV_001';
  readonly category: string = 'device';
  readonly severity: string = 'error';
  readonly recoverable = true;
}

export class DeviceOfflineError extends DeviceError {
  readonly code: string = 'DEV_002';
  constructor(deviceId: string) {
    super(`Device ${deviceId} is offline`);
  }
}

export class DeviceReadError extends DeviceError {
  readonly code: string = 'DEV_003';
  constructor(deviceId: string, address: string, detail: string) {
    super(`Failed to read device ${deviceId} address ${address}: ${detail}`);
  }
}

// ── Alarm Errors ──

export class AlarmError extends ScadaError {
  readonly code: string = 'ALM_001';
  readonly category: string = 'alarm';
  readonly severity: string = 'error';
  readonly recoverable = true;
  constructor(detail: string) {
    super(`Alarm error: ${detail}`);
  }
}

export class AlarmNotificationError extends AlarmError {
  readonly code: string = 'ALM_002';
  readonly severity: string = 'warn';
  constructor(channel: string, detail: string) {
    super(`Alarm notification failed on ${channel}: ${detail}`);
  }
}

// ── System Errors ──

export class SystemError extends ScadaError {
  readonly code: string = 'SYS_001';
  readonly category: string = 'system';
  readonly severity: string = 'fatal';
  readonly recoverable = false;
}

export class ConfigError extends SystemError {
  readonly code: string = 'SYS_002';
  constructor(key: string, detail: string) {
    super(`Configuration error for ${key}: ${detail}`);
  }
}

export class StorageError extends SystemError {
  readonly code: string = 'SYS_003';
  constructor(storage: string, detail: string) {
    super(`Storage error on ${storage}: ${detail}`);
  }
}
