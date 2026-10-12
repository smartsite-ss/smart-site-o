// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PipelineContext, PipelineStep } from './pipeline/pipeline-orchestrator';

/**
 * 插件测试夹具 — 在无真实设备环境下测试插件 Pipeline
 *
 * 使用方式：
 *   const harness = new PluginTestHarness(steps);
 *   const ctx = await harness.simulateRead({
 *     tagId: 'test-1',
 *     deviceId: 'dev-1',
 *     rawValue: 25.5,
 *     tagConfig: { address: '40001', dataType: 'uint16', scanRate: 1000, enabled: true },
 *   });
 */
export class PluginTestHarness {
  constructor(private readonly steps: PipelineStep[]) {}

  /**
   * 模拟一次 Pipeline 完整执行
   *
   * @param config.rawValue - 模拟的原始值（替代真实协议读取）
   * @param config.tagConfig - 标签配置
   * @param config.deviceType - 设备类型（影响协议适配器选择）
   */
  async simulateRead(config: {
    tagId: string;
    deviceId: string;
    projectId?: string;
    rawValue: any;
    tagConfig: Record<string, any>;
    deviceType?: string;
    deviceConnection?: Record<string, any>;
  }): Promise<{
    ctx: PipelineContext;
    elapsed: number;
    stepResults: Array<{ step: string; duration: number; error?: string }>;
  }> {
    const startTime = Date.now();
    const ctx: PipelineContext = {
      tagId: config.tagId,
      deviceId: config.deviceId,
      projectId: config.projectId || 'test-project',
      tagConfig: {
        enabled: true,
        scanRate: 1000,
        ...config.tagConfig,
      },
      deviceType: config.deviceType || 'virtual',
      deviceConnection: config.deviceConnection || {},
      rawValue: config.rawValue,
      rawTimestamp: new Date(),
      transformedValue: null,
      quality: 'good',
      shouldPersist: true,
      shouldPublish: true,
      startTime,
      errors: [],
    };

    let currentCtx = { ...ctx };
    const stepResults: Array<{ step: string; duration: number; error?: string }> = [];

    for (const step of this.steps) {
      const stepStart = Date.now();
      try {
        currentCtx = await step.process(currentCtx);
        stepResults.push({ step: step.name, duration: Date.now() - stepStart });
      } catch (error) {
        stepResults.push({
          step: step.name,
          duration: Date.now() - stepStart,
          error: (error as Error).message,
        });
      }
    }

    return {
      ctx: currentCtx,
      elapsed: Date.now() - startTime,
      stepResults,
    };
  }

  /**
   * 批量模拟读取（用于压力测试）
   */
  async simulateBatch(
    configs: Array<{
      tagId: string;
      deviceId: string;
      rawValue: any;
      tagConfig: Record<string, any>;
    }>,
    options?: { concurrency?: number; interval?: number },
  ): Promise<{
    total: number;
    successCount: number;
    errorCount: number;
    avgElapsed: number;
    results: Array<{ tagId: string; elapsed: number; errors: string[] }>;
  }> {
    const { concurrency = 1, interval = 0 } = options || {};
    const results: Array<{ tagId: string; elapsed: number; errors: string[] }> = [];
    let successCount = 0;
    let errorCount = 0;

    const queue = [...configs];

    const worker = async () => {
      while (queue.length > 0) {
        const config = queue.shift();
        if (!config) break;

        try {
          const result = await this.simulateRead(config);
          if (result.ctx.errors.length > 0) {
            errorCount++;
          } else {
            successCount++;
          }
          results.push({
            tagId: config.tagId,
            elapsed: result.elapsed,
            errors: result.ctx.errors.map((e) => e.message),
          });
        } catch {
          errorCount++;
          results.push({ tagId: config.tagId, elapsed: 0, errors: ['Unknown error'] });
        }

        if (interval > 0) {
          await new Promise((r) => setTimeout(r, interval));
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    const avgElapsed =
      results.length > 0 ? results.reduce((sum, r) => sum + r.elapsed, 0) / results.length : 0;

    return {
      total: configs.length,
      successCount,
      errorCount,
      avgElapsed,
      results,
    };
  }
}
