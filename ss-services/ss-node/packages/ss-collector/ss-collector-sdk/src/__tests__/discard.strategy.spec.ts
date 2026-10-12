// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DiscardStrategy, DataPriority, QueueState, Taggable } from '../pipeline/discard.strategy';
import { PressureLevel } from '../pipeline/frequency-reduction.strategy';
import { Logger } from '@nestjs/common';

describe('DiscardStrategy', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeQueueState = (overrides: Partial<QueueState> = {}): QueueState => ({
    size: 50,
    maxSize: 100,
    isUnderPressure: false,
    utilization: 0.5,
    ...overrides,
  });

  const makeTag = (overrides: Partial<Taggable> = {}): Taggable => ({
    tagId: 'test-tag-1',
    priority: DataPriority.MEDIUM,
    ...overrides,
  });

  describe('shouldDiscard - HIGH priority', () => {
    it('should never discard HIGH priority data regardless of pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.HIGH });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL)).toBe(false);
    });

    it('should never discard HIGH priority data at any pressure level', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.HIGH });
      const queueState = makeQueueState({ utilization: 0.95, size: 95, isUnderPressure: true });

      const levels = [
        PressureLevel.NORMAL,
        PressureLevel.LOW,
        PressureLevel.MEDIUM,
        PressureLevel.HIGH,
        PressureLevel.CRITICAL,
      ];
      for (const level of levels) {
        expect(strategy.shouldDiscard(tag, queueState, level)).toBe(false);
      }
    });
  });

  describe('shouldDiscard - MEDIUM priority', () => {
    it('should not discard MEDIUM at NORMAL pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 0.85, size: 85, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.NORMAL)).toBe(false);
    });

    it('should not discard MEDIUM at LOW pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 0.85, size: 85, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.LOW)).toBe(false);
    });

    it('should not discard MEDIUM at MEDIUM pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 0.92, size: 92, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.MEDIUM)).toBe(false);
    });

    it('should not discard MEDIUM at HIGH pressure (default: CRITICAL only)', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 0.97, size: 97, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.HIGH)).toBe(false);
    });

    it('should discard MEDIUM at CRITICAL pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL)).toBe(true);
    });
  });

  describe('shouldDiscard - LOW priority', () => {
    it('should not discard LOW at NORMAL pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.85, size: 85, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.NORMAL)).toBe(false);
    });

    it('should not discard LOW at LOW pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.85, size: 85, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.LOW)).toBe(false);
    });

    it('should not discard LOW at MEDIUM pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.92, size: 92, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.MEDIUM)).toBe(false);
    });

    it('should discard LOW at HIGH pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.97, size: 97, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.HIGH)).toBe(true);
    });

    it('should discard LOW at CRITICAL pressure', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL)).toBe(true);
    });
  });

  describe('shouldDiscard - utilization threshold', () => {
    it('should not discard when utilization is below min threshold', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.5, size: 50, isUnderPressure: false });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL)).toBe(false);
    });

    it('should not discard when utilization is exactly at min threshold', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.8, size: 80, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.HIGH)).toBe(true);
    });
  });

  describe('shouldDiscard - default priority', () => {
    it('should treat unspecified priority as MEDIUM', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: undefined });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      // MEDIUM is only discarded at CRITICAL
      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL)).toBe(true);
    });
  });

  describe('filterDiscardable', () => {
    it('should separate accepted and discarded tags', () => {
      const strategy = new DiscardStrategy();
      const tags: Taggable[] = [
        makeTag({ tagId: 'high-tag', priority: DataPriority.HIGH }),
        makeTag({ tagId: 'low-tag', priority: DataPriority.LOW }),
        makeTag({ tagId: 'med-tag', priority: DataPriority.MEDIUM }),
      ];
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      const result = strategy.filterDiscardable(tags, queueState, PressureLevel.CRITICAL);
      expect(result.accepted).toHaveLength(1);
      expect(result.accepted[0].tagId).toBe('high-tag');
      expect(result.discarded).toHaveLength(2);
      expect(result.discarded.map((t) => t.tagId)).toEqual(['low-tag', 'med-tag']);
    });

    it('should accept all tags at NORMAL pressure', () => {
      const strategy = new DiscardStrategy();
      const tags: Taggable[] = [
        makeTag({ tagId: 't1', priority: DataPriority.HIGH }),
        makeTag({ tagId: 't2', priority: DataPriority.MEDIUM }),
        makeTag({ tagId: 't3', priority: DataPriority.LOW }),
      ];
      const queueState = makeQueueState({ utilization: 0.85, size: 85, isUnderPressure: true });

      const result = strategy.filterDiscardable(tags, queueState, PressureLevel.NORMAL);
      expect(result.accepted).toHaveLength(3);
      expect(result.discarded).toHaveLength(0);
    });

    it('should handle empty input', () => {
      const strategy = new DiscardStrategy();
      const queueState = makeQueueState();

      const result = strategy.filterDiscardable([], queueState, PressureLevel.CRITICAL);
      expect(result.accepted).toHaveLength(0);
      expect(result.discarded).toHaveLength(0);
    });
  });

  describe('getDiscardStats', () => {
    it('should return initial zero stats', () => {
      const strategy = new DiscardStrategy();
      const stats = strategy.getDiscardStats();

      expect(stats.totalDiscarded).toBe(0);
      expect(stats.totalOffered).toBe(0);
      expect(stats.discardRate).toBe(0);
      expect(stats.lastDiscardTime).toBeNull();
      expect(stats.discardedByLevel[DataPriority.HIGH]).toBe(0);
      expect(stats.discardedByLevel[DataPriority.MEDIUM]).toBe(0);
      expect(stats.discardedByLevel[DataPriority.LOW]).toBe(0);
    });

    it('should track discarded counts by priority', () => {
      const strategy = new DiscardStrategy({ maxDiscardRate: 1.0 });
      const lowTag = makeTag({ tagId: 'low-1', priority: DataPriority.LOW });
      const medTag = makeTag({ tagId: 'med-1', priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      strategy.shouldDiscard(lowTag, queueState, PressureLevel.CRITICAL);
      strategy.shouldDiscard(medTag, queueState, PressureLevel.CRITICAL);

      const stats = strategy.getDiscardStats();
      expect(stats.totalDiscarded).toBe(2);
      expect(stats.totalOffered).toBe(2);
      expect(stats.discardRate).toBe(1);
      expect(stats.discardedByLevel[DataPriority.LOW]).toBe(1);
      expect(stats.discardedByLevel[DataPriority.MEDIUM]).toBe(1);
      expect(stats.discardedByLevel[DataPriority.HIGH]).toBe(0);
    });

    it('should track lastDiscardTime', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      const before = Date.now();
      strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL);
      const stats = strategy.getDiscardStats();

      expect(stats.lastDiscardTime).not.toBeNull();
      expect(stats.lastDiscardTime!).toBeGreaterThanOrEqual(before);
    });

    it('should calculate correct discard rate', () => {
      const strategy = new DiscardStrategy();
      const lowTag = makeTag({ priority: DataPriority.LOW });
      const highTag = makeTag({ priority: DataPriority.HIGH });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      strategy.shouldDiscard(lowTag, queueState, PressureLevel.CRITICAL); // discarded
      strategy.shouldDiscard(highTag, queueState, PressureLevel.CRITICAL); // not discarded

      const stats = strategy.getDiscardStats();
      expect(stats.totalOffered).toBe(2);
      expect(stats.totalDiscarded).toBe(1);
      expect(stats.discardRate).toBe(0.5);
    });
  });

  describe('reset', () => {
    it('should reset all statistics to zero', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL);
      strategy.reset();

      const stats = strategy.getDiscardStats();
      expect(stats.totalDiscarded).toBe(0);
      expect(stats.totalOffered).toBe(0);
      expect(stats.discardRate).toBe(0);
      expect(stats.lastDiscardTime).toBeNull();
      expect(stats.discardedByLevel[DataPriority.LOW]).toBe(0);
      expect(stats.discardedByLevel[DataPriority.MEDIUM]).toBe(0);
      expect(stats.discardedByLevel[DataPriority.HIGH]).toBe(0);
    });
  });

  describe('configurable thresholds', () => {
    it('should use custom medium discard level', () => {
      const strategy = new DiscardStrategy({
        mediumDiscardLevel: PressureLevel.HIGH,
      });
      const tag = makeTag({ priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 0.97, size: 97, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.HIGH)).toBe(true);
    });

    it('should use custom low discard level', () => {
      const strategy = new DiscardStrategy({
        lowDiscardLevel: PressureLevel.MEDIUM,
      });
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.92, size: 92, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.MEDIUM)).toBe(true);
    });

    it('should use custom min utilization threshold', () => {
      const strategy = new DiscardStrategy({
        minUtilizationForDiscard: 0.5,
      });
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.6, size: 60, isUnderPressure: false });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.HIGH)).toBe(true);
    });

    it('should respect max discard rate', () => {
      const strategy = new DiscardStrategy({
        maxDiscardRate: 0.3,
      });
      const lowTag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      // First discard: rate becomes 1/1 = 1.0 > 0.3
      expect(strategy.shouldDiscard(lowTag, queueState, PressureLevel.CRITICAL)).toBe(true);
      // Second call: rate = 1/2 = 0.5 >= 0.3, should be rejected
      expect(strategy.shouldDiscard(lowTag, queueState, PressureLevel.CRITICAL)).toBe(false);
      // After more rejected calls: rate = 1/4 = 0.25 < 0.3, should accept again
      expect(strategy.shouldDiscard(lowTag, queueState, PressureLevel.CRITICAL)).toBe(false);
      expect(strategy.shouldDiscard(lowTag, queueState, PressureLevel.CRITICAL)).toBe(true);
    });

    it('should update config dynamically', () => {
      const strategy = new DiscardStrategy();
      strategy.updateConfig({ lowDiscardLevel: PressureLevel.MEDIUM });

      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0.92, size: 92, isUnderPressure: true });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.MEDIUM)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle queue with zero maxSize', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.LOW });
      const queueState = makeQueueState({ utilization: 0, size: 0, maxSize: 0 });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL)).toBe(false);
    });

    it('should handle empty utilization', () => {
      const strategy = new DiscardStrategy();
      const tag = makeTag({ priority: DataPriority.MEDIUM });
      const queueState = makeQueueState({ utilization: 0, size: 0 });

      expect(strategy.shouldDiscard(tag, queueState, PressureLevel.CRITICAL)).toBe(false);
    });

    it('should not mutate input tags in filterDiscardable', () => {
      const strategy = new DiscardStrategy();
      const tags: Taggable[] = [makeTag({ tagId: 't1', priority: DataPriority.LOW })];
      const originalTags = [...tags];
      const queueState = makeQueueState({ utilization: 1.0, size: 100, isUnderPressure: true });

      strategy.filterDiscardable(tags, queueState, PressureLevel.CRITICAL);
      expect(tags).toEqual(originalTags);
    });
  });
});
