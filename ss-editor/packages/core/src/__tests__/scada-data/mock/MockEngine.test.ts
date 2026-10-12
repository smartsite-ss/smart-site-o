// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MockEngine } from '../../../scada-data/mock/MockEngine';
import type { MockDataSourceConfig } from '../../../scada-data/types/mock.types';

interface EventBusLike {
  emit(eventType: string, payload: unknown, sourceId?: string): void;
}

function createMockEventBus(): EventBusLike {
  return {
    emit: vi.fn(),
  };
}

function makeDeviceTagConfig(overrides: Partial<MockDataSourceConfig['deviceTagMock']> = {}): MockDataSourceConfig {
  return {
    mode: 'deviceTag',
    deviceTagMock: {
      tagId: 'tag-1',
      generatorType: 'sinWave',
      generatorParams: {
        amplitude: 10,
        period: 1000,
        phase: 0,
        offset: 0,
        step: 1,
        min: -100,
        max: 100,
        dutyCycle: 0.5,
        base: 0,
        noiseAmplitude: 0,
      },
      updateInterval: 1000,
      minValue: 0,
      maxValue: 100,
      ...overrides,
    },
  };
}

function makeWsConfig(overrides: Partial<MockDataSourceConfig['wsMock']> = {}): MockDataSourceConfig {
  return {
    mode: 'websocket',
    wsMock: {
      sendInterval: 1000,
      eventTypes: ['data'],
      payloadTemplate: { value: 42 },
      ...overrides,
    },
  };
}

describe('MockEngine', () => {
  let eventBus: EventBusLike;
  let engine: MockEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = createMockEventBus();
    engine = new MockEngine(eventBus);
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  // ==================== configure ====================
  describe('configure', () => {
    it('TC-MCK-001: should configure deviceTag mode', () => {
      const config = makeDeviceTagConfig();
      engine.configure(config);
      // Should not throw
      expect(() => engine.start()).not.toThrow();
    });

    it('TC-MCK-002: should configure websocket mode', () => {
      const config = makeWsConfig();
      engine.configure(config);
      expect(() => engine.start()).not.toThrow();
    });
  });

  // ==================== start ====================
  describe('start', () => {
    it('TC-MCK-010: should start deviceTag simulation', () => {
      const config = makeDeviceTagConfig();
      engine.configure(config);
      engine.start();
      expect(engine.isRunning()).toBe(true);
    });

    it('TC-MCK-011: should emit tagValueChanged events for deviceTag', () => {
      const config = makeDeviceTagConfig({ updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      expect(eventBus.emit).toHaveBeenCalled();
      const calls = (eventBus.emit as any).mock.calls;
      const tagValueCalls = calls.filter((c: any[]) => c[0] === 'tagValueChanged');
      expect(tagValueCalls.length).toBeGreaterThan(0);
      expect(tagValueCalls[0][1]).toMatchObject({
        tagId: 'tag-1',
        quality: 'good',
        sourceId: 'mock-device',
      });
    });

    it('TC-MCK-012: should start websocket simulation', () => {
      const config = makeWsConfig({ sendInterval: 100 });
      engine.configure(config);
      engine.start();
      expect(engine.isRunning()).toBe(true);
      vi.advanceTimersByTime(100);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('TC-MCK-013: should emit ws events with payload template', () => {
      const config = makeWsConfig({
        sendInterval: 100,
        payloadTemplate: { temp: 25, humidity: 60 },
      });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      const calls = (eventBus.emit as any).mock.calls;
      const wsCalls = calls.filter((c: any[]) => c[0] === 'tagValueChanged' && c[1].sourceId === 'mock-ws');
      expect(wsCalls.length).toBeGreaterThan(0);
      expect(wsCalls[0][1].value).toMatchObject({ temp: 25, humidity: 60 });
    });

    it('TC-MCK-014: should not start if already running', () => {
      const config = makeDeviceTagConfig();
      engine.configure(config);
      engine.start();
      engine.start();
      expect(engine.isRunning()).toBe(true);
    });

    it('TC-MCK-015: should not start if not configured', () => {
      engine.start();
      expect(engine.isRunning()).toBe(false);
    });
  });

  // ==================== stop ====================
  describe('stop', () => {
    it('TC-MCK-020: should stop simulation', () => {
      const config = makeDeviceTagConfig({ updateInterval: 100 });
      engine.configure(config);
      engine.start();
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('TC-MCK-021: should stop emitting events after stop', () => {
      const config = makeDeviceTagConfig({ updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      (eventBus.emit as any).mockClear();
      engine.stop();
      vi.advanceTimersByTime(500);
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  // ==================== isRunning ====================
  describe('isRunning', () => {
    it('TC-MCK-030: should return false initially', () => {
      expect(engine.isRunning()).toBe(false);
    });

    it('TC-MCK-031: should return true after start', () => {
      const config = makeDeviceTagConfig();
      engine.configure(config);
      engine.start();
      expect(engine.isRunning()).toBe(true);
    });
  });

  // ==================== getLastValues ====================
  describe('getLastValues', () => {
    it('TC-MCK-040: should return last values after generation', () => {
      const config = makeDeviceTagConfig({ updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      const values = engine.getLastValues();
      expect(values.has('tag-1')).toBe(true);
    });

    it('TC-MCK-041: should return empty map when no simulation', () => {
      const values = engine.getLastValues();
      expect(values.size).toBe(0);
    });
  });

  // ==================== destroy ====================
  describe('destroy', () => {
    it('TC-MCK-050: should stop and clean up', () => {
      const config = makeDeviceTagConfig({ updateInterval: 100 });
      engine.configure(config);
      engine.start();
      engine.destroy();
      expect(engine.isRunning()).toBe(false);
    });
  });

  // ==================== generator types ====================
  describe('generator types', () => {
    it('TC-MCK-060: should support sinWave generator', () => {
      const config = makeDeviceTagConfig({ generatorType: 'sinWave', updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      expect(engine.isRunning()).toBe(true);
      expect(engine.getLastValues().has('tag-1')).toBe(true);
    });

    it('TC-MCK-061: should support randomWalk generator', () => {
      const config = makeDeviceTagConfig({ generatorType: 'randomWalk', updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      expect(engine.getLastValues().has('tag-1')).toBe(true);
    });

    it('TC-MCK-062: should support pulse generator', () => {
      const config = makeDeviceTagConfig({ generatorType: 'pulse', updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      expect(engine.getLastValues().has('tag-1')).toBe(true);
    });

    it('TC-MCK-063: should support ramp generator', () => {
      const config = makeDeviceTagConfig({ generatorType: 'ramp', updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      expect(engine.getLastValues().has('tag-1')).toBe(true);
    });

    it('TC-MCK-064: should support noise generator', () => {
      const config = makeDeviceTagConfig({ generatorType: 'noise', updateInterval: 100 });
      engine.configure(config);
      engine.start();
      vi.advanceTimersByTime(100);
      expect(engine.getLastValues().has('tag-1')).toBe(true);
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-MCK-070: should handle multiple calls to start/stop', () => {
      const config = makeDeviceTagConfig({ updateInterval: 100 });
      engine.configure(config);
      engine.start();
      engine.stop();
      engine.start();
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('TC-MCK-071: should handle ws mock with sendInterval 0', () => {
      const config = makeWsConfig({ sendInterval: 0 });
      engine.configure(config);
      engine.start();
      // Should not start timer for 0 interval
      expect(engine.isRunning()).toBe(true);
    });
  });
});