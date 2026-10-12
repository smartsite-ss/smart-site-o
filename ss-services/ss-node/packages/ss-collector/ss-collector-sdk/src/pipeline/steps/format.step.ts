// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';

/**
 * 显示格式步骤 — 根据标签的 displayFormat 配置将数值格式化为显示字符串。
 *
 * 设计原则：
 * - 存储层（PersistStep）保留原始数值，不做格式化
 * - 显示层（PublishStep → WebSocket）使用格式化后的字符串
 * - 本步骤在 Persist 之后、Publish 之前执行
 *
 * 支持的格式字符串：
 * - `%.1f` / `%.2f` / `%.3f` 等 — 保留指定位小数
 * - `%d` / `%i` / `%.0f` — 整数
 * - `%X` / `%04X` / `%08X` — 十六进制大写（宽度补零）
 * - `%x` / `%04x` — 十六进制小写
 * - 空字符串或不支持格式 — 直接 toString()
 */
@Injectable()
export class FormatStep implements PipelineStep {
  readonly name = 'Format';
  readonly order = 7;

  private readonly logger = new Logger(FormatStep.name);

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.shouldPersist) {
      return ctx;
    }

    try {
      const value = ctx.transformedValue;

      if (value === null || value === undefined) {
        ctx.formattedValue = undefined;
        return ctx;
      }

      // 非数值类型（bool/string）直接转字符串，不做精度格式化
      // 这样前端 displayValue 能正确显示 true/false、OK/WARN/ERR 等
      if (typeof value === 'boolean') {
        ctx.formattedValue = value ? 'true' : 'false';
        return ctx;
      }
      if (typeof value === 'string') {
        ctx.formattedValue = value;
        return ctx;
      }

      const tagConfig = ctx.tagConfig || {};
      const displayFormat: string = tagConfig.displayFormat || '%.2f';

      ctx.formattedValue = this.applyFormat(Number(value), displayFormat);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown format error';
      this.logger.error(`Format error for tag ${ctx.tagId}: ${errorMsg}`);
      // 降级：使用 toString()
      ctx.formattedValue = ctx.transformedValue?.toString();
      ctx.errors.push({ step: this.name, message: errorMsg, code: 'FORMAT_ERROR' });
    }

    return ctx;
  }

  /**
   * 将数值按 printf 格式字符串格式化为字符串。
   * 与前端 formatTagValue() 保持一致的语义。
   */
  private applyFormat(value: number, format: string): string {
    // 整数格式
    if (format === '%d' || format === '%i' || format === '%.0f') {
      return Math.round(value).toString();
    }

    // 浮点格式：%.Nf
    const floatMatch = format.match(/^%\.(\d+)f$/);
    if (floatMatch) {
      const decimals = parseInt(floatMatch[1], 10);
      return value.toFixed(decimals);
    }

    // 十六进制格式：%X / %x / %04X / %08x 等
    const hexMatch = format.match(/^%(\d*)([Xx])$/);
    if (hexMatch) {
      const width = parseInt(hexMatch[1], 10) || 0;
      const upper = hexMatch[2] === 'X';
      const intVal = Math.round(value);
      if (intVal < 0) return value.toString();
      const hex = intVal.toString(16);
      const padded = hex.padStart(width, '0');
      return upper ? padded.toUpperCase() : padded;
    }

    // 默认：直接转字符串
    return value.toString();
  }
}
