// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface Counter {
  name: string;
  value: number;
  labels?: Record<string, string>;
}
export interface Gauge {
  name: string;
  value: number;
  labels?: Record<string, string>;
}
export interface HistogramBucket {
  upperBound: number;
  count: number;
}
export interface Histogram {
  name: string;
  buckets: HistogramBucket[];
  sum: number;
  count: number;
  labels?: Record<string, string>;
}
export interface Summary {
  name: string;
  quantiles: Record<string, number>;
  sum: number;
  count: number;
  labels?: Record<string, string>;
}
export interface MetricsReport {
  timestamp: number;
  counters: Counter[];
  gauges: Gauge[];
  histograms: Histogram[];
  summaries: Summary[];
}
export interface MetricsConfig {
  enabled: boolean;
  reportIntervalMs: number;
  histogramBuckets: number[];
  maxSamples: number;
}
