// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { BoundedBackpressureQueue, QueueStats } from './bounded-backpressure-queue';

export enum PressureLevel {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const PRESSURE_RATE_MAP: Record<PressureLevel, number> = {
  [PressureLevel.NORMAL]: 1.0,
  [PressureLevel.LOW]: 0.8,
  [PressureLevel.MEDIUM]: 0.5,
  [PressureLevel.HIGH]: 0.2,
  [PressureLevel.CRITICAL]: 0.1,
};

export interface FrequencyReductionConfig {
  /** High watermark utilization ratio (0-1) to trigger LOW pressure */
  lowPressureThreshold?: number;
  /** Queue utilization ratio (0-1) to trigger MEDIUM pressure */
  mediumPressureThreshold?: number;
  /** Queue utilization ratio (0-1) to trigger HIGH pressure */
  highPressureThreshold?: number;
  /** Queue utilization ratio (0-1) to trigger CRITICAL pressure */
  criticalPressureThreshold?: number;
}

const DEFAULT_CONFIG: Required<FrequencyReductionConfig> = {
  lowPressureThreshold: 0.8,
  mediumPressureThreshold: 0.9,
  highPressureThreshold: 0.95,
  criticalPressureThreshold: 1.0,
};

@Injectable()
export class FrequencyReductionStrategy {
  private readonly logger = new Logger(FrequencyReductionStrategy.name);
  private config: Required<FrequencyReductionConfig>;
  private currentPressureLevel: PressureLevel = PressureLevel.NORMAL;
  private skipCounters = new Map<string, number>();
  private totalSkipped = 0;
  private totalProcessed = 0;

  constructor(config?: FrequencyReductionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 根据原始扫描频率和当前压力等级，计算降频后的扫描频率
   */
  calculateReducedRate(originalRate: number, pressureLevel?: PressureLevel): number {
    const level = pressureLevel ?? this.currentPressureLevel;
    const multiplier = PRESSURE_RATE_MAP[level];
    return Math.max(1, Math.round(originalRate * multiplier));
  }

  /**
   * 判断某个 tag 在当前周期是否应该跳过采集
   * 使用轮询跳过策略：根据降频比例，周期性地跳过部分 tag
   */
  shouldSkip(tagId: string, currentRate: number, originalRate?: number): boolean {
    if (originalRate && currentRate >= originalRate) {
      return false;
    }

    if (currentRate <= 0) {
      return true;
    }

    const counter = this.skipCounters.get(tagId) ?? 0;
    const skipInterval = Math.max(1, Math.ceil(100 / currentRate));

    const shouldSkipThisCycle = counter % skipInterval !== 0;
    this.skipCounters.set(tagId, counter + 1);

    if (shouldSkipThisCycle) {
      this.totalSkipped++;
    }
    this.totalProcessed++;

    return shouldSkipThisCycle;
  }

  /**
   * 根据队列状态获取当前系统压力等级
   */
  getCurrentPressureLevel(queueStats?: QueueStats): PressureLevel {
    if (!queueStats) {
      return this.currentPressureLevel;
    }

    const utilization = queueStats.maxSize > 0 ? queueStats.size / queueStats.maxSize : 0;

    if (utilization >= this.config.criticalPressureThreshold) {
      this.currentPressureLevel = PressureLevel.CRITICAL;
    } else if (utilization >= this.config.highPressureThreshold) {
      this.currentPressureLevel = PressureLevel.HIGH;
    } else if (utilization >= this.config.mediumPressureThreshold) {
      this.currentPressureLevel = PressureLevel.MEDIUM;
    } else if (utilization >= this.config.lowPressureThreshold) {
      this.currentPressureLevel = PressureLevel.LOW;
    } else {
      this.currentPressureLevel = PressureLevel.NORMAL;
    }

    return this.currentPressureLevel;
  }

  /**
   * 更新压力等级（基于队列状态）
   */
  updatePressureLevel(queue: BoundedBackpressureQueue<any>): PressureLevel {
    const stats = queue.getStats();
    return this.getCurrentPressureLevel(stats);
  }

  /**
   * 获取当前保持的压力等级
   */
  get pressureLevel(): PressureLevel {
    return this.currentPressureLevel;
  }

  /**
   * 获取当前降频倍率
   */
  get currentRateMultiplier(): number {
    return PRESSURE_RATE_MAP[this.currentPressureLevel];
  }

  /**
   * 获取跳过统计
   */
  getSkipStats(): { totalSkipped: number; totalProcessed: number; skipRate: number } {
    const skipRate = this.totalProcessed > 0 ? this.totalSkipped / this.totalProcessed : 0;
    return {
      totalSkipped: this.totalSkipped,
      totalProcessed: this.totalProcessed,
      skipRate: Math.round(skipRate * 10000) / 10000,
    };
  }

  /**
   * 重置所有状态到正常频率
   */
  reset(): void {
    this.currentPressureLevel = PressureLevel.NORMAL;
    this.skipCounters.clear();
    this.totalSkipped = 0;
    this.totalProcessed = 0;
    this.logger.log('FrequencyReductionStrategy reset to NORMAL');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FrequencyReductionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
