// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { VariableSimulationConfig } from '../simulation-config.types';

/** 变量仿真器接口 */
export interface VariableSimulator {
  /** 生成下一个值 */
  generate(): number | boolean | string;
  /** 设置当前值（用于外部写入） */
  setValue(value: any): void;
  /** 重置仿真器状态 */
  reset(): void;
  /** 获取仿真器配置 */
  getConfig(): VariableSimulationConfig;
  /** 更新仿真器配置 */
  updateConfig(config: VariableSimulationConfig): void;
}

/** 带缓存的仿真器包装器 — 按 updateIntervalSec 控制更新频率 */
export class CachedSimulator implements VariableSimulator {
  private inner: VariableSimulator;
  private updateIntervalMs: number;
  private lastGeneratedTime: number = 0;
  private cachedValue: any = null;

  constructor(simulator: VariableSimulator, updateIntervalSec: number) {
    this.inner = simulator;
    this.updateIntervalMs = updateIntervalSec * 1000;
  }

  generate(): any {
    const now = Date.now();
    if (now - this.lastGeneratedTime >= this.updateIntervalMs) {
      this.cachedValue = this.inner.generate();
      this.lastGeneratedTime = now;
    }
    return this.cachedValue;
  }

  setValue(value: any): void {
    this.inner.setValue(value);
    this.cachedValue = value;
  }

  reset(): void {
    this.inner.reset();
    this.lastGeneratedTime = 0;
    this.cachedValue = null;
  }

  getConfig(): VariableSimulationConfig {
    return this.inner.getConfig();
  }

  updateConfig(config: VariableSimulationConfig): void {
    this.updateIntervalMs = config.updateIntervalSec * 1000;
    this.inner.updateConfig(config);
    this.lastGeneratedTime = 0;
    this.cachedValue = null;
  }
}
