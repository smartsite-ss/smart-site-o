// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { MockDataSourceConfig } from '../types/mock.types';
import { SinWaveGenerator } from './generators/SinWaveGenerator';
import { RandomWalkGenerator } from './generators/RandomWalkGenerator';
import { PulseGenerator } from './generators/PulseGenerator';
import { RampGenerator } from './generators/RampGenerator';
import { NoiseGenerator } from './generators/NoiseGenerator';
import { IDataGenerator } from './generators/IDataGenerator';

interface EventBusLike {
  emit(eventType: string, payload: unknown, sourceId?: string): void;
}

export class MockEngine {
  private _config: MockDataSourceConfig | null = null;
  private _running = false;
  private _timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private _generators: Record<string, IDataGenerator> = {
    sinWave: new SinWaveGenerator(),
    randomWalk: new RandomWalkGenerator(),
    pulse: new PulseGenerator(),
    ramp: new RampGenerator(),
    noise: new NoiseGenerator(),
  };
  private _lastValues: Map<string, number> = new Map();
  private _eventBus: EventBusLike;

  constructor(eventBus: EventBusLike) { this._eventBus = eventBus; }

  configure(config: MockDataSourceConfig): void { this._config = config; }

  start(): void {
    if (this._running || !this._config) return;
    this._running = true;

    if (this._config.mode === 'deviceTag' && this._config.deviceTagMock) {
      const cfg = this._config.deviceTagMock;
      const generator = this._generators[cfg.generatorType];
      if (generator) {
        const interval = cfg.updateInterval ?? 1000;
        generator.reset();
        this._timers.set(cfg.tagId, setInterval(() => {
          const lastVal = this._lastValues.get(cfg.tagId) ?? cfg.minValue ?? 0;
          const value = generator.next(lastVal, cfg.generatorParams as any);
          this._lastValues.set(cfg.tagId, value);
          this._eventBus.emit('tagValueChanged', { tagId: cfg.tagId, value, quality: 'good', sourceId: 'mock-device' });
        }, interval));
      }
    }

    if (this._config.mode === 'websocket' && this._config.wsMock) {
      const cfg = this._config.wsMock;
      if (cfg.sendInterval && cfg.sendInterval > 0) {
        this._timers.set('ws-mock', setInterval(() => {
          const payload = cfg.payloadTemplate ? JSON.parse(JSON.stringify(cfg.payloadTemplate)) : {};
          this._eventBus.emit('tagValueChanged', { tagId: 'ws-data', value: payload, quality: 'good', sourceId: 'mock-ws' });
        }, cfg.sendInterval));
      }
    }
  }

  stop(): void {
    this._running = false;
    for (const [, timer] of this._timers) { clearInterval(timer); }
    this._timers.clear();
  }

  isRunning(): boolean { return this._running; }
  getLastValues(): Map<string, number> { return new Map(this._lastValues); }
  destroy(): void { this.stop(); }
}