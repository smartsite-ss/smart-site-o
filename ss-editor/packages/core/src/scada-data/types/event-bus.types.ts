// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type ScadaEventType =
  | 'tagValueChanged'
  | 'tagQualityChanged'
  | 'tagBatchUpdated'
  | 'alarmTriggered'
  | 'alarmAcknowledged'
  | 'alarmCleared'
  | 'alarmArchived'
  | 'alarmEscalated'
  | 'sourceConnected'
  | 'sourceDisconnected'
  | 'sourceError'
  | 'pipelineStarted'
  | 'pipelineCompleted'
  | 'pipelineError'
  | 'simulationStarted'
  | 'simulationPaused'
  | 'simulationStopped'
  | 'simulationStepChanged'
  | 'trendUpdated'
  | 'protocolAdapterRegistered'
  | 'protocolAdapterUnregistered'
  | 'protocolConnected'
  | 'protocolConnectionError'
  | 'protocolDisconnected'
  | 'protocolSubscriptionCreated'
  | 'protocolSubscriptionRemoved'
  | 'protocolDataWritten';

export interface ScadaEvent {
  type: ScadaEventType;
  timestamp: number;
  payload: unknown;
  sourceId?: string;
}

export interface EventRecord extends ScadaEvent {
  id: string;
}

export interface EventListener {
  eventType: ScadaEventType;
  callback: (event: ScadaEvent) => void;
  options?: {
    once?: boolean;
    priority?: number;
  };
}

export interface EventBusConfig {
  maxHistory: number;
  debugMode: boolean;
}