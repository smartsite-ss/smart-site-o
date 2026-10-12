// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export interface CacheEntry<T> {
  value: T;
  timestamp: Date;
  ttl?: number;
  accessCount: number;
}
export interface CacheStats {
  l1Size: number;
  l1HitCount: number;
  l1MissCount: number;
  l3Size: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  evictionCount: number;
  cleanupCount: number;
}
export interface MultiLevelCacheConfig {
  l1MaxSize: number;
  l1DefaultTTL: number;
  l3MaxSize: number;
  l3DefaultTTL: number;
  cleanupIntervalMs: number;
  enableStats: boolean;
  enableLRU: boolean;
}
export declare class MultiLevelCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger;
  private l1Cache;
  private l3Storage;
  private accessOrder;
  private config;
  private stats;
  private cleanupInterval;
  onModuleInit(): void;
  onModuleDestroy(): void;
  setConfig(config: Partial<MultiLevelCacheConfig>): void;
  get<T>(key: string): Promise<T | undefined>;
  getMany<T>(keys: string[]): Promise<Map<string, T>>;
  set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      skipL3?: boolean;
    },
  ): Promise<void>;
  setMany<T>(
    entries: Array<{
      key: string;
      value: T;
      ttl?: number;
    }>,
  ): Promise<void>;
  invalidate(key: string): Promise<boolean>;
  invalidateByPrefix(prefix: string): Promise<number>;
  clear(): Promise<void>;
  has(key: string): boolean;
  getSize(): {
    l1: number;
    l3: number;
  };
  getStats(): CacheStats;
  resetStats(): void;
  warmUp<T>(
    keys: string[],
    fetchData: (key: string) => Promise<T | null>,
    options?: {
      batchSize?: number;
      concurrency?: number;
    },
  ): Promise<{
    loaded: number;
    skipped: number;
  }>;
  private getL1;
  private getL3;
  private setL1;
  private setL3;
  private updateAccessOrder;
  private evictOldest;
  private isExpired;
  private cleanup;
  private updateStats;
}
