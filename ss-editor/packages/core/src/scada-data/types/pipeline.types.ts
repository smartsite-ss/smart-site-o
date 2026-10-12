// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { QualityCode } from './quality.types';

export type FilterType =
  | 'fieldExtract'
  | 'typeConvert'
  | 'scaleTransform'
  | 'deadband'
  | 'format'
  | 'custom'

export interface FilterConfigBase {
  enabled: boolean
}

export interface FieldExtractConfig extends FilterConfigBase {
  jsonPath: string
}

export interface TypeConvertConfig extends FilterConfigBase {
  targetType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date'
}

export interface ScaleTransformConfig extends FilterConfigBase {
  scale: number
  offset: number
}

export interface DeadbandConfig extends FilterConfigBase {
  threshold: number
}

export interface FormatConfig extends FilterConfigBase {
  precision: number
  formatType: 'decimal' | 'scientific' | 'hex' | 'binary' | 'percentage'
}

export interface CustomConfig extends FilterConfigBase {
  script: string
}

export type FilterConfig =
  | FieldExtractConfig
  | TypeConvertConfig
  | ScaleTransformConfig
  | DeadbandConfig
  | FormatConfig
  | CustomConfig

export interface DataFilter {
  id: string
  name: string
  type: FilterType
  config: FilterConfig
  enabled: boolean
  order: number
}

export interface FilterExecutionResult {
  filterId: string
  input: unknown
  output: unknown
  duration: number
  success: boolean
  error?: string
}

export interface PipelineResult {
  input: unknown
  output: unknown
  success: boolean
  error?: string
  filters: FilterExecutionResult[]
}

export type PipelineErrorStrategy = 'skip' | 'stop' | 'defaultValue'

export interface PipelineErrorConfig {
  strategy: PipelineErrorStrategy
  defaultValue?: unknown
}

export type DataActionType = 'setProperty' | 'setStyle' | 'setAnimation' | 'triggerAction'

export interface DataActionSetProperty {
  type: 'setProperty'
  target: string
  value: unknown
}

export interface DataActionSetStyle {
  type: 'setStyle'
  target: string
  value: unknown
}

export interface DataActionSetAnimation {
  type: 'setAnimation'
  target: string
  value: unknown
}

export interface DataActionTriggerAction {
  type: 'triggerAction'
  target: string
  value: unknown
}

export type DataAction =
  | DataActionSetProperty
  | DataActionSetStyle
  | DataActionSetAnimation
  | DataActionTriggerAction

/**
 * 数据管道告警事件（简化版）。
 *
 * 与 alarm.types.ts 的 AlarmRecord（完整告警记录）不同：
 * - 本接口用于 DataDriverEngine 数据管道输出，仅包含驱动脚本触发的告警基本信息
 * - alarm.types.ts 的 AlarmRecord 用于告警系统完整记录，包含 definitionId/state/escalationLevel 等
 *
 * 两者不合并以避免数据管道依赖告警系统的完整字段定义。
 */
export interface AlarmRecord {
  id: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: number
  acknowledged: boolean
}

export interface DataInputPayload {
  source: string
  value: unknown
  actions: DataAction[]
  alarm?: AlarmRecord
  quality?: QualityCode
  pipelineLog?: PipelineResult
}