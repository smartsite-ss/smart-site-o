// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/** 仿真模式 */
export type SimulationMode = 'fixed' | 'range' | 'enum' | 'bool' | 'string' | 'fault_injection';

/** 变量级仿真配置 */
export interface VariableSimulationConfig {
  /** 是否启用仿真，默认 false */
  enabled: boolean;
  /** 仿真模式 */
  mode: SimulationMode;
  /** 更新间隔（秒），默认 1.0 */
  updateIntervalSec: number;
  /** 模式参数 */
  params:
    | FixedValueParams
    | RangeValueParams
    | EnumValueParams
    | BoolParams
    | StringParams
    | FaultInjectionParams;
}

// ============== 模式参数定义 ==============

/** 固定值参数 */
export interface FixedValueParams {
  /** 固定输出的值 */
  value: number;
}

/** 范围可变值参数 */
export interface RangeValueParams {
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 变化模式 */
  pattern: 'random_walk' | 'sine' | 'sawtooth' | 'ramp' | 'random';
  /** 变化步长（random_walk/ramp 有效） */
  step?: number;
  /** 正弦周期（秒），仅 sine 有效，默认 60 */
  period?: number;
  /** 随机噪声比例（0-1），仅 sine/ramp 有效，默认 0 */
  noiseLevel?: number;
}

/** 枚举值参数 */
export interface EnumValueParams {
  /** 枚举值列表 */
  values: number[];
  /** 切换模式 */
  switchMode: 'sequential' | 'random';
  /** 顺序切换时每次切换的步数（默认 1） */
  stepSize?: number;
}

/** 布尔值参数 */
export interface BoolParams {
  /** 切换模式 */
  switchMode: 'toggle' | 'random' | 'fixed';
  /** 固定值（仅 fixed 模式），默认 false */
  fixedValue?: boolean;
  /** 翻转间隔（秒），仅 toggle 模式，默认 5 */
  toggleIntervalSec?: number;
  /** 为 true 的概率（0-1），仅 random 模式，默认 0.5 */
  trueProbability?: number;
}

/** 字符串参数 */
export interface StringParams {
  /** 字符串列表 */
  values: string[];
  /** 切换模式 */
  switchMode: 'sequential' | 'random' | 'fixed';
  /** 切换间隔（秒），仅 sequential/random 模式，默认 10 */
  switchIntervalSec?: number;
}

/** 故障注入参数 */
export interface FaultInjectionParams {
  /** 故障场景 */
  scenario: 'error' | 'timeout' | 'slow_rise' | 'spike';
  /** 错误概率（0-1），仅 error 场景 */
  errorRate?: number;
  /** 超时概率（0-1），仅 timeout 场景 */
  timeoutRate?: number;
  /** 上升速率（每秒），仅 slow_rise 场景 */
  riseRatePerSec?: number;
  /** 噪声水平（0-1），仅 slow_rise 场景 */
  noiseLevel?: number;
  /** 尖峰概率（0-1），仅 spike 场景 */
  spikeRate?: number;
  /** 尖峰幅度，仅 spike 场景 */
  spikeMagnitude?: number;
  /** 初始值 */
  initialValue?: number;
}
