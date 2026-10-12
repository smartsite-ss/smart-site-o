// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep, PipelineValue } from '../pipeline-orchestrator';
import { TransformFormulaError } from '../errors';
import { isBooleanDataType, isStringDataType } from '../../data-type.util';

@Injectable()
export class TransformStep implements PipelineStep {
  readonly name = 'Transform';
  readonly order = 1;

  private readonly logger = new Logger(TransformStep.name);

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    try {
      // 如果 rawValue 为 null（通信错误），直接传递
      if (ctx.rawValue === null || ctx.rawValue === undefined) {
        ctx.transformedValue = null;
        return ctx;
      }

      const tagConfig = ctx.tagConfig || {};
      const dataType: string = tagConfig.dataType || 'float32';

      // 1. 基础类型转换 — 按 dataType 保留原始语义（兼容点表规范字符串 'boolean'）
      //    - bool: 保留 boolean，避免被转成 0/1
      //    - string: 保留字符串，避免 parseFloat 丢失非数字字符串
      //    - 数值型: parseRawValue 转为 number
      let value: PipelineValue;
      if (isBooleanDataType(dataType)) {
        value = this.parseBoolValue(ctx.rawValue);
        if (value === null) {
          this.logger.warn(
            `Data transformation parse failed for tag ${ctx.tagId}: INVALID_BOOL "${ctx.rawValue}"`,
          );
          ctx.transformedValue = null;
          ctx.quality = 'bad';
          ctx.errors.push({
            step: this.name,
            message: `Cannot parse bool value: ${ctx.rawValue}`,
            code: 'TRANSFORM_PARSE',
          });
          return ctx;
        }
      } else if (isStringDataType(dataType)) {
        value = this.parseStringValue(ctx.rawValue);
      } else {
        const numValue = this.parseRawValue(ctx.rawValue);
        if (numValue === null) {
          this.logger.warn(
            `Data transformation parse failed for tag ${ctx.tagId}: INVALID_VALUE "${ctx.rawValue}"`,
          );
          ctx.transformedValue = null;
          ctx.quality = 'bad';
          ctx.errors.push({
            step: this.name,
            message: `Cannot parse raw value: ${ctx.rawValue}`,
            code: 'TRANSFORM_PARSE',
          });
          return ctx;
        }
        value = numValue;
      }

      // 2. 应用转换配置（仅对数值型生效；bool/string 跳过线性/多项式转换）
      if (tagConfig.transform && typeof value === 'number') {
        value = this.applyTransform(value, tagConfig.transform, ctx);
      }

      // 3. 转换结果验证（仅对数值型）
      if (typeof value === 'number' && !isFinite(value)) {
        this.logger.warn(`Transform result is not finite for tag ${ctx.tagId}: ${value}`);
        ctx.transformedValue = null;
        ctx.quality = 'bad';
        ctx.errors.push({
          step: this.name,
          message: `Transform result is not finite: ${value}`,
          code: 'TRANSFORM_RANGE',
        });
        return ctx;
      }

      ctx.transformedValue = value;

      return ctx;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown transform error';
      this.logger.error(`Data transformation error for tag ${ctx.tagId}: ${errorMsg}`);

      // 降级：使用原始值
      ctx.transformedValue = typeof ctx.rawValue === 'number' ? ctx.rawValue : null;
      ctx.quality = 'uncertain';
      ctx.errors.push({ step: this.name, message: errorMsg, code: 'TRANSFORM_ERROR' });

      return ctx;
    }
  }

  /** 解析布尔值 — 支持 boolean / 0|1 / "true"|"false" / "0"|"1" */
  private parseBoolValue(rawValue: any): boolean | null {
    if (typeof rawValue === 'boolean') return rawValue;
    if (typeof rawValue === 'number') {
      if (rawValue === 0) return false;
      if (rawValue === 1) return true;
      return null;
    }
    if (typeof rawValue === 'string') {
      const s = rawValue.toLowerCase().trim();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
      return null;
    }
    return null;
  }

  /** 解析字符串值 — 任意值都转字符串，不会丢失 */
  private parseStringValue(rawValue: any): string {
    if (typeof rawValue === 'string') return rawValue;
    return String(rawValue);
  }

  private parseRawValue(rawValue: any): number | null {
    if (typeof rawValue === 'number') {
      return isNaN(rawValue) ? null : rawValue;
    }
    if (typeof rawValue === 'string') {
      const parsed = parseFloat(rawValue);
      return isNaN(parsed) ? null : parsed;
    }
    if (typeof rawValue === 'boolean') {
      return rawValue ? 1 : 0;
    }
    return null;
  }

  private applyTransform(
    value: number,
    transform: Record<string, any>,
    ctx: PipelineContext,
  ): number | null {
    const type = transform.type || 'linear';

    switch (type) {
      case 'linear': {
        const { scale = 1, offset = 0, precision } = transform;
        let result = value * scale + offset;
        if (precision !== undefined && precision >= 0) {
          result = parseFloat(result.toFixed(precision));
        }
        return result;
      }

      case 'polynomial': {
        const { a = 0, b = 1, c = 0, precision } = transform;
        let result = a * value ** 2 + b * value + c;
        if (precision !== undefined && precision >= 0) {
          result = parseFloat(result.toFixed(precision));
        }
        return result;
      }

      case 'table': {
        if (!Array.isArray(transform.table)) {
          throw new TransformFormulaError(`Transform table is not an array`, { tagId: ctx.tagId });
        }
        const entry = transform.table.find((e: any) => e.raw === value);
        if (entry) return entry.eng;
        // 线性插值
        return this.interpolateTable(value, transform.table);
      }

      case 'script': {
        // 脚本转换由 ScriptEngine 处理，这里仅做占位
        this.logger.warn(`Script transform not yet implemented for tag ${ctx.tagId}`);
        return value;
      }

      default:
        this.logger.warn(`Unknown transform type "${type}" for tag ${ctx.tagId}, using linear`);
        return value;
    }
  }

  private interpolateTable(value: number, table: Array<{ raw: number; eng: number }>): number {
    const sorted = [...table].sort((a, b) => a.raw - b.raw);

    // 边界外
    if (value <= sorted[0].raw) return sorted[0].eng;
    if (value >= sorted[sorted.length - 1].raw) return sorted[sorted.length - 1].eng;

    // 查找区间
    for (let i = 0; i < sorted.length - 1; i++) {
      if (value >= sorted[i].raw && value <= sorted[i + 1].raw) {
        const ratio = (value - sorted[i].raw) / (sorted[i + 1].raw - sorted[i].raw);
        return sorted[i].eng + ratio * (sorted[i + 1].eng - sorted[i].eng);
      }
    }

    return value;
  }
}
