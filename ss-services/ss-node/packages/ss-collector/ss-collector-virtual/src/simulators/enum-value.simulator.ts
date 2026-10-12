// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { VariableSimulator } from './variable-simulator.interface';
import { VariableSimulationConfig, EnumValueParams } from '../simulation-config.types';

/** 枚举值仿真器 */
export class EnumValueSimulator implements VariableSimulator {
  private values: number[];
  private switchMode: 'sequential' | 'random';
  private stepSize: number;
  private currentIndex: number;
  private simConfig: VariableSimulationConfig;

  constructor(config: EnumValueParams, simConfig: VariableSimulationConfig) {
    this.values = config.values;
    this.switchMode = config.switchMode;
    this.stepSize = config.stepSize || 1;
    this.currentIndex = 0;
    this.simConfig = simConfig;
  }

  generate(): number {
    if (this.switchMode === 'random') {
      return this.values[Math.floor(Math.random() * this.values.length)];
    }
    // sequential: 每次前进
    this.currentIndex = (this.currentIndex + this.stepSize) % this.values.length;
    return this.values[this.currentIndex];
  }

  setValue(value: any): void {
    const num = Number(value);
    const idx = this.values.indexOf(num);
    if (idx >= 0) {
      this.currentIndex = idx;
    }
  }

  reset(): void {
    this.currentIndex = 0;
  }

  getConfig(): VariableSimulationConfig {
    return this.simConfig;
  }

  updateConfig(config: VariableSimulationConfig): void {
    const params = config.params as EnumValueParams;
    this.values = params.values;
    this.switchMode = params.switchMode;
    this.stepSize = params.stepSize || 1;
    this.simConfig = config;
    this.reset();
  }
}
