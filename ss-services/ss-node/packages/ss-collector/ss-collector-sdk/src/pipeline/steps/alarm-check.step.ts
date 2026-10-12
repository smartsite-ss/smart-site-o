// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PipelineContext,
  PipelineStep,
  AlarmConditionType,
  AlarmEvent,
  NormalizedAlarmEvent,
} from '../pipeline.types';
import { isBooleanDataType, isStringDataType } from '../../data-type.util';

export { AlarmConditionType, AlarmEvent, NormalizedAlarmEvent };

/** 告警状态记录（含恢复消抖追踪） */
interface AlarmState {
  isActive: boolean;
  lastTriggerTime?: Date;
  /** 值开始恢复正常的时间（Phase 5 恢复消抖用），null 表示未开始恢复 */
  normalSince?: Date;
}

@Injectable()
export class AlarmCheckStep implements PipelineStep {
  readonly name = 'AlarmCheck';
  readonly order = 4;

  private readonly logger = new Logger(AlarmCheckStep.name);
  private alarmStates = new Map<string, AlarmState>();
  /** 已诊断告警状态的标签集合（每个标签仅打印一次诊断日志） */
  private diagnosedTags = new Set<string>();

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    try {
      // 如果数据质量不好，跳过报警检查
      if (ctx.quality !== 'good') {
        return ctx;
      }

      if (ctx.transformedValue === null || ctx.transformedValue === undefined) {
        return ctx;
      }

      const tagConfig = ctx.tagConfig || {};
      // 注意：必须用 let，下方虚拟设备分支会重新赋值以引用注入后的条件
      let alarmConditions: AlarmConditionType[] = tagConfig.alarms || [];

      // 为虚拟设备自动注入默认报警条件（模拟 0-100 范围随机游走数据）
      if (alarmConditions.length === 0 && ctx.deviceType === 'virtual') {
        const dataType = tagConfig.dataType || 'float32';
        if (!isBooleanDataType(dataType) && !isStringDataType(dataType)) {
          if (!ctx.tagConfig) ctx.tagConfig = {};
          ctx.tagConfig.alarms = [
            { type: 'limit', severity: 'warning', enabled: true },
            { type: 'limit', severity: 'critical', enabled: true },
          ];
          ctx.tagConfig.alarmLimits = { high: 55, low: 15, highHigh: 70, lowLow: 5 };
          // 重新读取注入后的条件
          alarmConditions = ctx.tagConfig.alarms;
          this.logger.log(
            `Injected default alarm limits for virtual tag "${ctx.tagName || ctx.tagId}" ` +
              `(dataType=${dataType}, warning: <15|>55, critical: <5|>70)`,
          );
        }
      }

      if (alarmConditions.length === 0) {
        // 每个标签仅打印一次诊断日志，避免刷屏
        if (!this.diagnosedTags.has(ctx.tagId)) {
          this.diagnosedTags.add(ctx.tagId);
          this.logger.log(
            `🔍 [DIAG] Tag "${ctx.tagName || ctx.tagId}" has no alarm conditions configured → alarm check skipped (tagConfig.alarms is empty)`,
          );
        }
        return ctx;
      }

      const value = Number(ctx.transformedValue);
      const triggeredAlarms: AlarmEvent[] = [];
      const normalizedAlarms: NormalizedAlarmEvent[] = [];

      for (const condition of alarmConditions) {
        if (!condition.enabled) continue;

        try {
          const isTriggered = this.checkAlarmCondition(value, condition, ctx);
          const alarmKey = `${ctx.tagId}:${condition.type}`;
          const state = this.alarmStates.get(alarmKey);

          if (isTriggered) {
            // 防抖：同一报警 5 秒内不重复触发
            if (!state || !state.isActive || this.shouldRetrigger(state.lastTriggerTime)) {
              const alarmEvent: AlarmEvent = {
                alarmId: randomUUID(),
                tagId: ctx.tagId,
                deviceId: ctx.deviceId,
                projectId: ctx.projectId,
                condition,
                value,
                timestamp: new Date(),
                message: this.buildAlarmMessage(
                  ctx.tagName || ctx.tagId,
                  value,
                  condition,
                  ctx.tagConfig,
                ),
              };

              triggeredAlarms.push(alarmEvent);
              this.alarmStates.set(alarmKey, { isActive: true, lastTriggerTime: new Date() });

              this.logger.warn(`Alarm triggered: ${alarmEvent.message}`, {
                tagId: ctx.tagId,
                deviceId: ctx.deviceId,
                value,
                severity: condition.severity,
              });
            }
          } else if (state?.isActive) {
            // Phase 5: 检测条件恢复正常
            // 值不再满足告警条件，且该条件曾处于活跃状态 → 判定是否恢复
            if (this.shouldRecover(state, condition)) {
              const normalizedEvent: NormalizedAlarmEvent = {
                tagId: ctx.tagId,
                deviceId: ctx.deviceId,
                projectId: ctx.projectId,
                value,
                timestamp: new Date(),
                message: `${ctx.tagName || ctx.tagId} 告警条件已恢复正常，当前值: ${this.formatAlarmValue(value)}`,
                conditionType: condition.type,
              };

              normalizedAlarms.push(normalizedEvent);
              // 标记为已恢复，清除活跃状态
              this.alarmStates.set(alarmKey, {
                isActive: false,
                lastTriggerTime: undefined,
                normalSince: new Date(),
              });

              this.logger.log(`Alarm normalized: ${normalizedEvent.message}`, {
                tagId: ctx.tagId,
                deviceId: ctx.deviceId,
                value,
                conditionType: condition.type,
              });
            } else if (!state.normalSince) {
              // 首次检测到值恢复正常，记录开始时间（恢复消抖计时起点）
              this.alarmStates.set(alarmKey, {
                ...state,
                normalSince: new Date(),
              });
            }
          }
        } catch (conditionError) {
          this.logger.error(
            `Alarm condition check error for tag ${ctx.tagId}: ${conditionError.message}`,
          );
        }
      }

      // 将触发的报警事件附加到 context（供 PublishStep 使用）
      if (triggeredAlarms.length > 0) {
        (ctx as any).triggeredAlarms = triggeredAlarms;
      }

      // Phase 5: 将恢复正常的告警事件附加到 context（供 PublishStep 发出 alarm_normalized）
      if (normalizedAlarms.length > 0) {
        (ctx as any).normalizedAlarms = normalizedAlarms;
      }

      return ctx;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown alarm check error';
      this.logger.error(`Alarm check error for tag ${ctx.tagId}: ${errorMsg}`);
      ctx.errors.push({ step: this.name, message: errorMsg, code: 'ALARM_ERROR' });
      return ctx;
    }
  }

  private checkAlarmCondition(
    value: number,
    condition: AlarmConditionType,
    ctx: PipelineContext,
  ): boolean {
    const tagConfig = ctx.tagConfig || {};

    switch (condition.type) {
      case 'limit': {
        const { high, low, highHigh, lowLow } = tagConfig.alarmLimits || {};
        if (highHigh !== undefined && value >= highHigh) return true;
        if (lowLow !== undefined && value <= lowLow) return true;
        if (high !== undefined && value >= high) return true;
        if (low !== undefined && value <= low) return true;
        return false;
      }

      case 'deviation': {
        const { setpoint, deviation } = tagConfig.alarmDeviation || {};
        if (setpoint !== undefined && deviation !== undefined) {
          return Math.abs(value - setpoint) > deviation;
        }
        return false;
      }

      case 'rate': {
        const { rateLimit } = tagConfig.alarmRate || {};
        if (rateLimit !== undefined) {
          const lastRecord = this.getLastValue(ctx.tagId);
          if (lastRecord) {
            const timeDiff = (Date.now() - lastRecord.timestamp.getTime()) / 1000;
            if (timeDiff > 0) {
              const rate = Math.abs(value - lastRecord.value) / timeDiff;
              return rate > rateLimit;
            }
          }
        }
        return false;
      }

      case 'digital': {
        // 数字量报警：值等于触发值
        const { triggerValue } = tagConfig.alarmDigital || {};
        return triggerValue !== undefined && value === triggerValue;
      }

      default:
        this.logger.warn(`Unknown alarm condition type: ${condition.type}`);
        return false;
    }
  }

  private shouldRetrigger(lastTriggerTime?: Date): boolean {
    if (!lastTriggerTime) return true;
    return Date.now() - lastTriggerTime.getTime() > 5000;
  }

  /**
   * 判断告警条件是否已恢复正常（Phase 5 恢复消抖）
   *
   * 第一版策略：值恢复正常即判定恢复（立即恢复）。
   * 后续可扩展为：值需持续 normalSince 后 N 秒/N 个采样周期才判定恢复，
   * 防止中间波动（如 80→79→80）导致告警抖动。
   *
   * @param state     当前告警状态（含 normalSince 恢复计时起点）
   * @param condition 告警条件（可用于按条件类型定制恢复策略）
   */
  private shouldRecover(_state: AlarmState, _condition: AlarmConditionType): boolean {
    // 简单策略：值恢复正常即恢复
    // TODO: 后续可扩展为时间消抖 — state.normalSince 持续超过 RECOVERY_DEBOUNCE_MS 才恢复
    return true;
  }

  /**
   * 格式化报警消息中的数值，避免浮点精度问题（如 22.57000000000001）
   * 整数不显小数，浮点保留 2 位
   */
  private formatAlarmValue(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  /**
   * 构建可读的中文报警消息，包含告警类型、阈值和当前值
   */
  private buildAlarmMessage(
    tagName: string,
    value: number,
    condition: AlarmConditionType,
    tagConfig?: any,
  ): string {
    const severityLabel =
      condition.severity === 'critical'
        ? '严重'
        : condition.severity === 'warning'
          ? '警告'
          : '提示';
    const fmtVal = this.formatAlarmValue(value);

    switch (condition.type) {
      case 'limit': {
        const limits = tagConfig?.alarmLimits || {};
        // 按优先级判断触发的是哪个限值（与 checkAlarmCondition 顺序一致）
        if (limits.highHigh !== undefined && value >= limits.highHigh) {
          return `[${severityLabel}] ${tagName} 超过上上限 ${this.formatAlarmValue(limits.highHigh)}，当前值: ${fmtVal}`;
        }
        if (limits.lowLow !== undefined && value <= limits.lowLow) {
          return `[${severityLabel}] ${tagName} 低于下下限 ${this.formatAlarmValue(limits.lowLow)}，当前值: ${fmtVal}`;
        }
        if (limits.high !== undefined && value >= limits.high) {
          return `[${severityLabel}] ${tagName} 超过上限 ${this.formatAlarmValue(limits.high)}，当前值: ${fmtVal}`;
        }
        if (limits.low !== undefined && value <= limits.low) {
          return `[${severityLabel}] ${tagName} 低于下限 ${this.formatAlarmValue(limits.low)}，当前值: ${fmtVal}`;
        }
        return `[${severityLabel}] ${tagName} 限值报警触发，当前值: ${fmtVal}`;
      }

      case 'deviation': {
        const dev = tagConfig?.alarmDeviation || {};
        const setpoint = dev.setpoint !== undefined ? this.formatAlarmValue(dev.setpoint) : '?';
        const devLimit = dev.deviation !== undefined ? this.formatAlarmValue(dev.deviation) : '?';
        return `[${severityLabel}] ${tagName} 偏差超限 ±${devLimit}，当前值: ${fmtVal}，设定值: ${setpoint}`;
      }

      case 'rate': {
        const rateCfg = tagConfig?.alarmRate || {};
        const rateLimit =
          rateCfg.rateLimit !== undefined ? this.formatAlarmValue(rateCfg.rateLimit) : '?';
        return `[${severityLabel}] ${tagName} 变化率超限 ${rateLimit}/s，当前值: ${fmtVal}`;
      }

      case 'digital': {
        return `[${severityLabel}] ${tagName} 数字量报警触发，当前值: ${fmtVal}`;
      }

      default:
        return `[${severityLabel}] ${tagName} 报警触发，当前值: ${fmtVal}`;
    }
  }

  private getLastValue(_tagId: string): { value: number; timestamp: Date } | undefined {
    // 从 DeadbandStep 或 Cache 获取上次值
    return undefined;
  }

  clearAlarmState(tagId: string): void {
    for (const key of this.alarmStates.keys()) {
      if (key.startsWith(`${tagId}:`)) {
        this.alarmStates.delete(key);
      }
    }
  }

  clearAllAlarmStates(): void {
    this.alarmStates.clear();
    this.diagnosedTags.clear();
  }
}
