// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { PipelineContext, PipelineStep, StepMetrics } from './pipeline-orchestrator';
import { BoundedBackpressureQueue } from './bounded-backpressure-queue';
import { CircuitBreakerService } from './circuit-breaker.service';
import { StepTimeoutError } from './errors';

export interface ConcurrentPipelineConfig {
  maxConcurrency: number;
  queueMaxSize: number;
  discardPolicy: 'oldest' | 'newest' | 'reject';
  stepTimeoutMs: number;
  workerIdleTimeoutMs: number;
}

const DEFAULT_CONFIG: Required<ConcurrentPipelineConfig> = {
  maxConcurrency: 10,
  queueMaxSize: 10000,
  discardPolicy: 'oldest',
  stepTimeoutMs: 10000,
  workerIdleTimeoutMs: 30000,
};

interface _WorkerTask {
  context: PipelineContext;
  resolve: (ctx: PipelineContext) => void;
  reject: (err: Error) => void;
  startTime: number;
}

interface WorkerStats {
  id: number;
  busy: boolean;
  tasksProcessed: number;
  totalDurationMs: number;
  lastActiveAt: number;
}

@Injectable()
export class ConcurrentPipelineOrchestrator implements OnModuleDestroy {
  private readonly logger = new Logger(ConcurrentPipelineOrchestrator.name);

  private steps: PipelineStep[] = [];
  private metrics = new Map<string, StepMetrics>();
  private config: Required<ConcurrentPipelineConfig>;

  private queue: BoundedBackpressureQueue<PipelineContext>;
  private workers: WorkerStats[] = [];
  private activeWorkers = 0;
  private isRunning = false;
  private isShuttingDown = false;

