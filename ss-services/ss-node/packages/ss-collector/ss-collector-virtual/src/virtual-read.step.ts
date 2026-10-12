// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineStep, PipelineContext, isBooleanDataType, isStringDataType } from '@ss-node/ss-collector-sdk';
import { SimulatorFactory } from './simulator-factory';

/**
 * VirtualReadStep — Pipeline 第一步（order=0），
 * 为虚拟设备生成模拟数据，替代真实设备的 ProtocolReadStep。
 */
@Injectable()
export class VirtualReadStep implements PipelineStep {
  name = 'VirtualRead';
  order = 0;
  private readonly logger = new Logger(VirtualReadStep.name);

  constructor(private readonly simulatorFactory: SimulatorFactory) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    try {
      const simulator = this.simulatorFactory.getOrCreate(ctx.tagId, ctx.tagConfig);

      const value = simulator.generate();
      ctx.rawValue = value;
      ctx.rawTimestamp = new Date();
      ctx.quality = 'good';

      // 为虚拟设备注入默认报警条件（如未配置），确保 AlarmCheckStep 能触发报警
      this.injectDefaultAlarms(ctx);
    } catch (error) {
      ctx.rawValue = null;
      ctx.rawTimestamp = new Date();
      ctx.quality = 'bad';
      ctx.errors.push({
        step: 'VirtualRead',
        message: error instanceof Error ? error.message : String(error),
      });
      this.logger.warn(
        `VirtualRead 生成失败: tagId=${ctx.tagId}, error=${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return ctx;
  }

  /**
   * 为未配置报警条件的虚拟设备标签注入默认限值报警。
   * 仅对数值类型（非 bool/string/enum）生效，模拟 0-100 范围随机游走数据时：
   *   - 值 > 80 或 < 20 → warning
   *   - 值 > 95 或 < 5  → critical
   */
  private injectDefaultAlarms(ctx: PipelineContext): void {
    const tagConfig = ctx.tagConfig || {};
    if (tagConfig.alarms && tagConfig.alarms.length > 0) return;

    const dataType = tagConfig.dataType || 'float32';
    // 仅数值类型注入限值报警（兼容点表规范字符串 'boolean'）
    if (isBooleanDataType(dataType) || isStringDataType(dataType)) return;

    if (!ctx.tagConfig) {
      ctx.tagConfig = {};
    }
    ctx.tagConfig.alarms = [
      { type: 'limit', severity: 'warning', enabled: true },
      { type: 'limit', severity: 'critical', enabled: true },
    ];
    ctx.tagConfig.alarmLimits = {
      high: 55,
      low: 15,
      highHigh: 70,
      lowLow: 5,
    };
    this.logger.log(
      `Injected default alarm limits for virtual tag "${ctx.tagName || ctx.tagId}" ` +
        `(dataType=${dataType}, range: 0-100, warning: <15|>55, critical: <5|>70)`,
    );
  }
}
