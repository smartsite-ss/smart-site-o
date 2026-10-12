// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Query, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { MetricsCollectorService } from './metrics-collector.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsCollectorService) {}

  /**
   * Get metrics summary (total counts, memory usage)
   */
  @Get('summary')
  getSummary() {
    const summary = this.metricsService.getSummary();
    return { code: 0, data: summary, message: 'ok' };
  }

  /**
   * Get all counters
   */
  @Get('counters')
  getCounters() {
    return { code: 0, data: this.metricsService.getAllCounters(), message: 'ok' };
  }

  /**
   * Get all gauges
   */
  @Get('gauges')
  getGauges() {
    return { code: 0, data: this.metricsService.getAllGauges(), message: 'ok' };
  }

  /**
   * Get all histograms
   */
  @Get('histograms')
  getHistograms() {
    return { code: 0, data: this.metricsService.getAllHistograms(), message: 'ok' };
  }

  /**
   * Get time series data for a specific metric
   */
  @Get('timeseries/:name')
  getTimeSeries(
    @Param('name') name: string,
    @Query('since') since?: string,
    @Query('limit') limit?: number,
  ) {
    const options: any = {};
    if (since) options.since = new Date(since);
    if (limit) options.limit = Number(limit);
    const data = this.metricsService.getTimeSeries(name, options);
    return { code: 0, data, message: 'ok' };
  }

  /**
   * Export metrics in Prometheus format
   */
  @Get('prometheus')
  exportPrometheus() {
    try {
      return this.metricsService.exportPrometheusFormat();
    } catch (err: any) {
      return `# Error: ${err.message}`;
    }
  }

  /**
   * Reset all metrics
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  resetAll() {
    this.metricsService.resetAll();
    return { code: 0, data: null, message: 'All metrics reset' };
  }

  /**
   * Reset a specific metric
   */
  @Post('reset/:name')
  @HttpCode(HttpStatus.OK)
  resetMetric(@Param('name') name: string) {
    const success = this.metricsService.resetMetric(name);
    return {
      code: success ? 0 : 404,
      data: null,
      message: success ? 'Metric reset' : 'Metric not found',
    };
  }
}