  private totalEnqueued = 0;
  private totalCompleted = 0;
  private totalDiscarded = 0;

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    @Optional() config?: Partial<ConcurrentPipelineConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = new BoundedBackpressureQueue<PipelineContext>({
      maxSize: this.config.queueMaxSize,
      discardPolicy: this.config.discardPolicy,
      onDiscard: (count) => {
        this.totalDiscarded += count;
        this.logger.warn(`Backpressure: ${count} items discarded`);
      },
    });
    this.initWorkers();
  }

  registerStep(step: PipelineStep): void {
    this.steps.push(step);
    this.steps.sort((a, b) => a.order - b.order);
    this.metrics.set(step.name, {
      stepName: step.name,
      totalCalls: 0,
      totalDurationMs: 0,
      errorCount: 0,
      lastCallAt: null,
      lastDurationMs: null,
    });

    const startOrder = this.steps[0]?.order || 0;
    const endOrder = this.steps[this.steps.length - 1]?.order || 0;
    this.logger.log(
      `[Concurrent] Pipeline registered: ${this.steps.map((s) => `${s.name}(${s.order})`).join(' → ')} ` +
        `[order: ${startOrder}-${endOrder}] [workers=${this.config.maxConcurrency}]`,
    );
  }

  async execute(initialContext: PipelineContext): Promise<PipelineContext> {
    if (this.isShuttingDown) {
      return {
        ...initialContext,
        errors: [
          ...(initialContext.errors || []),
          { step: 'Orchestrator', message: 'System is shutting down' },
        ],
        quality: 'bad',
      };
    }

    if (!this.isRunning) {
      this.start();
    }

    return new Promise<PipelineContext>((resolve, reject) => {
      const result = this.queue.enqueue(initialContext);
      this.totalEnqueued++;

      if (!result.accepted) {
        resolve({
          ...initialContext,
          errors: [
            ...(initialContext.errors || []),
            { step: 'Orchestrator', message: `Queue full, item discarded (${result.discarded})` },
          ],
          quality: 'bad',
        });
        return;
      }

      const _timeout = setTimeout(
        () => {
          reject(new Error(`Pipeline execution timed out for tag ${initialContext.tagId}`));
        },
        this.steps.length * this.config.stepTimeoutMs + 60000,
      );
    });
  }

  async executeBatch(contexts: PipelineContext[]): Promise<PipelineContext[]> {
    const results = await Promise.allSettled(contexts.map((ctx) => this.execute(ctx)));
    return results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : ({
            ...contexts[results.indexOf(r)],
            errors: [{ step: 'Orchestrator', message: r.reason?.message }],
            quality: 'bad',
          } as PipelineContext),
    );
  }

  getQueueStats() {
    return this.queue.getStats();
  }

  getWorkerStats(): WorkerStats[] {
    return [...this.workers];
  }

  getCircuitBreakerStates() {
    return this.circuitBreakerService.getAllStates();
  }

  getOverallStats() {
    return {
      pipeline: Object.fromEntries(this.metrics),
      queue: this.queue.getStats(),
      workers: this.workers.map((w) => ({ id: w.id, busy: w.busy, processed: w.tasksProcessed })),
      circuits: Object.fromEntries(this.circuitBreakerService.getAllStates()),
      throughput: {
        enqueued: this.totalEnqueued,
        completed: this.totalCompleted,
        discarded: this.totalDiscarded,
      },
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Graceful shutdown initiated...');
    this.isShuttingDown = true;
    this.isRunning = false;

    const remaining = this.queue.size;
    if (remaining > 0) {
      this.logger.warn(`${remaining} items still in queue during shutdown`);
    }

    this.queue.clear();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.logger.log('Shutdown complete');
  }

  setConfig(config: Partial<ConcurrentPipelineConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.maxConcurrency && config.maxConcurrency !== this.workers.length) {
      this.resizeWorkers(config.maxConcurrency);
    }
  }

  private initWorkers(): void {
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      this.workers.push({
        id: i,
        busy: false,
        tasksProcessed: 0,
        totalDurationMs: 0,
        lastActiveAt: 0,
      });
    }
  }

  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processQueue();
    this.logger.log(`Concurrent pipeline started with ${this.workers.length} workers`);
  }

  private async processQueue(): Promise<void> {
    while (this.isRunning && !this.isShuttingDown) {
      while (
        this.activeWorkers < this.config.maxConcurrency &&
        !this.queue.isEmpty &&
        !this.isShuttingDown
      ) {
        const item = this.queue.dequeue();
        if (!item) break;

        const worker = this.acquireWorker();
        if (!worker) break;

        this.activeWorkers++;
        this.runWorker(worker, item.data).finally(() => {
          this.activeWorkers--;
          this.releaseWorker(worker);
        });
      }

      if (this.queue.isEmpty || this.activeWorkers >= this.config.maxConcurrency) {
        await this.sleep(1);
      }
    }
  }

  private async runWorker(worker: WorkerStats, ctx: PipelineContext): Promise<void> {
    worker.busy = true;
    const pipelineStart = Date.now();
    let currentCtx: PipelineContext = {
      ...ctx,
      errors: ctx.errors || [],
    };
    currentCtx.startTime = pipelineStart;

    try {
      for (const step of this.steps) {
        const stepStart = Date.now();

        if (step.name === 'ProtocolRead') {
          currentCtx = await this.executeWithCircuitBreaker(step, currentCtx);
        } else {
          currentCtx = await this.withTimeout(
            step.process(currentCtx),
            this.config.stepTimeoutMs,
            step.name,
          );
        }

        const duration = Date.now() - stepStart;
        this.recordMetric(
          step.name,
          duration,
          currentCtx.errors.some((e) => e.step === step.name),
        );
      }

      this.totalCompleted++;

      if (currentCtx.quality === 'bad') {
        this.logger.debug(
          `[W${worker.id}] Tag ${currentCtx.tagId} completed with quality=bad, ` +
            `${currentCtx.errors.length} errors in ${Date.now() - pipelineStart}ms`,
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      currentCtx.errors.push({ step: 'Orchestrator', message: errorMsg });
      currentCtx.quality = 'bad';
      this.logger.error(`[W${worker.id}] Unhandled error for tag ${ctx.tagId}: ${errorMsg}`);
    } finally {
      worker.tasksProcessed++;
      worker.totalDurationMs += Date.now() - pipelineStart;
      worker.lastActiveAt = Date.now();
      worker.busy = false;
    }
  }

  private async executeWithCircuitBreaker(
    step: PipelineStep,
    ctx: PipelineContext,
  ): Promise<PipelineContext> {
    const resourceKey = ctx.deviceId || ctx.tagId;

    return this.circuitBreakerService.execute(
      resourceKey,
      () => {
        return this.withTimeout(step.process(ctx), this.config.stepTimeoutMs, step.name);
      },
      (error) => {
        this.logger.warn(`Circuit breaker fallback for ${resourceKey}: ${error.message}`);
        ctx.rawValue = null;
        ctx.quality = 'bad';
        ctx.errors.push({
          step: step.name,
          message: `Circuit breaker OPEN: ${error.message}`,
          code: 'CB_OPEN',
        });
        return Promise.resolve(ctx);
      },
    );
  }

  private acquireWorker(): WorkerStats | null {
    for (const worker of this.workers) {
      if (!worker.busy) return worker;
    }
    return null;
  }

  private releaseWorker(worker: WorkerStats): void {
    worker.busy = false;
  }

  private resizeWorkers(newSize: number): void {
    const diff = newSize - this.workers.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this.workers.push({
          id: this.workers.length,
          busy: false,
          tasksProcessed: 0,
          totalDurationMs: 0,
          lastActiveAt: 0,
        });
      }
    } else if (diff < 0) {
      this.workers.splice(newSize);
    }
    this.logger.log(`Resized to ${newSize} workers`);
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, stepName: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new StepTimeoutError(stepName, { step: stepName }));
      }, ms);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  private recordMetric(stepName: string, durationMs: number, isError: boolean): void {
    const metric = this.metrics.get(stepName);
    if (!metric) return;
    metric.totalCalls++;
    metric.totalDurationMs += durationMs;
    if (isError) metric.errorCount++;
    metric.lastCallAt = Date.now();
    metric.lastDurationMs = durationMs;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
