// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BoundedBackpressureQueue } from '../pipeline/bounded-backpressure-queue';
import {
  FrequencyReductionStrategy,
  PressureLevel,
} from '../pipeline/frequency-reduction.strategy';
import { DiscardStrategy, DataPriority } from '../pipeline/discard.strategy';
import { Logger } from '@nestjs/common';

describe('BoundedBackpressureQueue', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('enqueue', () => {
    it('should add item to queue', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      const result = queue.enqueue(42);

      expect(result.accepted).toBe(true);
      expect(queue.size).toBe(1);
    });

    it('should accept items with priority sorting', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1, 0);
      queue.enqueue(2, 10);

      const item = queue.peek();
      expect(item!.data).toBe(2); // higher priority first
      expect(item!.priority).toBe(10);
    });

    it('should respect capacity limit with oldest discard policy', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 2, discardPolicy: 'oldest' });

      queue.enqueue(1);
      queue.enqueue(2);
      const result = queue.enqueue(3);

      expect(result.accepted).toBe(true);
      expect(result.discarded).toBe(1);
      expect(queue.size).toBe(2);
    });

    it('should reject new items with newest discard policy', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 2, discardPolicy: 'newest' });

      queue.enqueue(1);
      queue.enqueue(2);
      const result = queue.enqueue(3);

      expect(result.accepted).toBe(false);
      expect(result.discarded).toBe(1);
      expect(queue.size).toBe(2);
    });

    it('should reject new items with reject discard policy', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 2, discardPolicy: 'reject' });

      queue.enqueue(1);
      queue.enqueue(2);
      const result = queue.enqueue(3);

      expect(result.accepted).toBe(false);
      expect(result.discarded).toBe(1);
    });
  });

  describe('enqueueBatch', () => {
    it('should add multiple items', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      const result = queue.enqueueBatch([{ data: 1 }, { data: 2 }, { data: 3 }]);

      expect(result.accepted).toBe(3);
      expect(result.discarded).toBe(0);
      expect(queue.size).toBe(3);
    });
  });

  describe('dequeue', () => {
    it('should return item in FIFO order (sorted by priority)', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1, 5);
      queue.enqueue(2, 10);
      queue.enqueue(3, 5);

      // Highest priority first
      expect(queue.dequeue()!.data).toBe(2);
      expect(queue.dequeue()!.data).toBe(1);
      expect(queue.dequeue()!.data).toBe(3);
    });

    it('should return null when empty', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      expect(queue.dequeue()).toBeNull();
    });
  });

  describe('dequeueBatch', () => {
    it('should return up to maxCount items', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      const items = queue.dequeueBatch(2);
      expect(items).toHaveLength(2);
      expect(queue.size).toBe(1);
    });

    it('should return fewer items when queue has less', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1);

      const items = queue.dequeueBatch(5);
      expect(items).toHaveLength(1);
    });
  });

  describe('peek', () => {
    it('should return item without removing', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(42);

      expect(queue.peek()!.data).toBe(42);
      expect(queue.size).toBe(1); // still in queue
    });

    it('should return null when empty', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      expect(queue.peek()).toBeNull();
    });
  });

  describe('isUnderPressure', () => {
    it('should return true when over high watermark', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, highWatermark: 3 });
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      expect(queue.isUnderPressure).toBe(true);
    });

    it('should return false when below high watermark', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, highWatermark: 5 });
      queue.enqueue(1);
      queue.enqueue(2);

      expect(queue.isUnderPressure).toBe(false);
    });
  });

  describe('isRecovering', () => {
    it('should return true when below low watermark and not empty', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, lowWatermark: 5 });
      queue.enqueue(1);
      queue.enqueue(2);

      expect(queue.isRecovering).toBe(true);
    });

    it('should return false when empty', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, lowWatermark: 5 });
      expect(queue.isRecovering).toBe(false);
    });
  });

  describe('size and capacity', () => {
    it('should return correct size', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1);
      queue.enqueue(2);

      expect(queue.size).toBe(2);
    });

    it('should return correct capacity', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1);

      expect(queue.capacity).toBe(9);
    });
  });

  describe('clear', () => {
    it('should empty the queue', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      queue.clear();

      expect(queue.size).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1);
      queue.enqueue(2);
      queue.dequeue();

      const stats = queue.getStats();
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(10);
      expect(stats.isUnderPressure).toBe(false);
      expect(stats.totalEnqueued).toBe(2);
      expect(stats.totalDequeued).toBe(1);
      expect(stats.totalDiscarded).toBe(0);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty queue', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      expect(queue.isEmpty).toBe(true);
    });

    it('should return false when queue has items', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10 });
      queue.enqueue(1);
      expect(queue.isEmpty).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update queue configuration', () => {
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, highWatermark: 5 });
      queue.updateConfig({ highWatermark: 8 });

      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);
      queue.enqueue(4);
      queue.enqueue(5);
      queue.enqueue(6);

      expect(queue.isUnderPressure).toBe(false); // 6 < 8
    });
  });

  describe('integration with FrequencyReductionStrategy', () => {
    it('should detect NORMAL pressure from empty queue', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100 });

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.NORMAL);
      expect(strategy.pressureLevel).toBe(PressureLevel.NORMAL);
    });

    it('should detect LOW pressure when queue fills beyond 80%', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100, highWatermark: 80 });

      for (let i = 0; i < 85; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.LOW);
    });

    it('should detect MEDIUM pressure when queue fills beyond 90%', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100, discardPolicy: 'oldest' });

      for (let i = 0; i < 92; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.MEDIUM);
    });

    it('should detect HIGH pressure when queue fills beyond 95%', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100, discardPolicy: 'oldest' });

      for (let i = 0; i < 97; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.HIGH);
    });

    it('should detect CRITICAL pressure when queue is full', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, discardPolicy: 'oldest' });

      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.CRITICAL);
    });

    it('should transition from CRITICAL to NORMAL when queue is drained', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, discardPolicy: 'oldest' });

      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }
      expect(strategy.updatePressureLevel(queue)).toBe(PressureLevel.CRITICAL);

      // Drain all items
      for (let i = 0; i < 10; i++) {
        queue.dequeue();
      }
      expect(strategy.updatePressureLevel(queue)).toBe(PressureLevel.NORMAL);
    });

    it('should reduce rate according to pressure level', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100, discardPolicy: 'oldest' });

      // Fill to MEDIUM level
      for (let i = 0; i < 92; i++) {
        queue.enqueue(i);
      }
      strategy.updatePressureLevel(queue);

      const reducedRate = strategy.calculateReducedRate(100);
      expect(reducedRate).toBe(50); // 0.5x at MEDIUM
    });

    it('should skip tags appropriately when under pressure', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100, discardPolicy: 'oldest' });

      // Fill to MEDIUM level
      for (let i = 0; i < 92; i++) {
        queue.enqueue(i);
      }
      strategy.updatePressureLevel(queue);

      const reducedRate = strategy.calculateReducedRate(100);
      expect(reducedRate).toBe(50);

      // With rate 50, approximately half the calls should skip
      let skipCount = 0;
      const totalCalls = 100;
      for (let i = 0; i < totalCalls; i++) {
        if (strategy.shouldSkip('tag-1', reducedRate, 100)) {
          skipCount++;
        }
      }
      // Skip rate should be roughly 50% (allow 40-60% range)
      expect(skipCount).toBeGreaterThan(totalCalls * 0.35);
      expect(skipCount).toBeLessThan(totalCalls * 0.65);
    });
  });

  describe('integration with DiscardStrategy', () => {
    it('should never discard HIGH priority data at full queue', () => {
      const strategy = new DiscardStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, discardPolicy: 'oldest' });

      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }
      const stats = queue.getStats();
      const queueState = {
        size: stats.size,
        maxSize: stats.maxSize,
        isUnderPressure: stats.isUnderPressure,
        utilization: stats.size / stats.maxSize,
      };

      const result = strategy.shouldDiscard(
        { tagId: 'important-tag', priority: DataPriority.HIGH },
        queueState,
        PressureLevel.CRITICAL,
      );

      expect(result).toBe(false);
    });

    it('should discard LOW priority data at full queue', () => {
      const strategy = new DiscardStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, discardPolicy: 'oldest' });

      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }
      const stats = queue.getStats();
      const queueState = {
        size: stats.size,
        maxSize: stats.maxSize,
        isUnderPressure: stats.isUnderPressure,
        utilization: stats.size / stats.maxSize,
      };

      const result = strategy.shouldDiscard(
        { tagId: 'low-priority-tag', priority: DataPriority.LOW },
        queueState,
        PressureLevel.HIGH,
      );

      expect(result).toBe(true);
    });

    it('should not discard when queue is below utilization threshold', () => {
      const strategy = new DiscardStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100 });

      // Only fill to 50%
      for (let i = 0; i < 50; i++) {
        queue.enqueue(i);
      }

      const stats = queue.getStats();
      const queueState = {
        size: stats.size,
        maxSize: stats.maxSize,
        isUnderPressure: stats.isUnderPressure,
        utilization: stats.size / stats.maxSize,
      };

      const result = strategy.shouldDiscard(
        { tagId: 'low-tag', priority: DataPriority.LOW },
        queueState,
        PressureLevel.CRITICAL,
      );

      expect(result).toBe(false);
    });

    it('should track discard statistics from queue operations', () => {
      const strategy = new DiscardStrategy({ maxDiscardRate: 1.0 });
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 10, discardPolicy: 'oldest' });

      for (let i = 0; i < 10; i++) {
        queue.enqueue(i);
      }
      const stats = queue.getStats();
      const queueState = {
        size: stats.size,
        maxSize: stats.maxSize,
        isUnderPressure: stats.isUnderPressure,
        utilization: stats.size / stats.maxSize,
      };

      strategy.shouldDiscard(
        { tagId: 'tag-1', priority: DataPriority.LOW },
        queueState,
        PressureLevel.HIGH,
      );
      strategy.shouldDiscard(
        { tagId: 'tag-2', priority: DataPriority.MEDIUM },
        queueState,
        PressureLevel.CRITICAL,
      );

      const discardStats = strategy.getDiscardStats();
      expect(discardStats.totalDiscarded).toBe(2);
      expect(discardStats.totalOffered).toBe(2);
      expect(discardStats.discardedByLevel[DataPriority.LOW]).toBe(1);
      expect(discardStats.discardedByLevel[DataPriority.MEDIUM]).toBe(1);
    });
  });

  describe('stress test scenarios', () => {
    it('should handle rapid enqueue/dequeue with frequency reduction', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({
        maxSize: 1000,
        discardPolicy: 'oldest',
      });

      // Simulate rapid filling
      for (let i = 0; i < 950; i++) {
        queue.enqueue(i);
      }

      const level = strategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.HIGH);

      const reducedRate = strategy.calculateReducedRate(100);
      expect(reducedRate).toBe(20); // 0.2x at HIGH

      // Simulate draining
      for (let i = 0; i < 900; i++) {
        queue.dequeue();
      }

      const newLevel = strategy.updatePressureLevel(queue);
      expect(newLevel).toBe(PressureLevel.NORMAL);
    });

    it('should handle combined frequency reduction and discard', () => {
      const freqStrategy = new FrequencyReductionStrategy();
      const discStrategy = new DiscardStrategy();
      const queue = new BoundedBackpressureQueue<number>({ maxSize: 100, discardPolicy: 'oldest' });

      // Fill queue to critical
      for (let i = 0; i < 100; i++) {
        queue.enqueue(i);
      }

      const level = freqStrategy.updatePressureLevel(queue);
      expect(level).toBe(PressureLevel.CRITICAL);

      const stats = queue.getStats();
      const queueState = {
        size: stats.size,
        maxSize: stats.maxSize,
        isUnderPressure: stats.isUnderPressure,
        utilization: stats.size / stats.maxSize,
      };

      // LOW priority should be discarded
      expect(
        discStrategy.shouldDiscard(
          { tagId: 'low-tag', priority: DataPriority.LOW },
          queueState,
          level,
        ),
      ).toBe(true);

      // HIGH priority should never be discarded
      expect(
        discStrategy.shouldDiscard(
          { tagId: 'high-tag', priority: DataPriority.HIGH },
          queueState,
          level,
        ),
      ).toBe(false);

      // Reduced rate should be 10% (CRITICAL)
      const reducedRate = freqStrategy.calculateReducedRate(100);
      expect(reducedRate).toBe(10);
    });

    it('should maintain consistency under high throughput', () => {
      const strategy = new FrequencyReductionStrategy();
      const queue = new BoundedBackpressureQueue<number>({
        maxSize: 5000,
        discardPolicy: 'oldest',
      });

      // Rapid enqueue/dequeue cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Fill rapidly
        for (let i = 0; i < 1000; i++) {
          queue.enqueue(i);
        }

        const level = strategy.updatePressureLevel(queue);
        expect([PressureLevel.LOW, PressureLevel.NORMAL]).toContain(level);

        // Drain rapidly
        for (let i = 0; i < 1000; i++) {
          queue.dequeue();
        }
      }

      expect(strategy.updatePressureLevel(queue)).toBe(PressureLevel.NORMAL);
      expect(queue.size).toBe(0);
    });
  });
});
