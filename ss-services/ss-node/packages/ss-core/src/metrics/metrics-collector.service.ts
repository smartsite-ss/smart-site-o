// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

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

const DEFAULT_CONFIG: MetricsConfig = {
  retentionPeriodMs: 3600000, // 1 hour
  aggregationIntervals: ['1m', '5m', '15m', '1h'],
  enablePrometheusExport: true,
  maxMetricsCount: 10000,
  autoCleanupIntervalMs: 300000, // 5 minutes
};

@Injectable()
export class MetricsCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsCollectorService.name);

  private config: MetricsConfig = DEFAULT_CONFIG;

  // 指标存储
  private counters = new Map<string, CounterMetric>();
  private gauges = new Map<string, GaugeMetric>();
  private histograms = new Map<string, HistogramMetric>();

  // 原始数据时间序列
  private timeSeriesData = new Map<string, TimeSeriesPoint[]>();

  // 聚合数据
  private aggregatedData = new Map<string, AggregatedMetrics[]>();

  // 清理定时器
  private cleanupInterval: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.logger.log('MetricsCollectorService initialized');

    if (this.config.autoCleanupIntervalMs > 0) {
      this.cleanupInterval = setInterval(
        () => this.cleanupOldData(),
        this.config.autoCleanupIntervalMs,
      );
    }

    this.logger.debug(
      `Metrics config: retention=${this.config.retentionPeriodMs}ms, ` +
        `maxMetrics=${this.config.maxMetricsCount}`,
    );
  }

  onModuleDestroy(): void {
    this.logger.log('MetricsCollectorService destroyed');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timeSeriesData.clear();
    this.aggregatedData.clear();
  }

  setConfig(config: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  increment(name: string, value: number = 1, dimensions?: MetricDimension[]): void {
    const key = this.getMetricKey(name, dimensions);

    let counter = this.counters.get(key);

    if (!counter) {
      counter = {
        name,
        value: 0,
        dimensions: dimensions || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (this.counters.size >= this.config.maxMetricsCount) {
        this.evictOldestMetric('counter');
      }

      this.counters.set(key, counter);
    }

    counter.value += value;
    counter.updatedAt = new Date();

    this.recordTimeSeries(name, counter.value, dimensions);
  }

  decrement(name: string, value: number = 1, dimensions?: MetricDimension[]): void {
    this.increment(name, -value, dimensions);
  }

  gauge(name: string, value: number, dimensions?: MetricDimension[]): void {
    const key = this.getMetricKey(name, dimensions);

    let gauge = this.gauges.get(key);

    if (!gauge) {
      gauge = {
        name,
        value,
        min: value,
        max: value,
        dimensions: dimensions || [],
        lastUpdated: new Date(),
      };

      if (this.gauges.size >= this.config.maxMetricsCount) {
        this.evictOldestMetric('gauge');
      }

      this.gauges.set(key, gauge);
    } else {
      gauge.value = value;
      gauge.min = Math.min(gauge.min, value);
      gauge.max = Math.max(gauge.max, value);
      gauge.lastUpdated = new Date();
    }

    this.recordTimeSeries(name, value, dimensions);
  }

  histogram(name: string, value: number, buckets?: number[], dimensions?: MetricDimension[]): void {
    const key = this.getMetricKey(name, dimensions);

    const defaultBuckets = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    const bucketBounds = buckets || defaultBuckets;

    let histogram = this.histograms.get(key);

    if (!histogram) {
      histogram = {
        name,
        count: 0,
        sum: 0,
        buckets: bucketBounds.map((bound) => ({
          upperBound: bound,
          count: 0,
        })),
        dimensions: dimensions || [],
        min: value,
        max: value,
        lastUpdated: new Date(),
      };

      if (this.histograms.size >= this.config.maxMetricsCount) {
        this.evictOldestMetric('histogram');
      }

      this.histograms.set(key, histogram);
    }

    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min!, value);
    histogram.max = Math.max(histogram.max!, value);
    histogram.lastUpdated = new Date();

    // 更新bucket计数
    for (const bucket of histogram.buckets) {
      if (value <= bucket.upperBound) {
        bucket.count++;
      }
    }

    this.recordTimeSeries(name, value, dimensions);
  }

  timing(name: string, durationMs: number, dimensions?: MetricDimension[]): void {
    this.histogram(name, durationMs, undefined, dimensions);
  }

  getCounter(name: string, dimensions?: MetricDimension[]): CounterMetric | undefined {
    return this.counters.get(this.getMetricKey(name, dimensions));
  }

  getGauge(name: string, dimensions?: MetricDimension[]): GaugeMetric | undefined {
    return this.gauges.get(this.getMetricKey(name, dimensions));
  }

  getHistogram(name: string, dimensions?: MetricDimension[]): HistogramMetric | undefined {
    return this.histograms.get(this.getMetricKey(name, dimensions));
  }

  getAllCounters(): CounterMetric[] {
    return Array.from(this.counters.values());
  }

  getAllGauges(): GaugeMetric[] {
    return Array.from(this.gauges.values());
  }

  getAllHistograms(): HistogramMetric[] {
    return Array.from(this.histograms.values());
  }

  getTimeSeries(
    name: string,
    options?: { since?: Date; until?: Date; limit?: number },
  ): TimeSeriesPoint[] {
    const data = this.timeSeriesData.get(name);
    if (!data) return [];

    let points = [...data];

    if (options?.since) {
      points = points.filter((p) => p.timestamp >= options.since!);
    }

    if (options?.until) {
      points = points.filter((p) => p.timestamp <= options.until!);
    }

    if (options?.limit) {
      points = points.slice(-options.limit);
    }

    return points;
  }

  getAggregatedMetrics(period: string): AggregatedMetrics | null {
    return this.aggregatedData.get(period)?.[0] || null;
  }

  resetMetric(name: string, dimensions?: MetricDimension[]): boolean {
    const key = this.getMetricKey(name, dimensions);

    return this.counters.delete(key) || this.gauges.delete(key) || this.histograms.delete(key);
  }

  resetAll(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timeSeriesData.clear();
    this.aggregatedData.clear();

    this.logger.log('All metrics reset');
  }

  exportPrometheusFormat(): string {
    if (!this.config.enablePrometheusExport) {
      throw new Error('Prometheus export is disabled');
    }

    const lines: string[] = [];

    // Export counters
    for (const counter of this.counters.values()) {
      const labels = this.formatLabels(counter.dimensions);
      lines.push(`# TYPE ${counter.name} counter`);
      lines.push(`${counter.name}${labels} ${counter.value}`);
      lines.push('');
    }

    // Export gauges
    for (const gauge of this.gauges.values()) {
      const labels = this.formatLabels(gauge.dimensions);
      lines.push(`# TYPE ${gauge.name} gauge`);
      lines.push(`${gauge.name}${labels} ${gauge.value}`);
      lines.push(`${gauge.name}_min${labels} ${gauge.min}`);
      lines.push(`${gauge.name}_max${labels} ${gauge.max}`);
      lines.push('');
    }

    // Export histograms
    for (const hist of this.histograms.values()) {
      const labels = this.formatLabels(hist.dimensions);
      lines.push(`# TYPE ${hist.name} histogram`);
      lines.push(`${hist.name}_count${labels} ${hist.count}`);
      lines.push(`${hist.name}_sum${labels} ${hist.sum}`);

      let cumulativeCount = 0;
      for (const bucket of hist.buckets) {
        cumulativeCount += bucket.count;
        lines.push(
          `${hist.name}_bucket{le="${bucket.upperBound}"${labels.substring(0, labels.length - 1)}} ${cumulativeCount}`,
        );
      }

      lines.push(
        `${hist.name}_bucket{le="+Inf"${labels.substring(0, labels.length - 1)}} ${hist.count}`,
      );
      lines.push('');
    }

    return lines.join('\n');
  }

  getSummary(): {
    totalMetrics: number;
    counters: number;
    gauges: number;
    histograms: number;
    timeSeriesPoints: number;
    memoryUsageEstimate: number;
  } {
    let timeSeriesPoints = 0;
    for (const [, data] of this.timeSeriesData) {
      timeSeriesPoints += data.length;
    }

    return {
      totalMetrics: this.counters.size + this.gauges.size + this.histograms.size,
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
      timeSeriesPoints,
      memoryUsageEstimate: this.estimateMemoryUsage(),
    };
  }

  private recordTimeSeries(name: string, value: number, dimensions?: MetricDimension[]): void {
    const key = this.getMetricKey(name, dimensions);

    let series = this.timeSeriesData.get(key);
    if (!series) {
      series = [];
      this.timeSeriesData.set(key, series);
    }

    series.push({
      timestamp: new Date(),
      value,
    });

    // 限制数据点数量（保留最近的数据）
    const maxPoints = Math.floor(this.config.retentionPeriodMs / 1000); // 每秒一个点
    if (series.length > maxPoints) {
      series.splice(0, series.length - maxPoints);
    }
  }

  private getMetricKey(name: string, dimensions?: MetricDimension[]): string {
    if (!dimensions || dimensions.length === 0) {
      return name;
    }

    const dimString = dimensions
      .map((d) => `${d.key}="${d.value}"`)
      .sort()
      .join(',');

    return `${name}{${dimString}}`;
  }

  private formatLabels(dimensions: MetricDimension[]): string {
    if (!dimensions || dimensions.length === 0) {
      return '';
    }

    const labels = dimensions.map((d) => `${d.key}="${d.value}"`).join(',');
    return `{${labels},}`;
  }

  private evictOldestMetric(type: 'counter' | 'gauge' | 'histogram'): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    const map =
      type === 'counter' ? this.counters : type === 'gauge' ? this.gauges : this.histograms;

    for (const [key, metric] of map.entries()) {
      const updateTime =
        type === 'counter'
          ? (metric as CounterMetric).updatedAt.getTime()
          : type === 'gauge'
            ? (metric as GaugeMetric).lastUpdated.getTime()
            : (metric as HistogramMetric).lastUpdated.getTime();

      if (updateTime < oldestTime) {
        oldestTime = updateTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      map.delete(oldestKey);
      this.logger.debug(`Evicted oldest ${type} metric: ${oldestKey}`);
    }
  }

  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriodMs);
    let cleaned = 0;

    // 清理时间序列数据
    for (const [key, data] of this.timeSeriesData.entries()) {
      const beforeLength = data.length;
      const filtered = data.filter((point) => point.timestamp > cutoff);

      if (filtered.length !== beforeLength) {
        this.timeSeriesData.set(key, filtered);
        cleaned += beforeLength - filtered.length;

        if (filtered.length === 0) {
          this.timeSeriesData.delete(key);
        }
      }
    }

    // 清理过期的计数器（长时间未更新）
    for (const [key, counter] of this.counters.entries()) {
      if (counter.updatedAt < cutoff && counter.value === 0) {
        this.counters.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} old metric entries`);
    }
  }

  private estimateMemoryUsage(): number {
    let bytes = 0;

    for (const [, counter] of this.counters) {
      bytes += JSON.stringify(counter).length * 2; // 粗略估算
    }

    for (const [, gauge] of this.gauges) {
      bytes += JSON.stringify(gauge).length * 2;
    }

    for (const [, hist] of this.histograms) {
      bytes += JSON.stringify(hist).length * 2;
    }

    for (const [, data] of this.timeSeriesData) {
      bytes += data.length * 64; // 每个点约64字节
    }

    return Math.round((bytes / 1024 / 1024) * 100) / 100; // MB
  }
}
