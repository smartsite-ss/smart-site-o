// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export enum ExecutionPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface QueueJob {
  id: string;
  scriptId: string;
  projectId: string;
  priority: ExecutionPriority;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  createdAt: number;
  timeoutMs: number;
  timeoutId?: NodeJS.Timeout;
}

export interface QueueStats {
  queueLength: number;
  activeJobs: number;
  globalLimit: number;
  projectLimit: number;
  projectCounts: Map<string, { active: number; waiting: number }>;
  waitingJobs: Array<{
    id: string;
    scriptId: string;
    projectId: string;
    priority: string;
    waitingMs: number;
  }>;
}

@Injectable()
export class ExecutionQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ExecutionQueueService.name);

  private readonly globalConcurrencyLimit = 50;
  private readonly projectConcurrencyLimit = 10;

  private queues: QueueJob[][] = [[], [], [], []];
  private activeJobs = new Map<string, QueueJob>();
  private activeCount = 0;
  private projectActiveCounts = new Map<string, number>();
  private isProcessing = false;

  onModuleDestroy(): void {
    this.logger.log('ExecutionQueueService destroyed, cleaning up active jobs');
    for (const [_id, job] of this.activeJobs) {
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }
      job.reject(new Error('Queue service shutting down'));
    }
    this.activeJobs.clear();
    this.queues = [[], [], [], []];
  }

  enqueue(
    id: string,
    scriptId: string,
    projectId: string,
    priority: ExecutionPriority,
    execute: () => Promise<any>,
    timeoutMs: number = 300000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const job: QueueJob = {
        id,
        scriptId,
        projectId,
        priority,
        execute,
        resolve,
        reject,
        createdAt: Date.now(),
        timeoutMs,
      };

      if (timeoutMs > 0) {
        job.timeoutId = setTimeout(() => {
          this.removeJob(id);
          reject(new Error(`Job ${id} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      this.queues[priority].push(job);
      this.logger.debug(
        `Enqueued job ${id} (script=${scriptId}, project=${projectId}, priority=${ExecutionPriority[priority]})`,
      );

      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    setImmediate(() => {
      try {
        this.drainQueue();
      } finally {
        this.isProcessing = false;
      }
    });
  }

  private drainQueue(): void {
    for (let priority = 0; priority <= ExecutionPriority.LOW; priority++) {
      while (this.queues[priority].length > 0) {
        if (this.activeCount >= this.globalConcurrencyLimit) {
          return;
        }

        const job = this.queues[priority][0];

        const projectActive = this.projectActiveCounts.get(job.projectId) || 0;
        if (projectActive >= this.projectConcurrencyLimit) {
          return;
        }

        this.queues[priority].shift()!;
        this.startJob(job);
      }
    }
  }

  private startJob(job: QueueJob): void {
    this.activeCount++;
    this.activeJobs.set(job.id, job);

    const currentProjectCount = this.projectActiveCounts.get(job.projectId) || 0;
    this.projectActiveCounts.set(job.projectId, currentProjectCount + 1);

    this.logger.debug(
      `Starting job ${job.id} (active=${this.activeCount}/${this.globalConcurrencyLimit}, project=${job.projectId} active=${currentProjectCount + 1}/${this.projectConcurrencyLimit})`,
    );

    job
      .execute()
      .then((result) => {
        this.completeJob(job);
        job.resolve(result);
      })
      .catch((error) => {
        this.completeJob(job);
        job.reject(error);
      });
  }

  private completeJob(job: QueueJob): void {
    this.activeJobs.delete(job.id);
    this.activeCount--;

    const projectCount = this.projectActiveCounts.get(job.projectId) || 1;
    if (projectCount <= 1) {
      this.projectActiveCounts.delete(job.projectId);
    } else {
      this.projectActiveCounts.set(job.projectId, projectCount - 1);
    }

    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
    }

    this.logger.debug(
      `Completed job ${job.id} (active=${this.activeCount}/${this.globalConcurrencyLimit})`,
    );

    this.processQueue();
  }

  private removeJob(id: string): void {
    for (let priority = 0; priority <= ExecutionPriority.LOW; priority++) {
      const idx = this.queues[priority].findIndex((j) => j.id === id);
      if (idx >= 0) {
        const job = this.queues[priority][idx];
        this.queues[priority].splice(idx, 1);
        if (job.timeoutId) {
          clearTimeout(job.timeoutId);
        }
        this.logger.debug(`Removed job ${id} from queue`);
        return;
      }
    }
  }

  cancelJob(id: string): boolean {
    const activeJob = this.activeJobs.get(id);
    if (activeJob) {
      if (activeJob.timeoutId) {
        clearTimeout(activeJob.timeoutId);
      }
      activeJob.reject(new Error(`Job ${id} cancelled`));
      this.activeJobs.delete(id);
      this.activeCount--;
      const projectCount = this.projectActiveCounts.get(activeJob.projectId) || 1;
      if (projectCount <= 1) {
        this.projectActiveCounts.delete(activeJob.projectId);
      } else {
        this.projectActiveCounts.set(activeJob.projectId, projectCount - 1);
      }
      this.processQueue();
      return true;
    }

    for (let priority = 0; priority <= ExecutionPriority.LOW; priority++) {
      const idx = this.queues[priority].findIndex((j) => j.id === id);
      if (idx >= 0) {
        const job = this.queues[priority][idx];
        this.queues[priority].splice(idx, 1);
        if (job.timeoutId) {
          clearTimeout(job.timeoutId);
        }
        job.reject(new Error(`Job ${id} cancelled`));
        return true;
      }
    }

    return false;
  }

  getStats(): QueueStats {
    const projectCounts = new Map<string, { active: number; waiting: number }>();

    for (const [projectId, count] of this.projectActiveCounts) {
      if (!projectCounts.has(projectId)) {
        projectCounts.set(projectId, { active: 0, waiting: 0 });
      }
      projectCounts.get(projectId)!.active = count;
    }

    for (let priority = 0; priority <= ExecutionPriority.LOW; priority++) {
      for (const job of this.queues[priority]) {
        if (!projectCounts.has(job.projectId)) {
          projectCounts.set(job.projectId, { active: 0, waiting: 0 });
        }
        projectCounts.get(job.projectId)!.waiting++;
      }
    }

    const waitingJobs: QueueStats['waitingJobs'] = [];
    for (let priority = 0; priority <= ExecutionPriority.LOW; priority++) {
      for (const job of this.queues[priority]) {
        waitingJobs.push({
          id: job.id,
          scriptId: job.scriptId,
          projectId: job.projectId,
          priority: ExecutionPriority[job.priority],
          waitingMs: Date.now() - job.createdAt,
        });
      }
    }

    let totalQueueLength = 0;
    for (let priority = 0; priority <= ExecutionPriority.LOW; priority++) {
      totalQueueLength += this.queues[priority].length;
    }

    return {
      queueLength: totalQueueLength,
      activeJobs: this.activeCount,
      globalLimit: this.globalConcurrencyLimit,
      projectLimit: this.projectConcurrencyLimit,
      projectCounts,
      waitingJobs,
    };
  }

  getQueueLength(): number {
    let total = 0;
    for (let priority = 0; priority <= ExecutionPriority.LOW; priority++) {
      total += this.queues[priority].length;
    }
    return total;
  }
}
