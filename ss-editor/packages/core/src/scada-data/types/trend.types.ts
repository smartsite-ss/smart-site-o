// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface DataPoint {
  timestamp: number;
  value: unknown;
  quality?: string;
  sourceId?: string;
}

export interface TrendSeries {
  tagId: string;
  tagName: string;
  dataPoints: DataPoint[];
  minValue: number;
  maxValue: number;
  unit?: string;
}

export interface RingBuffer<T> {
  push(item: T): void;
  getPoints(): T[];
  clear(): void;
  getSize(): number;
  getMaxSize(): number;
  toArray(): T[];
}

export interface TrendConfig {
  windowSize: number;
  maxPoints: number;
  sampleInterval: number;
  tags: string[];
}

export interface TrendData {
  series: TrendSeries[];
  timeRange: { start: number; end: number };
  isPaused: boolean;
}