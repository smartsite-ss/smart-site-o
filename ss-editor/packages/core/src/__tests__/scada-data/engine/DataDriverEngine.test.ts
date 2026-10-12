// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataDriverEngine, type DriverDefinition } from '../../../scada-data/engine/DataDriverEngine';
import { ScriptEngine } from '../../../scada-data/engine/ScriptEngine';

describe('DataDriverEngine', () => {
  let engine: DataDriverEngine;

  beforeEach(() => {
    const se = ScriptEngine.getInstance();
    se.destroy();
    engine = new DataDriverEngine();
  });

  // ==================== registerDriver ====================
  describe('registerDriver', () => {
    it('TC-DDE-001: should register a driver definition', () => {
      const def: DriverDefinition = {
        id: 'driver-1',
        name: 'Test Driver',
        script: 'return { value: value * 2 };',
        priority: 0,
        enabled: true,
      };
      engine.registerDriver(def);
      const drivers = engine.getDrivers();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('driver-1');
      expect(drivers[0].name).toBe('Test Driver');
    });

    it('TC-DDE-002: should register multiple drivers', () => {
      const def1: DriverDefinition = {
        id: 'driver-1', name: 'D1', script: 'return {};', priority: 0, enabled: true,
      };
      const def2: DriverDefinition = {
        id: 'driver-2', name: 'D2', script: 'return {};', priority: 0, enabled: true,
      };
      engine.registerDriver(def1);
      engine.registerDriver(def2);
      expect(engine.getDrivers()).toHaveLength(2);
    });

    it('TC-DDE-003: should sort drivers by priority', () => {
      const def1: DriverDefinition = {
        id: 'driver-1', name: 'D1', script: 'return {};', priority: 10, enabled: true,
      };
      const def2: DriverDefinition = {
        id: 'driver-2', name: 'D2', script: 'return {};', priority: 1, enabled: true,
      };
      engine.registerDriver(def1);
      engine.registerDriver(def2);
      const drivers = engine.getDrivers();
      expect(drivers[0].id).toBe('driver-2');
      expect(drivers[1].id).toBe('driver-1');
    });
  });

  // ==================== removeDriver ====================
  describe('removeDriver', () => {
    it('TC-DDE-010: should remove driver by id', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'D1', script: 'return {};', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      engine.removeDriver('driver-1');
      expect(engine.getDrivers()).toHaveLength(0);
    });

    it('TC-DDE-011: should be idempotent for non-existent driver', () => {
      expect(() => engine.removeDriver('non-existent')).not.toThrow();
    });
  });

  // ==================== getDrivers ====================
  describe('getDrivers', () => {
    it('TC-DDE-020: should return shallow copy of drivers', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'D1', script: 'return {};', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const drivers = engine.getDrivers();
      drivers.pop();
      expect(engine.getDrivers()).toHaveLength(1);
    });
  });

  // ==================== setDriverEnabled ====================
  describe('setDriverEnabled', () => {
    it('TC-DDE-030: should enable/disable driver', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'D1', script: 'return {};', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      engine.setDriverEnabled('driver-1', false);
      const drivers = engine.getDrivers();
      expect(drivers[0].enabled).toBe(false);
    });

    it('TC-DDE-031: disabled driver should not execute', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'D1', script: 'return { value: value * 2 };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      engine.setDriverEnabled('driver-1', false);
      const result = engine.execute(100, {});
      expect(result.value).toBe(100);
    });
  });

  // ==================== execute ====================
  describe('execute', () => {
    it('TC-DDE-040: should execute script and transform value', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Multiply', script: 'return { value: value * 2 };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(50, {});
      expect(result.value).toBe(100);
      expect(result.source).toBe('driver-engine');
    });

    it('TC-DDE-041: should execute script and return actions', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'SetProps', script: 'return { properties: { x: value } };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(42, {});
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('setProperty');
      expect(result.actions[0].target).toBe('x');
      expect(result.actions[0].value).toBe(42);
    });

    it('TC-DDE-042: should execute script with style actions', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'SetStyle', script: 'return { styles: { color: "#ff0000" } };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(0, {});
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('setStyle');
      expect(result.actions[0].target).toBe('color');
    });

    it('TC-DDE-043: should execute script with animation action', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Anim', script: 'return { animation: "play" };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(0, {});
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('setAnimation');
    });

    it('TC-DDE-044: should not add action for animation "none"', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Anim', script: 'return { animation: "none" };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(0, {});
      expect(result.actions).toHaveLength(0);
    });

    it('TC-DDE-045: should execute script with triggerAction', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Trigger', script: 'return { triggerAction: { target: "btn", payload: 1 } };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(0, {});
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('triggerAction');
    });

    it('TC-DDE-046: should execute script with quality', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Q', script: 'return { quality: "bad" };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(0, {});
      expect(result.quality).toBe('bad');
    });

    it('TC-DDE-047: should execute script with alarm', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Alarm', script: 'return { alarm: { level: "warning", message: "Test" } };', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(0, {});
      expect(result.alarm).toBeDefined();
      expect(result.alarm?.severity).toBe('warning');
      expect(result.alarm?.message).toBe('Test');
    });

    it('TC-DDE-048: should chain multiple drivers', () => {
      const def1: DriverDefinition = {
        id: 'd1', name: 'Double', script: 'return { value: value * 2 };', priority: 1, enabled: true,
      };
      const def2: DriverDefinition = {
        id: 'd2', name: 'Add10', script: 'return { value: value + 10 };', priority: 2, enabled: true,
      };
      engine.registerDriver(def1);
      engine.registerDriver(def2);
      const result = engine.execute(5, {});
      expect(result.value).toBe(20);
    });

    it('TC-DDE-049: should handle script execution error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Bad', script: 'throw new Error("fail");', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(0, {});
      expect(result.source).toBe('driver-engine');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('TC-DDE-050: should handle driver with no return value', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'Empty', script: '', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      const result = engine.execute(100, {});
      expect(result.value).toBe(100);
      expect(result.source).toBe('driver-engine');
    });
  });

  // ==================== clear ====================
  describe('clear', () => {
    it('TC-DDE-060: should clear all drivers', () => {
      const def: DriverDefinition = {
        id: 'driver-1', name: 'D1', script: 'return {};', priority: 0, enabled: true,
      };
      engine.registerDriver(def);
      engine.clear();
      expect(engine.getDrivers()).toHaveLength(0);
    });
  });

  // ==================== registerRuntimeDriver / executeRuntimeDriver ====================
  describe('runtime drivers', () => {
    it('TC-DDE-070: should register and execute runtime driver', async () => {
      engine.registerRuntimeDriver('graphic-1', 'api.setText("hello");', 0);
      const mockApi = {
        setText: vi.fn(), setBackground: vi.fn(), setVisible: vi.fn(),
        setBorder: vi.fn(), setRotation: vi.fn(), setOpacity: vi.fn(),
        setPosition: vi.fn(), showGraphic: vi.fn(), hideGraphic: vi.fn(),
        setGraphicProps: vi.fn(), triggerAlarm: vi.fn(), clearAlarm: vi.fn(),
        getActiveAlarms: vi.fn(() => []), httpGet: vi.fn(), httpPost: vi.fn(),
        readTag: vi.fn(() => null), writeTag: vi.fn(),
        setTimeout: vi.fn(() => 1), setInterval: vi.fn(() => 1),
        clearTimeout: vi.fn(), clearInterval: vi.fn(),
        clamp: vi.fn((v, min, max) => Math.max(min, Math.min(max, v))),
        mapRange: vi.fn((v, fMin, fMax, tMin, tMax) => tMin + ((v - fMin) / (fMax - fMin)) * (tMax - tMin)),
        colorForValue: vi.fn(() => '#000000'),
        formatNumber: vi.fn((v, d) => v.toFixed(d)),
      };
      const result = await engine.executeRuntimeDriver(
        'graphic-1',
        {} as any,
        {},
        { graphicId: 'g1', graphicName: 'G1', graphicType: 'text', pageId: 'p1' },
        mockApi,
      );
      expect(result).not.toBeNull();
      expect(mockApi.setText).toHaveBeenCalledWith('hello');
    });

    it('TC-DDE-071: should return null for disabled runtime driver', async () => {
      engine.registerRuntimeDriver('graphic-1', 'return 1;', 0);
      engine.setRuntimeDriverEnabled('graphic-1', false);
      const result = await engine.executeRuntimeDriver(
        'graphic-1',
        {} as any, {}, {} as any, {} as any,
      );
      expect(result).toBeNull();
    });

    it('TC-DDE-072: should return null for non-existent runtime driver', async () => {
      const result = await engine.executeRuntimeDriver(
        'non-existent',
        {} as any, {}, {} as any, {} as any,
      );
      expect(result).toBeNull();
    });

    it('TC-DDE-073: should remove runtime driver', () => {
      engine.registerRuntimeDriver('graphic-1', 'return 1;', 0);
      engine.removeRuntimeDriver('graphic-1');
      // Should not throw
      expect(() => engine.removeRuntimeDriver('graphic-1')).not.toThrow();
    });

    it('TC-DDE-074: should throttle runtime driver execution', async () => {
      engine.registerRuntimeDriver('graphic-1', 'api.setText("throttled");', 0);
      const mockApi = {
        setText: vi.fn(), setBackground: vi.fn(), setVisible: vi.fn(),
        setBorder: vi.fn(), setRotation: vi.fn(), setOpacity: vi.fn(),
        setPosition: vi.fn(), showGraphic: vi.fn(), hideGraphic: vi.fn(),
        setGraphicProps: vi.fn(), triggerAlarm: vi.fn(), clearAlarm: vi.fn(),
        getActiveAlarms: vi.fn(() => []), httpGet: vi.fn(), httpPost: vi.fn(),
        readTag: vi.fn(() => null), writeTag: vi.fn(),
        setTimeout: vi.fn(() => 1), setInterval: vi.fn(() => 1),
        clearTimeout: vi.fn(), clearInterval: vi.fn(),
        clamp: vi.fn((v, min, max) => Math.max(min, Math.min(max, v))),
        mapRange: vi.fn((v, fMin, fMax, tMin, tMax) => tMin + ((v - fMin) / (fMax - fMin)) * (tMax - tMin)),
        colorForValue: vi.fn(() => '#000000'),
        formatNumber: vi.fn((v, d) => v.toFixed(d)),
      };
      await engine.executeRuntimeDriver('graphic-1', {} as any, {}, {} as any, mockApi);
      const result2 = await engine.executeRuntimeDriver('graphic-1', {} as any, {}, {} as any, mockApi);
      expect(result2).toBeNull();
    });
  });
});