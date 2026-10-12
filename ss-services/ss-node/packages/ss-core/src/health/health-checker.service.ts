// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { HealthCheckResult, HealthReport, HealthStatus, HealthChecker } from './health.types';
import { EventBusService } from '../event-bus/event-bus.service';
import { HealthEvent } from '../event-bus/event-bus.types';

@Injectable()
export class HealthCheckerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthCheckerService.name);
  private checkers: HealthChecker[] = [];
  private lastHealthStatus: HealthStatus = 'healthy';
  private startTime: number = Date.now();
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly eventBusService: EventBusService) {}

  onModuleInit(): void {
    this.logger.log('HealthCheckerService initialized');
    this.startPeriodicCheck();
  }

  onModuleDestroy(): void {
    this.logger.log('HealthCheckerService destroyed');
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  registerChecker(checker: HealthChecker): void {
    this.checkers.push(checker);
    this.logger.log(`Registered health checker: ${checker.name}`);
  }

  private startPeriodicCheck(): void {
    this.timerId = setInterval(() => {
      this.checkHealth().catch((error) => {
        this.logger.error(`Health check failed: ${error.message}`);
      });
    }, 30000);
  }

  async checkHealth(): Promise<HealthReport> {
    const checks = await Promise.all(this.checkers.map((checker) => this.executeCheck(checker)));

    const report = this.generateReport(checks);
    this.notifyStatusChange(report);

    return report;
  }

  async executeCheck(checker: HealthChecker): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const result = await checker.check();
      result.latency = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        name: checker.name,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  private generateReport(checks: HealthCheckResult[]): HealthReport {
    const unhealthy = checks.filter((c) => c.status === 'unhealthy');
    const degraded = checks.filter((c) => c.status === 'unhealthy' && c.error);

    let overallStatus: HealthStatus = 'healthy';
    if (unhealthy.length === checks.length) {
      overallStatus = 'unhealthy';
    } else if (degraded.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      overallStatus,
      checks,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    };
  }

  private notifyStatusChange(report: HealthReport): void {
    if (report.overallStatus !== this.lastHealthStatus) {
      this.lastHealthStatus = report.overallStatus;

      if (report.overallStatus === 'healthy') {
        const event: HealthEvent = {
          checks: report.checks,
          timestamp: report.timestamp,
        };
        this.eventBusService.emitHealthRecovered(event);
        this.logger.log('System health recovered');
      } else {
        const event: HealthEvent = {
          checks: report.checks,
          timestamp: report.timestamp,
        };
        this.eventBusService.emitHealthDegraded(event);
        this.logger.warn(`System health degraded to: ${report.overallStatus}`);
      }
    }
  }

  async attemptRecovery(): Promise<void> {
    const report = await this.checkHealth();
    const unhealthyChecks = report.checks.filter((c) => c.status === 'unhealthy');

    for (const check of unhealthyChecks) {
      await this.recoverCheck(check);
    }
  }

  private async recoverCheck(check: HealthCheckResult): Promise<void> {
    this.logger.log(`Attempting recovery for: ${check.name}`);

    const maxRetries = 3;
    let retryCount = 0;
    const baseDelay = 5000;

    while (retryCount < maxRetries) {
      try {
        const result = await this.executeRecovery(check.name);
        if (result) {
          this.logger.log(`Recovery successful for: ${check.name}`);
          return;
        }
      } catch (error) {
        this.logger.error(
          `Recovery attempt ${retryCount + 1} failed for ${check.name}: ${error.message}`,
        );
      }

      retryCount++;
      const delay = baseDelay * Math.pow(2, retryCount);
      await this.sleep(delay);
    }

    this.logger.error(`Recovery failed after ${maxRetries} attempts for: ${check.name}`);
  }

  private async executeRecovery(checkName: string): Promise<boolean> {
    this.logger.log(`Executing recovery action for: ${checkName}`);
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
