// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';

export interface ScriptMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  errorRate: number;
  durationDistribution: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  };
  queueLength: number;
  activeJobs: number;
  totalScripts: number;
  activeScripts: number;
  periodStart: Date;
  periodEnd: Date;
}

interface DurationRecord {
  durationMs: number;
  timestamp: number;
  success: boolean;
}

@Injectable()
export class ScriptMetricsService {
  private readonly logger = new Logger(ScriptMetricsService.name);

  private durationRecords: DurationRecord[] = [];
  private maxRecords = 10000;
  private totalExecutions = 0;
  private successCount = 0;
  private failureCount = 0;
  private totalScripts = 0;
  private activeScripts = 0;

  recordExecution(durationMs: number, success: boolean): void {
    this.totalExecutions++;
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }

    this.durationRecords.push({
      durationMs,
      timestamp: Date.now(),
      success,
    });

    if (this.durationRecords.length > this.maxRecords) {
      this.durationRecords = this.durationRecords.slice(-this.maxRecords);
    }
  }

  setScriptCounts(total: number, active: number): void {
    this.totalScripts = total;
    this.activeScripts = active;
  }

  getMetrics(queueLength: number = 0, activeJobs: number = 0): ScriptMetrics {
    const total = this.totalExecutions || 1;
    const durations = this.durationRecords.map((r) => r.durationMs);

    let p50 = 0;
    let p95 = 0;
    let p99 = 0;
    let avg = 0;
    let min = 0;
    let max = 0;

    if (durations.length > 0) {
      const sorted = [...durations].sort((a, b) => a - b);
      p50 = this.percentile(sorted, 50);
      p95 = this.percentile(sorted, 95);
      p99 = this.percentile(sorted, 99);
      avg = sorted.reduce((sum, d) => sum + d, 0) / sorted.length;
      min = sorted[0];
      max = sorted[sorted.length - 1];
    }

    return {
      totalExecutions: this.totalExecutions,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.successCount / total,
      errorRate: this.failureCount / total,
      durationDistribution: {
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
        avg: Math.round(avg),
        min,
        max,
      },
      queueLength,
      activeJobs,
      totalScripts: this.totalScripts,
      activeScripts: this.activeScripts,
      periodStart: new Date(0),
      periodEnd: new Date(),
    };
  }

  getRecentDurations(limit: number = 100): DurationRecord[] {
    return this.durationRecords.slice(-limit);
  }

  getSuccessRateWindow(windowMs: number = 300000): number {
    const cutoff = Date.now() - windowMs;
    const recent = this.durationRecords.filter((r) => r.timestamp >= cutoff);
    if (recent.length === 0) return 0;
    const successCount = recent.filter((r) => r.success).length;
    return successCount / recent.length;
  }

  reset(): void {
    this.durationRecords = [];
    this.totalExecutions = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.totalScripts = 0;
    this.activeScripts = 0;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    if (index < 0) return sorted[0];
    if (index >= sorted.length) return sorted[sorted.length - 1];
    return sorted[index];
  }
}
