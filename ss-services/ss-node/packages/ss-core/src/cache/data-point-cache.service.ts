// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CachedDataPoint, CacheConfig } from './cache.types';
import { Logger } from '@nestjs/common';

const DEFAULT_CONFIG: CacheConfig = {
  l1Enabled: true,
  l2Enabled: false,
  l1MaxSize: 10000,
  l2TtlMs: 30000,
  l3TtlMs: 60000,
};

@Injectable()
export class DataPointCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataPointCacheService.name);
  private l1Cache = new Map<string, CachedDataPoint>();
  private l3Storage: Map<string, CachedDataPoint> = new Map();
  private config: CacheConfig = DEFAULT_CONFIG;
  private accessOrder: string[] = [];

  onModuleInit(): void {
    this.logger.log('DataPointCacheService initialized');
  }

  onModuleDestroy(): void {
    this.logger.log('DataPointCacheService destroyed');
    this.l1Cache.clear();
    this.l3Storage.clear();
  }

  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async get(tagId: string): Promise<CachedDataPoint | null> {
    if (this.config.l1Enabled) {
      const l1Result = this.l1Cache.get(tagId);
      if (l1Result && !this.isExpired(l1Result, this.config.l2TtlMs)) {
        this.updateAccessOrder(tagId);
        return l1Result;
      }
    }

    const l3Result = this.l3Storage.get(tagId);
    if (l3Result && !this.isExpired(l3Result, this.config.l3TtlMs)) {
      if (this.config.l1Enabled) {
        this.setL1(tagId, l3Result);
      }
      return l3Result;
    }

    return null;
  }

  async getMany(tagIds: string[]): Promise<Map<string, CachedDataPoint>> {
    const results = new Map<string, CachedDataPoint>();

    for (const tagId of tagIds) {
      const result = await this.get(tagId);
      if (result) {
        results.set(tagId, result);
      }
    }

    return results;
  }

  async set(dataPoint: CachedDataPoint): Promise<void> {
    if (this.config.l1Enabled) {
      this.setL1(dataPoint.tagId, dataPoint);
    }

    this.l3Storage.set(dataPoint.tagId, dataPoint);
  }

  async setMany(dataPoints: CachedDataPoint[]): Promise<void> {
    for (const dataPoint of dataPoints) {
      await this.set(dataPoint);
    }
  }

  async delete(tagId: string): Promise<void> {
    this.l1Cache.delete(tagId);
    this.l3Storage.delete(tagId);
    this.accessOrder = this.accessOrder.filter((id) => id !== tagId);
  }

  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l3Storage.clear();
    this.accessOrder = [];
  }

  has(tagId: string): boolean {
    return this.l1Cache.has(tagId) || this.l3Storage.has(tagId);
  }

  getSize(): { l1: number; l3: number } {
    return {
      l1: this.l1Cache.size,
      l3: this.l3Storage.size,
    };
  }

  private setL1(tagId: string, dataPoint: CachedDataPoint): void {
    if (this.l1Cache.size >= this.config.l1MaxSize) {
      const oldestTagId = this.accessOrder.shift();
      if (oldestTagId) {
        this.l1Cache.delete(oldestTagId);
      }
    }

    this.l1Cache.set(tagId, dataPoint);
    this.updateAccessOrder(tagId);
  }

  private updateAccessOrder(tagId: string): void {
    const index = this.accessOrder.indexOf(tagId);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(tagId);
  }

  private isExpired(entry: CachedDataPoint, ttlMs: number): boolean {
    return Date.now() - entry.cachedAt > ttlMs;
  }

  async warmUp(
    tagIds: string[],
    fetchData: (tagId: string) => Promise<CachedDataPoint | null>,
  ): Promise<void> {
    this.logger.log(`Warming up cache for ${tagIds.length} tags`);

    for (const tagId of tagIds) {
      if (!this.l1Cache.has(tagId)) {
        const data = await fetchData(tagId);
        if (data) {
          await this.set(data);
        }
      }
    }

    this.logger.log('Cache warm-up completed');
  }
}
