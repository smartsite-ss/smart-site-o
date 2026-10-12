// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { VariableSimulator } from './variable-simulator.interface';
import { VariableSimulationConfig, RangeValueParams } from '../simulation-config.types';

/** 范围可变值仿真器 — 支持 5 种变化模式 */
export class RangeValueSimulator implements VariableSimulator {
  private currentValue: number;
  private config: RangeValueParams;
  private simConfig: VariableSimulationConfig;
  private startTime: number;
  private sinePhase: number;

  constructor(config: RangeValueParams, simConfig: VariableSimulationConfig) {
    this.config = config;
    this.simConfig = simConfig;
    this.currentValue = (config.min + config.max) / 2;
    this.startTime = Date.now();
    this.sinePhase = Math.random() * Math.PI * 2;
  }

  generate(): number {
    let value: number;
    const { min, max, pattern, step, period, noiseLevel } = this.config;

    switch (pattern) {
      case 'random_walk': {
        const delta = (Math.random() * 2 - 1) * (step || (max - min) * 0.05);
        this.currentValue = Math.max(min, Math.min(max, this.currentValue + delta));
        value = this.currentValue;
        break;
      }
      case 'sine': {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const effectivePeriod = period || 60;
        const amplitude = (max - min) / 2;
        const center = (max + min) / 2;
        value =
          center + amplitude * Math.sin((2 * Math.PI * elapsed) / effectivePeriod + this.sinePhase);
        if (noiseLevel) {
          value += (Math.random() * 2 - 1) * noiseLevel * amplitude;
        }
        break;
      }
      case 'sawtooth': {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const effectivePeriod = period || 60;
        const phase = (elapsed % effectivePeriod) / effectivePeriod;
        value = min + (max - min) * phase;
        break;
      }
      case 'ramp': {
        this.currentValue += step || (max - min) * 0.01;
        if (this.currentValue > max) {
          this.currentValue = min;
        }
        value = this.currentValue;
        break;
      }
      case 'random': {
        value = min + Math.random() * (max - min);
        break;
      }
      default:
        value = this.currentValue;
    }

    this.currentValue = value;
    return value;
  }

  setValue(value: any): void {
    this.currentValue = Number(value);
  }

  reset(): void {
    this.currentValue = (this.config.min + this.config.max) / 2;
    this.startTime = Date.now();
    this.sinePhase = Math.random() * Math.PI * 2;
  }

  getConfig(): VariableSimulationConfig {
    return this.simConfig;
  }

  updateConfig(config: VariableSimulationConfig): void {
    this.config = config.params as RangeValueParams;
    this.simConfig = config;
    this.reset();
  }
}
