// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  halfOpenMaxCalls: number;
  monitoringWindowMs: number;
  adaptiveThreshold: boolean;
  minFailureThreshold: number;
  maxFailureThreshold: number;
}

export interface CircuitStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  openCount: number;
  recoveryCount: number;
  avgResponseTime: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeoutMs: 30000,
  halfOpenMaxCalls: 1,
  monitoringWindowMs: 60000,
  adaptiveThreshold: true,
  minFailureThreshold: 3,
  maxFailureThreshold: 10,
};

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  // 存储各个资源（设备/服务）的熔断器
  private circuitBreakers = new Map<string, CircuitBreaker>();

  // 默认配置
  private defaultConfig: CircuitBreakerConfig = DEFAULT_CONFIG;

  constructor(@Optional() config?: Partial<CircuitBreakerConfig>) {
    if (config) {
      this.defaultConfig = { ...this.defaultConfig, ...config };
    }
  }

  setDefaultConfig(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    this.logger.debug(`Default circuit breaker config updated`);
  }

  getCircuitBreaker(resourceId: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(resourceId);

    if (!breaker) {
      breaker = new CircuitBreaker(resourceId, this.defaultConfig);
      this.circuitBreakers.set(resourceId, breaker);
      this.logger.debug(`Created new circuit breaker for ${resourceId}`);
    }

    return breaker;
  }

  async execute<T>(
    resourceId: string,
    operation: () => Promise<T>,
    fallback?: (error: Error) => T | Promise<T>,
  ): Promise<T> {
    const breaker = this.getCircuitBreaker(resourceId);

    if (!breaker.canExecute()) {
      const error = new Error(
        `Circuit breaker is OPEN for resource ${resourceId}. ` +
          `Please wait ${breaker.getRemainingTimeout()}ms before retrying.`,
      );

      this.logger.warn(error.message);

      if (fallback) {
        return await fallback(error);
      }

      throw error;
    }

    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      breaker.recordSuccess(duration);

      return result;
    } catch (error) {
      breaker.recordFailure();

      if (fallback) {
        return await fallback(error as Error);
      }

      throw error;
    }
  }

  getStats(resourceId?: string): CircuitStats | Map<string, CircuitStats> {
    if (resourceId) {
      const breaker = this.circuitBreakers.get(resourceId);
      return breaker?.getStats() || this.createEmptyStats();
    }

    const statsMap = new Map<string, CircuitStats>();
    for (const [id, breaker] of this.circuitBreakers) {
      statsMap.set(id, breaker.getStats());
    }
    return statsMap;
  }

  reset(resourceId?: string): void {
    if (resourceId) {
      const breaker = this.circuitBreakers.get(resourceId);
      if (breaker) {
        breaker.reset();
        this.logger.log(`Circuit breaker reset for ${resourceId}`);
      }
    } else {
      for (const [id] of this.circuitBreakers) {
        this.reset(id);
      }
    }
  }

  getAllStates(): Map<string, CircuitState> {
    const states = new Map<string, CircuitState>();
    for (const [id, breaker] of this.circuitBreakers) {
      states.set(id, breaker.getState());
    }
    return states;
  }

  private createEmptyStats(): CircuitStats {
    return {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      totalCalls: 0,
      openCount: 0,
      recoveryCount: 0,
      avgResponseTime: 0,
    };
  }
}

