// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  PipelineOrchestrator,
  PipelineContext,
  PipelineStep,
} from '../pipeline/pipeline-orchestrator';
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

describe('PipelineOrchestrator', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    orchestrator = new PipelineOrchestrator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerStep', () => {
    it('should add a step', () => {
      const step = makeStep('read', 1);
      orchestrator.registerStep(step);

      const order = orchestrator.getStepOrder();
      expect(order).toContain('read');
    });

    it('should sort steps by order', () => {
      const step2 = makeStep('transform', 2);
      const step1 = makeStep('read', 1);
      const step3 = makeStep('persist', 3);

      orchestrator.registerStep(step2);
      orchestrator.registerStep(step1);
      orchestrator.registerStep(step3);

      const order = orchestrator.getStepOrder();
      expect(order).toEqual(['read', 'transform', 'persist']);
    });
  });

  describe('execute', () => {
    it('should run steps in order', async () => {
      const readStep = makeStep(
        'read',
        1,
        jest.fn().mockImplementation((ctx) => Promise.resolve(ctx)),
      );
      const transformStep = makeStep(
        'transform',
        2,
        jest.fn().mockImplementation((ctx) => Promise.resolve(ctx)),
      );

      orchestrator.registerStep(readStep);
      orchestrator.registerStep(transformStep);

      const ctx = makeContext();
      await orchestrator.execute(ctx);

      expect(readStep.process).toHaveBeenCalled();
      expect(transformStep.process).toHaveBeenCalled();
    });

    it('should pass context between steps', async () => {
      const readStep = makeStep(
        'read',
        1,
        jest.fn().mockImplementation((ctx) => Promise.resolve({ ...ctx, rawValue: 42 })),
      );
      const transformStep = makeStep(
        'transform',
        2,
        jest.fn().mockImplementation((ctx) => Promise.resolve({ ...ctx, transformedValue: 84 })),
      );

      orchestrator.registerStep(readStep);
      orchestrator.registerStep(transformStep);

      const ctx = makeContext();
      const result = await orchestrator.execute(ctx);

      expect(result.rawValue).toBe(42);
      expect(result.transformedValue).toBe(84);
    });

    it('should continue on step failure and record error', async () => {
      const nextProcessFn = jest
        .fn()
        .mockImplementation((ctx: PipelineContext) => Promise.resolve(ctx));
      const failingStep = makeStep(
        'bad-step',
        1,
        jest.fn().mockImplementation(() => Promise.reject(new Error('step failed'))),
      );
      const nextStep = makeStep('good-step', 2, nextProcessFn);

      orchestrator.registerStep(failingStep);
      orchestrator.registerStep(nextStep);

      const ctx = makeContext();
      const result = await orchestrator.execute(ctx);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].step).toBe('bad-step');
      expect(nextProcessFn).toHaveBeenCalled();
    });

    it('should mark quality as bad on step error', async () => {
      const failingStep = makeStep(
        'bad-step',
        1,
        jest.fn().mockImplementation(() => Promise.reject(new Error('failed'))),
      );

      orchestrator.registerStep(failingStep);

      const ctx = makeContext({ quality: 'good' });
      const result = await orchestrator.execute(ctx);

      expect(result.quality).toBe('bad');
    });
  });

  describe('getStepOrder', () => {
    it('should return step names in order', () => {
      orchestrator.registerStep(makeStep('c', 3));
      orchestrator.registerStep(makeStep('a', 1));
      orchestrator.registerStep(makeStep('b', 2));

      expect(orchestrator.getStepOrder()).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array when no steps', () => {
      expect(orchestrator.getStepOrder()).toEqual([]);
    });
  });

  describe('setTimeout', () => {
    it('should set timeout value', () => {
      orchestrator.setStepTimeout(5000);
      // No direct getter, but verify it doesn't throw
      expect(() => orchestrator.setStepTimeout(5000)).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return execution metrics', async () => {
      const step = makeStep(
        'read',
        1,
        jest.fn().mockImplementation((ctx) => Promise.resolve(ctx)),
      );
      orchestrator.registerStep(step);

      const ctx = makeContext();
      await orchestrator.execute(ctx);

      const metrics = orchestrator.getMetrics();
      expect(metrics.has('read')).toBe(true);
      const readMetric = metrics.get('read')!;
      expect(readMetric.totalCalls).toBe(1);
      expect(readMetric.errorCount).toBe(0);
    });

    it('should track error count in metrics', async () => {
      const failingStep = makeStep('bad-step', 1, jest.fn().mockRejectedValue(new Error('failed')));
      orchestrator.registerStep(failingStep);

      const ctx = makeContext();
      await orchestrator.execute(ctx);

      const metrics = orchestrator.getMetrics();
      const metric = metrics.get('bad-step')!;
      expect(metric.errorCount).toBe(1);
    });
  });
});
