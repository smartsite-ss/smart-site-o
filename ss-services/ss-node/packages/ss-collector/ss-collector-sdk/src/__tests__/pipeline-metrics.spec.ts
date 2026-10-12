// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  PipelineOrchestrator,
  PipelineContext,
  PipelineStep,
} from '../pipeline/pipeline-orchestrator';
import { PipelineMetricsService } from '../pipeline/pipeline-metrics.service';
import { PipelineMetricsController } from '../pipeline/pipeline-metrics.controller';
import { EnhancedScheduler } from '../pipeline/scheduler/enhanced-scheduler';
import { Logger } from '@nestjs/common';

function makeContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    tagId: 'tag-001',
    deviceId: 'device-001',
    projectId: 'project-001',
    rawValue: null,
    transformedValue: null,
    quality: 'unknown',
    shouldPersist: true,
    shouldPublish: true,
    startTime: Date.now(),
    errors: [],
    ...overrides,
  };
}

function makeStep(
  name: string,
  order: number,
  processFn?: (ctx: PipelineContext) => Promise<PipelineContext>,
): PipelineStep {
  return {
    name,
    order,
    process:
      processFn || jest.fn().mockImplementation((ctx: PipelineContext) => Promise.resolve(ctx)),
  };
}

/** 模拟延迟的 step，用于测试耗时统计 */
function makeDelayedStep(name: string, order: number, delayMs: number): PipelineStep {
  return {
    name,
    order,
    process: jest
      .fn()
      .mockImplementation(
        (ctx: PipelineContext) => new Promise((resolve) => setTimeout(() => resolve(ctx), delayMs)),
      ),
  };
}

describe('PipelineMetrics Integration', () => {
  let orchestrator: PipelineOrchestrator;
  let metricsService: PipelineMetricsService;
  let scheduler: EnhancedScheduler;
  let controller: PipelineMetricsController;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    metricsService = new PipelineMetricsService();
    orchestrator = new PipelineOrchestrator(metricsService);
    scheduler = new EnhancedScheduler();
    controller = new PipelineMetricsController(metricsService, orchestrator, scheduler);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('PipelineOrchestrator → PipelineMetricsService 推送', () => {
    it('执行成功后应推送 execution 指标到 PipelineMetricsService', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);

      await orchestrator.execute(makeContext());

      const snapshot = metricsService.getMetricsSnapshot();
      expect(snapshot.pipeline_executions_total).toBe(1);
      expect(snapshot.pipeline_executions_success).toBe(1);
      expect(snapshot.pipeline_executions_error).toBe(0);
      expect(snapshot.pipeline_duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('step 执行后应推送 step duration 到 PipelineMetricsService', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);

      await orchestrator.execute(makeContext());

      const snapshot = metricsService.getMetricsSnapshot();
      expect(snapshot.step_duration_ms['read']).toBeGreaterThanOrEqual(0);
    });

    it('step 失败时应推送 step error 到 PipelineMetricsService', async () => {
      const failingStep = makeStep('bad-step', 1, jest.fn().mockRejectedValue(new Error('failed')));
      orchestrator.registerStep(failingStep);

      await orchestrator.execute(makeContext());

      const snapshot = metricsService.getMetricsSnapshot();
      expect(snapshot.step_error_count['bad-step']).toBe(1);
      // step 失败时 ctx.errors > 0，recordExecution 标记为失败
      expect(snapshot.pipeline_executions_error).toBe(1);
    });

    it('多次执行应累积计数', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);

      await orchestrator.execute(makeContext());
      await orchestrator.execute(makeContext());
      await orchestrator.execute(makeContext());

      const snapshot = metricsService.getMetricsSnapshot();
      expect(snapshot.pipeline_executions_total).toBe(3);
      expect(snapshot.pipeline_executions_success).toBe(3);
    });
  });

  describe('StepTimingStats (P50/P95/P99)', () => {
    it('应返回各步骤的 P50/P95/P99 延迟统计', async () => {
      jest.useFakeTimers();

      const step = makeDelayedStep('read', 1, 10);
      orchestrator.registerStep(step);

      // 执行 5 次
      for (let i = 0; i < 5; i++) {
        const promise = orchestrator.execute(makeContext());
        jest.advanceTimersByTime(10);
        await promise;
      }

      const stats = orchestrator.getStepTimingStats();
      expect(stats.length).toBe(1);
      expect(stats[0].stepName).toBe('read');
      expect(stats[0].totalCalls).toBe(5);
      expect(stats[0].errorCount).toBe(0);
      expect(stats[0].p50Ms).toBeGreaterThanOrEqual(0);
      expect(stats[0].p95Ms).toBeGreaterThanOrEqual(0);
      expect(stats[0].p99Ms).toBeGreaterThanOrEqual(0);
    });

    it('应正确统计错误率', async () => {
      let callCount = 0;
      const flakyStep = makeStep('flaky', 1, (ctx) => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('flaky error'));
        }
        return Promise.resolve(ctx);
      });
      orchestrator.registerStep(flakyStep);

      // 执行 4 次，2 次成功 2 次失败
      for (let i = 0; i < 4; i++) {
        await orchestrator.execute(makeContext());
      }

      const stats = orchestrator.getStepTimingStats();
      expect(stats[0].totalCalls).toBe(4);
      expect(stats[0].errorCount).toBe(2);
      expect(stats[0].errorRate).toBe(0.5);
    });
  });

  describe('PipelineMetricsController', () => {
    it('getPrometheusMetrics 应返回 Prometheus 文本格式', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);
      await orchestrator.execute(makeContext());

      const result = controller.getPrometheusMetrics();
      expect(result).toContain('pipeline_executions_total');
      expect(result).toContain('pipeline_executions_success');
      expect(result).toContain('step_duration_ms');
    });

    it('getJsonMetrics 应返回 JSON 格式指标', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);
      await orchestrator.execute(makeContext());

      const result = controller.getJsonMetrics();
      expect(result.code).toBe(0);
      expect(result.message).toBe('ok');
      expect(result.data.pipeline_executions_total).toBe(1);
    });

    it('getPercentiles 应返回 P50/P95/P99 统计', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);
      await orchestrator.execute(makeContext());

      const result = controller.getPercentiles();
      expect(result.code).toBe(0);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].stepName).toBe('read');
      expect(result.data[0]).toHaveProperty('p50Ms');
      expect(result.data[0]).toHaveProperty('p95Ms');
      expect(result.data[0]).toHaveProperty('p99Ms');
    });

    it('getBreakdowns 应返回耗时分解记录', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);
      await orchestrator.execute(makeContext());

      const result = controller.getBreakdowns();
      expect(result.code).toBe(0);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toHaveProperty('pipelineTotalMs');
      expect(result.data[0]).toHaveProperty('steps');
      expect(result.data[0]).toHaveProperty('tagId');
    });
  });

  describe('Prometheus 格式正确性', () => {
    it('应包含所有指标类型的 HELP 和 TYPE 声明', async () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);
      await orchestrator.execute(makeContext());

      const prometheusText = controller.getPrometheusMetrics();
      expect(prometheusText).toContain('# HELP pipeline_executions_total');
      expect(prometheusText).toContain('# TYPE pipeline_executions_total counter');
      expect(prometheusText).toContain('# HELP step_duration_ms');
      expect(prometheusText).toContain('# TYPE step_duration_ms gauge');
    });
  });
});
