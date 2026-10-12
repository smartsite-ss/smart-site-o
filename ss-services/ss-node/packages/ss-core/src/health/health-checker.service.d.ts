// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { HealthCheckResult, HealthReport, HealthChecker } from './health.types';
import { EventBusService } from '../event-bus/event-bus.service';
export declare class HealthCheckerService implements OnModuleInit, OnModuleDestroy {
  private readonly eventBusService;
  private readonly logger;
  private checkers;
  private lastHealthStatus;
  private startTime;
  private timerId;
  constructor(eventBusService: EventBusService);
  onModuleInit(): void;
  onModuleDestroy(): void;
  registerChecker(checker: HealthChecker): void;
  private startPeriodicCheck;
  checkHealth(): Promise<HealthReport>;
  executeCheck(checker: HealthChecker): Promise<HealthCheckResult>;
  private generateReport;
  private notifyStatusChange;
  attemptRecovery(): Promise<void>;
  private recoverCheck;
  private executeRecovery;
  private sleep;
}
