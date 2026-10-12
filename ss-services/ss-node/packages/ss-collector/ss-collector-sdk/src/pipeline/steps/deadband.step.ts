// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';

interface LastValueRecord {
  value: number;
  timestamp: Date;
  bypassCount: number;
}

@Injectable()
export class DeadbandStep implements PipelineStep {
  readonly name = 'Deadband';
  readonly order = 2;

  private readonly logger = new Logger(DeadbandStep.name);
  private lastValues = new Map<string, LastValueRecord>();

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    ctx.shouldPersist = true;

    try {
      // 如果 transformedValue 为 null（通信错误/转换失败），不过滤，直接传递
      if (ctx.transformedValue === null || ctx.transformedValue === undefined) {
        return ctx;
      }

      const tagConfig = ctx.tagConfig || {};
      const deadband = tagConfig.deadband;

      // 无死区配置，不过滤
      if (!deadband) {
        return ctx;
      }

      const lastRecord = this.lastValues.get(ctx.tagId);
      const currentValue = Number(ctx.transformedValue);

      if (lastRecord !== undefined) {
        const shouldFilter = this.shouldFilterByDeadband(currentValue, lastRecord, deadband);

        if (shouldFilter) {
          ctx.shouldPersist = false;
          lastRecord.bypassCount++;
          return ctx;
        }
      }

      // 更新记录
      this.lastValues.set(ctx.tagId, {
        value: currentValue,
        timestamp: new Date(),
        bypassCount: 0,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown deadband error';
      this.logger.error(`Deadband error for tag ${ctx.tagId}: ${errorMsg}`);
      // 死区过滤异常不阻塞数据流，允许通过
      ctx.shouldPersist = true;
      ctx.errors.push({ step: this.name, message: errorMsg, code: 'DEADBAND_ERROR' });
    }

    return ctx;
  }

  private shouldFilterByDeadband(
    currentValue: number,
    lastRecord: LastValueRecord,
    deadband: Record<string, any>,
  ): boolean {
    const type = deadband.type || 'absolute';
    const threshold = deadband.value ?? 0.01;

    switch (type) {
      case 'absolute': {
        const delta = Math.abs(currentValue - lastRecord.value);
        return delta < threshold;
      }

      case 'percent': {
        if (lastRecord.value === 0) return false; // 避免除零
        const deltaPercent =
          (Math.abs(currentValue - lastRecord.value) / Math.abs(lastRecord.value)) * 100;
        return deltaPercent < threshold;
      }

      case 'time': {
        // 时间死区：距上次采集时间小于阈值则过滤
        const elapsedMs = Date.now() - lastRecord.timestamp.getTime();
        return elapsedMs < threshold * 1000;
      }

      default:
        this.logger.warn(`Unknown deadband type "${type}", using absolute`);
        const delta = Math.abs(currentValue - lastRecord.value);
        return delta < threshold;
    }
  }

  getLastValue(tagId: string): LastValueRecord | undefined {
    return this.lastValues.get(tagId);
  }

  clearTag(tagId: string): boolean {
    return this.lastValues.delete(tagId);
  }

  clearAll(): void {
    this.lastValues.clear();
  }
}
