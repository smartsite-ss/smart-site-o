// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PressureLevel } from './frequency-reduction.strategy';

export enum DataPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface DiscardConfig {
  /** 丢弃 MEDIUM 优先级数据所需的压力等级，默认 CRITICAL */
  mediumDiscardLevel?: PressureLevel;
  /** 丢弃 LOW 优先级数据所需的压力等级，默认 HIGH */
  lowDiscardLevel?: PressureLevel;
  /** 开启丢弃的最小队列利用率 (0-1)，默认 0.8 */
  minUtilizationForDiscard?: number;
  /** 最大丢弃率 (0-1)，超过此比例将不再丢弃，默认 0.5 */
  maxDiscardRate?: number;
}

const DEFAULT_DISCARD_CONFIG: Required<DiscardConfig> = {
  mediumDiscardLevel: PressureLevel.CRITICAL,
  lowDiscardLevel: PressureLevel.HIGH,
  minUtilizationForDiscard: 0.8,
  maxDiscardRate: 0.5,
};

export interface DiscardStats {
  totalDiscarded: number;
  totalOffered: number;
  discardRate: number;
  lastDiscardTime: number | null;
  discardedByLevel: Record<DataPriority, number>;
  currentPressureLevel: PressureLevel;
}

export interface QueueState {
  size: number;
  maxSize: number;
  isUnderPressure: boolean;
  utilization: number;
}

export interface Taggable {
  tagId: string;
  priority?: DataPriority;
}

@Injectable()
export class DiscardStrategy {
  private readonly logger = new Logger(DiscardStrategy.name);
  private config: Required<DiscardConfig>;
  private totalDiscarded = 0;
  private totalOffered = 0;
  private lastDiscardTime: number | null = null;
  private discardedByLevel: Record<DataPriority, number> = {
    [DataPriority.HIGH]: 0,
    [DataPriority.MEDIUM]: 0,
    [DataPriority.LOW]: 0,
  };

  constructor(config?: DiscardConfig) {
    this.config = { ...DEFAULT_DISCARD_CONFIG, ...config };
  }

  /**
   * 判断是否应该丢弃数据
   * @param tag 带优先级的数据标签
   * @param queueState 队列状态
   * @param currentPressure 当前压力等级
   * @returns 是否应该丢弃
   */
  shouldDiscard(tag: Taggable, queueState: QueueState, currentPressure?: PressureLevel): boolean {
    this.totalOffered++;

    const priority = tag.priority ?? DataPriority.MEDIUM;
    const pressure = currentPressure ?? PressureLevel.NORMAL;

    // HIGH 优先级数据永不丢弃
    if (priority === DataPriority.HIGH) {
      return false;
    }

    // 队列利用率低于最小阈值时不丢弃
    if (queueState.utilization < this.config.minUtilizationForDiscard) {
      return false;
    }

    // 检查丢弃率是否超过最大限制
    if (this.totalOffered > 0) {
      const currentDiscardRate = this.totalDiscarded / this.totalOffered;
      if (currentDiscardRate >= this.config.maxDiscardRate) {
        return false;
      }
    }

    const pressureLevels = [
      PressureLevel.NORMAL,
      PressureLevel.LOW,
      PressureLevel.MEDIUM,
      PressureLevel.HIGH,
      PressureLevel.CRITICAL,
    ];
    const pressureIndex = pressureLevels.indexOf(pressure);

    let shouldDiscard = false;

    if (priority === DataPriority.LOW) {
      const lowThreshold = pressureLevels.indexOf(this.config.lowDiscardLevel);
      if (pressureIndex >= lowThreshold) {
        shouldDiscard = true;
      }
    } else if (priority === DataPriority.MEDIUM) {
      const mediumThreshold = pressureLevels.indexOf(this.config.mediumDiscardLevel);
      if (pressureIndex >= mediumThreshold) {
        shouldDiscard = true;
      }
    }

    if (shouldDiscard) {
      this.totalDiscarded++;
      this.discardedByLevel[priority]++;
      this.lastDiscardTime = Date.now();
      this.logger.warn(
        `Discarding ${priority} priority tag "${tag.tagId}" ` +
          `at pressure=${pressure}, utilization=${queueState.utilization.toFixed(2)}`,
      );
    }

    return shouldDiscard;
  }

  /**
   * 批量判断数据是否应该丢弃
   */
  filterDiscardable(
    tags: Taggable[],
    queueState: QueueState,
    currentPressure?: PressureLevel,
  ): { accepted: Taggable[]; discarded: Taggable[] } {
    const accepted: Taggable[] = [];
    const discarded: Taggable[] = [];

    for (const tag of tags) {
      if (this.shouldDiscard(tag, queueState, currentPressure)) {
        discarded.push(tag);
      } else {
        accepted.push(tag);
      }
    }

    return { accepted, discarded };
  }

  /**
   * 获取丢弃统计信息
   */
  getDiscardStats(): DiscardStats {
    const discardRate = this.totalOffered > 0 ? this.totalDiscarded / this.totalOffered : 0;

    return {
      totalDiscarded: this.totalDiscarded,
      totalOffered: this.totalOffered,
      discardRate: Math.round(discardRate * 10000) / 10000,
      lastDiscardTime: this.lastDiscardTime,
      discardedByLevel: { ...this.discardedByLevel },
      currentPressureLevel: PressureLevel.NORMAL,
    };
  }

  /**
   * 重置丢弃统计
   */
  reset(): void {
    this.totalDiscarded = 0;
    this.totalOffered = 0;
    this.lastDiscardTime = null;
    this.discardedByLevel = {
      [DataPriority.HIGH]: 0,
      [DataPriority.MEDIUM]: 0,
      [DataPriority.LOW]: 0,
    };
    this.logger.log('DiscardStrategy reset');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DiscardConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
