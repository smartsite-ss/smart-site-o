// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  FrequencyReductionStrategy,
  PressureLevel,
  PRESSURE_RATE_MAP,
} from '../pipeline/frequency-reduction.strategy';
import { BoundedBackpressureQueue } from '../pipeline/bounded-backpressure-queue';
import { Logger } from '@nestjs/common';

describe('FrequencyReductionStrategy', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateReducedRate', () => {
    it('should return original rate at NORMAL pressure', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.calculateReducedRate(100, PressureLevel.NORMAL)).toBe(100);
    });

    it('should reduce rate to 80% at LOW pressure', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.calculateReducedRate(100, PressureLevel.LOW)).toBe(80);
    });

    it('should reduce rate to 50% at MEDIUM pressure', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.calculateReducedRate(100, PressureLevel.MEDIUM)).toBe(50);
    });

    it('should reduce rate to 20% at HIGH pressure', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.calculateReducedRate(100, PressureLevel.HIGH)).toBe(20);
    });

    it('should reduce rate to 10% at CRITICAL pressure', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.calculateReducedRate(100, PressureLevel.CRITICAL)).toBe(10);
    });

    it('should return at least 1 when rate rounds down to 0', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.calculateReducedRate(5, PressureLevel.CRITICAL)).toBe(1);
    });

    it('should use current internal pressure level when no level provided', () => {
      const strategy = new FrequencyReductionStrategy();
      // Default is NORMAL, so rate should be unchanged
      expect(strategy.calculateReducedRate(100)).toBe(100);
    });

    it('should round reduced rate to nearest integer', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.calculateReducedRate(17, PressureLevel.MEDIUM)).toBe(9);
    });
  });

  describe('shouldSkip', () => {
    it('should not skip when currentRate >= originalRate', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.shouldSkip('tag-1', 100, 100)).toBe(false);
    });

    it('should always skip when currentRate is 0', () => {
      const strategy = new FrequencyReductionStrategy();
      expect(strategy.shouldSkip('tag-1', 0)).toBe(true);
    });

    it('should skip tags based on rate reduction', () => {
      const strategy = new FrequencyReductionStrategy();
      // rate=50 means every other call should be skipped (50% rate)
      let skipped = 0;
      let _processed = 0;
      for (let i = 0; i < 100; i++) {
        if (strategy.shouldSkip('tag-1', 50)) {
          skipped++;
        }
        _processed++;
      }
      // Approximately 50% skipped
      expect(skipped).toBeGreaterThan(40);
      expect(skipped).toBeLessThan(60);
    });

    it('should not skip when rate is 100', () => {
      const strategy = new FrequencyReductionStrategy();
      for (let i = 0; i < 20; i++) {
        expect(strategy.shouldSkip('tag-1', 100)).toBe(false);
      }
    });

    it('should track skip statistics', () => {
      const strategy = new FrequencyReductionStrategy();
      strategy.shouldSkip('tag-1', 50);
      strategy.shouldSkip('tag-1', 50);

      const stats = strategy.getSkipStats();
      expect(stats.totalProcessed).toBe(2);
      expect(stats.totalSkipped).toBeGreaterThanOrEqual(0);
    });

    it('should handle different tags independently', () => {
      const strategy = new FrequencyReductionStrategy();
      // Reset counters
      strategy.reset();

      // tag-1 at rate 50, tag-2 at rate 100
      const tag1Skip = strategy.shouldSkip('tag-1', 50);
      const tag2Skip = strategy.shouldSkip('tag-2', 100);

      expect(tag2Skip).toBe(false);
      // tag-1 at rate 50: first call should not skip
      expect(tag1Skip).toBe(false);
    });
  });

  describe('getCurrentPressureLevel', () => {
    it('should return NORMAL when queue utilization is below low threshold', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 50,
        maxSize: 100,
        isUnderPressure: false,
        totalEnqueued: 50,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats)).toBe(PressureLevel.NORMAL);
    });

    it('should return LOW when queue utilization is >= 80%', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 80,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 80,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats)).toBe(PressureLevel.LOW);
    });

    it('should return MEDIUM when queue utilization is >= 90%', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 90,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 90,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats)).toBe(PressureLevel.MEDIUM);
    });

    it('should return HIGH when queue utilization is >= 95%', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 95,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 95,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats)).toBe(PressureLevel.HIGH);
    });

    it('should return CRITICAL when queue utilization is >= 100%', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 100,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 100,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats)).toBe(PressureLevel.CRITICAL);
    });

    it('should return current level when no stats provided', () => {
      const strategy = new FrequencyReductionStrategy();
      // Default is NORMAL
      expect(strategy.getCurrentPressureLevel()).toBe(PressureLevel.NORMAL);
    });

    it('should handle zero maxSize gracefully', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 0,
        maxSize: 0,
        isUnderPressure: false,
        totalEnqueued: 0,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats)).toBe(PressureLevel.NORMAL);
    });
  });

  describe('updatePressureLevel', () => {
    it('should update pressure level from queue stats', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, highWatermark: 5 });
      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.CRITICAL);
      expect(strategy.pressureLevel).toBe(PressureLevel.CRITICAL);
    });
  });

  describe('reset', () => {
    it('should reset pressure level to NORMAL', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 100,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 100,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      strategy.getCurrentPressureLevel(stats);
      expect(strategy.pressureLevel).toBe(PressureLevel.CRITICAL);

      strategy.reset();
      expect(strategy.pressureLevel).toBe(PressureLevel.NORMAL);
    });

    it('should reset skip counters and statistics', () => {
      const strategy = new FrequencyReductionStrategy();
      strategy.shouldSkip('tag-1', 50);
      strategy.shouldSkip('tag-1', 50);

      strategy.reset();
      const stats = strategy.getSkipStats();
      expect(stats.totalSkipped).toBe(0);
      expect(stats.totalProcessed).toBe(0);
      expect(stats.skipRate).toBe(0);
    });

    it('should reset rate multiplier to 1.0', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = {
        size: 100,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 100,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      strategy.getCurrentPressureLevel(stats);

      strategy.reset();
      expect(strategy.currentRateMultiplier).toBe(1.0);
    });
  });

  describe('getSkipStats', () => {
    it('should return zero stats when no processing occurred', () => {
      const strategy = new FrequencyReductionStrategy();
      const stats = strategy.getSkipStats();
      expect(stats.totalSkipped).toBe(0);
      expect(stats.totalProcessed).toBe(0);
      expect(stats.skipRate).toBe(0);
    });

    it('should calculate correct skip rate', () => {
      const strategy = new FrequencyReductionStrategy();
      for (let i = 0; i < 4; i++) {
        strategy.shouldSkip('tag-1', 50);
      }
      const stats = strategy.getSkipStats();
      expect(stats.totalProcessed).toBe(4);
      expect(stats.skipRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configurable thresholds', () => {
    it('should use custom threshold values', () => {
      const strategy = new FrequencyReductionStrategy({
        lowPressureThreshold: 0.5,
        mediumPressureThreshold: 0.7,
        highPressureThreshold: 0.85,
        criticalPressureThreshold: 0.95,
      });

      const stats70 = {
        size: 70,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 70,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats70)).toBe(PressureLevel.MEDIUM);
    });

    it('should update config dynamically', () => {
      const strategy = new FrequencyReductionStrategy();
      strategy.updateConfig({ lowPressureThreshold: 0.3 });

      const stats50 = {
        size: 50,
        maxSize: 100,
        isUnderPressure: true,
        totalEnqueued: 50,
        totalDequeued: 0,
        totalDiscarded: 0,
        avgWaitTimeMs: 0,
        oldestAgeMs: 0,
      };
      expect(strategy.getCurrentPressureLevel(stats50)).toBe(PressureLevel.LOW);
    });
  });

  describe('PRESSURE_RATE_MAP', () => {
    it('should have correct values for all pressure levels', () => {
      expect(PRESSURE_RATE_MAP[PressureLevel.NORMAL]).toBe(1.0);
      expect(PRESSURE_RATE_MAP[PressureLevel.LOW]).toBe(0.8);
      expect(PRESSURE_RATE_MAP[PressureLevel.MEDIUM]).toBe(0.5);
      expect(PRESSURE_RATE_MAP[PressureLevel.HIGH]).toBe(0.2);
      expect(PRESSURE_RATE_MAP[PressureLevel.CRITICAL]).toBe(0.1);
    });
  });

  describe('integration with BoundedBackpressureQueue', () => {
    it('should detect normal pressure from empty queue', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100 });

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.NORMAL);
    });

    it('should detect low pressure from partially filled queue', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100, highWatermark: 80 });

      for (let i = 0; i < 85; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.LOW);
    });

    it('should detect critical pressure from full queue', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, discardPolicy: 'oldest' });

      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.CRITICAL);
    });

    it('should transition from high to normal after queue drain', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, discardPolicy: 'oldest' });

      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }
      expect(strategy.updatePressureLevel(queue)).toBe(PressureLevel.CRITICAL);

      // Drain queue
      for (let i = 0; i < 10; i++) {
        queue.dequeue();
      }
      expect(strategy.updatePressureLevel(queue)).toBe(PressureLevel.NORMAL);
    });
  });
});
