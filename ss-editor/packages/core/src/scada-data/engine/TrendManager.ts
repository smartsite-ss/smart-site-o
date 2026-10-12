// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { EventBus } from './EventBus';
import type { ScadaEventType } from '../types/event-bus.types';
import type { DataPoint } from '../types/trend.types';

export interface TrendPoint {
  tagId: string;
  value: any;
  quality: string;
  timestamp: number;
}

export interface TrendSeries {
  tagId: string;
  points: Array<{ time: number; value: any; quality?: string }>;
}

export class RingBuffer<T> {
  private _buffer: T[] = [];
  private _maxSize: number;

  constructor(maxSize: number = 10000) {
    this._maxSize = maxSize;
  }

  push(item: T): void {
    if (this._buffer.length >= this._maxSize) {
      this._buffer.shift();
    }
    this._buffer.push(item);
  }

  toArray(): T[] {
    return [...this._buffer];
  }

  get length(): number {
    return this._buffer.length;
  }

  clear(): void {
    this._buffer = [];
  }
}

export class TrendManager {
  private static instance: TrendManager;

  static getInstance(eventBus?: EventBus): TrendManager {
    if (!TrendManager.instance) {
      if (!eventBus) {
        throw new Error('[TrendManager] EventBus instance required for initialization');
      }
      TrendManager.instance = new TrendManager(eventBus);
    }
    return TrendManager.instance;
  }

  static resetInstance(): void {
    TrendManager.instance = undefined as unknown as TrendManager;
  }

  private _eventBus: EventBus;
  private _dataBuffer: Map<string, RingBuffer<DataPoint>> = new Map();
  private _maxBufferSize: number = 10000;
  private _windowSize: number = 60000;

  private constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  recordDataPoint(tagId: string, value: any, quality: string): void {
    if (!tagId) {
      return;
    }

    let buffer = this._dataBuffer.get(tagId);
    if (!buffer) {
      buffer = new RingBuffer<DataPoint>(this._maxBufferSize);
      this._dataBuffer.set(tagId, buffer);
    }

    const point: DataPoint = {
      timestamp: Date.now(),
      value,
      quality,
    };

    buffer.push(point);

    try {
      this._eventBus.emit('trendUpdated' as ScadaEventType, {
        tagId,
        value,
        quality,
        timestamp: point.timestamp,
      });
    } catch (err) {
      console.error('[TrendManager] Failed to emit trendUpdated event:', err);
    }
  }

  getRealtimeData(tagIds: string[], windowMs?: number): TrendSeries[] {
    const window = windowMs ?? this._windowSize;
    const now = Date.now();
    const cutoff = now - window;

    return tagIds.map((tagId) => {
      const buffer = this._dataBuffer.get(tagId);
      if (!buffer) {
        return { tagId, points: [] };
      }

      const allPoints = buffer.toArray();
      const filtered = allPoints
        .filter((p) => p.timestamp >= cutoff)
        .map((p) => ({
          time: p.timestamp,
          value: p.value,
          quality: p.quality,
        }));

      return { tagId, points: filtered };
    });
  }

  setWindowSize(ms: number): void {
    if (ms <= 0) {
      console.warn('[TrendManager] Window size must be positive');
      return;
    }
    this._windowSize = ms;
  }

  setMaxBufferSize(size: number): void {
    if (size <= 0) {
      console.warn('[TrendManager] Max buffer size must be positive');
      return;
    }
    this._maxBufferSize = size;

    for (const [tagId, buffer] of this._dataBuffer) {
      const data = buffer.toArray();
      const newBuffer = new RingBuffer<DataPoint>(size);
      const keepCount = Math.min(data.length, size);
      const keepData = data.slice(-keepCount);
      for (const point of keepData) {
        newBuffer.push(point);
      }
      this._dataBuffer.set(tagId, newBuffer);
    }
  }

  clearTag(tagId: string): void {
    const buffer = this._dataBuffer.get(tagId);
    if (buffer) {
      buffer.clear();
    }
    this._dataBuffer.delete(tagId);
  }

  clearAll(): void {
    for (const [, buffer] of this._dataBuffer) {
      buffer.clear();
    }
    this._dataBuffer.clear();
  }

  getTagNames(): string[] {
    return Array.from(this._dataBuffer.keys());
  }

  getLatestValue(tagId: string): { value: any; timestamp: number } | null {
    const buffer = this._dataBuffer.get(tagId);
    if (!buffer) {
      return null;
    }

    const points = buffer.toArray();
    if (points.length === 0) {
      return null;
    }

    const latest = points[points.length - 1];
    return {
      value: latest.value,
      timestamp: latest.timestamp,
    };
  }

