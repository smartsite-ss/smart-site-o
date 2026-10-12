// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  generateId,
  generateShortId,
  generateBusinessId,
  generateDeviceId,
  generateTagId,
  generateAlarmId,
  buildPaginatedResponse,
  maskSensitive,
  maskPassword,
  maskToken,
  maskPhone,
  maskEmail,
  formatDate,
  formatDateTime,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  isValidEmail,
  isValidPhone,
  isValidIp,
  createHash256,
  createHashMd5,
  generateToken,
  getFileExtension,
  getFileBasename,
  deepFreeze,
  safeJsonParse,
  delay,
  retry,
} from '../utils';
import {
  DataQuality,
  DeviceStatus,
  DeviceType,
  AlarmLevel,
  AlarmStatus,
  AlarmCondition,
  TagType,
  SortOrder,
} from '../types';
import {
  BusinessException,
  AuthenticationException,
  ForbiddenException,
  TokenExpiredException,
  ValidationException,
  NotFoundException,
  DataAcquisitionError,
  ProtocolTimeoutError,
  DataPersistenceError,
  DataQualityError,
  DeviceError,
  DeviceOfflineError,
  DeviceReadError,
  AlarmError,
  AlarmNotificationError,
  SystemError,
  StorageError,
  ConfigError,
  ERROR_CODE_HTTP_STATUS,
  ERROR_CODE_I18N_KEY,
} from '../errors';

// ==================== 领域类型枚举 ====================
describe('Domain Type Enums', () => {
  describe('DataQuality', () => {
    it('TC-SDK-001: should have all expected quality values', () => {
      expect(DataQuality.GOOD).toBe('good');
      expect(DataQuality.BAD).toBe('bad');
      expect(DataQuality.UNCERTAIN).toBe('uncertain');
      expect(DataQuality.STALE).toBe('stale');
      expect(DataQuality.MANUAL).toBe('manual');
      expect(DataQuality.COMM_ERROR).toBe('comm_error');
      expect(DataQuality.CONFIG_ERROR).toBe('config_error');
      expect(DataQuality.OUT_OF_RANGE).toBe('out_of_range');
      expect(DataQuality.SIMULATED).toBe('simulated');
      expect(DataQuality.INITIALIZING).toBe('initializing');
    });
  });

  describe('DeviceStatus', () => {
    it('TC-SDK-002: should have all expected status values', () => {
      expect(DeviceStatus.ONLINE).toBe('online');
      expect(DeviceStatus.OFFLINE).toBe('offline');
      expect(DeviceStatus.CONNECTING).toBe('connecting');
      expect(DeviceStatus.DEGRADED).toBe('degraded');
      expect(DeviceStatus.ERROR).toBe('error');
    });
  });

  describe('AlarmLevel', () => {
    it('TC-SDK-003: should have all expected alarm level values', () => {
      expect(AlarmLevel.INFO).toBe('info');
      expect(AlarmLevel.WARNING).toBe('warning');
      expect(AlarmLevel.ERROR).toBe('error');
      expect(AlarmLevel.CRITICAL).toBe('critical');
    });
  });

  describe('TagType', () => {
    it('TC-SDK-004: should have all expected tag type values', () => {
      expect(TagType.ANALOG).toBe('analog');
      expect(TagType.DIGITAL).toBe('digital');
      expect(TagType.STRING).toBe('string');
      expect(TagType.COUNTER).toBe('counter');
    });
  });

  describe('SortOrder', () => {
    it('TC-SDK-005: should have ASC and DESC', () => {
      expect(SortOrder.ASC).toBe('ASC');
      expect(SortOrder.DESC).toBe('DESC');
    });
  });

  describe('AlarmStatus', () => {
    it('TC-SDK-006: should have all expected alarm status values', () => {
      expect(AlarmStatus.ACTIVE).toBe('active');
      expect(AlarmStatus.ACKNOWLEDGED).toBe('acknowledged');
      expect(AlarmStatus.CLEARED).toBe('cleared');
      expect(AlarmStatus.SHELVED).toBe('shelved');
    });
  });

  describe('AlarmCondition', () => {
    it('TC-SDK-007: should have all comparison operators', () => {
      expect(AlarmCondition.GT).toBe('gt');
      expect(AlarmCondition.LT).toBe('lt');
      expect(AlarmCondition.EQ).toBe('eq');
      expect(AlarmCondition.NEQ).toBe('neq');
      expect(AlarmCondition.GTE).toBe('gte');
      expect(AlarmCondition.LTE).toBe('lte');
      expect(AlarmCondition.RANGE_IN).toBe('range_in');
      expect(AlarmCondition.RANGE_OUT).toBe('range_out');
    });
  });

  describe('DeviceType', () => {
    it('TC-SDK-008: should have expected protocol types', () => {
      expect(DeviceType.MODBUS_TCP).toBe('modbus_tcp');
      expect(DeviceType.MODBUS_RTU).toBe('modbus_rtu');
      expect(DeviceType.OPC_UA).toBe('opc_ua');
      expect(DeviceType.MQTT).toBe('mqtt');
      expect(DeviceType.SIEMENS_S7).toBe('siemens_s7');
      expect(DeviceType.VIRTUAL).toBe('virtual');
    });
  });
});

