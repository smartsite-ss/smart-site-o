// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { StorageEngineRouterService } from './storage-engine-router.service';

export interface StorageMetrics {
  diskUsagePercent: number;
  diskTotalGb: number;
  diskUsedGb: number;
  writeRate: number;
  readRate: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface HealthCheck {
  name: string;
  status: string;
  message?: string;
  latency?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
}

@Injectable()
export class StorageHealthService {
  private readonly logger = new Logger(StorageHealthService.name);

  private errorCount = 0;

  constructor(private readonly router: StorageEngineRouterService) {}

  // ──────────── checkHealth ────────────

  async checkHealth(): Promise<HealthCheckResult> {
    const checks: HealthCheck[] = [];
    const engines = this.router.getAvailableEngines();

    for (const engine of engines) {
      const startTime = Date.now();
      try {
        const adapter = this.router.getAdapterForEngine(engine);
        const health = await adapter.health();
        const latency = Date.now() - startTime;

        checks.push({
          name: `${engine} adapter`,
          status: health.status,
          message: health.details ? JSON.stringify(health.details) : undefined,
          latency,
        });
      } catch (error) {
        const latency = Date.now() - startTime;
        this.errorCount++;
        checks.push({
          name: `${engine} adapter`,
          status: 'unhealthy',
          message: error.message,
          latency,
        });
      }
    }

    // Disk health check
    const diskCheck = await this.checkDiskHealth();
    checks.push(diskCheck);

    // Determine overall status
    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (hasUnhealthy) {
      status = 'unhealthy';
    } else if (hasDegraded) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, checks };
  }

  // ──────────── getStorageMetrics ────────────

  async getStorageMetrics(): Promise<StorageMetrics> {
    return {
      diskUsagePercent: this.getDiskUsagePercent(),
      diskTotalGb: 100, // simulated
      diskUsedGb: this.getDiskUsagePercent(),
      writeRate: 0,
      readRate: 0,
      avgLatencyMs: 0,
      errorCount: this.errorCount,
    };
  }

  // ──────────── Internal ────────────

  private async checkDiskHealth(): Promise<HealthCheck> {
    const usagePercent = this.getDiskUsagePercent();

    if (usagePercent > 90) {
      return {
        name: 'disk',
        status: 'unhealthy',
        message: `Disk usage at ${usagePercent}% (> 90% threshold)`,
      };
    }

    if (usagePercent > 80) {
      return {
        name: 'disk',
        status: 'degraded',
        message: `Disk usage at ${usagePercent}% (> 80% threshold)`,
      };
    }

    return {
      name: 'disk',
      status: 'healthy',
      message: `Disk usage at ${usagePercent}%`,
    };
  }

  private getDiskUsagePercent(): number {
    const envValue = process.env.STORAGE_DISK_USAGE_PERCENT;
    if (envValue) {
      const parsed = parseFloat(envValue);
      if (!isNaN(parsed)) return parsed;
    }
    return 60; // default healthy
  }
}
