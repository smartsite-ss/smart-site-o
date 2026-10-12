// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@nestjs/common';

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

const DEFAULT_CONFIG: MultiLevelCacheConfig = {
  l1MaxSize: 10000,
  l1DefaultTTL: 5000,
  l3MaxSize: 100000,
  l3DefaultTTL: 60000,
  cleanupIntervalMs: 10000,
  enableStats: true,
  enableLRU: true,
};

@Injectable()
export class MultiLevelCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MultiLevelCacheService.name);

  // L1: 内存缓存（最快，容量有限）
  private l1Cache = new Map<string, CacheEntry<any>>();

  // L3: 长期存储（SQLite/InfluxDB替代方案）
  private l3Storage = new Map<string, CacheEntry<any>>();

  // LRU访问顺序追踪
  private accessOrder: string[] = [];

  // 配置
  private config: MultiLevelCacheConfig = DEFAULT_CONFIG;

  // 统计信息
  private stats: CacheStats = {
    l1Size: 0,
    l1HitCount: 0,
    l1MissCount: 0,
    l3Size: 0,
    totalHits: 0,
    totalMisses: 0,
    hitRate: 0,
    evictionCount: 0,
    cleanupCount: 0,
  };

  // 清理定时器
  private cleanupInterval: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.logger.log(
      `MultiLevelCacheService initialized (L1 max=${this.config.l1MaxSize}, L3 max=${this.config.l3MaxSize})`,
    );

    if (this.config.cleanupIntervalMs > 0) {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.config.cleanupIntervalMs);
    }
  }

  onModuleDestroy(): void {
    this.logger.log('MultiLevelCacheService destroyed');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.l1Cache.clear();
    this.l3Storage.clear();
    this.accessOrder = [];
  }

  setConfig(config: Partial<MultiLevelCacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug(`Cache config updated: ${JSON.stringify(config)}`);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const l1Result = await this.getL1<T>(key);
    if (l1Result !== undefined) {
      return l1Result;
    }

    const l3Result = await this.getL3<T>(key);
    if (l3Result !== undefined) {
      // 回填到L1
      this.setL1(key, l3Result);
      return l3Result;
    }

    return undefined;
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }

    return result;
  }

  async set<T>(key: string, value: T, options?: { ttl?: number; skipL3?: boolean }): Promise<void> {
    // 写入L1
    this.setL1(key, value, options?.ttl);

    // 写入L3（除非明确跳过）
    if (!options?.skipL3) {
      this.setL3(key, value, options?.ttl);
    }
  }

  async setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, { ttl: entry.ttl });
    }
  }

  async invalidate(key: string): Promise<boolean> {
    const l1Deleted = this.l1Cache.delete(key);
    const l3Deleted = this.l3Storage.delete(key);

    // 从访问顺序中移除
    this.accessOrder = this.accessOrder.filter((k) => k !== key);

    return l1Deleted || l3Deleted;
  }

  async invalidateByPrefix(prefix: string): Promise<number> {
    let count = 0;

    // 清理L1
    for (const key of this.l1Cache.keys()) {
      if (key.startsWith(prefix)) {
        this.l1Cache.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
        count++;
      }
    }

    // 清理L3
    for (const key of this.l3Storage.keys()) {
      if (key.startsWith(prefix)) {
        this.l3Storage.delete(key);
        count++;
      }
    }

    return count;
  }

  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l3Storage.clear();
    this.accessOrder = [];

    this.logger.log('Cache cleared');
  }

  has(key: string): boolean {
    return this.l1Cache.has(key) || this.l3Storage.has(key);
  }

  getSize(): { l1: number; l3: number } {
    return {
      l1: this.l1Cache.size,
      l3: this.l3Storage.size,
    };
  }

  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      l1Size: 0,
      l1HitCount: 0,
      l1MissCount: 0,
      l3Size: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      evictionCount: 0,
      cleanupCount: 0,
    };
  }

  async warmUp<T>(
    keys: string[],
    fetchData: (key: string) => Promise<T | null>,
    options?: { batchSize?: number; concurrency?: number },
  ): Promise<{ loaded: number; skipped: number }> {
    const batchSize = options?.batchSize || 50;
    const concurrency = options?.concurrency || 5;

    let loaded = 0;
    let skipped = 0;

    this.logger.log(`Starting cache warm-up for ${keys.length} keys`);

    // 分批处理
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      // 并发加载
      const promises = batch.map(async (key) => {
        if (this.has(key)) {
          skipped++;
          return;
        }

        try {
          const data = await fetchData(key);
          if (data !== null) {
            await this.set(key, data);
            loaded++;
          }
        } catch (error) {
          this.logger.warn(`Failed to warm-up cache for ${key}: ${error.message}`);
        }
      });

      // 控制并发数
      const chunks = [];
      for (let j = 0; j < promises.length; j += concurrency) {
        chunks.push(promises.slice(j, j + concurrency));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk);
      }
    }

    this.logger.log(`Cache warm-up completed: ${loaded} loaded, ${skipped} skipped`);

    return { loaded, skipped };
  }

  private async getL1<T>(key: string): Promise<T | undefined> {
    const entry = this.l1Cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.l1MissCount++;
        this.stats.totalMisses++;
      }
      return undefined;
    }

    // 检查TTL
    if (entry.ttl && this.isExpired(entry)) {
      this.l1Cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);

      if (this.config.enableStats) {
        this.stats.l1MissCount++;
        this.stats.totalMisses++;
      }
      return undefined;
    }

    // 更新访问记录
    entry.accessCount++;
    this.updateAccessOrder(key);

    if (this.config.enableStats) {
      this.stats.l1HitCount++;
      this.stats.totalHits++;
    }

    return entry.value as T;
  }

  private async getL3<T>(key: string): Promise<T | undefined> {
    const entry = this.l3Storage.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查TTL
    if (entry.ttl && this.isExpired(entry)) {
      this.l3Storage.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  private setL1<T>(key: string, value: T, ttl?: number): void {
    // 容量检查和淘汰
    if (this.l1Cache.size >= this.config.l1MaxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: new Date(),
      ttl: ttl || this.config.l1DefaultTTL,
      accessCount: 1,
    };

    this.l1Cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  private setL3<T>(key: string, value: T, ttl?: number): void {
    // 容量检查
    if (this.l3Storage.size >= this.config.l3MaxSize) {
      // L3采用FIFO策略淘汰最旧条目
      const oldestKey = this.l3Storage.keys().next().value;
      if (oldestKey) {
        this.l3Storage.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: new Date(),
      ttl: ttl || this.config.l3DefaultTTL,
      accessCount: 0,
    };

    this.l3Storage.set(key, entry);
  }

  private updateAccessOrder(key: string): void {
    if (!this.config.enableLRU) return;

    // 移除现有位置
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }

    // 添加到末尾（最近访问）
    this.accessOrder.push(key);
  }

  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;

    // LRU: 淘汰最久未访问的条目
    const oldestKey = this.accessOrder.shift();
    if (oldestKey && this.l1Cache.has(oldestKey)) {
      this.l1Cache.delete(oldestKey);

      if (this.config.enableStats) {
        this.stats.evictionCount++;
      }
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp.getTime() > entry.ttl;
  }

  private cleanup(): void {
    let cleaned = 0;
    const now = Date.now();

    // 清理L1过期条目
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.ttl && now - entry.timestamp.getTime() > entry.ttl) {
        this.l1Cache.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
        cleaned++;
      }
    }

    // 清理L3过期条目
    for (const [key, entry] of this.l3Storage.entries()) {
      if (entry.ttl && now - entry.timestamp.getTime() > entry.ttl) {
        this.l3Storage.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      if (this.config.enableStats) {
        this.stats.cleanupCount += cleaned;
      }
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  private updateStats(): void {
    this.stats.l1Size = this.l1Cache.size;
    this.stats.l3Size = this.l3Storage.size;

    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.totalHits / totalRequests) * 100 : 0;
  }
}