// ==================== ID 生成器 ====================
describe('ID Generator', () => {
  describe('generateId', () => {
    it('TC-SDK-010: should generate a valid UUID v4 string', () => {
      const id = generateId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('TC-SDK-011: should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('generateShortId', () => {
    it('TC-SDK-012: should generate string of default length 12', () => {
      const id = generateShortId();
      expect(id).toHaveLength(12);
      expect(/^[A-Za-z0-9]+$/.test(id)).toBe(true);
    });

    it('TC-SDK-013: should generate string of specified length', () => {
      const id = generateShortId(8);
      expect(id).toHaveLength(8);
    });

    it('TC-SDK-014: should generate unique short IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateShortId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('generateBusinessId', () => {
    it('TC-SDK-015: should generate ID with prefix', () => {
      const id = generateBusinessId('DEV');
      expect(id.startsWith('DEV-')).toBe(true);
    });

    it('TC-SDK-016: should generate ID with custom length', () => {
      const id = generateBusinessId('TAG', 6);
      expect(id.startsWith('TAG-')).toBe(true);
      expect(id.length).toBe(10); // 'TAG-' + 6
    });
  });

  describe('generateDeviceId', () => {
    it('TC-SDK-017: should generate device ID with DEV- prefix', () => {
      const id = generateDeviceId();
      expect(id.startsWith('DEV-')).toBe(true);
    });
  });

  describe('generateTagId', () => {
    it('TC-SDK-018: should generate tag ID with TAG- prefix', () => {
      const id = generateTagId();
      expect(id.startsWith('TAG-')).toBe(true);
    });
  });

  describe('generateAlarmId', () => {
    it('TC-SDK-019: should generate alarm ID with ALM- prefix', () => {
      const id = generateAlarmId();
      expect(id.startsWith('ALM-')).toBe(true);
    });
  });
});

// ==================== 分页响应构建 ====================
describe('Pagination', () => {
  describe('buildPaginatedResponse', () => {
    it('TC-SDK-020: should build correct paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = buildPaginatedResponse(data, 25, 1, 10);

      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('TC-SDK-021: should handle empty data', () => {
      const result = buildPaginatedResponse([], 0, 1, 20);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('TC-SDK-022: should calculate totalPages correctly for exact division', () => {
      const result = buildPaginatedResponse([], 20, 1, 10);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('TC-SDK-023: should handle large page sizes', () => {
      const result = buildPaginatedResponse([], 5, 1, 100);
      expect(result.pagination.totalPages).toBe(1);
    });
  });
});

// ==================== 敏感数据脱敏 ====================
describe('Sensitive Data Masking', () => {
  describe('maskSensitive', () => {
    it('TC-SDK-030: should mask value showing last 4 chars by default', () => {
      const result = maskSensitive('1234567890');
      expect(result).toBe('******7890');
    });

    it('TC-SDK-031: should handle empty/null value', () => {
      expect(maskSensitive('')).toBe('***');
    });

    it('TC-SDK-032: should handle short value', () => {
      const result = maskSensitive('ab');
      expect(result).toBe('***');
    });

    it('TC-SDK-033: should support showFirst option', () => {
      const result = maskSensitive('1234567890', { showFirst: 3, showLast: 2 });
      expect(result).toBe('123*****90');
    });

    it('TC-SDK-034: should support custom mask character', () => {
      const result = maskSensitive('1234567890', { showLast: 4, maskChar: '#' });
      expect(result).toBe('######7890');
    });
  });

  describe('maskPassword', () => {
    it('TC-SDK-035: should always return fixed mask', () => {
      expect(maskPassword('password123')).toBe('******');
      expect(maskPassword('')).toBe('******');
    });
  });

  describe('maskToken', () => {
    it('TC-SDK-036: should mask token showing first and last 4 chars', () => {
      const result = maskToken('abcdef1234567890');
      expect(result).toBe('abcd********7890');
    });

    it('TC-SDK-037: should handle short token', () => {
      expect(maskToken('short')).toBe('***');
    });
  });

  describe('maskPhone', () => {
    it('TC-SDK-038: should mask phone number', () => {
      const result = maskPhone('13812345678');
      expect(result).toBe('138****5678');
    });

    it('TC-SDK-039: should handle short phone', () => {
      expect(maskPhone('123')).toBe('***');
    });
  });

  describe('maskEmail', () => {
    it('TC-SDK-040: should mask email local part', () => {
      const result = maskEmail('test@example.com');
      expect(result).toBe('t***t@example.com');
    });

    it('TC-SDK-041: should handle short local part', () => {
      const result = maskEmail('a@example.com');
      expect(result).toBe('a***@example.com');
    });

    it('TC-SDK-042: should handle invalid email', () => {
      expect(maskEmail('invalid')).toBe('***');
    });
  });

  describe('maskSensitive numeric options', () => {
    it('TC-SDK-043: should accept number as showLast option', () => {
      const result = maskSensitive('1234567890', 4);
      expect(result).toBe('******7890');
    });
  });
});

// ==================== 通用工具函数 ====================
describe('Utility Functions', () => {
  describe('deepFreeze', () => {
    it('TC-SDK-050: should freeze object', () => {
      const obj = deepFreeze({ a: { b: 1 } });
      expect(Object.isFrozen(obj)).toBe(true);
      expect(Object.isFrozen(obj.a)).toBe(true);
    });
  });

  describe('safeJsonParse', () => {
    it('TC-SDK-051: should parse valid JSON', () => {
      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    });

    it('TC-SDK-052: should return fallback for invalid JSON', () => {
      expect(safeJsonParse('invalid', { default: true })).toEqual({ default: true });
    });
  });

  describe('delay', () => {
    it('TC-SDK-053: should resolve after specified ms', async () => {
      jest.useRealTimers();
      const start = Date.now();
      await delay(10);
      expect(Date.now() - start).toBeGreaterThanOrEqual(0);
      jest.useFakeTimers();
    });
  });

  describe('retry', () => {
    it('TC-SDK-054: should succeed on first try', async () => {
      jest.useRealTimers();
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retry(fn, 0, 0);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      jest.useFakeTimers();
    });

    it('TC-SDK-055: should retry on failure and succeed', async () => {
      jest.useRealTimers();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');
      const result = await retry(fn, 2, 0);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      jest.useFakeTimers();
    });

    it('TC-SDK-056: should throw after max retries', async () => {
      jest.useRealTimers();
      const fn = jest.fn().mockRejectedValue(new Error('always fail'));
      await expect(retry(fn, 1, 0)).rejects.toThrow('always fail');
      expect(fn).toHaveBeenCalledTimes(2);
      jest.useFakeTimers();
    });
  });
});

// ==================== 日期工具函数 ====================
describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('TC-SDK-060: should format date to YYYY-MM-DD', () => {
      expect(formatDate(new Date(2026, 0, 15))).toBe('2026-01-15');
    });

    it('TC-SDK-061: should format string date', () => {
      const result = formatDate('2026-06-15T10:30:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateTime', () => {
    it('TC-SDK-062: should format to YYYY-MM-DD HH:mm:ss', () => {
      const d = new Date(2026, 5, 15, 10, 30, 45);
      expect(formatDateTime(d)).toBe('2026-06-15 10:30:45');
    });
  });

  describe('startOfDay', () => {
    it('TC-SDK-063: should set time to 00:00:00.000', () => {
      const d = startOfDay(new Date(2026, 5, 15, 12, 30, 45, 500));
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
      expect(d.getMilliseconds()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('TC-SDK-064: should set time to 23:59:59.999', () => {
      const d = endOfDay(new Date(2026, 5, 15, 12, 30, 45, 500));
      expect(d.getHours()).toBe(23);
      expect(d.getMinutes()).toBe(59);
      expect(d.getSeconds()).toBe(59);
      expect(d.getMilliseconds()).toBe(999);
    });
  });

  describe('startOfMonth', () => {
    it('TC-SDK-065: should return first day of month', () => {
      const d = startOfMonth(2026, 6);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5); // 0-indexed
      expect(d.getDate()).toBe(1);
    });
  });

  describe('endOfMonth', () => {
    it('TC-SDK-066: should return last day of month', () => {
      const d = endOfMonth(2026, 6);
      expect(d.getDate()).toBe(30);
    });
  });
});

// ==================== 校验工具函数 ====================
describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('TC-SDK-070: should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('TC-SDK-071: should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('TC-SDK-072: should validate Chinese phone number', () => {
      expect(isValidPhone('13812345678')).toBe(true);
    });

    it('TC-SDK-073: should reject invalid phone', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('12345678901')).toBe(false);
    });
  });

  describe('isValidIp', () => {
    it('TC-SDK-074: should validate IPv4 address', () => {
      expect(isValidIp('192.168.1.1')).toBe(true);
    });

    it('TC-SDK-075: should reject invalid IP', () => {
      expect(isValidIp('999.999.999.999')).toBe(false);
      expect(isValidIp('invalid')).toBe(false);
    });
  });
});

// ==================== 加密工具函数 ====================
describe('Crypto Utilities', () => {
  describe('createHash256', () => {
    it('TC-SDK-080: should create SHA-256 hash', () => {
      const hash = createHash256('hello');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('TC-SDK-081: should produce consistent results', () => {
      expect(createHash256('hello')).toBe(createHash256('hello'));
    });
  });

  describe('createHashMd5', () => {
    it('TC-SDK-082: should create MD5 hash', () => {
      const hash = createHashMd5('hello');
      expect(hash).toHaveLength(32);
    });
  });

  describe('generateToken', () => {
    it('TC-SDK-083: should generate hex token of default length', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('TC-SDK-084: should generate unique tokens', () => {
      const t1 = generateToken();
      const t2 = generateToken();
      expect(t1).not.toBe(t2);
    });
  });
});

// ==================== 文件路径工具 ====================
describe('File Utilities', () => {
  describe('getFileExtension', () => {
    it('TC-SDK-090: should extract extension', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
      expect(getFileExtension('file.TXT')).toBe('txt');
    });

    it('TC-SDK-091: should return empty for no extension', () => {
      expect(getFileExtension('file')).toBe('');
    });
  });

  describe('getFileBasename', () => {
    it('TC-SDK-092: should extract basename without extension', () => {
      expect(getFileBasename('file.txt')).toBe('file');
    });

    it('TC-SDK-093: should return full name if no extension', () => {
      expect(getFileBasename('file')).toBe('file');
    });
  });
});

// ==================== 错误处理 ====================
describe('Error Handling', () => {
  describe('ScadaError base class', () => {
    it('TC-SDK-100: should have getHttpStatus method', () => {
      const err = new DataAcquisitionError('test');
      expect(err.getHttpStatus()).toBeDefined();
    });

    it('TC-SDK-101: should have getI18nKey method', () => {
      const err = new DataAcquisitionError('test');
      expect(err.getI18nKey()).toBe('error.data.acquisition_failed');
    });

    it('TC-SDK-102: should serialize to JSON', () => {
      const err = new DataAcquisitionError('test');
      const json = err.toJSON();
      expect(json.code).toBe('DATA_001');
      expect(json.message).toBe('test');
      expect(json.category).toBe('data');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('BusinessException', () => {
    it('TC-SDK-103: should create with code and message', () => {
      const err = new BusinessException('CUSTOM_001', 'Custom error');
      expect(err.code).toBe('CUSTOM_001');
      expect(err.message).toBe('Custom error');
      expect(err.category).toBe('business');
    });

    it('TC-SDK-104: should support details', () => {
      const err = new BusinessException('CUSTOM_001', 'Error', { details: { field: 'name' } });
      expect(err.details).toEqual({ field: 'name' });
    });
  });

  describe('AuthenticationException', () => {
    it('TC-SDK-105: should have correct code', () => {
      const err = new AuthenticationException();
      expect(err.code).toBe('AUTH_001');
    });
  });

  describe('ForbiddenException', () => {
    it('TC-SDK-106: should have correct code', () => {
      const err = new ForbiddenException();
      expect(err.code).toBe('AUTH_002');
    });
  });

  describe('ValidationException', () => {
    it('TC-SDK-107: should have correct code and details', () => {
      const err = new ValidationException('Invalid input', { field: 'email' });
      expect(err.code).toBe('VALIDATION_001');
      expect(err.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundException', () => {
    it('TC-SDK-108: should format message with resource and id', () => {
      const err = new NotFoundException('Device', 'dev-001');
      expect(err.message).toContain('Device');
      expect(err.message).toContain('dev-001');
    });
  });

  describe('Device Errors', () => {
    it('TC-SDK-109: DeviceOfflineError should format message', () => {
      const err = new DeviceOfflineError('dev-001');
      expect(err.message).toContain('dev-001');
      expect(err.code).toBe('DEV_002');
    });

    it('TC-SDK-110: DeviceReadError should format message', () => {
      const err = new DeviceReadError('dev-001', '40001', 'timeout');
      expect(err.message).toContain('dev-001');
      expect(err.message).toContain('40001');
      expect(err.message).toContain('timeout');
    });
  });

  describe('ProtocolTimeoutError', () => {
    it('TC-SDK-111: should format protocol and timeout', () => {
      const err = new ProtocolTimeoutError('modbus', 5000);
      expect(err.message).toContain('modbus');
      expect(err.message).toContain('5000');
    });
  });

  describe('DataPersistenceError', () => {
    it('TC-SDK-112: should be non-recoverable', () => {
      const err = new DataPersistenceError('postgres', 'connection lost');
      expect(err.recoverable).toBe(false);
      expect(err.severity).toBe('fatal');
    });
  });

  describe('ConfigError', () => {
    it('TC-SDK-113: should format key and detail', () => {
      const err = new ConfigError('db.host', 'invalid value');
      expect(err.message).toContain('db.host');
    });
  });

  describe('ERROR_CODE_HTTP_STATUS', () => {
    it('TC-SDK-114: should have mapping for all error codes', () => {
      expect(ERROR_CODE_HTTP_STATUS['DATA_001']).toBeDefined();
      expect(ERROR_CODE_HTTP_STATUS['DEV_001']).toBeDefined();
      expect(ERROR_CODE_HTTP_STATUS['ALM_001']).toBeDefined();
      expect(ERROR_CODE_HTTP_STATUS['SYS_001']).toBeDefined();
      expect(ERROR_CODE_HTTP_STATUS['AUTH_001']).toBeDefined();
    });
  });

  describe('ERROR_CODE_I18N_KEY', () => {
    it('TC-SDK-115: should have i18n key for all error codes', () => {
      expect(ERROR_CODE_I18N_KEY['DATA_001']).toBeDefined();
      expect(ERROR_CODE_I18N_KEY['DEV_001']).toBeDefined();
      expect(ERROR_CODE_I18N_KEY['AUTH_001']).toBeDefined();
    });
  });

  describe('TokenExpiredException', () => {
    it('TC-SDK-116: should have correct code AUTH_003', () => {
      const err = new TokenExpiredException();
      expect(err.code).toBe('AUTH_003');
      expect(err.category).toBe('auth');
    });
  });

  describe('DataQualityError', () => {
    it('TC-SDK-117: should have correct code DATA_004 and format message', () => {
      const err = new DataQualityError('tag-001', DataQuality.BAD);
      expect(err.code).toBe('DATA_004');
      expect(err.message).toContain('tag-001');
      expect(err.message).toContain('bad');
      expect(err.severity).toBe('warn');
    });
  });

  describe('AlarmError', () => {
    it('TC-SDK-118: should have correct code ALM_001', () => {
      const err = new AlarmError('threshold exceeded');
      expect(err.code).toBe('ALM_001');
      expect(err.category).toBe('alarm');
      expect(err.message).toContain('threshold exceeded');
    });
  });

  describe('AlarmNotificationError', () => {
    it('TC-SDK-119: should have correct code ALM_002', () => {
      const err = new AlarmNotificationError('email', 'smtp timeout');
      expect(err.code).toBe('ALM_002');
      expect(err.message).toContain('email');
      expect(err.message).toContain('smtp timeout');
    });
  });

  describe('SystemError', () => {
    it('TC-SDK-120: should be non-recoverable and fatal', () => {
      const err = new SystemError('kernel panic');
      expect(err.code).toBe('SYS_001');
      expect(err.category).toBe('system');
      expect(err.severity).toBe('fatal');
      expect(err.recoverable).toBe(false);
      expect(err.message).toContain('kernel panic');
    });
  });

  describe('StorageError', () => {
    it('TC-SDK-121: should have correct code SYS_003', () => {
      const err = new StorageError('influxdb', 'connection lost');
      expect(err.code).toBe('SYS_003');
      expect(err.message).toContain('influxdb');
      expect(err.message).toContain('connection lost');
    });
  });

  describe('DeviceError base class', () => {
    it('TC-SDK-122: should have correct code DEV_001', () => {
      const err = new DeviceError('generic device failure');
      expect(err.code).toBe('DEV_001');
      expect(err.category).toBe('device');
      expect(err.recoverable).toBe(true);
      expect(err.message).toContain('generic device failure');
    });
  });
});
