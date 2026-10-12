// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventType,
  DataPointChangedEvent,
  DeviceStatusChangedEvent,
  AlarmTriggeredEvent,
  AlarmAcknowledgedEvent,
  ConfigChangedEvent,
  ProcessingErrorEvent,
  HealthEvent,
} from './event-bus.types';
export declare class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly eventEmitter;
  private readonly logger;
  private readonly listeners;
  constructor(eventEmitter: EventEmitter2);
  onModuleInit(): void;
  onModuleDestroy(): void;
  emit<T extends EventType>(eventType: T, payload: any): void;
  emitDataPointChanged(event: DataPointChangedEvent): void;
  emitDeviceStatusChanged(event: DeviceStatusChangedEvent): void;
  emitAlarmTriggered(event: AlarmTriggeredEvent): void;
  emitAlarmAcknowledged(event: AlarmAcknowledgedEvent): void;
  emitConfigChanged(event: ConfigChangedEvent): void;
  emitProcessingError(event: ProcessingErrorEvent): void;
  emitHealthDegraded(event: HealthEvent): void;
  emitHealthRecovered(event: HealthEvent): void;
  on<T extends EventType>(eventType: T, handler: (payload: any) => void): void;
  once<T extends EventType>(eventType: T, handler: (payload: any) => void): void;
  off<T extends EventType>(eventType: T, handler?: (payload: any) => void): void;
  removeAllListeners(eventType?: string): void;
  getListenerCount(eventType?: string): number;
}
