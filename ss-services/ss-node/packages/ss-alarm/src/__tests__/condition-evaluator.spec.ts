// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @ss-node/ss-device — entity 文件中 import DataTag 需要
// ============================================================
jest.mock('@ss-node/ss-device', () => ({
  DataTag: class {},
  Device: class {},
  DeviceGroup: class {},
  DeviceModule: class {},
  DeviceService: class {},
  TagDataType: {},
  DeadbandMode: {},
  ConversionType: {},
}));

// ============================================================
// Mock @ss-node/ss-sdk — entity 文件中 import enums 需要
// ============================================================
jest.mock('@ss-node/ss-sdk', () => ({
  AlarmLevel: { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'critical' },
  AlarmStatus: {
    ACTIVE: 'active',
    ACKNOWLEDGED: 'acknowledged',
    CLEARED: 'cleared',
    SHELVED: 'shelved',
  },
  AlarmCondition: {
    GT: 'gt',
    LT: 'lt',
    EQ: 'eq',
    NEQ: 'neq',
    GTE: 'gte',
    LTE: 'lte',
    RANGE_IN: 'range_in',
    RANGE_OUT: 'range_out',
    RANGE: 'range',
  },
  DataQuality: {
    GOOD: 'good',
    BAD: 'bad',
    UNCERTAIN: 'uncertain',
    COMM_ERROR: 'comm_error',
    CONFIG_ERROR: 'config_error',
    OUT_OF_RANGE: 'out_of_range',
    STALE: 'stale',
    MANUAL: 'manual',
    SIMULATED: 'simulated',
    INITIALIZING: 'initializing',
  },
  DeviceStatus: {
    OFFLINE: 'offline',
    CONNECTING: 'connecting',
    ONLINE: 'online',
    DEGRADED: 'degraded',
    ERROR: 'error',
  },
  DeviceType: {
    MODBUS_TCP: 'modbus_tcp',
    MODBUS_RTU: 'modbus_rtu',
    OPC_UA: 'opc_ua',
    MQTT: 'mqtt',
  },
  SortOrder: { ASC: 'ASC', DESC: 'DESC' },
  PaginationDto: class {},
}));

import { ConditionEvaluator } from '../engine/condition-evaluator';
import { AlarmCondition } from '../entities/alarm.entity';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
  });

  // ==================== GT ====================
  describe('GT (>)', () => {
    it('TC-ALM-COND-001: should return true when value is greater than threshold', () => {
      expect(evaluator.evaluate(95, AlarmCondition.GT, 80)).toBe(true);
    });

    it('TC-ALM-COND-002: should return false when value equals threshold', () => {
      expect(evaluator.evaluate(80, AlarmCondition.GT, 80)).toBe(false);
    });

    it('TC-ALM-COND-003: should return false when value is less than threshold', () => {
      expect(evaluator.evaluate(70, AlarmCondition.GT, 80)).toBe(false);
    });
  });

  // ==================== LT ====================
  describe('LT (<)', () => {
    it('TC-ALM-COND-010: should return true when value is less than threshold', () => {
      expect(evaluator.evaluate(0.1, AlarmCondition.LT, 1.0)).toBe(true);
    });

    it('TC-ALM-COND-011: should return false when value equals threshold', () => {
      expect(evaluator.evaluate(80, AlarmCondition.LT, 80)).toBe(false);
    });
  });

  // ==================== GTE / LTE ====================
  describe('GTE / LTE (>= / <=)', () => {
    it('TC-ALM-COND-020: should return true when value equals threshold for GTE', () => {
      expect(evaluator.evaluate(80, AlarmCondition.GTE, 80)).toBe(true);
    });

    it('TC-ALM-COND-021: should return true when value equals threshold for LTE', () => {
      expect(evaluator.evaluate(80, AlarmCondition.LTE, 80)).toBe(true);
    });

    it('TC-ALM-COND-022: should return false when value greater than threshold for LTE', () => {
      expect(evaluator.evaluate(95, AlarmCondition.LTE, 80)).toBe(false);
    });
  });

  // ==================== EQ / NEQ ====================
  describe('EQ / NEQ (== / !=)', () => {
    it('TC-ALM-COND-030: should return true when values match within tolerance for EQ', () => {
      expect(evaluator.evaluate(80, AlarmCondition.EQ, 80)).toBe(true);
    });

    it('TC-ALM-COND-031: should return true when values differ for NEQ', () => {
      expect(evaluator.evaluate(95, AlarmCondition.NEQ, 80)).toBe(true);
    });

    it('TC-ALM-COND-032: should return false when values match for NEQ', () => {
      expect(evaluator.evaluate(80, AlarmCondition.NEQ, 80)).toBe(false);
    });
  });

  // ==================== RANGE_IN / RANGE_OUT ====================
  describe('RANGE_IN / RANGE_OUT (between)', () => {
    it('TC-ALM-COND-040: should return true when value is within range for RANGE_IN', () => {
      expect(evaluator.evaluate(50, AlarmCondition.RANGE_IN, [10, 100])).toBe(true);
    });

    it('TC-ALM-COND-041: should return false when value is outside range for RANGE_IN', () => {
      expect(evaluator.evaluate(150, AlarmCondition.RANGE_IN, [10, 100])).toBe(false);
    });

    it('TC-ALM-COND-042: should return true when value is outside range for RANGE_OUT', () => {
      expect(evaluator.evaluate(150, AlarmCondition.RANGE_OUT, [10, 100])).toBe(true);
    });

    it('TC-ALM-COND-043: should return false when value is within range for RANGE_OUT', () => {
      expect(evaluator.evaluate(50, AlarmCondition.RANGE_OUT, [10, 100])).toBe(false);
    });
  });

  // ==================== Type parsing ====================
  describe('type parsing', () => {
    it('TC-ALM-COND-050: should parse string threshold to number', () => {
      expect(evaluator.evaluate(95, AlarmCondition.GT, '80')).toBe(true);
    });

    it('TC-ALM-COND-051: should parse boolean threshold to numeric (1/0)', () => {
      expect(evaluator.evaluate(1, AlarmCondition.EQ, true)).toBe(true);
      expect(evaluator.evaluate(0, AlarmCondition.EQ, false)).toBe(true);
    });
  });

  // ==================== Error handling ====================
  describe('error handling', () => {
    it('TC-ALM-COND-060: should return false for unknown condition', () => {
      expect(evaluator.evaluate(95, 'unknown_op' as any, 80)).toBe(false);
    });

    it('TC-ALM-COND-061: should return false when range value is not an array', () => {
      expect(evaluator.evaluate(50, AlarmCondition.RANGE_IN, 80)).toBe(false);
    });

    it('TC-ALM-COND-062: should return false when conditionValue cannot be parsed as numeric', () => {
      expect(evaluator.evaluate(95, AlarmCondition.GT, { foo: 'bar' } as any)).toBe(false);
    });
  });
});
