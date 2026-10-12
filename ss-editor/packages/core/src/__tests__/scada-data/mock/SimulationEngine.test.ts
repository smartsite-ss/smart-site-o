// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SimulationEngine } from '../../../scada-data/mock/SimulationEngine';
import type { SimulationScenario, SimulationStep as _SimulationStep } from '../../../scada-data/types/simulation.types';

interface EventBusLike {
  emit(eventType: string, payload: unknown, sourceId?: string): void;
}

function createMockEventBus(): EventBusLike {
  return {
    emit: vi.fn(),
  };
}

function makeScenario(overrides: Partial<SimulationScenario> = {}): SimulationScenario {
  return {
    id: 'scenario-1',
    name: 'Test Scenario',
    description: 'A test scenario',
    steps: [
      { id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 'tag-1', value: 42 } },
      { id: 'step-2', action: 'setTagValue', delay: 200, params: { tagId: 'tag-1', value: 84 } },
      { id: 'step-3', action: 'triggerAlarm', delay: 300, params: { alarmId: 'alarm-1', tagId: 'tag-1', value: 100, level: 'warning', message: 'Test alarm' } },
    ],
    loop: false,
    speed: 1,
    status: 'idle' as const,
    ...overrides,
  };
}

describe('SimulationEngine', () => {
  let eventBus: EventBusLike;
  let engine: SimulationEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = createMockEventBus();
    engine = new SimulationEngine(eventBus);
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  // ==================== registerScenario ====================
  describe('registerScenario', () => {
    it('TC-SIM-001: should register a scenario', () => {
      const scenario = makeScenario();
      engine.registerScenario(scenario);
      const scenarios = engine.getScenarios();
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].id).toBe('scenario-1');
      expect(scenarios[0].status).toBe('idle');
    });

    it('TC-SIM-002: should register multiple scenarios', () => {
      engine.registerScenario(makeScenario({ id: 's1' }));
      engine.registerScenario(makeScenario({ id: 's2' }));
      expect(engine.getScenarios()).toHaveLength(2);
    });
  });

  // ==================== removeScenario ====================
  describe('removeScenario', () => {
    it('TC-SIM-010: should remove a scenario', () => {
      const scenario = makeScenario();
      engine.registerScenario(scenario);
      engine.removeScenario('scenario-1');
      expect(engine.getScenarios()).toHaveLength(0);
    });

    it('TC-SIM-011: should stop active scenario when removed', () => {
      const scenario = makeScenario({ steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } }] });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      engine.removeScenario('scenario-1');
      expect(engine.getActiveScenario()).toBeNull();
    });
  });

  // ==================== getScenarios ====================
  describe('getScenarios', () => {
    it('TC-SIM-020: should return all scenarios', () => {
      engine.registerScenario(makeScenario({ id: 's1', name: 'A' }));
      engine.registerScenario(makeScenario({ id: 's2', name: 'B' }));
      const scenarios = engine.getScenarios();
      expect(scenarios).toHaveLength(2);
    });
  });

  // ==================== getActiveScenario ====================
  describe('getActiveScenario', () => {
    it('TC-SIM-030: should return null when no active scenario', () => {
      expect(engine.getActiveScenario()).toBeNull();
    });
  });

  // ==================== getStatus ====================
  describe('getStatus', () => {
    it('TC-SIM-040: should return initial status', () => {
      const status = engine.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.isPaused).toBe(false);
      expect(status.currentStep).toBe(0);
      expect(status.activeScenarioId).toBeNull();
    });
  });

  // ==================== start ====================
  describe('start', () => {
    it('TC-SIM-050: should start a scenario', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 'tag-1', value: 42 } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      // Check status before timer fires - should be running
      const status = engine.getStatus();
      expect(status.isRunning).toBe(true);
      vi.advanceTimersByTime(100);
    });

    it('TC-SIM-051: should throw for non-existent scenario', async () => {
      await expect(engine.start('non-existent')).rejects.toThrow('Scenario not found');
    });

    it('TC-SIM-052: should emit simulationStarted event', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 'tag-1', value: 42 } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'simulationStarted',
        expect.objectContaining({ scenarioId: 'scenario-1' }),
      );
      vi.advanceTimersByTime(100);
    });

    it('TC-SIM-053: should execute setTagValue step', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 'tag-1', value: 42, quality: 'good' } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      const calls = (eventBus.emit as any).mock.calls;
      const tagCalls = calls.filter((c: any[]) => c[0] === 'tagValueChanged');
      expect(tagCalls.length).toBeGreaterThan(0);
      expect(tagCalls[0][1]).toMatchObject({
        tagId: 'tag-1',
        value: 42,
      });
    });

    it('TC-SIM-054: should execute triggerAlarm step', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'triggerAlarm', delay: 100, params: { alarmId: 'alarm-1', tagId: 'tag-1', value: 100, level: 'critical', message: 'Over limit' } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      const calls = (eventBus.emit as any).mock.calls;
      const alarmCalls = calls.filter((c: any[]) => c[0] === 'alarmTriggered');
      expect(alarmCalls.length).toBeGreaterThan(0);
    });

    it('TC-SIM-055: should execute acknowledgeAlarm step', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'acknowledgeAlarm', delay: 100, params: { alarmId: 'alarm-1' } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      const calls = (eventBus.emit as any).mock.calls;
      const ackCalls = calls.filter((c: any[]) => c[0] === 'alarmAcknowledged');
      expect(ackCalls.length).toBeGreaterThan(0);
    });

    it('TC-SIM-056: should execute executeScript step', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'executeScript', delay: 100, params: { script: 'var x = 1;' } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      // Should not throw
    });

    it('TC-SIM-057: should stop previous scenario when starting new one', async () => {
      const s1 = makeScenario({
        id: 's1',
        steps: [
          { id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } },
          { id: 'step-2', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 2 } },
        ],
      });
      const s2 = makeScenario({
        id: 's2',
        steps: [
          { id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't2', value: 2 } },
          { id: 'step-2', action: 'setTagValue', delay: 100, params: { tagId: 't2', value: 3 } },
        ],
      });
      engine.registerScenario(s1);
      engine.registerScenario(s2);
      engine.start('s1');
      engine.start('s2');
      const status = engine.getStatus();
      expect(status.activeScenarioId).toBe('s2');
      vi.advanceTimersByTime(300);
    });
  });

  // ==================== pause / resume ====================
  describe('pause / resume', () => {
    it('TC-SIM-060: should pause simulation', async () => {
      const scenario = makeScenario({
        steps: [
          { id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } },
          { id: 'step-2', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 2 } },
        ],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(50);
      engine.pause();
      expect(engine.getStatus().isPaused).toBe(true);
      vi.advanceTimersByTime(200);
      const calls = (eventBus.emit as any).mock.calls;
      const pausedCalls = calls.filter((c: any[]) => c[0] === 'simulationPaused');
      expect(pausedCalls.length).toBeGreaterThan(0);
    });

    it('TC-SIM-061: should resume simulation', async () => {
      const scenario = makeScenario({
        steps: [
          { id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } },
          { id: 'step-2', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 2 } },
        ],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(50);
      engine.pause();
      engine.resume();
      expect(engine.getStatus().isPaused).toBe(false);
      vi.advanceTimersByTime(200);
    });

    it('TC-SIM-062: should not pause if not running', () => {
      engine.pause();
      expect(engine.getStatus().isPaused).toBe(false);
    });

    it('TC-SIM-063: should not resume if not paused', () => {
      engine.resume();
      expect(engine.getStatus().isPaused).toBe(false);
    });
  });

  // ==================== stop ====================
  describe('stop', () => {
    it('TC-SIM-070: should stop simulation', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(50);
      engine.stop();
      expect(engine.getStatus().isRunning).toBe(false);
      expect(engine.getActiveScenario()).toBeNull();
    });

    it('TC-SIM-071: should emit simulationStopped event', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      engine.stop();
      const calls = (eventBus.emit as any).mock.calls;
      const stoppedCalls = calls.filter((c: any[]) => c[0] === 'simulationStopped');
      expect(stoppedCalls.length).toBeGreaterThan(0);
    });
  });

  // ==================== setSpeed ====================
  describe('setSpeed', () => {
    it('TC-SIM-080: should set simulation speed', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      engine.setSpeed(2);
      const activeScenario = engine.getActiveScenario();
      expect(activeScenario?.speed).toBe(2);
    });
  });

  // ==================== loop ====================
  describe('loop', () => {
    it('TC-SIM-090: should loop scenario when loop is true', async () => {
      const scenario = makeScenario({
        loop: true,
        steps: [
          { id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } },
          { id: 'step-2', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 2 } },
        ],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      // Run through multiple loops (each loop is 200ms)
      vi.advanceTimersByTime(250);
      // Should still be running after loop
      expect(engine.getStatus().isRunning).toBe(true);
      engine.stop();
    });
  });

  // ==================== destroy ====================
  describe('destroy', () => {
    it('TC-SIM-100: should clear all state', () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100, params: { tagId: 't1', value: 1 } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      engine.destroy();
      expect(engine.getScenarios()).toHaveLength(0);
      expect(engine.getActiveScenario()).toBeNull();
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-SIM-110: should handle scenario with no steps', async () => {
      const scenario = makeScenario({ steps: [] });
      engine.registerScenario(scenario);
      await engine.start('scenario-1');
      expect(engine.getStatus().isRunning).toBe(false);
    });

    it('TC-SIM-111: should handle executeScript with error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'executeScript', delay: 100, params: { script: 'throw new Error("fail");' } }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('TC-SIM-112: should handle step with no params', async () => {
      const scenario = makeScenario({
        steps: [{ id: 'step-1', action: 'setTagValue', delay: 100 }],
      });
      engine.registerScenario(scenario);
      engine.start('scenario-1');
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      // Should not throw
    });
  });
});