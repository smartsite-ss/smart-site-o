// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { VariableSimulator } from './variable-simulator.interface';
import { VariableSimulationConfig, BoolParams } from '../simulation-config.types';

/** 布尔值仿真器 */
export class BoolSimulator implements VariableSimulator {
  private config: BoolParams;
  private simConfig: VariableSimulationConfig;
  private currentValue: boolean;
  private lastToggleTime: number;

  constructor(config: BoolParams, simConfig: VariableSimulationConfig) {
    this.config = config;
    this.simConfig = simConfig;
    this.currentValue = config.fixedValue ?? false;
    this.lastToggleTime = Date.now();
  }

  generate(): boolean {
    switch (this.config.switchMode) {
      case 'fixed':
        return this.config.fixedValue ?? false;
      case 'toggle': {
        const elapsed = (Date.now() - this.lastToggleTime) / 1000;
        const interval = this.config.toggleIntervalSec ?? 5;
        if (elapsed >= interval) {
          this.currentValue = !this.currentValue;
          this.lastToggleTime = Date.now();
        }
        return this.currentValue;
      }
      case 'random':
        return Math.random() < (this.config.trueProbability ?? 0.5);
      default:
        return false;
    }
  }

  setValue(value: any): void {
    this.currentValue = Boolean(value);
  }

  reset(): void {
    this.currentValue = this.config.fixedValue ?? false;
    this.lastToggleTime = Date.now();
  }

  getConfig(): VariableSimulationConfig {
    return this.simConfig;
  }

  updateConfig(config: VariableSimulationConfig): void {
    this.config = config.params as BoolParams;
    this.simConfig = config;
    this.reset();
  }
}
