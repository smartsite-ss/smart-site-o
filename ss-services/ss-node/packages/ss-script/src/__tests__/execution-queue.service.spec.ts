// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ExecutionQueueService, ExecutionPriority } from '../execution-queue.service';

describe('ExecutionQueueService', () => {
  let service: ExecutionQueueService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new ExecutionQueueService();
  });

  afterEach(() => {
    jest.useRealTimers();
    service.onModuleDestroy();
  });

  describe('enqueue and execute', () => {
    it('should execute a job and return result', async () => {
      const executeFn = jest.fn().mockResolvedValue('result-value');

      const promise = service.enqueue(
        'job-1',
        'script-1',
        'project-1',
        ExecutionPriority.NORMAL,
        executeFn,
        5000,
      );

      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('result-value');
      expect(executeFn).toHaveBeenCalled();
    });

    it('should execute jobs in priority order', async () => {
      const results: string[] = [];
      const createJob = (id: string, priority: ExecutionPriority) => {
        return service.enqueue(
          id,
          'script-1',
          'project-1',
          priority,
          () => {
            results.push(id);
            return Promise.resolve(id);
          },
          5000,
        );
      };

      const lowPromise = createJob('low', ExecutionPriority.LOW);
      const normalPromise = createJob('normal', ExecutionPriority.NORMAL);
      const highPromise = createJob('high', ExecutionPriority.HIGH);
      const criticalPromise = createJob('critical', ExecutionPriority.CRITICAL);

      await jest.runAllTimersAsync();
      await Promise.all([criticalPromise, highPromise, normalPromise, lowPromise]);

      expect(results[0]).toBe('critical');
      expect(results[1]).toBe('high');
      expect(results[2]).toBe('normal');
      expect(results[3]).toBe('low');
    });

    it('should enforce global concurrency limit', async () => {
      const resolvers: Array<() => void> = [];
      const fns: jest.Mock[] = [];

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 55; i++) {
        const fn = jest.fn().mockImplementation(
          () =>
            new Promise<void>((resolve) => {
              resolvers.push(resolve);
            }),
        );
        fns.push(fn);

        const promise = service.enqueue(
          `job-${i}`,
          'script-1',
          `project-${i}`,
          ExecutionPriority.NORMAL,
          fn,
          0,
        );
        promises.push(promise);
      }

      await jest.runAllTimersAsync();

      const startedCount = fns.filter((fn) => fn.mock.calls.length > 0).length;
      expect(startedCount).toBeLessThanOrEqual(50);

      // Resolve all started jobs, then flush to start waiting jobs
      while (resolvers.length > 0) {
        const batch = resolvers.splice(0);
        batch.forEach((r) => r());
        await jest.runAllTimersAsync();
      }
      await Promise.all(promises);
    });

    it('should enforce per-project concurrency limit', async () => {
      const resolvers: Array<() => void> = [];
      const fns: jest.Mock[] = [];

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 15; i++) {
        const fn = jest.fn().mockImplementation(
          () =>
            new Promise<void>((resolve) => {
              resolvers.push(resolve);
            }),
        );
        fns.push(fn);

        const promise = service.enqueue(
          `job-${i}`,
          'script-1',
          'project-1',
          ExecutionPriority.NORMAL,
          fn,
          0,
        );
        promises.push(promise);
      }

      await jest.runAllTimersAsync();

      const stats = service.getStats();
      const projectStats = stats.projectCounts.get('project-1');
      expect(projectStats).toBeDefined();
      expect(projectStats!.active).toBeLessThanOrEqual(10);

      while (resolvers.length > 0) {
        const batch = resolvers.splice(0);
        batch.forEach((r) => r());
        await jest.runAllTimersAsync();
      }
      await Promise.all(promises);
    });

    it('should timeout and reject job', async () => {
      const executeFn = jest.fn().mockImplementation(() => new Promise(() => {}));

      const promise = service.enqueue(
        'job-timeout',
        'script-1',
        'project-1',
        ExecutionPriority.NORMAL,
        executeFn,
        100,
      );

      // Attach catch handler immediately to prevent unhandled rejection
      const errorPromise = promise.catch((e) => e);

      jest.advanceTimersByTime(150);
      await jest.runAllTimersAsync();

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('timed out');
    });

    it('should cancel a waiting job', async () => {
      // Fill project concurrency (10) so job-2 waits in queue
      const resolvers: Array<() => void> = [];
      const blockingPromises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        const fn = jest.fn().mockImplementation(
          () =>
            new Promise<void>((resolve) => {
              resolvers.push(resolve);
            }),
        );
        blockingPromises.push(
          service.enqueue(
            `job-block-${i}`,
            'script-1',
            'project-1',
            ExecutionPriority.NORMAL,
            fn,
            0,
          ),
        );
      }

      await jest.runAllTimersAsync();

      const executeFn2 = jest.fn().mockResolvedValue('job-2-result');
      const promise2 = service.enqueue(
        'job-2',
        'script-1',
        'project-1',
        ExecutionPriority.NORMAL,
        executeFn2,
        0,
      );

      await jest.runAllTimersAsync();

      // job-2 should be waiting, not started
      expect(executeFn2).not.toHaveBeenCalled();

      const cancelled = service.cancelJob('job-2');
      expect(cancelled).toBe(true);

      await expect(promise2).rejects.toThrow('cancelled');

      // Cleanup blocking jobs
      resolvers.forEach((r) => r());
      await jest.runAllTimersAsync();
      await Promise.all(blockingPromises);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', () => {
      const stats = service.getStats();
      expect(stats.queueLength).toBe(0);
      expect(stats.activeJobs).toBe(0);
      expect(stats.globalLimit).toBe(50);
      expect(stats.projectLimit).toBe(10);
    });

    it('should reflect active jobs in stats', async () => {
      const resolvers: Array<() => void> = [];
      const fn = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvers.push(resolve);
          }),
      );

      const promise = service.enqueue(
        'job-1',
        'script-1',
        'project-1',
        ExecutionPriority.NORMAL,
        fn,
        0,
      );

      await jest.runAllTimersAsync();

      const stats = service.getStats();
      expect(stats.activeJobs).toBe(1);

      // Resolve the started job and flush microtasks + timers
      resolvers.splice(0).forEach((r) => r());
      await jest.runAllTimersAsync();
      await promise;

      const finalStats = service.getStats();
      expect(finalStats.activeJobs).toBe(0);
    });
  });
});
