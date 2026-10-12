// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionManager, type TagValueChangeHandler as _TagValueChangeHandler } from '../../../scada-data/engine/SubscriptionManager';
import type { IDataSourceDriver } from '../../../scada-data/drivers/IDataSourceDriver';
import type { TagValue as _TagValue } from '../../../scada-data/types/data-source.types';

function createMockDriver(): IDataSourceDriver {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onData: vi.fn(),
    offData: vi.fn(),
    getStatus: vi.fn().mockReturnValue('connected'),
    write: vi.fn().mockResolvedValue(undefined),
    getAvailableTags: vi.fn().mockReturnValue([]),
  };
}

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  // ==================== init ====================
  describe('init', () => {
    it('TC-SUB-001: should initialize with bindings and variables', () => {
      manager.init(
        [{ graphicId: 'g1', graphicName: 'G1', graphicType: 'text', tagId: 'tag-1' }],
        [{ tagId: 'tag-1', tagName: 'T1', dataSourceId: 'ds1', dataType: 'number' }],
      );
      const bindings = manager.getBindings();
      expect(bindings).toHaveLength(1);
      expect(bindings[0].tagId).toBe('tag-1');
      const meta = manager.getVariableMeta('tag-1');
      expect(meta).toBeDefined();
      expect(meta?.tagName).toBe('T1');
    });

    it('TC-SUB-002: should clear previous state on re-init', () => {
      manager.init(
        [{ graphicId: 'g1', graphicName: 'G1', graphicType: 'text', tagId: 'tag-1' }],
        [{ tagId: 'tag-1', tagName: 'T1', dataSourceId: 'ds1', dataType: 'number' }],
      );
      manager.init(
        [{ graphicId: 'g2', graphicName: 'G2', graphicType: 'rect', tagId: 'tag-2' }],
        [{ tagId: 'tag-2', tagName: 'T2', dataSourceId: 'ds2', dataType: 'string' }],
      );
      const bindings = manager.getBindings();
      expect(bindings).toHaveLength(1);
      expect(bindings[0].tagId).toBe('tag-2');
    });
  });

  // ==================== getBindings ====================
  describe('getBindings', () => {
    it('TC-SUB-010: should return empty array when no bindings', () => {
      expect(manager.getBindings()).toEqual([]);
    });

    it('TC-SUB-011: should return copy of bindings', () => {
      manager.init(
        [{ graphicId: 'g1', graphicName: 'G1', graphicType: 'text', tagId: 'tag-1' }],
        [],
      );
      const bindings = manager.getBindings();
      bindings.pop();
      expect(manager.getBindings()).toHaveLength(1);
    });
  });

  // ==================== getVariableMeta ====================
  describe('getVariableMeta', () => {
    it('TC-SUB-020: should return variable metadata', () => {
      manager.init([], [
        { tagId: 'tag-1', tagName: 'Temp', dataSourceId: 'ds1', dataType: 'float32', unit: '°C', minValue: 0, maxValue: 100 },
      ]);
      const meta = manager.getVariableMeta('tag-1');
      expect(meta).toBeDefined();
      expect(meta?.unit).toBe('°C');
      expect(meta?.minValue).toBe(0);
      expect(meta?.maxValue).toBe(100);
    });

    it('TC-SUB-021: should return undefined for non-existent tag', () => {
      expect(manager.getVariableMeta('non-existent')).toBeUndefined();
    });
  });

  // ==================== onTagValueChanged ====================
  describe('onTagValueChanged', () => {
    it('TC-SUB-030: should register handler and return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = manager.onTagValueChanged(handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('TC-SUB-031: should call handler when notifyTagValueChanged is called', () => {
      const handler = vi.fn();
      manager.onTagValueChanged(handler);
      manager.notifyTagValueChanged({
        tagId: 'tag-1',
        value: 42,
        previousValue: 0,
        quality: 'good',
        sourceId: 'test',
        timestamp: Date.now(),
      });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        tagId: 'tag-1',
        value: 42,
        previousValue: 0,
        quality: 'good',
        sourceId: 'test',
        timestamp: expect.any(Number),
      });
    });

    it('TC-SUB-032: should call all registered handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      manager.onTagValueChanged(handler1);
      manager.onTagValueChanged(handler2);
      manager.notifyTagValueChanged({
        tagId: 'tag-1', value: 42, previousValue: 0,
        quality: 'good', sourceId: 'test', timestamp: Date.now(),
      });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('TC-SUB-033: should not call unsubscribed handler', () => {
      const handler = vi.fn();
      const unsubscribe = manager.onTagValueChanged(handler);
      unsubscribe();
      manager.notifyTagValueChanged({
        tagId: 'tag-1', value: 42, previousValue: 0,
        quality: 'good', sourceId: 'test', timestamp: Date.now(),
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('TC-SUB-034: should handle handler errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const badHandler = vi.fn().mockImplementation(() => { throw new Error('fail'); });
      const goodHandler = vi.fn();
      manager.onTagValueChanged(badHandler);
      manager.onTagValueChanged(goodHandler);
      manager.notifyTagValueChanged({
        tagId: 'tag-1', value: 42, previousValue: 0,
        quality: 'good', sourceId: 'test', timestamp: Date.now(),
      });
      expect(goodHandler).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ==================== subscribeToSource ====================
  describe('subscribeToSource', () => {
    it('TC-SUB-040: should call driver.subscribe', () => {
      const driver = createMockDriver();
      manager.subscribeToSource(driver, ['tag-1', 'tag-2']);
      expect(driver.subscribe).toHaveBeenCalledWith(['tag-1', 'tag-2']);
    });

    it('TC-SUB-041: should not throw when driver is undefined', () => {
      expect(() => manager.subscribeToSource(undefined, ['tag-1'])).not.toThrow();
    });
  });

  // ==================== clear ====================
  describe('clear', () => {
    it('TC-SUB-060: should clear all state', () => {
      manager.init(
        [{ graphicId: 'g1', graphicName: 'G1', graphicType: 'text', tagId: 'tag-1' }],
        [{ tagId: 'tag-1', tagName: 'T1', dataSourceId: 'ds1', dataType: 'number' }],
      );
      const handler = vi.fn();
      manager.onTagValueChanged(handler);
      manager.clear();
      expect(manager.getBindings()).toHaveLength(0);
      expect(manager.getVariableMeta('tag-1')).toBeUndefined();
      manager.notifyTagValueChanged({
        tagId: 'tag-1', value: 42, previousValue: 0,
        quality: 'good', sourceId: 'test', timestamp: Date.now(),
      });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-SUB-070: should handle notifyTagValueChanged with no handlers', () => {
      expect(() => manager.notifyTagValueChanged({
        tagId: 'tag-1', value: 42, previousValue: 0,
        quality: 'good', sourceId: 'test', timestamp: Date.now(),
      })).not.toThrow();
    });

    it('TC-SUB-071: should handle multiple unsubscribe calls idempotently', () => {
      const handler = vi.fn();
      const unsubscribe = manager.onTagValueChanged(handler);
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
      manager.notifyTagValueChanged({
        tagId: 'tag-1', value: 42, previousValue: 0,
        quality: 'good', sourceId: 'test', timestamp: Date.now(),
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('TC-SUB-072: should handle full variable metadata', () => {
      manager.init([], [{
        tagId: 'tag-1',
        tagName: 'Full Tag',
        dataSourceId: 'ds1',
        dataType: 'float32',
        unit: '°C',
        minValue: -50,
        maxValue: 150,
        alarmHigh: 100,
        alarmHighHigh: 120,
        alarmLow: 0,
        alarmLowLow: -10,
        decimalPlaces: 2,
      }]);
      const meta = manager.getVariableMeta('tag-1');
      expect(meta).toBeDefined();
      expect(meta?.alarmHigh).toBe(100);
      expect(meta?.alarmHighHigh).toBe(120);
      expect(meta?.alarmLow).toBe(0);
      expect(meta?.alarmLowLow).toBe(-10);
      expect(meta?.decimalPlaces).toBe(2);
    });
  });
});