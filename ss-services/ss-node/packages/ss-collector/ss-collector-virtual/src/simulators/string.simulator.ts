// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { VariableSimulator } from './variable-simulator.interface';
import { VariableSimulationConfig, StringParams } from '../simulation-config.types';

/** 字符串仿真器 */
export class StringSimulator implements VariableSimulator {
  private values: string[];
  private switchMode: 'sequential' | 'random' | 'fixed';
  private switchIntervalSec: number;
  private currentIndex: number;
  private lastSwitchTime: number;
  private simConfig: VariableSimulationConfig;

  constructor(config: StringParams, simConfig: VariableSimulationConfig) {
    this.values = config.values;
    this.switchMode = config.switchMode;
    this.switchIntervalSec = config.switchIntervalSec ?? 10;
    this.currentIndex = 0;
    this.lastSwitchTime = Date.now();
    this.simConfig = simConfig;
  }

  generate(): string {
    switch (this.switchMode) {
      case 'fixed':
        return this.values[0] || '';
      case 'random': {
        this.maybeSwitch();
        return this.values[Math.floor(Math.random() * this.values.length)];
      }
      case 'sequential': {
        this.maybeSwitch();
        return this.values[this.currentIndex];
      }
      default:
        return '';
    }
  }

  setValue(value: any): void {
    const str = String(value);
    const idx = this.values.indexOf(str);
    if (idx >= 0) {
      this.currentIndex = idx;
    }
  }

  private maybeSwitch(): void {
    const elapsed = (Date.now() - this.lastSwitchTime) / 1000;
    if (elapsed >= this.switchIntervalSec) {
      this.currentIndex = (this.currentIndex + 1) % this.values.length;
      this.lastSwitchTime = Date.now();
    }
  }

  reset(): void {
    this.currentIndex = 0;
    this.lastSwitchTime = Date.now();
  }

  getConfig(): VariableSimulationConfig {
    return this.simConfig;
  }

  updateConfig(config: VariableSimulationConfig): void {
    const params = config.params as StringParams;
    this.values = params.values;
    this.switchMode = params.switchMode;
    this.switchIntervalSec = params.switchIntervalSec ?? 10;
    this.simConfig = config;
    this.reset();
  }
}
