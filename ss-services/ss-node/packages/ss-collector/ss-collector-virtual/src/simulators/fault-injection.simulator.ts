// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger } from '@nestjs/common';
import { VariableSimulator } from './variable-simulator.interface';
import { VariableSimulationConfig, FaultInjectionParams } from '../simulation-config.types';

/**
 * 故障注入仿真器
 *
 * 按配置比例随机返回错误或超时，用于测试报警规则和熔断逻辑。
 * 支持三种故障场景：
 * - error：随机返回 NaN/Error（模拟通信失败）
 * - timeout：随机延迟超过超时阈值（模拟超时）
 * - slow_rise：值缓慢上升（模拟传感器漂移）
 * - spike：偶发尖峰跳变（模拟传感器故障）
 */
export class FaultInjectionSimulator implements VariableSimulator {
  private readonly logger = new Logger(FaultInjectionSimulator.name);

  private currentValue: number;
  private startTime: number;
  private config: VariableSimulationConfig;

  constructor(
    private readonly params: FaultInjectionParams,
    simConfig: VariableSimulationConfig,
  ) {
    this.currentValue = params.initialValue ?? 50;
    this.startTime = Date.now();
    this.config = simConfig;
  }

  generate(): number | null {
    const elapsedSec = (Date.now() - this.startTime) / 1000;

    switch (this.params.scenario) {
      case 'error':
        return this.generateError();
      case 'timeout':
        return this.generateTimeout();
      case 'slow_rise':
        return this.generateSlowRise(elapsedSec);
      case 'spike':
        return this.generateSpike(elapsedSec);
      default:
        return this.currentValue;
    }
  }

  setValue(value: number): void {
    this.currentValue = value;
  }

  reset(): void {
    this.currentValue = this.params.initialValue ?? 50;
    this.startTime = Date.now();
  }

  getConfig(): VariableSimulationConfig {
    return this.config;
  }

  updateConfig(config: VariableSimulationConfig): void {
    const newParams = config.params as FaultInjectionParams;
    this.currentValue = newParams.initialValue ?? this.currentValue;
    this.startTime = Date.now();
    this.config = config;
  }

  /** 随机错误：按 errorRate 概率返回 NaN */
  private generateError(): number | null {
    const errorRate = this.params.errorRate ?? 0.1;
    if (Math.random() < errorRate) {
      this.logger.warn(`[FaultInjection] Error injected (scenario: ${this.params.scenario})`);
      return NaN;
    }
    return this.currentValue;
  }

  /** 随机超时：通过返回 null 模拟，由上层处理 */
  private generateTimeout(): number | null {
    const timeoutRate = this.params.timeoutRate ?? 0.05;
    if (Math.random() < timeoutRate) {
      this.logger.warn(`[FaultInjection] Timeout injected (scenario: ${this.params.scenario})`);
      return null;
    }
    return this.currentValue;
  }

  /** 缓慢上升：模拟传感器漂移 */
  private generateSlowRise(elapsedSec: number): number {
    const riseRate = this.params.riseRatePerSec ?? 0.1;
    const noiseLevel = this.params.noiseLevel ?? 0.05;
    this.currentValue += riseRate + (Math.random() - 0.5) * noiseLevel;
    return this.currentValue;
  }

  /** 偶发尖峰：模拟传感器跳变 */
  private generateSpike(_elapsedSec: number): number {
    const spikeRate = this.params.spikeRate ?? 0.02;
    const spikeMagnitude = this.params.spikeMagnitude ?? 50;

    if (Math.random() < spikeRate) {
      const spikeValue = this.currentValue + spikeMagnitude * (Math.random() > 0.5 ? 1 : -1);
      this.logger.warn(`[FaultInjection] Spike injected: ${spikeValue}`);
      return spikeValue;
    }
    return this.currentValue;
  }
}
