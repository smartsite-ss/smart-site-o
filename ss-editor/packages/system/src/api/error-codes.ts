// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 错误码 → i18n key 映射
 *
 * 与后端 ss-sdk/src/errors/index.ts 中的 ERROR_CODE_I18N_KEY 保持同步。
 * 后端错误响应体中的 `code` 字段（如 'DEV_002'）通过此映射找到对应 i18n key，
 * 再由 vue-i18n 翻译为当前语言的错误消息。
 */

/** 错误码 → i18n key 映射表 */
export const ERROR_CODE_I18N_KEY: Record<string, string> = {
  // 数据采集错误
  DATA_001: 'error.data.acquisition_failed',
  DATA_002: 'error.data.protocol_timeout',
  DATA_003: 'error.data.persistence_failed',
  DATA_004: 'error.data.quality_issue',
  // 设备错误
  DEV_001: 'error.device.error',
  DEV_002: 'error.device.offline',
  DEV_003: 'error.device.read_error',
  // 告警错误
  ALM_001: 'error.alarm.error',
  ALM_002: 'error.alarm.notification_failed',
  // 系统错误
  SYS_001: 'error.system.internal',
  SYS_002: 'error.system.config_error',
  SYS_003: 'error.system.storage_error',
  // 认证错误
  AUTH_001: 'error.auth.unauthorized',
  AUTH_002: 'error.auth.forbidden',
  AUTH_003: 'error.auth.token_expired',
  // 通用 HTTP 错误码
  FORBIDDEN: 'error.auth.forbidden',
  UNAUTHORIZED: 'error.auth.unauthorized',
  // 通用错误
  VALIDATION_001: 'error.validation.invalid_input',
  NOT_FOUND_001: 'error.not_found',
};

/**
 * 根据错误码获取对应的 i18n key
 * @param code 后端错误响应中的 `code` 字段
 * @returns i18n key，未匹配时返回 undefined
 */
export function mapErrorCodeToI18n(code: string): string | undefined {
  return ERROR_CODE_I18N_KEY[code];
}
