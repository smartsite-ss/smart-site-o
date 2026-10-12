// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export type MetricType = 'counter' | 'gauge' | 'histogram';
export interface MetricDimension {
  key: string;
  value: string;
}
export interface MetricData {
  name: string;
  type: MetricType;
  value: number;
  dimensions: MetricDimension[];
  timestamp: Date;
}
export interface HistogramBucket {
  upperBound: number;
  count: number;
}
export interface CounterMetric {
  name: string;
  value: number;
  dimensions: MetricDimension[];
  createdAt: Date;
  updatedAt: Date;
}
export interface GaugeMetric {
  name: string;
  value: number;
  min: number;
  max: number;
  dimensions: MetricDimension[];
  lastUpdated: Date;
}
export interface HistogramMetric {
  name: string;
  count: number;
  sum: number;
  buckets: HistogramBucket[];
  dimensions: MetricDimension[];
  min?: number;
  max?: number;
  lastUpdated: Date;
}
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}
export interface AggregatedMetrics {
  period: string;
  metrics: Map<
    string,
    {
      count: number;
      sum: number;
      avg: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    }
  >;
}
export interface MetricsConfig {
  retentionPeriodMs: number;
  aggregationIntervals: string[];
  enablePrometheusExport: boolean;
  maxMetricsCount: number;
  autoCleanupIntervalMs: number;
}
export declare class MetricsCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger;
  private config;
  private counters;
  private gauges;
  private histograms;
  private timeSeriesData;
  private aggregatedData;
  private cleanupInterval;
  onModuleInit(): void;
  onModuleDestroy(): void;
  setConfig(config: Partial<MetricsConfig>): void;
  increment(name: string, value?: number, dimensions?: MetricDimension[]): void;
  decrement(name: string, value?: number, dimensions?: MetricDimension[]): void;
  gauge(name: string, value: number, dimensions?: MetricDimension[]): void;
  histogram(name: string, value: number, buckets?: number[], dimensions?: MetricDimension[]): void;
  timing(name: string, durationMs: number, dimensions?: MetricDimension[]): void;
  getCounter(name: string, dimensions?: MetricDimension[]): CounterMetric | undefined;
  getGauge(name: string, dimensions?: MetricDimension[]): GaugeMetric | undefined;
  getHistogram(name: string, dimensions?: MetricDimension[]): HistogramMetric | undefined;
  getAllCounters(): CounterMetric[];
  getAllGauges(): GaugeMetric[];
  getAllHistograms(): HistogramMetric[];
  getTimeSeries(
    name: string,
    options?: {
      since?: Date;
      until?: Date;
      limit?: number;
    },
  ): TimeSeriesPoint[];
  getAggregatedMetrics(period: string): AggregatedMetrics | null;
  resetMetric(name: string, dimensions?: MetricDimension[]): boolean;
  resetAll(): void;
  exportPrometheusFormat(): string;
  getSummary(): {
    totalMetrics: number;
    counters: number;
    gauges: number;
    histograms: number;
    timeSeriesPoints: number;
    memoryUsageEstimate: number;
  };
  private recordTimeSeries;
  private getMetricKey;
  private formatLabels;
  private evictOldestMetric;
  private cleanupOldData;
  private estimateMemoryUsage;
}
