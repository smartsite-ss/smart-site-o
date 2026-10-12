// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type EventType =
  | 'data_point_changed'
  | 'device_status_changed'
  | 'device:statusChange'
  | 'device:retry'
  | 'alarm_triggered'
  | 'alarm_acknowledged'
  | 'alarm.escalated'
  | 'alarm.notification.sent'
  | 'alarm.sound.trigger'
  | 'alarm.popup.show'
  | 'alarm.triggered'
  | 'alarm.cleared'
  | 'tag.change'
  | 'device.status'
  | 'system.startup'
  | 'protocol.config.updated'
  | 'config_changed'
  | 'processing_error'
  | 'health_degraded'
  | 'health_recovered';
export interface DataPointChangedEvent {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: number;
  timestamp: number;
  quality: string;
}
export interface DeviceStatusChangedEvent {
  deviceId: string;
  projectId: string;
  status: 'online' | 'offline' | 'connecting' | 'error' | 'degraded';
  previousStatus?: string;
  errorMessage?: string;
  timestamp: number;
}
export interface AlarmTriggeredEvent {
  alarmId: string;
  tagId: string;
  deviceId: string;
  projectId: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
  value?: number;
  limit?: number;
}
export interface AlarmAcknowledgedEvent {
  alarmId: string;
  acknowledgedBy: string;
  acknowledgedAt: number;
}
export interface ConfigChangedEvent {
  configType: 'tag' | 'device' | 'alarm' | 'system';
  targetId: string;
  changes: Record<string, any>;
  timestamp: number;
}
export interface ProcessingErrorEvent {
  step: string;
  error: Error;
  timestamp: number;
  context?: Record<string, any>;
}
export interface HealthEvent {
  checks: HealthCheck[];
  timestamp: number;
}
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  error?: string;
  latency?: number;
  details?: Record<string, any>;
}
export interface EventPayloadMap {
  data_point_changed: DataPointChangedEvent;
  device_status_changed: DeviceStatusChangedEvent;
  'device:statusChange': any;
  'device:retry': any;
  alarm_triggered: AlarmTriggeredEvent;
  alarm_acknowledged: AlarmAcknowledgedEvent;
  'alarm.escalated': any;
  'alarm.notification.sent': any;
  'alarm.sound.trigger': any;
  'alarm.popup.show': any;
  'alarm.triggered': any;
  'alarm.cleared': any;
  'tag.change': any;
  'device.status': any;
  'system.startup': any;
  'protocol.config.updated': any;
  config_changed: ConfigChangedEvent;
  processing_error: ProcessingErrorEvent;
  health_degraded: HealthEvent;
  health_recovered: HealthEvent;
}
export type EventPayload<T extends EventType> = EventPayloadMap[T];
