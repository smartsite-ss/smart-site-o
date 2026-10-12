// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ScadaEventType, ScadaEvent, EventRecord, EventListener, EventBusConfig } from '../types/event-bus.types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CONFIG: EventBusConfig = {
  maxHistory: 100,
  debugMode: false,
};

export class EventBus {
  private _listeners: Map<ScadaEventType, EventListener[]> = new Map();
  private _history: EventRecord[] = [];
  private _config: EventBusConfig;

  constructor(config?: Partial<EventBusConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  on(eventType: ScadaEventType, callback: (event: ScadaEvent) => void, options?: EventListener['options']): () => void {
    const listener: EventListener = { eventType, callback, options };
    const listeners = this._listeners.get(eventType) || [];
    listeners.push(listener);
    if (options?.priority !== undefined) {
      listeners.sort((a, b) => (b.options?.priority ?? 0) - (a.options?.priority ?? 0));
    }
    this._listeners.set(eventType, listeners);

    return () => this.off(eventType, callback);
  }

  off(eventType: ScadaEventType, callback?: (event: ScadaEvent) => void): void {
    if (!callback) {
      this._listeners.delete(eventType);
      return;
    }
    const listeners = this._listeners.get(eventType);
    if (!listeners) return;
    const idx = listeners.findIndex((l) => l.callback === callback);
    if (idx >= 0) listeners.splice(idx, 1);
    if (listeners.length === 0) this._listeners.delete(eventType);
  }

  emit(eventType: ScadaEventType, payload: unknown, sourceId?: string): void {
    const event: ScadaEvent = {
      type: eventType,
      timestamp: Date.now(),
      payload,
      sourceId,
    };

    this._addToHistory(event);

    if (this._config.debugMode) {
      console.debug(`[EventBus] emit ${eventType}`, payload);
    }

    const listeners = this._listeners.get(eventType);
    if (!listeners) return;

    for (const listener of [...listeners]) {
      try {
        listener.callback(event);
      } catch (err) {
        console.error(`[EventBus] Error in listener for ${eventType}:`, err);
      }
      if (listener.options?.once) {
        this.off(eventType, listener.callback);
      }
    }
  }

  getHistory(eventType?: ScadaEventType): EventRecord[] {
    if (eventType) {
      return this._history.filter((r) => r.type === eventType);
    }
    return [...this._history];
  }

  clearHistory(): void {
    this._history = [];
  }

  private _addToHistory(event: ScadaEvent): void {
    const record: EventRecord = {
      ...event,
      id: uuidv4(),
    };
    this._history.push(record);
    if (this._history.length > this._config.maxHistory) {
      this._history = this._history.slice(-this._config.maxHistory);
    }
  }
}