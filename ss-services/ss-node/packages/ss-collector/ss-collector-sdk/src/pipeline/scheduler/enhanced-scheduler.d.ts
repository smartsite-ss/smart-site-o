// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PipelineStep } from '../pipeline-orchestrator';
export declare enum TaskPriority {
  CRITICAL = 100,
  HIGH = 75,
  NORMAL = 50,
  LOW = 25,
}
export interface AcquisitionTask {
  id: string;
  deviceId: string;
  tagId: string;
  tagConfig: any;
  deviceClient: any;
  priority: TaskPriority;
  interval: number;
  lastExecution?: Date;
  retryCount: number;
  maxRetries: number;
  enabled: boolean;
}
export interface SchedulerConfig {
  maxConcurrentTasks: number;
  maxQueueSize: number;
  schedulingIntervalMs: number;
  enableBackpressure: boolean;
  defaultMaxRetries: number;
}
export interface SchedulerMetrics {
  totalTasks: number;
  runningTasks: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  throughputPerSecond: number;
}
export declare class EnhancedScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger;
  private tasks;
  private runningTasksCount;
  private schedulerInterval;
  private metricsTimer;
  private config;
  private pipelineSteps;
  private metrics;
  constructor(config?: Partial<SchedulerConfig>);
  onModuleInit(): void;
  onModuleDestroy(): void;
  setPipelineSteps(steps: PipelineStep[]): void;
  registerTask(task: AcquisitionTask): void;
  unregisterTask(taskId: string): boolean;
  enableTask(taskId: string): void;
  disableTask(taskId: string): void;
  getTaskStatus(): Map<string, AcquisitionTask>;
  getMetrics(): SchedulerMetrics;
  private startSchedulingLoop;
  private startMetricsCollection;
  private executeNextBatch;
  private getReadyTasks;
  private executeTask;
  private handleCriticalTaskFailure;
  private applyBackpressure;
  private recordSuccess;
  private recordFailure;
  resetMetrics(): void;
}