  /**
   * 查询历史数据，当返回数据量超过阈值时自动应用 LTTB 降采样
   * @param tagIds 标签 ID 列表
   * @param options 查询选项
   * @param options.startTime 开始时间戳（可选，默认不限制）
   * @param options.endTime 结束时间戳（可选，默认不限制）
   * @param options.downsampleThreshold 降采样阈值，超过此数量时自动降采样（默认 1000）
   * @returns 趋势序列数组
   */
  queryHistory(
    tagIds: string[],
    options?: {
      startTime?: number;
      endTime?: number;
      downsampleThreshold?: number;
    },
  ): TrendSeries[] {
    const startTime = options?.startTime;
    const endTime = options?.endTime;
    const threshold = options?.downsampleThreshold ?? 1000;

    return tagIds.map((tagId) => {
      const buffer = this._dataBuffer.get(tagId);
      if (!buffer) {
        return { tagId, points: [] };
      }

      const allPoints = buffer.toArray();
      const filtered = allPoints.filter((p) => {
        if (startTime !== undefined && p.timestamp < startTime) return false;
        if (endTime !== undefined && p.timestamp > endTime) return false;
        return true;
      });

      let trendPoints: TrendPoint[] = filtered.map((p) => ({
        tagId,
        value: p.value,
        quality: p.quality ?? 'good',
        timestamp: p.timestamp,
      }));

      if (trendPoints.length > threshold) {
        trendPoints = TrendManager.downsample(trendPoints, threshold);
      }

      const points = trendPoints.map((p) => ({
        time: p.timestamp,
        value: p.value,
        quality: p.quality,
      }));

      return { tagId, points };
    });
  }

  /**
   * LTTB (Largest Triangle Three Buckets) 降采样算法
   * 在保留数据视觉特征的同时大幅减少数据点数量
   *
   * 算法步骤：
   * 1. 将数据分为 N 个 bucket（N = threshold）
   * 2. 第一个和最后一个数据点始终保留
   * 3. 对于每个 bucket，选择能形成"最大三角形面积"的点
   * 4. 三角形由：前一个选中点、当前 bucket 的候选点、下一个 bucket 的平均点 组成
   *
   * @param data 输入数据点数组（需按 timestamp 升序排列）
   * @param threshold 目标数据点数
   * @returns 降采样后的数据点数组
   */
  static downsample(data: TrendPoint[], threshold: number): TrendPoint[] {
    if (!data || data.length === 0) {
      return data ?? [];
    }

    if (data.length <= threshold) {
      return data;
    }

    // threshold < 3 时无法形成三角形，直接截取首尾
    if (threshold < 3) {
      const result: TrendPoint[] = [data[0]];
      if (threshold === 2 && data.length > 1) {
        result.push(data[data.length - 1]);
      }
      return result;
    }

    const result: TrendPoint[] = [];
    const bucketSize = (data.length - 2) / (threshold - 2);
    let a = 0; // 上一个选中点的索引
    result.push(data[0]);

    for (let i = 0; i < threshold - 2; i++) {
      const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
      const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

      // 计算下一个 bucket 的平均点
      let avgX = 0;
      let avgY = 0;
      const avgCount = avgRangeEnd - avgRangeStart;
      if (avgCount <= 0) {
        // 防御性处理：bucket 为空时直接取当前 bucket 起始点
        const fallbackIndex = Math.min(rangeStart, data.length - 1);
        result.push(data[fallbackIndex]);
        a = fallbackIndex;
        continue;
      }
      for (let j = avgRangeStart; j < avgRangeEnd; j++) {
        avgX += data[j].timestamp;
        avgY += Number(data[j].value);
      }
      avgX /= avgCount;
      avgY /= avgCount;

      // 在当前 bucket 中找最大三角形面积的点
      let maxArea = -1;
      let maxAreaIndex = rangeStart;
      const pointA = data[a];
      const pointAX = pointA.timestamp;
      const pointAY = Number(pointA.value);
      const actualRangeEnd = Math.min(rangeEnd, data.length);
      for (let j = rangeStart; j < actualRangeEnd; j++) {
        const pointBX = data[j].timestamp;
        const pointBY = Number(data[j].value);
        // 三角形面积 = |(xA - avgX) * (yB - yA) - (xA - xB) * (avgY - yA)| * 0.5
        const area =
          Math.abs((pointAX - avgX) * (pointBY - pointAY) - (pointAX - pointBX) * (avgY - pointAY)) *
          0.5;
        if (area > maxArea) {
          maxArea = area;
          maxAreaIndex = j;
        }
      }
      result.push(data[maxAreaIndex]);
      a = maxAreaIndex;
    }
    result.push(data[data.length - 1]);
    return result;
  }

  destroy(): void {
    this.clearAll();
  }
}