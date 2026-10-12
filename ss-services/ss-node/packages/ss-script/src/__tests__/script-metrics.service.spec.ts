// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ScriptMetricsService } from '../script-metrics.service';

describe('ScriptMetricsService', () => {
  let service: ScriptMetricsService;

  beforeEach(() => {
    service = new ScriptMetricsService();
  });

  describe('recordExecution', () => {
    it('should increment total and success counts', () => {
      service.recordExecution(100, true);
      service.recordExecution(200, true);
      service.recordExecution(300, false);

      const metrics = service.getMetrics();
      expect(metrics.totalExecutions).toBe(3);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(1);
    });

    it('should calculate correct success and error rates', () => {
      service.recordExecution(100, true);
      service.recordExecution(200, false);

      const metrics = service.getMetrics();
      expect(metrics.successRate).toBe(0.5);
      expect(metrics.errorRate).toBe(0.5);
    });
  });

  describe('durationDistribution', () => {
    it('should calculate P50/P95/P99 percentiles', () => {
      for (let i = 0; i < 100; i++) {
        service.recordExecution(i * 10, true);
      }

      const metrics = service.getMetrics();
      expect(metrics.durationDistribution.p50).toBeGreaterThan(0);
      expect(metrics.durationDistribution.p95).toBeGreaterThan(metrics.durationDistribution.p50);
      expect(metrics.durationDistribution.p99).toBeGreaterThanOrEqual(
        metrics.durationDistribution.p95,
      );
    });
  });

  describe('getSuccessRateWindow', () => {
    it('should return success rate for recent executions', () => {
      service.recordExecution(100, true);
      service.recordExecution(200, true);
      service.recordExecution(300, false);

      const rate = service.getSuccessRateWindow(60000);
      expect(rate).toBeCloseTo(2 / 3, 1);
    });

    it('should return 0 when no recent executions', () => {
      const rate = service.getSuccessRateWindow(1000);
      expect(rate).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      service.recordExecution(100, true);
      service.recordExecution(200, true);

      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successCount).toBe(0);
    });
  });
});
