// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import { isBooleanDataType } from '@ss-node/ss-collector-sdk';
import { VariableSimulator, CachedSimulator } from './simulators/variable-simulator.interface';
import { FixedValueSimulator } from './simulators/fixed-value.simulator';
import { RangeValueSimulator } from './simulators/range-value.simulator';
import { EnumValueSimulator } from './simulators/enum-value.simulator';
import { BoolSimulator } from './simulators/bool.simulator';
import { StringSimulator } from './simulators/string.simulator';
import { FaultInjectionSimulator } from './simulators/fault-injection.simulator';
import {
  VariableSimulationConfig,
  FixedValueParams,
  RangeValueParams,
  EnumValueParams,
  BoolParams,
  StringParams,
  FaultInjectionParams,
} from './simulation-config.types';

/**
 * 仿真器工厂 — 管理所有仿真器实例，支持按 tagId 获取/创建/更新/删除。
 * 优先使用 tagConfig 中的 simulation 配置，未配置时按 dataType 自动推断默认策略。
 */
@Injectable()
export class SimulatorFactory {
  private simulators = new Map<string, CachedSimulator>();

  /**
   * 获取或创建变量仿真器。
   */
  getOrCreate(tagId: string, tagConfig: Record<string, any> | undefined): VariableSimulator {
    const existing = this.simulators.get(tagId);
    if (existing) return existing;

    const simConfig = this.extractSimConfig(tagConfig);
    const inner = this.createFromConfig(simConfig);
    const cached = new CachedSimulator(inner, simConfig.updateIntervalSec);
    this.simulators.set(tagId, cached);
    return cached;
  }

  /** 获取已有仿真器 */
  get(tagId: string): VariableSimulator | undefined {
    return this.simulators.get(tagId);
  }

  /** 更新仿真器配置 */
  update(tagId: string, config: VariableSimulationConfig): void {
    const simulator = this.simulators.get(tagId);
    if (simulator) {
      simulator.updateConfig(config);
    }
  }

  /** 移除指定 tag 的仿真器 */
  remove(tagId: string): void {
    this.simulators.delete(tagId);
  }

  /** 清除所有仿真器 */
  clear(): void {
    this.simulators.clear();
  }

  /** 获取所有仿真器数量 */
  get size(): number {
    return this.simulators.size;
  }

  /** 从 tagConfig 提取仿真配置，未配置时按 dataType 推断默认策略 */
  private extractSimConfig(tagConfig: Record<string, any> | undefined): VariableSimulationConfig {
    if (tagConfig?.simulation?.enabled) {
      return tagConfig.simulation as VariableSimulationConfig;
    }
    return this.getDefaultSimulation(tagConfig?.dataType || 'float32');
  }

  /** 根据配置创建仿真器 */
  private createFromConfig(config: VariableSimulationConfig): VariableSimulator {
    switch (config.mode) {
      case 'fixed':
        return new FixedValueSimulator(config.params as FixedValueParams, config);
      case 'range':
        return new RangeValueSimulator(config.params as RangeValueParams, config);
      case 'enum':
        return new EnumValueSimulator(config.params as EnumValueParams, config);
      case 'bool':
        return new BoolSimulator(config.params as BoolParams, config);
      case 'string':
        return new StringSimulator(config.params as StringParams, config);
      case 'fault_injection':
        return new FaultInjectionSimulator(config.params as FaultInjectionParams, config);
      default:
        throw new Error(`不支持的仿真模式: ${(config as any).mode}`);
    }
  }

  /** 未配置仿真时，按数据类型自动推断默认策略（兼容点表规范字符串 'boolean'） */
  private getDefaultSimulation(dataType: string): VariableSimulationConfig {
    if (isBooleanDataType(dataType)) {
      return {
        enabled: true,
        mode: 'bool',
        updateIntervalSec: 2,
        params: { switchMode: 'random', trueProbability: 0.5 } as BoolParams,
      };
    }
    switch (dataType) {
      case 'string':
        return {
          enabled: true,
          mode: 'string',
          updateIntervalSec: 10,
          params: { values: ['OK', 'WARN', 'ERR'], switchMode: 'sequential' } as StringParams,
        };
      default:
        // 数值型默认：范围随机游走
        return {
          enabled: true,
          mode: 'range',
          updateIntervalSec: 1,
          params: { min: 0, max: 100, pattern: 'random_walk', step: 1 } as RangeValueParams,
        };
    }
  }
}
