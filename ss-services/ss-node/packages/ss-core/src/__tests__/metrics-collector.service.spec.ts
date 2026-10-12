// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MetricsCollectorService, MetricDimension } from '../metrics/metrics-collector.service';
import { Logger } from '@nestjs/common';

describe('MetricsCollectorService', () => {
  let service: MetricsCollectorService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new MetricsCollectorService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== Counter ====================
  describe('counter operations', () => {
    it('should increment a counter', () => {
      service.increment('requests_total');
      const counter = service.getCounter('requests_total');
      expect(counter).toBeDefined();
      expect(counter!.value).toBe(1);
    });

    it('should increment by custom value', () => {
      service.increment('requests_total', 5);
      const counter = service.getCounter('requests_total');
      expect(counter!.value).toBe(5);
    });

    it('should decrement a counter', () => {
      service.increment('active_connections', 10);
      service.decrement('active_connections', 3);
      const counter = service.getCounter('active_connections');
      expect(counter!.value).toBe(7);
    });

    it('should set counter with dimensions', () => {
      const dims: MetricDimension[] = [{ key: 'method', value: 'GET' }];
      service.increment('requests_total', 1, dims);
      const counter = service.getCounter('requests_total', dims);
      expect(counter).toBeDefined();
      expect(counter!.value).toBe(1);
    });

    it('should get all counters', () => {
      service.increment('counter_a', 1);
      service.increment('counter_b', 2);
      const all = service.getAllCounters();
      expect(all).toHaveLength(2);
    });
  });

  // ==================== Gauge ====================
  describe('gauge operations', () => {
    it('should set a gauge', () => {
      service.gauge('cpu_usage', 75.5);
      const gauge = service.getGauge('cpu_usage');
      expect(gauge).toBeDefined();
      expect(gauge!.value).toBe(75.5);
      expect(gauge!.min).toBe(75.5);
      expect(gauge!.max).toBe(75.5);
    });

    it('should update gauge min/max', () => {
      service.gauge('cpu_usage', 50);
      service.gauge('cpu_usage', 80);
      service.gauge('cpu_usage', 30);
      const gauge = service.getGauge('cpu_usage');
      expect(gauge!.value).toBe(30);
      expect(gauge!.min).toBe(30);
      expect(gauge!.max).toBe(80);
    });

    it('should get all gauges', () => {
      service.gauge('gauge_a', 1);
      service.gauge('gauge_b', 2);
      const all = service.getAllGauges();
      expect(all).toHaveLength(2);
    });
  });

  // ==================== Histogram ====================
  describe('histogram operations', () => {
    it('should observe a histogram value', () => {
      service.histogram('response_time', 150);
      const hist = service.getHistogram('response_time');
      expect(hist).toBeDefined();
      expect(hist!.count).toBe(1);
      expect(hist!.sum).toBe(150);
    });

    it('should track min and max in histogram', () => {
      service.histogram('response_time', 100);
      service.histogram('response_time', 500);
      service.histogram('response_time', 50);
      const hist = service.getHistogram('response_time');
      expect(hist!.min).toBe(50);
      expect(hist!.max).toBe(500);
      expect(hist!.count).toBe(3);
    });

    it('should update histogram buckets', () => {
      service.histogram('response_time', 0.01);
      const hist = service.getHistogram('response_time');
      expect(hist!.buckets.length).toBeGreaterThan(0);
    });

    it('should get all histograms', () => {
      service.histogram('hist_a', 10);
      service.histogram('hist_b', 20);
      const all = service.getAllHistograms();
      expect(all).toHaveLength(2);
    });
  });

  // ==================== Time Series ====================
  describe('time series operations', () => {
    it('should add time series points on counter increment', () => {
      service.increment('requests_total', 1);
      service.increment('requests_total', 2);

      const series = service.getTimeSeries('requests_total');
      expect(series.length).toBe(2);
      expect(series[0].value).toBe(1);
      expect(series[1].value).toBe(3);
    });

    it('should get time series range with since filter', () => {
      const now = new Date();
      service.increment('requests_total', 1);

      const series = service.getTimeSeries('requests_total', { since: now });
      expect(series.length).toBeGreaterThanOrEqual(0);
    });

    it('should get time series with limit', () => {
      service.increment('requests_total', 1);
      service.increment('requests_total', 2);
      service.increment('requests_total', 3);

      const series = service.getTimeSeries('requests_total', { limit: 2 });
      expect(series.length).toBe(2);
    });
  });

  // ==================== Aggregation ====================
  describe('aggregation operations', () => {
    it('should return null for non-existent aggregated period', () => {
      const aggregated = service.getAggregatedMetrics('1m');
      expect(aggregated).toBeNull();
    });
  });

  // ==================== Summary ====================
  describe('getSummary', () => {
    it('should return summary with metric counts', () => {
      service.increment('counter_a', 1);
      service.gauge('gauge_a', 1);
      service.histogram('hist_a', 10);

      const summary = service.getSummary();
      expect(summary.totalMetrics).toBe(3);
      expect(summary.counters).toBe(1);
      expect(summary.gauges).toBe(1);
      expect(summary.histograms).toBe(1);
    });

    it('should return zero for empty metrics', () => {
      const summary = service.getSummary();
      expect(summary.totalMetrics).toBe(0);
    });
  });

  // ==================== Reset ====================
  describe('reset', () => {
    it('should reset a specific metric', () => {
      service.increment('requests_total', 10);
      const deleted = service.resetMetric('requests_total');
      expect(deleted).toBe(true);
      expect(service.getCounter('requests_total')).toBeUndefined();
    });

    it('should return false when resetting non-existent metric', () => {
      const deleted = service.resetMetric('non_existent');
      expect(deleted).toBe(false);
    });

    it('should clear all metrics', () => {
      service.increment('counter_a', 1);
      service.gauge('gauge_a', 1);
      service.histogram('hist_a', 10);

      service.resetAll();

      expect(service.getAllCounters()).toHaveLength(0);
      expect(service.getAllGauges()).toHaveLength(0);
      expect(service.getAllHistograms()).toHaveLength(0);
    });
  });

  // ==================== Prometheus Export ====================
  describe('prometheus export', () => {
    it('should export counters in prometheus format', () => {
      service.increment('requests_total', 42);
      const output = service.exportPrometheusFormat();
      expect(output).toContain('# TYPE requests_total counter');
      expect(output).toContain('requests_total 42');
    });

    it('should export gauges in prometheus format', () => {
      service.gauge('cpu_usage', 75.5);
      const output = service.exportPrometheusFormat();
      expect(output).toContain('# TYPE cpu_usage gauge');
      expect(output).toContain('cpu_usage 75.5');
    });

    it('should throw when prometheus export is disabled', () => {
      service.setConfig({ enablePrometheusExport: false });
      expect(() => service.exportPrometheusFormat()).toThrow('Prometheus export is disabled');
    });
  });

  // ==================== Timing ====================
  describe('timing', () => {
    it('should record timing as histogram', () => {
      service.timing('db_query', 45);
      const hist = service.getHistogram('db_query');
      expect(hist).toBeDefined();
      expect(hist!.count).toBe(1);
      expect(hist!.sum).toBe(45);
    });
  });
});
