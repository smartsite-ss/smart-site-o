// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Optional, Logger } from '@nestjs/common';

interface DebounceEntry {
  ruleId: string;
  tagId: string;
  firstTriggerAt: number;
  triggerCount: number;
  lastValue: number | null;
  /** 最近一次更新的时间戳，用于 LRU 淘汰 */
  lastUpdatedAt: number;
}

/** 消抖统计 */
export interface DebounceStats {
  totalChecks: number;
  immediateTriggers: number;
  debouncedTriggers: number;
  debouncingCount: number;
  noChangeCount: number;
  clearedCount: number;
  evictedCount: number;
  maxEntriesReached: boolean;
}

/** 默认最大条目数 */
const DEFAULT_MAX_ENTRIES = 10000;

@Injectable()
export class AlarmDebouncer {
  private readonly logger = new Logger(AlarmDebouncer.name);
  private entries = new Map<string, DebounceEntry>();
  private readonly maxEntries: number;

  /** 统计计数器 */
  private stats = {
    totalChecks: 0,
    immediateTriggers: 0,
    debouncedTriggers: 0,
    noChangeCount: 0,
    clearedCount: 0,
    evictedCount: 0,
  };

  constructor(@Optional() maxEntries?: number) {
    this.maxEntries = maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  private getKey(ruleId: string, tagId: string): string {
    return `${ruleId}:${tagId}`;
  }

  /**
   * 消抖检查
   * @param debounceMs 时间消抖（毫秒），0 表示不启用时间消抖
   * @param debounceCount 次数消抖，0 表示不启用次数消抖
   * @returns 'trigger' = 消抖通过，应触发报警；'debouncing' = 消抖中；'no_change' = 值未变化
   *
   * 组合规则：
   * - debounceMs > 0 && debounceCount > 0：时间和次数均满足才触发
   * - debounceMs > 0 && debounceCount == 0：仅时间消抖
   * - debounceMs == 0 && debounceCount > 0：仅次数消抖
   * - 均为 0：立即触发
   */
  check(
    ruleId: string,
    tagId: string,
    value: number,
    debounceMs: number,
    debounceCount: number = 0,
  ): 'trigger' | 'debouncing' | 'no_change' {
    this.stats.totalChecks++;
    const key = this.getKey(ruleId, tagId);
    const now = Date.now();

    // 无消抖要求，直接触发
    if (debounceMs <= 0 && debounceCount <= 0) {
      this.stats.immediateTriggers++;
      return 'trigger';
    }

    const existing = this.entries.get(key);

    if (!existing) {
      // LRU 淘汰：达到上限时淘汰最旧的条目
      this.evictIfNeeded();

      // 首次触发，记录并进入消抖等待
      this.entries.set(key, {
        ruleId,
        tagId,
        firstTriggerAt: now,
        triggerCount: 1,
        lastValue: value,
        lastUpdatedAt: now,
      });
      this.logger.debug(
        `Debounce started for rule ${ruleId}: ms=${debounceMs}, count=${debounceCount}`,
      );

      // 如果仅需 1 次即可满足次数消抖，且无时间要求
      if (debounceMs <= 0 && debounceCount > 0 && debounceCount <= 1) {
        this.clear(ruleId, tagId);
        this.stats.debouncedTriggers++;
        return 'trigger';
      }

      return 'debouncing';
    }

    // 更新最近访问时间（LRU）
    existing.lastUpdatedAt = now;

    // 相同值不重复计数（允许微小浮点误差）
    if (existing.lastValue !== null && Math.abs(value - existing.lastValue) < 0.001) {
      this.stats.noChangeCount++;
      return 'no_change';
    }

    existing.triggerCount++;
    existing.lastValue = value;

    const elapsed = now - existing.firstTriggerAt;
    const timeSatisfied = debounceMs <= 0 || elapsed >= debounceMs;
    const countSatisfied = debounceCount <= 0 || existing.triggerCount >= debounceCount;

    if (timeSatisfied && countSatisfied) {
      // 消抖通过
      this.clear(ruleId, tagId);
      this.stats.debouncedTriggers++;
      this.logger.debug(
        `Debounce passed for rule ${ruleId}: ${existing.triggerCount} triggers in ${elapsed}ms`,
      );
      return 'trigger';
    }

    return 'debouncing';
  }

  /** 取消消抖（值恢复正常） */
  clear(ruleId: string, tagId: string): void {
    const existed = this.entries.delete(this.getKey(ruleId, tagId));
    if (existed) {
      this.stats.clearedCount++;
    }
  }

  /** LRU 淘汰：当条目数超过上限时，淘汰最久未更新的条目 */
  private evictIfNeeded(): void {
    if (this.entries.size < this.maxEntries) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.lastUpdatedAt < oldestTime) {
        oldestTime = entry.lastUpdatedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.entries.delete(oldestKey);
      this.stats.evictedCount++;
      this.logger.warn(
        `Debounce LRU eviction: max entries (${this.maxEntries}) reached, evicted ${oldestKey}`,
      );
    }
  }

  /** 获取当前消抖中的规则数 */
  getDebouncingCount(): number {
    return this.entries.size;
  }

  /** 获取消抖详情用于调试 */
  getDebouncingEntries(): DebounceEntry[] {
    return Array.from(this.entries.values());
  }

  /** 获取统计信息 */
  getStats(): DebounceStats {
    return {
      ...this.stats,
      debouncingCount: this.entries.size,
      maxEntriesReached: this.entries.size >= this.maxEntries,
    };
  }

  /** 重置统计计数器 */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      immediateTriggers: 0,
      debouncedTriggers: 0,
      noChangeCount: 0,
      clearedCount: 0,
      evictedCount: 0,
    };
  }

  /** 清理超时的消抖条目（24小时未更新的） */
  cleanup(): number {
    const cutoff = Date.now() - 24 * 3600000;
    let cleaned = 0;

    for (const [key, entry] of this.entries) {
      if (entry.firstTriggerAt < cutoff) {
        this.entries.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} stale debounce entries`);
    }

    return cleaned;
  }
}
