// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { MetricsController } from '../metrics.controller';
import { MetricsCollectorService } from '../metrics-collector.service';

type MockMetricsService = Partial<Record<keyof MetricsCollectorService, jest.Mock>>;

function createMockMetricsService(): MockMetricsService {
  return {
    getSummary: jest.fn(),
    getAllCounters: jest.fn(),
    getAllGauges: jest.fn(),
    getAllHistograms: jest.fn(),
    getTimeSeries: jest.fn(),
    exportPrometheusFormat: jest.fn(),
    resetAll: jest.fn(),
    resetMetric: jest.fn(),
  };
}

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockMetricsService: MockMetricsService;

  beforeEach(() => {
    mockMetricsService = createMockMetricsService();
    controller = new MetricsController(mockMetricsService as any);
  });

  // ==================== GET /metrics/summary ====================
  describe('getSummary', () => {
    it('should return metrics summary', () => {
      const summary = {
        totalMetrics: 3,
        counters: 1,
        gauges: 1,
        histograms: 1,
        timeSeriesPoints: 10,
        memoryUsageEstimate: 0.05,
      };
      mockMetricsService.getSummary!.mockReturnValue(summary);

      const result = controller.getSummary();

      expect(mockMetricsService.getSummary).toHaveBeenCalled();
      expect(result.code).toBe(0);
      expect(result.data).toEqual(summary);
      expect(result.message).toBe('ok');
    });
  });

  // ==================== GET /metrics/counters ====================
  describe('getCounters', () => {
    it('should return all counters', () => {
      const counters = [
        {
          name: 'requests_total',
          value: 42,
          dimensions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockMetricsService.getAllCounters!.mockReturnValue(counters);

      const result = controller.getCounters();

      expect(mockMetricsService.getAllCounters).toHaveBeenCalled();
      expect(result.code).toBe(0);
      expect(result.data).toEqual(counters);
      expect(result.message).toBe('ok');
    });

    it('should return empty array when no counters', () => {
      mockMetricsService.getAllCounters!.mockReturnValue([]);

      const result = controller.getCounters();

      expect(result.code).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  // ==================== GET /metrics/gauges ====================
  describe('getGauges', () => {
    it('should return all gauges', () => {
      const gauges = [
        {
          name: 'cpu_usage',
          value: 75.5,
          min: 50,
          max: 90,
          dimensions: [],
          lastUpdated: new Date(),
        },
      ];
      mockMetricsService.getAllGauges!.mockReturnValue(gauges);

      const result = controller.getGauges();

      expect(mockMetricsService.getAllGauges).toHaveBeenCalled();
      expect(result.code).toBe(0);
      expect(result.data).toEqual(gauges);
      expect(result.message).toBe('ok');
    });
  });

  // ==================== GET /metrics/histograms ====================
  describe('getHistograms', () => {
    it('should return all histograms', () => {
      const histograms = [
        {
          name: 'response_time',
          count: 10,
          sum: 1500,
          buckets: [],
          dimensions: [],
          lastUpdated: new Date(),
        },
      ];
      mockMetricsService.getAllHistograms!.mockReturnValue(histograms);

      const result = controller.getHistograms();

      expect(mockMetricsService.getAllHistograms).toHaveBeenCalled();
      expect(result.code).toBe(0);
      expect(result.data).toEqual(histograms);
      expect(result.message).toBe('ok');
    });
  });

  // ==================== GET /metrics/timeseries/:name ====================
  describe('getTimeSeries', () => {
    it('should return time series data for a metric', () => {
      const points = [
        { timestamp: new Date(), value: 10 },
        { timestamp: new Date(), value: 20 },
      ];
      mockMetricsService.getTimeSeries!.mockReturnValue(points);

      const result = controller.getTimeSeries('requests_total');

      expect(mockMetricsService.getTimeSeries).toHaveBeenCalledWith('requests_total', {});
      expect(result.code).toBe(0);
      expect(result.data).toEqual(points);
      expect(result.message).toBe('ok');
    });

    it('should pass since and limit query parameters', () => {
      mockMetricsService.getTimeSeries!.mockReturnValue([]);

      controller.getTimeSeries('requests_total', '2024-01-01T00:00:00Z', 100);

      expect(mockMetricsService.getTimeSeries).toHaveBeenCalledWith('requests_total', {
        since: expect.any(Date),
        limit: 100,
      });
    });

    it('should handle missing optional query params', () => {
      mockMetricsService.getTimeSeries!.mockReturnValue([]);

      controller.getTimeSeries('requests_total', undefined, undefined);

      expect(mockMetricsService.getTimeSeries).toHaveBeenCalledWith('requests_total', {});
    });
  });

  // ==================== GET /metrics/prometheus ====================
  describe('exportPrometheus', () => {
    it('should export metrics in prometheus format', () => {
      const prometheusOutput = '# TYPE requests_total counter\nrequests_total 42\n';
      mockMetricsService.exportPrometheusFormat!.mockReturnValue(prometheusOutput);

      const result = controller.exportPrometheus();

      expect(mockMetricsService.exportPrometheusFormat).toHaveBeenCalled();
      expect(result).toBe(prometheusOutput);
    });

    it('should return error message when export fails', () => {
      mockMetricsService.exportPrometheusFormat!.mockImplementation(() => {
        throw new Error('Prometheus export is disabled');
      });

      const result = controller.exportPrometheus();

      expect(result).toBe('# Error: Prometheus export is disabled');
    });
  });

  // ==================== POST /metrics/reset ====================
  describe('resetAll', () => {
    it('should reset all metrics', () => {
      const result = controller.resetAll();

      expect(mockMetricsService.resetAll).toHaveBeenCalled();
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
      expect(result.message).toBe('All metrics reset');
    });
  });

  // ==================== POST /metrics/reset/:name ====================
  describe('resetMetric', () => {
    it('should reset a specific metric when found', () => {
      mockMetricsService.resetMetric!.mockReturnValue(true);

      const result = controller.resetMetric('requests_total');

      expect(mockMetricsService.resetMetric).toHaveBeenCalledWith('requests_total');
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Metric reset');
    });

    it('should return 404 when metric not found', () => {
      mockMetricsService.resetMetric!.mockReturnValue(false);

      const result = controller.resetMetric('non_existent');

      expect(mockMetricsService.resetMetric).toHaveBeenCalledWith('non_existent');
      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Metric not found');
    });
  });
});
