// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger } from '@nestjs/common';

export type DiscardPolicy = 'oldest' | 'newest' | 'reject';
export type QueueFullCallback = (discardedCount: number) => void;

export interface BackpressureQueueConfig {
  maxSize: number;
  discardPolicy: DiscardPolicy;
  highWatermark?: number;
  lowWatermark?: number;
  onDiscard?: QueueFullCallback;
}

const DEFAULT_CONFIG: Required<BackpressureQueueConfig> = {
  maxSize: 10000,
  discardPolicy: 'oldest',
  highWatermark: 8000,
  lowWatermark: 5000,
  onDiscard: () => {},
};

export interface QueueItem<T> {
  id: string;
  data: T;
  priority: number;
  enqueuedAt: number;
  attempts: number;
}

export interface QueueStats {
  size: number;
  maxSize: number;
  isUnderPressure: boolean;
  totalEnqueued: number;
  totalDequeued: number;
  totalDiscarded: number;
  avgWaitTimeMs: number;
  oldestAgeMs: number;
}

export class BoundedBackpressureQueue<T> {
  private readonly logger = new Logger(BoundedBackpressureQueue.name);
  private queue: QueueItem<T>[] = [];
  private config: Required<BackpressureQueueConfig>;
  private totalEnqueued = 0;
  private totalDequeued = 0;
  private totalDiscarded = 0;
  private waitTimes: number[] = [];
  private readonly maxWaitTimeSamples = 1000;

  constructor(config?: Partial<BackpressureQueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger.log(
      `BoundedBackpressureQueue initialized: max=${this.config.maxSize}, ` +
        `discard=${this.config.discardPolicy}, highWM=${this.config.highWatermark}`,
    );
  }

  enqueue(data: T, priority: number = 0): { accepted: boolean; discarded: number } {
    const item: QueueItem<T> = {
      id: this.generateId(),
      data,
      priority,
      enqueuedAt: Date.now(),
      attempts: 0,
    };

    if (this.queue.length < this.config.maxSize) {
      this.queue.push(item);
      this.queue.sort((a, b) => b.priority - a.priority);
      this.totalEnqueued++;
      return { accepted: true, discarded: 0 };
    }

    return this.handleOverflow(item);
  }

  enqueueBatch(items: Array<{ data: T; priority?: number }>): {
    accepted: number;
    discarded: number;
  } {
    let accepted = 0;
    let discarded = 0;

    for (const item of items) {
      const result = this.enqueue(item.data, item.priority);
      if (result.accepted) accepted++;
      else discarded += result.discarded;
    }

    return { accepted, discarded };
  }

  dequeue(): QueueItem<T> | null {
    if (this.queue.length === 0) return null;

    const item = this.queue.shift()!;
    const waitTime = Date.now() - item.enqueuedAt;
    this.recordWaitTime(waitTime);
    this.totalDequeued++;
    return item;
  }

  dequeueBatch(maxCount: number): QueueItem<T>[] {
    const items: QueueItem<T>[] = [];
    for (let i = 0; i < maxCount && this.queue.length > 0; i++) {
      items.push(this.dequeue()!);
    }
    return items;
  }

  peek(): QueueItem<T> | null {
    return this.queue[0] || null;
  }

  get isUnderPressure(): boolean {
    return this.queue.length >= this.config.highWatermark!;
  }

  get isRecovering(): boolean {
    return this.queue.length <= this.config.lowWatermark! && !this.isEmpty;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  get size(): number {
    return this.queue.length;
  }

  get capacity(): number {
    return this.config.maxSize - this.queue.length;
  }

  clear(): void {
    const cleared = this.queue.length;
    this.totalDiscarded += cleared;
    this.queue = [];
    if (cleared > 0) {
      this.logger.warn(`Queue cleared: ${cleared} items discarded`);
    }
  }

  getStats(): QueueStats {
    return {
      size: this.queue.length,
      maxSize: this.config.maxSize,
      isUnderPressure: this.isUnderPressure,
      totalEnqueued: this.totalEnqueued,
      totalDequeued: this.totalDequeued,
      totalDiscarded: this.totalDiscarded,
      avgWaitTimeMs: this.calculateAvgWaitTime(),
      oldestAgeMs: this.getOldestAge(),
    };
  }

  updateConfig(config: Partial<BackpressureQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private handleOverflow(newItem: QueueItem<T>): { accepted: boolean; discarded: number } {
    let discarded = 0;

    switch (this.config.discardPolicy) {
      case 'oldest':
        while (this.queue.length >= this.config.maxSize && this.queue.length > 0) {
          this.queue.pop();
          discarded++;
        }
        break;

      case 'newest':
        this.totalDiscarded++;
        this.config.onDiscard(1);
        return { accepted: false, discarded: 1 };

      case 'reject': {
        const rejectAll = 1;
        this.totalDiscarded += rejectAll;
        this.config.onDiscard(rejectAll);
        return { accepted: false, discarded: rejectAll };
      }
    }

    this.queue.push(newItem);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.totalEnqueued++;
    this.totalDiscarded += discarded;
    this.config.onDiscard(discarded);

    if (discarded > 0) {
      this.logger.warn(
        `Backpressure triggered: discarded ${discarded} items to accept new item ` +
          `(queue=${this.queue.length}/${this.config.maxSize})`,
      );
    }

    return { accepted: true, discarded };
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private recordWaitTime(ms: number): void {
    this.waitTimes.push(ms);
    if (this.waitTimes.length > this.maxWaitTimeSamples) {
      this.waitTimes.shift();
    }
  }

  private calculateAvgWaitTime(): number {
    if (this.waitTimes.length === 0) return 0;
    const sum = this.waitTimes.reduce((acc, t) => acc + t, 0);
    return sum / this.waitTimes.length;
  }

  private getOldestAge(): number {
    if (this.queue.length === 0) return 0;
    return Date.now() - this.queue[this.queue.length - 1].enqueuedAt;
  }
}
