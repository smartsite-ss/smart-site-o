// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { VariableSimulator } from './variable-simulator.interface';
import { VariableSimulationConfig, FixedValueParams } from '../simulation-config.types';

/** 固定值仿真器 */
export class FixedValueSimulator implements VariableSimulator {
  private value: number;
  private config: VariableSimulationConfig;

  constructor(config: FixedValueParams, simConfig: VariableSimulationConfig) {
    this.value = config.value;
    this.config = simConfig;
  }

  generate(): number {
    return this.value;
  }

  setValue(value: any): void {
    this.value = Number(value);
  }

  reset(): void {}

  getConfig(): VariableSimulationConfig {
    return this.config;
  }

  updateConfig(config: VariableSimulationConfig): void {
    this.value = (config.params as FixedValueParams).value;
    this.config = config;
  }
}
