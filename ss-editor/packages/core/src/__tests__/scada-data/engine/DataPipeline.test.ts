// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { DataPipeline } from '../../../scada-data/engine/DataPipeline';
import type { DataFilter } from '../../../scada-data/types/pipeline.types';

function makeFilter(overrides: Partial<DataFilter> = {}): DataFilter {
  const baseType = (overrides.type || 'typeConvert') as string;
  const filter: DataFilter = {
    id: 'filter-1',
    name: 'Test Filter',
    type: baseType as any,
    config: { type: baseType, targetType: 'number', enabled: true } as any,
    enabled: true,
    order: 0,
  };
  // Merge overrides, ensuring nested config type is preserved
  const merged = { ...filter, ...overrides };
  if (overrides.config) {
    merged.config = { type: baseType, ...overrides.config } as any;
  } else if (overrides.type) {
    // Ensure config.type stays in sync with filter.type
    (merged.config as any).type = overrides.type;
  }
  return merged;
}

describe('DataPipeline', () => {
  let pipeline: DataPipeline;

  beforeEach(() => {
    pipeline = new DataPipeline();
  });

  // ==================== registerFilter ====================
  describe('registerFilter', () => {
    it('TC-DPL-001: should register a filter and return filter id', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'number', enabled: true } as any });
      const id = pipeline.registerFilter(filter);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('TC-DPL-002: should register multiple filters', () => {
      const f1 = makeFilter({ id: 'f1', name: 'F1', type: 'typeConvert', config: { targetType: 'number', enabled: true } as any, order: 0 });
      const f2 = makeFilter({ id: 'f2', name: 'F2', type: 'typeConvert', config: { targetType: 'string', enabled: true } as any, order: 1 });
      pipeline.registerFilter(f1);
      pipeline.registerFilter(f2);
      expect(pipeline.getFilters()).toHaveLength(2);
    });

    it('TC-DPL-003: should sort filters by order', () => {
      const f1 = makeFilter({ id: 'f1', name: 'F1', type: 'typeConvert', config: { targetType: 'number', enabled: true } as any, order: 10 });
      const f2 = makeFilter({ id: 'f2', name: 'F2', type: 'typeConvert', config: { targetType: 'string', enabled: true } as any, order: 1 });
      pipeline.registerFilter(f1);
      pipeline.registerFilter(f2);
      const filters = pipeline.getFilters();
      expect(filters[0].order).toBeLessThanOrEqual(filters[1].order);
    });
  });

  // ==================== removeFilter ====================
  describe('removeFilter', () => {
    it('TC-DPL-010: should remove filter by instance id', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'number', enabled: true } as any });
      const id = pipeline.registerFilter(filter);
      pipeline.removeFilter(id);
      expect(pipeline.getFilters()).toHaveLength(0);
    });

    it('TC-DPL-011: should be idempotent for non-existent filter', () => {
      expect(() => pipeline.removeFilter('non-existent')).not.toThrow();
    });
  });

  // ==================== getFilters ====================
  describe('getFilters', () => {
    it('TC-DPL-020: should return all registered filters', () => {
      const filter = makeFilter({ name: 'MyFilter', type: 'typeConvert', config: { targetType: 'number', enabled: true } as any });
      pipeline.registerFilter(filter);
      const filters = pipeline.getFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0].name).toBe('MyFilter');
    });

    it('TC-DPL-021: should return empty array when no filters', () => {
      expect(pipeline.getFilters()).toEqual([]);
    });
  });

  // ==================== setFilterEnabled ====================
  describe('setFilterEnabled', () => {
    it('TC-DPL-030: should enable/disable filter', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'number', enabled: true } as any });
      const id = pipeline.registerFilter(filter);
      pipeline.setFilterEnabled(id, false);
      const filters = pipeline.getFilters();
      expect(filters[0].enabled).toBe(false);
    });
  });

  // ==================== moveFilter ====================
  describe('moveFilter', () => {
    it('TC-DPL-040: should move filter to new order position', () => {
      const f1 = makeFilter({ id: 'f1', name: 'F1', type: 'typeConvert', config: { targetType: 'number', enabled: true } as any, order: 0 });
      const f2 = makeFilter({ id: 'f2', name: 'F2', type: 'typeConvert', config: { targetType: 'string', enabled: true } as any, order: 1 });
      const f3 = makeFilter({ id: 'f3', name: 'F3', type: 'typeConvert', config: { targetType: 'boolean', enabled: true } as any, order: 2 });
      const id1 = pipeline.registerFilter(f1);
      pipeline.registerFilter(f2);
      pipeline.registerFilter(f3);
      pipeline.moveFilter(id1, 1);
      const filters = pipeline.getFilters();
      expect(filters[0].name).toBe('F2');
      expect(filters[1].name).toBe('F1');
    });
  });

  // ==================== executeChain ====================
  describe('executeChain', () => {
    it('TC-DPL-050: should execute typeConvert filter (number)', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'number', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('123', 'tag-1');
      expect(result.success).toBe(true);
      expect(result.output).toBe(123);
    });

    it('TC-DPL-051: should execute typeConvert filter (string)', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'string', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(123, 'tag-1');
      expect(result.output).toBe('123');
    });

    it('TC-DPL-052: should execute scaleTransform filter', () => {
      const filter = makeFilter({ type: 'scaleTransform', config: { scale: 2, offset: 10, enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(5, 'tag-1');
      expect(result.output).toBe(20);
    });

    it('TC-DPL-053: should execute deadband filter', () => {
      const filter = makeFilter({ type: 'deadband', config: { threshold: 5, enabled: true } as any });
      pipeline.registerFilter(filter);
      const result1 = pipeline.executeChain(100, 'tag-1');
      expect(result1.output).toBe(100);
      const result2 = pipeline.executeChain(102, 'tag-1');
      expect(result2.output).toBe(100);
    });

    it('TC-DPL-054: should execute deadband - change outside threshold', () => {
      const filter = makeFilter({ type: 'deadband', config: { threshold: 5, enabled: true } as any });
      pipeline.registerFilter(filter);
      pipeline.executeChain(100, 'tag-1');
      const result = pipeline.executeChain(110, 'tag-1');
      expect(result.output).toBe(110);
    });

    it('TC-DPL-055: should execute format filter (decimal)', () => {
      const filter = makeFilter({ type: 'format', config: { precision: 2, formatType: 'decimal', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(3.14159, 'tag-1');
      expect(result.output).toBe('3.14');
    });

    it('TC-DPL-056: should execute format filter (percent)', () => {
      const filter = makeFilter({ type: 'format', config: { precision: 1, formatType: 'percent', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(0.856, 'tag-1');
      expect(result.output).toBe('85.6%');
    });

    it('TC-DPL-057: should execute format filter (currency)', () => {
      const filter = makeFilter({ type: 'format', config: { precision: 2, formatType: 'currency', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(99.5, 'tag-1');
      expect(result.output).toBe('¥99.50');
    });

    it('TC-DPL-058: should execute fieldExtract filter', () => {
      const filter = makeFilter({ type: 'fieldExtract', config: { jsonPath: 'data.value', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain({ data: { value: 42 } }, 'tag-1');
      expect(result.output).toBe(42);
    });

    it('TC-DPL-059: should execute custom script filter', () => {
      const filter = makeFilter({ type: 'custom', config: { script: 'return value * 3;', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(10, 'tag-1');
      expect(result.output).toBe(30);
    });

    it('TC-DPL-060: should chain multiple filters', () => {
      const f1 = makeFilter({ type: 'scaleTransform', config: { scale: 2, offset: 0, enabled: true } as any, order: 0 });
      const f2 = makeFilter({ type: 'typeConvert', config: { targetType: 'string', enabled: true } as any, order: 1 });
      pipeline.registerFilter(f1);
      pipeline.registerFilter(f2);
      const result = pipeline.executeChain(5, 'tag-1');
      expect(result.output).toBe('10');
    });

    it('TC-DPL-061: should skip disabled filters', () => {
      const f1 = makeFilter({ type: 'scaleTransform', config: { scale: 2, offset: 0, enabled: true } as any, order: 0 });
      const f2 = makeFilter({ type: 'typeConvert', config: { targetType: 'number', enabled: true } as any, order: 1 });
      pipeline.registerFilter(f1);
      const id2 = pipeline.registerFilter(f2);
      pipeline.setFilterEnabled(id2, false);
      const result = pipeline.executeChain(5, 'tag-1');
      expect(result.output).toBe(10);
    });

    it('TC-DPL-062: should handle empty pipeline', () => {
      const result = pipeline.executeChain('hello', 'tag-1');
      expect(result.success).toBe(true);
      expect(result.output).toBe('hello');
      expect(result.filters).toHaveLength(0);
    });
  });

  // ==================== error handling ====================
  describe('error handling', () => {
    it('TC-DPL-070: should stop on filter error by default', () => {
      const filter = makeFilter({ type: 'custom', config: { script: 'throw new Error("fail");', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('data', 'tag-1');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('TC-DPL-071: should skip on filter error when configured', () => {
      pipeline.configureError({ strategy: 'skip' });
      const filter = makeFilter({ type: 'custom', config: { script: 'throw new Error("fail");', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('data', 'tag-1');
      expect(result.success).toBe(true);
    });

    it('TC-DPL-072: should use defaultValue on filter error when configured', () => {
      pipeline.configureError({ strategy: 'defaultValue', defaultValue: 'fallback' });
      const filter = makeFilter({ type: 'custom', config: { script: 'throw new Error("fail");', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('data', 'tag-1');
      expect(result.success).toBe(true);
      expect(result.output).toBe('fallback');
    });
  });

  // ==================== filter scripts ====================
  describe('filter scripts', () => {
    it('TC-DPL-080: should execute filter script for tag', () => {
      pipeline.registerFilterScript('tag-1', 'return { tagId: "tag-1", tagName: "T1", value: data * 2, dataType: "int32", quality: "good", timestamp: Date.now(), raw: data, dataSourceId: "", dataSourceName: "", dataSourceType: "tag" };');
      const result = pipeline.executeFilter(10, 'tag-1', 'good', { tagName: 'T1', dataType: 'int32' });
      expect(result).not.toBeNull();
      if (result && 'value' in result) {
        expect(result.value).toBe(20);
      }
    });

    it('TC-DPL-081: should return default data point when no filter script', () => {
      const result = pipeline.executeFilter(42, 'tag-1', 'good', { tagName: 'T1' });
      expect(result).not.toBeNull();
      if (result && 'value' in result) {
        expect(result.value).toBe(42);
      }
    });

    it('TC-DPL-082: should handle filter script error gracefully', () => {
      pipeline.registerFilterScript('tag-1', 'throw new Error("script error");');
      const result = pipeline.executeFilter(10, 'tag-1', 'good', { tagName: 'T1' });
      expect(result).not.toBeNull();
    });
  });

  // ==================== shouldUpdate / isChanged ====================
  describe('shouldUpdate / isChanged', () => {
    it('TC-DPL-090: should return true when no previous data', () => {
      const next = {
        tagId: 'tag-1', tagName: 'T1', dataSourceId: '', dataSourceName: '',
        dataSourceType: 'tag' as const, value: 42, dataType: 'int32' as const,
        quality: 'good' as const, timestamp: Date.now(), raw: 42,
      };
      expect(pipeline.isChanged('tag-1', next)).toBe(true);
    });
  });

  // ==================== clear ====================
  describe('clear', () => {
    it('TC-DPL-100: should clear all filters and state', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'number', enabled: true } as any });
      pipeline.registerFilter(filter);
      pipeline.clear();
      expect(pipeline.getFilters()).toHaveLength(0);
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-DPL-110: should handle null input for typeConvert', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'number', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(null, 'tag-1');
      expect(result.output).toBeNull();
    });

    it('TC-DPL-111: should handle fieldExtract with null input', () => {
      const filter = makeFilter({ type: 'fieldExtract', config: { jsonPath: 'a.b', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(null, 'tag-1');
      expect(result.output).toBeNull();
    });

    it('TC-DPL-112: should handle scaleTransform with non-numeric input', () => {
      const filter = makeFilter({ type: 'scaleTransform', config: { scale: 2, offset: 0, enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('abc', 'tag-1');
      expect(result.output).toBe(0);
    });

    it('TC-DPL-113: should handle format with non-number input', () => {
      const filter = makeFilter({ type: 'format', config: { precision: 2, formatType: 'decimal', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('hello', 'tag-1');
      expect(result.output).toBe('hello');
    });

    it('TC-DPL-114: should handle deadband with non-number input', () => {
      const filter = makeFilter({ type: 'deadband', config: { threshold: 5, enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('hello', 'tag-1');
      expect(result.output).toBe('hello');
    });

    it('TC-DPL-115: should handle unknown filter type gracefully', () => {
      const filter = makeFilter({ type: 'unknown' as any, config: { enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(42, 'tag-1');
      expect(result.output).toBe(42);
    });

    it('TC-DPL-116: should handle typeConvert to boolean', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'boolean', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain(1, 'tag-1');
      expect(result.output).toBe(true);
    });

    it('TC-DPL-117: should handle typeConvert to json', () => {
      const filter = makeFilter({ type: 'typeConvert', config: { targetType: 'json', enabled: true } as any });
      pipeline.registerFilter(filter);
      const result = pipeline.executeChain('{"a":1}', 'tag-1');
      expect(result.output).toEqual({ a: 1 });
    });
  });
});