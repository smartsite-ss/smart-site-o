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

import { AlarmDebouncer } from '../engine/alarm-debouncer';

describe('AlarmDebouncer', () => {
  let debouncer: AlarmDebouncer;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T10:00:00Z'));
    debouncer = new AlarmDebouncer();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==================== No debounce requirement ====================
  describe('no debounce requirement', () => {
    it('TC-ALM-DEB-001: should trigger immediately when debounceMs is 0', () => {
      const result = debouncer.check('rule-001', 'tag-001', 95, 0);
      expect(result).toBe('trigger');
    });

    it('TC-ALM-DEB-002: should trigger immediately when debounceMs is negative', () => {
      const result = debouncer.check('rule-001', 'tag-001', 95, -1);
      expect(result).toBe('trigger');
    });

    it('TC-ALM-DEB-003: should trigger immediately when both debounceMs and debounceCount are 0', () => {
      const result = debouncer.check('rule-001', 'tag-001', 95, 0, 0);
      expect(result).toBe('trigger');
    });
  });

  // ==================== Duration debounce ====================
  describe('duration debounce', () => {
    it('TC-ALM-DEB-010: should return debouncing on first trigger', () => {
      const result = debouncer.check('rule-001', 'tag-001', 95, 5000);
      expect(result).toBe('debouncing');
      expect(debouncer.getDebouncingCount()).toBe(1);
    });

    it('TC-ALM-DEB-011: should trigger after debounce duration elapses', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(5000);

      const result = debouncer.check('rule-001', 'tag-001', 96, 5000);
      expect(result).toBe('trigger');
      expect(debouncer.getDebouncingCount()).toBe(0);
    });

    it('TC-ALM-DEB-012: should remain debouncing before duration elapses', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(3000);

      const result = debouncer.check('rule-001', 'tag-001', 96, 5000);
      expect(result).toBe('debouncing');
      expect(debouncer.getDebouncingCount()).toBe(1);
    });

    it('TC-ALM-DEB-013: should trigger exactly at the boundary of debounce duration', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(4999);
      // 差 1ms，仍未满足
      let result = debouncer.check('rule-001', 'tag-001', 96, 5000);
      expect(result).toBe('debouncing');

      jest.advanceTimersByTime(1);
      // 刚好满 5000ms
      result = debouncer.check('rule-001', 'tag-001', 97, 5000);
      expect(result).toBe('trigger');
    });
  });

  // ==================== Count debounce ====================
  describe('count debounce', () => {
    it('TC-ALM-DEB-020: should trigger after count threshold with no time requirement', () => {
      debouncer.check('rule-001', 'tag-001', 95, 0, 3);
      debouncer.check('rule-001', 'tag-001', 96, 0, 3);
      const result = debouncer.check('rule-001', 'tag-001', 97, 0, 3);
      expect(result).toBe('trigger');
      expect(debouncer.getDebouncingCount()).toBe(0);
    });

    it('TC-ALM-DEB-021: should not trigger before count threshold', () => {
      debouncer.check('rule-001', 'tag-001', 95, 0, 3);
      const result = debouncer.check('rule-001', 'tag-001', 96, 0, 3);
      expect(result).toBe('debouncing');
      expect(debouncer.getDebouncingCount()).toBe(1);
    });

    it('TC-ALM-DEB-022: should trigger immediately when debounceCount is 1', () => {
      const result = debouncer.check('rule-001', 'tag-001', 95, 0, 1);
      expect(result).toBe('trigger');
      expect(debouncer.getDebouncingCount()).toBe(0);
    });
  });

  // ==================== Combined debounce (time + count) ====================
  describe('combined debounce (time + count)', () => {
    it('TC-ALM-DEB-030: should trigger only when both time and count are satisfied', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000, 3);
      jest.advanceTimersByTime(6000); // 时间满足
      debouncer.check('rule-001', 'tag-001', 96, 5000, 3); // count=2
      expect(debouncer.getDebouncingCount()).toBe(1); // 次数未满

      const result = debouncer.check('rule-001', 'tag-001', 97, 5000, 3); // count=3
      expect(result).toBe('trigger');
    });

    it('TC-ALM-DEB-031: should not trigger when count satisfied but time not', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000, 2);
      debouncer.check('rule-001', 'tag-001', 96, 5000, 2); // count=2 satisfied
      // 但时间未满 5000ms
      expect(debouncer.getDebouncingCount()).toBe(1);
    });

    it('TC-ALM-DEB-032: should not trigger when time satisfied but count not', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000, 5);
      jest.advanceTimersByTime(6000); // 时间满足
      debouncer.check('rule-001', 'tag-001', 96, 5000, 5); // count=2
      expect(debouncer.getDebouncingCount()).toBe(1);
    });
  });

  // ==================== Same value handling ====================
  describe('same value handling', () => {
    it('TC-ALM-DEB-040: should return no_change when same value is sent again', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      const result = debouncer.check('rule-001', 'tag-001', 95, 5000);
      expect(result).toBe('no_change');
    });

    it('TC-ALM-DEB-041: should treat values within 0.001 tolerance as same', () => {
      debouncer.check('rule-001', 'tag-001', 95.0005, 5000);
      const result = debouncer.check('rule-001', 'tag-001', 95.0001, 5000);
      expect(result).toBe('no_change');
    });

    it('TC-ALM-DEB-042: should treat values beyond 0.001 tolerance as different', () => {
      debouncer.check('rule-001', 'tag-001', 95.0, 5000);
      const result = debouncer.check('rule-001', 'tag-001', 95.002, 5000);
      expect(result).toBe('debouncing');
    });
  });

  // ==================== Clear / cancel ====================
  describe('clear / cancel', () => {
    it('TC-ALM-DEB-050: should clear debounce entry when value returns to normal', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      expect(debouncer.getDebouncingCount()).toBe(1);

      debouncer.clear('rule-001', 'tag-001');
      expect(debouncer.getDebouncingCount()).toBe(0);
    });

    it('TC-ALM-DEB-051: should start fresh debounce after clear', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      debouncer.clear('rule-001', 'tag-001');

      const result = debouncer.check('rule-001', 'tag-001', 95, 5000);
      expect(result).toBe('debouncing');
    });

    it('TC-ALM-DEB-052: clear on non-existent entry should not throw', () => {
      expect(() => debouncer.clear('nonexistent', 'tag-001')).not.toThrow();
      expect(debouncer.getDebouncingCount()).toBe(0);
    });
  });

  // ==================== Multiple rules / tags ====================
  describe('multiple rules and tags', () => {
    it('TC-ALM-DEB-060: should track debounce state independently per rule+tag pair', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      debouncer.check('rule-001', 'tag-002', 95, 5000);
      debouncer.check('rule-002', 'tag-001', 95, 5000);

      expect(debouncer.getDebouncingCount()).toBe(3);
    });

    it('TC-ALM-DEB-061: should clear only the specified rule+tag pair', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      debouncer.check('rule-002', 'tag-001', 95, 5000);

      debouncer.clear('rule-001', 'tag-001');
      expect(debouncer.getDebouncingCount()).toBe(1);
    });

    it('TC-ALM-DEB-062: should allow independent triggering for different rule+tag pairs', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(5000);
      const result1 = debouncer.check('rule-001', 'tag-001', 96, 5000);
      expect(result1).toBe('trigger');

      // rule-002 仍处于消抖中
      debouncer.check('rule-002', 'tag-001', 95, 5000);
      expect(debouncer.getDebouncingCount()).toBe(1);
    });
  });

  // ==================== Oscillation scenario (震荡场景) ====================
  describe('oscillation scenario', () => {
    it('TC-ALM-DEB-070: should handle value oscillation around threshold', () => {
      // 模拟值在阈值附近快速上下波动
      debouncer.check('rule-001', 'tag-001', 95, 3000, 3);
      jest.advanceTimersByTime(1000);
      debouncer.check('rule-001', 'tag-001', 94, 3000, 3); // 下降
      jest.advanceTimersByTime(1000);
      debouncer.check('rule-001', 'tag-001', 96, 3000, 3); // 上升
      jest.advanceTimersByTime(1000);
      // 时间满 3000ms，次数满 3 次
      const result = debouncer.check('rule-001', 'tag-001', 97, 3000, 3);
      expect(result).toBe('trigger');
    });

    it('TC-ALM-DEB-071: should handle value recovery during debounce window', () => {
      // 值恢复正常后，消抖被取消，重新触发时从头开始
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(2000);
      debouncer.clear('rule-001', 'tag-001'); // 值恢复正常

      // 重新触发
      const result = debouncer.check('rule-001', 'tag-001', 95, 5000);
      expect(result).toBe('debouncing'); // 从头开始消抖
      expect(debouncer.getDebouncingCount()).toBe(1);
    });

    it('TC-ALM-DEB-072: should handle rapid value changes during debounce', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000, 5);
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(500);
        debouncer.check('rule-001', 'tag-001', 95 + i, 5000, 5);
      }
      // 时间满 5000ms，次数满 5 次
      expect(debouncer.getDebouncingCount()).toBe(0); // 应该已触发
    });
  });

  // ==================== Concurrent debounce for same tag ====================
  describe('concurrent debounce for same tag', () => {
    it('TC-ALM-DEB-080: should handle multiple rules on same tag independently', () => {
      // 同一标签有多个报警规则，各自独立消抖
      const r1 = debouncer.check('rule-high', 'tag-001', 95, 5000, 2);
      const r2 = debouncer.check('rule-critical', 'tag-001', 95, 3000, 3);

      expect(r1).toBe('debouncing');
      expect(r2).toBe('debouncing');
      expect(debouncer.getDebouncingCount()).toBe(2);

      // rule-high: 时间满 5000ms，次数满 2
      jest.advanceTimersByTime(5000);
      const r1Result = debouncer.check('rule-high', 'tag-001', 96, 5000, 2);
      expect(r1Result).toBe('trigger');

      // rule-critical: 时间满 3000ms，但次数仅 2/3
      const r2Result = debouncer.check('rule-critical', 'tag-001', 96, 3000, 3);
      expect(r2Result).toBe('debouncing');
    });
  });

  // ==================== Cleanup stale entries ====================
  describe('cleanup stale entries', () => {
    it('TC-ALM-DEB-090: should clean up entries older than 24 hours', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);

      const cleaned = debouncer.cleanup();
      expect(cleaned).toBe(1);
      expect(debouncer.getDebouncingCount()).toBe(0);
    });

    it('TC-ALM-DEB-091: should not clean up entries within 24 hours', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(23 * 60 * 60 * 1000);

      const cleaned = debouncer.cleanup();
      expect(cleaned).toBe(0);
      expect(debouncer.getDebouncingCount()).toBe(1);
    });
  });

  // ==================== LRU eviction ====================
  describe('LRU eviction', () => {
    it('TC-ALM-DEB-100: should evict oldest entry when max entries reached', () => {
      const smallDebouncer = new AlarmDebouncer(3);

      smallDebouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(100);
      smallDebouncer.check('rule-002', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(100);
      smallDebouncer.check('rule-003', 'tag-001', 95, 5000);
      expect(smallDebouncer.getDebouncingCount()).toBe(3);

      // 第4个条目触发 LRU 淘汰
      smallDebouncer.check('rule-004', 'tag-001', 95, 5000);
      expect(smallDebouncer.getDebouncingCount()).toBe(3); // 仍为3，最旧的被淘汰

      const stats = smallDebouncer.getStats();
      expect(stats.evictedCount).toBe(1);
      expect(stats.maxEntriesReached).toBe(true);
    });

    it('TC-ALM-DEB-101: should evict least recently updated entry', () => {
      const smallDebouncer = new AlarmDebouncer(3);

      smallDebouncer.check('rule-001', 'tag-001', 95, 5000); // oldest
      jest.advanceTimersByTime(100);
      smallDebouncer.check('rule-002', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(100);
      smallDebouncer.check('rule-003', 'tag-001', 95, 5000);

      // 更新 rule-001（不再是 oldest）
      jest.advanceTimersByTime(100);
      smallDebouncer.check('rule-001', 'tag-001', 96, 5000);

      // 第4个条目触发淘汰，rule-002 应该被淘汰（现在是 oldest）
      smallDebouncer.check('rule-004', 'tag-001', 95, 5000);

      const entries = smallDebouncer.getDebouncingEntries();
      const ruleIds = entries.map((e) => e.ruleId);
      expect(ruleIds).not.toContain('rule-002');
      expect(ruleIds).toContain('rule-001');
      expect(ruleIds).toContain('rule-003');
      expect(ruleIds).toContain('rule-004');
    });
  });

  // ==================== Statistics ====================
  describe('statistics', () => {
    it('TC-ALM-DEB-110: should track check statistics correctly', () => {
      debouncer.check('rule-001', 'tag-001', 95, 0); // immediate trigger
      debouncer.check('rule-001', 'tag-001', 95, 5000); // debouncing start
      debouncer.check('rule-001', 'tag-001', 95, 5000); // no_change

      const stats = debouncer.getStats();
      expect(stats.totalChecks).toBe(3);
      expect(stats.immediateTriggers).toBe(1);
      expect(stats.noChangeCount).toBe(1);
      expect(stats.debouncingCount).toBe(1);
    });

    it('TC-ALM-DEB-111: should track debounced triggers', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      jest.advanceTimersByTime(5000);
      debouncer.check('rule-001', 'tag-001', 96, 5000);

      const stats = debouncer.getStats();
      expect(stats.debouncedTriggers).toBe(1);
    });

    it('TC-ALM-DEB-112: should track cleared count', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      debouncer.clear('rule-001', 'tag-001');

      const stats = debouncer.getStats();
      expect(stats.clearedCount).toBe(1);
    });

    it('TC-ALM-DEB-113: resetStats should reset all counters', () => {
      debouncer.check('rule-001', 'tag-001', 95, 0);
      debouncer.check('rule-002', 'tag-001', 95, 5000);
      debouncer.clear('rule-002', 'tag-001');

      debouncer.resetStats();
      const stats = debouncer.getStats();
      expect(stats.totalChecks).toBe(0);
      expect(stats.immediateTriggers).toBe(0);
      expect(stats.clearedCount).toBe(0);
      // debouncing entries should persist
      expect(stats.debouncingCount).toBe(0);
    });
  });

  // ==================== Debug inspection ====================
  describe('getDebouncingEntries', () => {
    it('TC-ALM-DEB-120: should return details for debugging', () => {
      debouncer.check('rule-001', 'tag-001', 95, 5000);
      const entries = debouncer.getDebouncingEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].ruleId).toBe('rule-001');
      expect(entries[0].tagId).toBe('tag-001');
      expect(entries[0].triggerCount).toBe(1);
      expect(entries[0].lastValue).toBe(95);
    });
  });
});
