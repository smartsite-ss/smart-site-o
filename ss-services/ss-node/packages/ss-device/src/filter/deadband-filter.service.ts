// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { DeadbandMode } from '../entities/data-tag.entity';

/** 死区过滤结果 */
export interface DeadbandFilterResult {
  /** 是否应该上报 */
  shouldReport: boolean;
  /** 过滤原因 */
  reason?: string;
  /** 变化量 */
  delta?: number;
  /** 变化百分比 */
  deltaPercent?: number;
}

/** 死区状态记录 */
interface DeadbandState {
  lastValue: number;
  lastReportedAt: number;
  skipCount: number;
}

@Injectable()
export class DeadbandFilterService {
  private readonly logger = new Logger(DeadbandFilterService.name);
  private readonly states = new Map<string, DeadbandState>();

  /**
   * 判断数据点是否应该上报（死区过滤）
   * @param currentValue 当前值
   * @param previousValue 上一次上报的值
   * @param tag 标签配置（包含死区参数）
   */
  shouldReport(
    currentValue: number,
    previousValue: number | undefined,
    tag: {
      deadbandMode?: DeadbandMode | string;
      deadbandValue?: number;
      deadbandPercent?: number;
      deadbandTime?: number;
    },
  ): DeadbandFilterResult {
    const mode = tag.deadbandMode || DeadbandMode.NONE;
    const _now = Date.now();

    // 首次上报，或 previousValue 未提供
    if (previousValue === undefined || previousValue === null) {
      return { shouldReport: true, reason: 'first_report' };
    }

    switch (mode) {
      case DeadbandMode.NONE:
        return this.handleNone(currentValue, previousValue);

      case DeadbandMode.ABSOLUTE:
        return this.handleAbsolute(currentValue, previousValue, tag.deadbandValue);

      case DeadbandMode.PERCENT:
        return this.handlePercentage(currentValue, previousValue, tag.deadbandPercent);

      case DeadbandMode.TIME:
        return this.handleTime(currentValue, tag.deadbandTime);

      default:
        this.logger.warn(`Unknown deadband mode: ${mode}, defaulting to pass`);
        return { shouldReport: true, reason: 'unknown_mode' };
    }
  }

  /**
   * 绝对死区比较
   */
  absoluteDeadband(current: number, previous: number, deadbandValue: number): DeadbandFilterResult {
    const delta = Math.abs(current - previous);
    const shouldReport = delta > (deadbandValue || 0);

    return {
      shouldReport,
      delta,
      reason: shouldReport
        ? undefined
        : `absolute_deadband: |${current} - ${previous}| = ${delta} <= ${deadbandValue}`,
    };
  }

  /**
   * 百分比死区比较
   */
  percentageDeadband(
    current: number,
    previous: number,
    deadbandPercent: number,
  ): DeadbandFilterResult {
    // 避免除零
    if (Math.abs(previous) < 1e-10) {
      return { shouldReport: true, reason: 'zero_base_bypass' };
    }

    const deltaPercent = (Math.abs(current - previous) / Math.abs(previous)) * 100;
    const shouldReport = deltaPercent > (deadbandPercent || 0);

    return {
      shouldReport,
      deltaPercent,
      reason: shouldReport
        ? undefined
        : `percentage_deadband: ${deltaPercent.toFixed(4)}% <= ${deadbandPercent}%`,
    };
  }

  /**
   * 更新标签死区状态
   */
  updateState(tagId: string, value: number): void {
    this.states.set(tagId, {
      lastValue: value,
      lastReportedAt: Date.now(),
      skipCount: 0,
    });
  }

  /**
   * 记录跳过的数据点
   */
  recordSkip(tagId: string): void {
    const state = this.states.get(tagId);
    if (state) {
      state.skipCount++;
    }
  }

  /**
   * 获取标签死区状态
   */
  getState(tagId: string): DeadbandState | undefined {
    return this.states.get(tagId);
  }

  /**
   * 获取标签上一次上报的值
   */
  getLastValue(tagId: string): number | undefined {
    return this.states.get(tagId)?.lastValue;
  }

  /**
   * 重置标签死区状态
   */
  reset(tagId: string): void {
    this.states.delete(tagId);
  }

  /**
   * 清除所有死区状态
   */
  clearAll(): void {
    this.states.clear();
  }

  /**
   * 获取所有标签的跳过统计
   */
  getSkipStatistics(): Map<string, { tagId: string; skipCount: number; lastValue: number }> {
    const result = new Map<string, { tagId: string; skipCount: number; lastValue: number }>();
    for (const [tagId, state] of this.states) {
      result.set(tagId, {
        tagId,
        skipCount: state.skipCount,
        lastValue: state.lastValue,
      });
    }
    return result;
  }

  // ──────────── 私有方法 ────────────

  private handleNone(_currentValue: number, _previousValue: number): DeadbandFilterResult {
    return { shouldReport: true, reason: 'none_mode' };
  }

  private handleAbsolute(
    currentValue: number,
    previousValue: number,
    deadbandValue?: number,
  ): DeadbandFilterResult {
    return this.absoluteDeadband(currentValue, previousValue, deadbandValue ?? 0);
  }

  private handlePercentage(
    currentValue: number,
    previousValue: number,
    deadbandPercent?: number,
  ): DeadbandFilterResult {
    return this.percentageDeadband(currentValue, previousValue, deadbandPercent ?? 0);
  }

  private handleTime(currentValue: number, deadbandTime?: number): DeadbandFilterResult {
    // 时间死区需要基于状态判断
    // 此处简化实现：如果提供了 deadbandTime，始终返回 true（时间死区由 DeadbandStep 在 pipeline 中处理）
    if (!deadbandTime || deadbandTime <= 0) {
      return { shouldReport: true, reason: 'time_deadband_disabled' };
    }
    return { shouldReport: true, reason: 'time_deadband_delegated' };
  }
}
