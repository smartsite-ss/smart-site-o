// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import type { DataPoint, TrendSeries, TrendConfig } from '../scada-data/types/trend.types';

function createRingBuffer<T>(maxSize: number) {
  const buffer: T[] = [];
  return {
    push(item: T): void {
      buffer.push(item);
      if (buffer.length > maxSize) {
        buffer.shift();
      }
    },
    getPoints(): T[] {
      return [...buffer];
    },
    clear(): void {
      buffer.length = 0;
    },
    getSize(): number {
      return buffer.length;
    },
    getMaxSize(): number {
      return maxSize;
    },
    toArray(): T[] {
      return [...buffer];
    },
  };
}

function getDefaultState() {
  return {
    series: {} as Record<string, ReturnType<typeof createRingBuffer<DataPoint>>>,
    config: {
      windowSize: 60,
      maxPoints: 10000,
      sampleInterval: 1000,
      tags: [] as string[],
    } as TrendConfig,
    isPaused: false,
    timeRange: { start: 0, end: 0 },
  };
}

export const useTrendStore = defineStore('trend', {
  state: () => getDefaultState(),

  getters: {
    getSeries: (state) => {
      return (tagId: string): DataPoint[] => {
        const buffer = state.series[tagId];
        return buffer ? buffer.toArray() : [];
      };
    },
    getAllSeries: (state): TrendSeries[] => {
      return state.config.tags.map((tagId) => {
        const buffer = state.series[tagId];
        const points = buffer ? buffer.toArray() : [];
        return {
          tagId,
          tagName: tagId,
          dataPoints: points,
          minValue: points.length > 0 ? Math.min(...points.map((p) => Number(p.value))) : 0,
          maxValue: points.length > 0 ? Math.max(...points.map((p) => Number(p.value))) : 0,
        };
      });
    },
  },

  actions: {
    addPoint(tagId: string, point: DataPoint): void {
      if (this.isPaused) return;
      if (!this.series[tagId]) {
        this.series[tagId] = createRingBuffer<DataPoint>(this.config.maxPoints);
      }
      this.series[tagId].push(point);

      this.timeRange.end = point.timestamp;
      if (this.timeRange.start === 0) {
        this.timeRange.start = point.timestamp;
      }
    },

    addBatch(tagId: string, points: DataPoint[]): void {
      for (const point of points) {
        this.addPoint(tagId, point);
      }
    },

    configure(config: Partial<TrendConfig>): void {
      Object.assign(this.config, config);
    },

    addTag(tagId: string): void {
      if (!this.config.tags.includes(tagId)) {
        this.config.tags.push(tagId);
      }
      if (!this.series[tagId]) {
        this.series[tagId] = createRingBuffer<DataPoint>(this.config.maxPoints);
      }
    },

    removeTag(tagId: string): void {
      this.config.tags = this.config.tags.filter((t) => t !== tagId);
      delete this.series[tagId];
    },

    setPaused(paused: boolean): void {
      this.isPaused = paused;
    },

    clearSeries(tagId?: string): void {
      if (tagId) {
        this.series[tagId]?.clear();
      } else {
        for (const key of Object.keys(this.series)) {
          this.series[key]?.clear();
        }
      }
    },

    reset(): void {
      this.series = {};
      this.isPaused = false;
      this.timeRange = { start: 0, end: 0 };
    },
  },
});