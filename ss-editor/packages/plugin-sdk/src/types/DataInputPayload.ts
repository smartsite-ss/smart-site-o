// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { QualityCode } from './QualityCode';

export type DataActionType = 'setProperty' | 'setStyle' | 'setAnimation' | 'triggerAction';

export interface DataActionSetProperty {
  type: 'setProperty';
  target: string;
  value: unknown;
}

export interface DataActionSetStyle {
  type: 'setStyle';
  target: string;
  value: unknown;
}

export interface DataActionSetAnimation {
  type: 'setAnimation';
  target: string;
  value: unknown;
}

export interface DataActionTriggerAction {
  type: 'triggerAction';
  target: string;
  value: unknown;
}

export type DataAction =
  | DataActionSetProperty
  | DataActionSetStyle
  | DataActionSetAnimation
  | DataActionTriggerAction;

export interface AlarmRecord {
  id: string;
  message: string;
  severity: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface PipelineResult {
  input: unknown;
  output: unknown;
  success: boolean;
  error?: string;
  filters: unknown[];
}

export interface DataInputPayload {
  source: string;
  value: unknown;
  actions: DataAction[];
  alarm?: AlarmRecord;
  quality?: QualityCode;
  pipelineLog?: PipelineResult;
}