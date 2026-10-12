// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type AlarmLevel = 'info' | 'warning' | 'critical' | 'emergency';

export type AlarmState = 'unacknowledged' | 'acknowledged' | 'recovered' | 'archived';

export interface AlarmRecord {
  id: string;
  definitionId: string;
  level: AlarmLevel;
  state: AlarmState;
  value: number;
  threshold: number;
  message: string;
  triggeredAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  recoveredAt?: number;
  sourceId: string;
  tagId: string;
  escalationLevel: number;
}

export interface AlarmRule {
  definitionId: string;
  tagId: string;
  condition: string;
  level: AlarmLevel;
  message: string;
  debounceMs: number;
  autoRecover: boolean;
}

export interface SuppressionRule {
  sourceAlarmId: string;
  suppressedAlarmId: string;
  duration: number;
}

export interface EscalationRule {
  afterDuration: number;
  newLevel: AlarmLevel;
  notifyUsers: string[];
}

export interface AlarmNotifier {
  type: 'popup' | 'sound' | 'email' | 'api';
  config: Record<string, unknown>;
}

export interface AlarmSummary {
  total: number;
  byLevel: Record<AlarmLevel, number>;
  byState: Record<AlarmState, number>;
  activeCount: number;
}