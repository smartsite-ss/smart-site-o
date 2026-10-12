// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TaskScheduler } from '../../scada-data/engine/TaskScheduler';
import { ScriptEngine } from '../../scada-data/engine/ScriptEngine';

describe('TaskScheduler', () => { let scheduler: TaskScheduler; beforeEach(() => { vi.useFakeTimers(); /* 重建单例 */ const engine = ScriptEngine.getInstance(); engine.destroy(); /* 注册一个测试脚本 */ engine.registerScript({ id:'script-1',
      name: 'Test Script',
      script: 'api.log("info", "executed");',
      type: 'client',
      mode: 'timer',
      enabled: true,
      maxRetries: 0,
      timeout: 5000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executeCount: 0,
    });
    scheduler = new TaskScheduler();
  });

  afterEach(() => {
    scheduler.destroy();
    vi.useRealTimers();
  });

  describe('schedule', () => {
    it('should schedule a task with cron expression', () => {
      const task = scheduler.schedule('script-1', '* * * * *');
      expect(task).toBeDefined();
      expect(task.scriptId).toBe('script-1');
      expect(task.cron).toBe('* * * * *');
      expect(task.enabled).toBe(true);
      expect(task.runCount).toBe(0);
    });

    it('should schedule a task with params', () => {
      const task = scheduler.schedule('script-1', '* * * * *', { key: 'value' });
      expect(task.params).toEqual({ key: 'value' });
    });

    it('should generate unique taskId', () => {
      const task1 = scheduler.schedule('script-1', '* * * * *'); /* 推进时间以确保不同的 taskId */ vi.advanceTimersByTime(1); const task2 = scheduler.schedule('script-1', '* * * * *');
      expect(task1.taskId).not.toBe(task2.taskId);
    });
  });

  describe('getAll', () => {
    it('should return all scheduled tasks', () => {
      scheduler.schedule('script-1', '* * * * *');
      vi.advanceTimersByTime(1);
      scheduler.schedule('script-1', '*/5 * * * *');
      expect(scheduler.getAll()).toHaveLength(2);
    });
  });

  describe('getByScriptId', () => {
    it('should return tasks by script id', () => {
      scheduler.schedule('script-1', '* * * * *');
      vi.advanceTimersByTime(1);
      scheduler.schedule('script-1', '*/5 * * * *');

      const engine = ScriptEngine.getInstance();
      engine.registerScript({
        id: 'script-2',
        name: 'Other Script',
        script: 'return 1;',
        type: 'client',
        mode: 'timer',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });
      vi.advanceTimersByTime(1);
      scheduler.schedule('script-2', '* * * * *');

      const tasks = scheduler.getByScriptId('script-1');
      expect(tasks).toHaveLength(2);
      tasks.forEach((t) => expect(t.scriptId).toBe('script-1'));
    });
  });

  describe('cancel', () => {
    it('should cancel a scheduled task', () => {
      const task = scheduler.schedule('script-1', '* * * * *');
      scheduler.cancel(task.taskId);
      expect(scheduler.getAll()).toHaveLength(0);
    });
  });

  describe('pause and resume', () => {
    it('should pause and resume a task', () => {
      const task = scheduler.schedule('script-1', '* * * * *');
      scheduler.pause(task.taskId);
      expect(scheduler.getAll()[0].enabled).toBe(false);

      scheduler.resume(task.taskId);
      expect(scheduler.getAll()[0].enabled).toBe(true);
    });
  });

  describe('getNextRunTime', () => {
    it('should return next minute for wildcard cron', () => {
      const fromDate = new Date('2026-06-02T10:30:00');
      const nextRun = TaskScheduler.getNextRunTime('* * * * *', fromDate);
      expect(nextRun).toBeGreaterThan(fromDate.getTime());
      expect(nextRun).toBe(fromDate.getTime() + 60000);
    });

    it('should handle specific minute', () => {
      const fromDate = new Date('2026-06-02T10:30:00');
      const nextRun = TaskScheduler.getNextRunTime('45 * * * *', fromDate);
      const nextDate = new Date(nextRun);
      expect(nextDate.getMinutes()).toBe(45);
    });

    it('should handle specific hour', () => {
      const fromDate = new Date('2026-06-02T10:30:00');
      const nextRun = TaskScheduler.getNextRunTime('0 14 * * *', fromDate);
      const nextDate = new Date(nextRun);
      expect(nextDate.getHours()).toBe(14);
      expect(nextDate.getMinutes()).toBe(0);
    });
  });

  describe('cron execution', () => {
    it('should execute script when cron triggers', () => {
      const task = scheduler.schedule('script-1', '* * * * *'); const initialRunCount = task.runCount; /* 推进 61 秒，触发定时器 */ vi.advanceTimersByTime(65000); const updatedTask = scheduler.getAll().find((t) => t.taskId === task.taskId); expect(updatedTask?.runCount).toBeGreaterThan(initialRunCount); }); }); describe('destroy', () => {
    it('should clear all tasks and timers', () => {
      scheduler.schedule('script-1', '* * * * *');
      scheduler.destroy();
      expect(scheduler.getAll()).toHaveLength(0);
    });
  });
});