class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);

  private readonly resourceId: string;
  private config: CircuitBreakerConfig;

  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalCalls: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private openTime?: Date;
  private openCount: number = 0;
  private recoveryCount: number = 0;

  // 用于计算平均响应时间
  private responseTimes: number[] = [];
  private readonly maxResponseTimeSamples: number = 100;

  constructor(resourceId: string, config: CircuitBreakerConfig) {
    this.resourceId = resourceId;
    this.config = config;
  }

  canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // 检查是否超时，可以进入半开状态
        if (this.shouldAttemptReset()) {
          this.transitionTo(CircuitState.HALF_OPEN);
          this.logger.warn(`Circuit breaker HALF-OPEN for ${this.resourceId}, allowing test call`);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // 半开状态只允许有限数量的调用
        return this.successCount < this.config.halfOpenMaxCalls;

      default:
        return true;
    }
  }

  recordSuccess(responseTime?: number): void {
    this.totalCalls++;
    this.successCount++;

    if (responseTime) {
      this.recordResponseTime(responseTime);
    }

    this.lastSuccessTime = new Date();

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        // 半开状态下成功，检查是否达到恢复阈值
        if (this.successCount >= this.config.successThreshold) {
          this.transitionTo(CircuitState.CLOSED);
          this.recoveryCount++;
          this.logger.log(
            `Circuit breaker RECOVERED for ${this.resourceId} after ${this.successCount} successes`,
          );
        }
        break;

      case CircuitState.CLOSED:
        // 关闭状态下成功，重置失败计数
        if (this.failureCount > 0) {
          this.failureCount = Math.max(0, this.failureCount - 1);
        }
        break;
    }
  }

  recordFailure(): void {
    this.totalCalls++;
    this.failureCount++;
    this.lastFailureTime = new Date();

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        // 半开状态下失败，立即重新打开
        this.transitionTo(CircuitState.OPEN);
        this.logger.error(`Circuit breaker RE-OPENED for ${this.resourceId} during test call`);
        break;

      case CircuitState.CLOSED:
        // 检查是否达到失败阈值
        if (this.isFailureThresholdReached()) {
          this.transitionTo(CircuitState.OPEN);
          this.openCount++;
          this.logger.error(
            `Circuit breaker OPENED for ${this.resourceId} after ${this.failureCount} failures`,
          );
        }
        break;
    }
  }

  getState(): CircuitState {
    // 自动状态转换检查
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    return this.state;
  }

  getStats(): CircuitStats {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openCount: this.openCount,
      recoveryCount: this.recoveryCount,
      avgResponseTime: this.calculateAvgResponseTime(),
    };
  }

  getRemainingTimeout(): number {
    if (this.state !== CircuitState.OPEN || !this.openTime) {
      return 0;
    }

    const elapsed = Date.now() - this.openTime.getTime();
    const remaining = this.config.timeoutMs - elapsed;

    return Math.max(0, remaining);
  }

  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.responseTimes = [];
    this.openCount = 0;
    this.recoveryCount = 0;
  }

  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    // 重置相关计数器
    if (newState === CircuitState.HALF_OPEN || newState === CircuitState.OPEN) {
      this.successCount = 0;
    }

    if (newState === CircuitState.OPEN) {
      this.openTime = new Date();
    }

    this.logger.debug(
      `Circuit breaker state changed for ${this.resourceId}: ${oldState} -> ${newState}`,
    );
  }

  private isFailureThresholdReached(): boolean {
    if (this.config.adaptiveThreshold) {
      // 自适应阈值：基于历史成功率动态调整
      const failureRate = this.totalCalls > 0 ? this.failureCount / this.totalCalls : 0;
      const adjustedThreshold = Math.floor(
        this.config.minFailureThreshold +
          (this.config.maxFailureThreshold - this.config.minFailureThreshold) * (1 - failureRate),
      );

      return this.failureCount >= Math.max(this.config.minFailureThreshold, adjustedThreshold);
    }

    return this.failureCount >= this.config.failureThreshold;
  }

  private shouldAttemptReset(): boolean {
    if (!this.openTime) return false;

    const elapsed = Date.now() - this.openTime.getTime();
    return elapsed >= this.config.timeoutMs;
  }

  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);

    // 保持固定大小的样本窗口
    if (this.responseTimes.length > this.maxResponseTimeSamples) {
      this.responseTimes.shift();
    }
  }

  private calculateAvgResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;

    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.responseTimes.length;
  }
}
