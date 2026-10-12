// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CachedDataPoint, CacheConfig } from './cache.types';
export declare class DataPointCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger;
  private l1Cache;
  private l3Storage;
  private config;
  private accessOrder;
  onModuleInit(): void;
  onModuleDestroy(): void;
  setConfig(config: Partial<CacheConfig>): void;
  get(tagId: string): Promise<CachedDataPoint | null>;
  getMany(tagIds: string[]): Promise<Map<string, CachedDataPoint>>;
  set(dataPoint: CachedDataPoint): Promise<void>;
  setMany(dataPoints: CachedDataPoint[]): Promise<void>;
  delete(tagId: string): Promise<void>;
  clear(): Promise<void>;
  has(tagId: string): boolean;
  getSize(): {
    l1: number;
    l3: number;
  };
  private setL1;
  private updateAccessOrder;
  private isExpired;
  warmUp(
    tagIds: string[],
    fetchData: (tagId: string) => Promise<CachedDataPoint | null>,
  ): Promise<void>;
}
