// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimerManager } from '../../../runtime/managers/TimerManager';

describe('TimerManager', () => {
  let timerManager: TimerManager;

  beforeEach(() => {
    vi.useFakeTimers();
    timerManager = new TimerManager();
  });

  afterEach(() => {
    timerManager.destroy();
    vi.useRealTimers();
  });

  describe('addTimer', () => {
    it('should add a new timer and return config with auto-generated id', () => {
      const config = timerManager.addTimer({
        name: 'Test Timer',
        interval: 1000,
        script: 'utils.log("hello")',
        type: 'interval',
        enabled: true,
      });
      expect(config).toBeTruthy();
      expect(config.id).toBeTruthy();
      expect(typeof config.id).toBe('string');
      expect(config.name).toBe('Test Timer');
      expect(config.interval).toBe(1000);
      expect(config.executeCount).toBe(0);
    });

    it('should store timer in manager', () => {
      const config = timerManager.addTimer({
        name: 'Stored Timer',
        interval: 500,
        script: '',
        type: 'interval',
        enabled: true,
      });
      const retrieved = timerManager.getTimer(config.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.name).toBe('Stored Timer');
    });
  });

  describe('removeTimer', () => {
    it('should remove an existing timer', () => {
      const config = timerManager.addTimer({
        name: 'Removable',
        interval: 1000,
        script: '',
        type: 'interval',
        enabled: true,
      });
      timerManager.removeTimer(config.id);
      expect(timerManager.getTimer(config.id)).toBeNull();
    });

    it('should not throw for non-existent timer', () => {
      expect(() => timerManager.removeTimer('nonexistent')).not.toThrow();
    });
  });

  describe('getAllTimers', () => {
    it('should return empty array initially', () => {
      expect(timerManager.getAllTimers()).toEqual([]);
    });

    it('should return all timers', () => {
      timerManager.addTimer({ name: 'T1', interval: 100, script: '', type: 'interval', enabled: true });
      timerManager.addTimer({ name: 'T2', interval: 200, script: '', type: 'interval', enabled: true });
      expect(timerManager.getAllTimers().length).toBe(2);
    });
  });

  describe('getTimer', () => {
    it('should return null for unknown timer', () => {
      expect(timerManager.getTimer('unknown')).toBeNull();
    });
  });

  describe('updateTimer', () => {
    it('should update timer config', () => {
      const config = timerManager.addTimer({
        name: 'Updatable',
        interval: 1000,
        script: '',
        type: 'interval',
        enabled: false,
      });
      timerManager.updateTimer(config.id, { name: 'Updated', interval: 500 });
      const updated = timerManager.getTimer(config.id);
      expect(updated?.name).toBe('Updated');
      expect(updated?.interval).toBe(500);
    });
  });

  describe('enableTimer / disableTimer', () => {
    it('should enable a disabled timer', () => {
      const config = timerManager.addTimer({
        name: 'Toggle',
        interval: 100,
        script: '',
        type: 'interval',
        enabled: false,
      });
      timerManager.enableTimer(config.id);
      expect(timerManager.getTimer(config.id)?.enabled).toBe(true);
    });

    it('should disable an enabled timer', () => {
      const config = timerManager.addTimer({
        name: 'Toggle',
        interval: 100,
        script: '',
        type: 'interval',
        enabled: true,
      });
      timerManager.disableTimer(config.id);
      expect(timerManager.getTimer(config.id)?.enabled).toBe(false);
    });
  });

  describe('startTimer / stopTimer', () => {
    it('should start an enabled timer', () => {
      const config = timerManager.addTimer({
        name: 'Startable',
        interval: 100,
        script: 'utils.log("running")',
        type: 'interval',
        enabled: true,
      });
      timerManager.startTimer(config.id);
      expect(timerManager.isTimerRunning(config.id)).toBe(true);
    });

    it('should not start a disabled timer', () => {
      const config = timerManager.addTimer({
        name: 'Disabled',
        interval: 100,
        script: '',
        type: 'interval',
        enabled: false,
      });
      timerManager.startTimer(config.id);
      expect(timerManager.isTimerRunning(config.id)).toBe(false);
    });

    it('should stop a running timer', () => {
      const config = timerManager.addTimer({
        name: 'Stoppable',
        interval: 100,
        script: 'utils.log("running")',
        type: 'interval',
        enabled: true,
      });
      timerManager.startTimer(config.id);
      timerManager.stopTimer(config.id);
      expect(timerManager.isTimerRunning(config.id)).toBe(false);
    });
  });

  describe('startAllTimers / stopAllTimers', () => {
    it('should start all enabled timers', () => {
      const c1 = timerManager.addTimer({ name: 'A', interval: 100, script: '', type: 'interval', enabled: true });
      const c2 = timerManager.addTimer({ name: 'B', interval: 200, script: '', type: 'interval', enabled: false });
      timerManager.startAllTimers();
      expect(timerManager.isTimerRunning(c1.id)).toBe(true);
      expect(timerManager.isTimerRunning(c2.id)).toBe(false);
    });

    it('should stop all running timers', () => {
      const c1 = timerManager.addTimer({ name: 'A', interval: 100, script: 'utils.log("a")', type: 'interval', enabled: true });
      const c2 = timerManager.addTimer({ name: 'B', interval: 200, script: 'utils.log("b")', type: 'interval', enabled: true });
      timerManager.startAllTimers();
      timerManager.stopAllTimers();
      expect(timerManager.isTimerRunning(c1.id)).toBe(false);
      expect(timerManager.isTimerRunning(c2.id)).toBe(false);
    });
  });

  describe('executeTimer', () => {
    it('should execute timer script and return result', () => {
      const config = timerManager.addTimer({
        name: 'Exec',
        interval: 100,
        script: 'utils.log("test")',
        type: 'interval',
        enabled: true,
      });
      const result = timerManager.executeTimer(config);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should increment executeCount', () => {
      const config = timerManager.addTimer({
        name: 'Counter',
        interval: 100,
        script: 'utils.log("x")',
        type: 'interval',
        enabled: true,
      });
      timerManager.executeTimer(config);
      timerManager.executeTimer(config);
      expect(config.executeCount).toBe(2);
    });

    it('should record execution logs', () => {
      const config = timerManager.addTimer({
        name: 'Logger',
        interval: 100,
        script: 'utils.log("logged")',
        type: 'interval',
        enabled: true,
      });
      timerManager.executeTimer(config);
      const logs = timerManager.getExecutionLogs(config.id);
      expect(logs.length).toBe(1);
    });
  });

  describe('execution logs', () => {
    it('should clear logs for a timer', () => {
      const config = timerManager.addTimer({
        name: 'Clear',
        interval: 100,
        script: 'utils.log("x")',
        type: 'interval',
        enabled: true,
      });
      timerManager.executeTimer(config);
      timerManager.clearExecutionLogs(config.id);
      expect(timerManager.getExecutionLogs(config.id).length).toBe(0);
    });

    it('should clear all logs', () => {
      const c1 = timerManager.addTimer({ name: 'A', interval: 100, script: 'utils.log("a")', type: 'interval', enabled: true });
      const c2 = timerManager.addTimer({ name: 'B', interval: 100, script: 'utils.log("b")', type: 'interval', enabled: true });
      timerManager.executeTimer(c1);
      timerManager.executeTimer(c2);
      timerManager.clearExecutionLogs();
      expect(timerManager.getExecutionLogs(c1.id).length).toBe(0);
      expect(timerManager.getExecutionLogs(c2.id).length).toBe(0);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      timerManager.addTimer({ name: 'S1', interval: 100, script: '', type: 'interval', enabled: true });
      timerManager.addTimer({ name: 'S2', interval: 200, script: '', type: 'timeout', enabled: false });
      const json = timerManager.toJSON();
      expect(json.length).toBe(2);
    });

    it('should restore from JSON', () => {
      timerManager.addTimer({ name: 'S1', interval: 100, script: '', type: 'interval', enabled: true });
      const json = timerManager.toJSON();

      const newManager = new TimerManager();
      newManager.fromJSON(json);
      expect(newManager.getAllTimers().length).toBe(1);
      newManager.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      const c = timerManager.addTimer({ name: 'Clean', interval: 100, script: 'utils.log("x")', type: 'interval', enabled: true });
      timerManager.startTimer(c.id);
      timerManager.destroy();
      expect(timerManager.getAllTimers().length).toBe(0);
      expect(timerManager.isTimerRunning(c.id)).toBe(false);
    });
  });
});