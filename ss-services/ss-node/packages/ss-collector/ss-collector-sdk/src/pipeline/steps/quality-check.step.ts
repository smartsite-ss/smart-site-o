// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';

@Injectable()
export class QualityCheckStep implements PipelineStep {
  readonly name = 'QualityCheck';
  readonly order = 3;

  private readonly logger = new Logger(QualityCheckStep.name);

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    // 如果前面步骤已标记异常，不再覆盖（除非需要升级）
    if (ctx.quality && ctx.quality !== 'unknown' && ctx.quality !== 'good') {
      return ctx;
    }

    try {
      // 1. 空值检查
      if (ctx.transformedValue === null || ctx.transformedValue === undefined) {
        ctx.quality = 'bad';
        ctx.errors.push({
          step: this.name,
          message: 'Transformed value is null',
          code: 'QUALITY_NULL',
        });
        return ctx;
      }

      // 非数值类型（bool/string）跳过 NaN/Infinity 和量程检查
      // 这类类型无需量程校验，直接标记为 good
      if (typeof ctx.transformedValue === 'boolean' || typeof ctx.transformedValue === 'string') {
        ctx.quality = 'good';
        return ctx;
      }

      // 2. NaN/Infinity 检查
      if (!isFinite(Number(ctx.transformedValue))) {
        ctx.quality = 'bad';
        ctx.errors.push({
          step: this.name,
          message: `Value is not finite: ${ctx.transformedValue}`,
          code: 'QUALITY_NAN',
        });
        return ctx;
      }

      const tagConfig = ctx.tagConfig || {};
      const value = Number(ctx.transformedValue);

      // 3. 量程检查
      if (tagConfig.rangeMin !== undefined && value < tagConfig.rangeMin) {
        ctx.quality = 'out_of_range';
        ctx.errors.push({
          step: this.name,
          message: `Value ${value} below rangeMin ${tagConfig.rangeMin}`,
          code: 'QUALITY_RANGE',
        });
        this.logger.warn(`Tag ${ctx.tagId} out of range: ${value} < ${tagConfig.rangeMin}`);
        return ctx;
      }

      if (tagConfig.rangeMax !== undefined && value > tagConfig.rangeMax) {
        ctx.quality = 'out_of_range';
        ctx.errors.push({
          step: this.name,
          message: `Value ${value} above rangeMax ${tagConfig.rangeMax}`,
          code: 'QUALITY_RANGE',
        });
        this.logger.warn(`Tag ${ctx.tagId} out of range: ${value} > ${tagConfig.rangeMax}`);
        return ctx;
      }

      // 4. 数据有效期检查
      if (tagConfig.maxAge && ctx.rawTimestamp) {
        const ageMs = Date.now() - new Date(ctx.rawTimestamp).getTime();
        if (ageMs > tagConfig.maxAge * 1000) {
          ctx.quality = 'stale';
          ctx.errors.push({
            step: this.name,
            message: `Data stale: age=${Math.round(ageMs / 1000)}s > maxAge=${tagConfig.maxAge}s`,
            code: 'QUALITY_STALE',
          });
          this.logger.warn(`Tag ${ctx.tagId} stale data: ${Math.round(ageMs / 1000)}s old`);
          return ctx;
        }
      }

      // 5. 通过所有检查
      ctx.quality = 'good';

      return ctx;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown quality check error';
      this.logger.error(`Quality check error for tag ${ctx.tagId}: ${errorMsg}`);
      ctx.quality = 'uncertain';
      ctx.errors.push({ step: this.name, message: errorMsg, code: 'QUALITY_ERROR' });
      return ctx;
    }
  }
}
