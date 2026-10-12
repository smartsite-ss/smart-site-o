// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { TagValue } from '../types/data-source.types';

/**
 * TagCache — 标签值缓存与失效策略
 *
 * 职责：
 * - 缓存所有标签的最新值（_tagCache）
 * - 缓存每个数据源的原始数据（_sourceRawData）
 * - 处理驱动推送的数据，检测变更，返回变更列表
 * - 支持按数据源清除缓存
 */
export class TagCache {
  private _tagCache: Map<string, TagValue> = new Map();
  private _sourceRawData: Map<string, Record<string, unknown>> = new Map();

  getCachedValue(tagId: string): TagValue | undefined {
    return this._tagCache.get(tagId);
  }

  getAllCachedValues(): Map<string, TagValue> {
    return new Map(this._tagCache);
  }

  getSourceRawData(sourceId: string): Record<string, unknown> | undefined {
    return this._sourceRawData.get(sourceId);
  }

  clearCachedTags(sourceId: string): void {
    for (const [tagId, v] of this._tagCache) {
      if (v.sourceId === sourceId) {
        this._tagCache.delete(tagId);
      }
    }
  }

  clear(): void {
    this._tagCache.clear();
    this._sourceRawData.clear();
  }

  /**
   * 处理驱动推送的数据：
   * - 更新 _sourceRawData
   * - 比较缓存值，检测变更
   * - 更新 _tagCache
   * - 返回所有发生变更的条目（含 previousValue）
   */
  processReceivedData(
    sourceId: string,
    values: TagValue[],
  ): Array<{
    tagId: string;
    value: unknown;
    previousValue: unknown;
    quality: string;
    sourceId: string;
  }> {
    const changes: Array<{
      tagId: string;
      value: unknown;
      previousValue: unknown;
      quality: string;
      sourceId: string;
    }> = [];

    let rawData = this._sourceRawData.get(sourceId);
    if (!rawData) {
      rawData = {};
      this._sourceRawData.set(sourceId, rawData);
    }

    for (const v of values) {
      rawData[v.tagId] = v.value;

      const cached = this._tagCache.get(v.tagId);
      v.sourceId = sourceId;
      if (!cached || cached.value !== v.value || cached.quality !== v.quality) {
        this._tagCache.set(v.tagId, v);
        changes.push({
          tagId: v.tagId,
          value: v.value,
          previousValue: cached?.value,
          quality: v.quality,
          sourceId,
        });
      }
    }

    return changes;
  }
}