// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExpressionTriggerManager } from '../../scada-data/engine/ExpressionTrigger';
import { ScriptEngine } from '../../scada-data/engine/ScriptEngine';

describe('ExpressionTriggerManager', () => { let triggerManager: ExpressionTriggerManager; beforeEach(() => { vi.useFakeTimers(); /* 重建引擎 */ const engine = ScriptEngine.getInstance(); engine.destroy(); /* 注册测试脚本 */ engine.registerScript({ id:'script-1',
      name: 'Test Script',
      script: 'api.log("info", "triggered");',
      type: 'client',
      mode: 'expression',
      enabled: true,
      maxRetries: 0,
      timeout: 5000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executeCount: 0,
    });
    triggerManager = new ExpressionTriggerManager();
  });

  afterEach(() => {
    triggerManager.destroy();
    vi.useRealTimers();
  });

  describe('register', () => {
    it('should register an expression trigger', () => {
      const trigger = triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 300,
        enabled: true,
      });
      expect(trigger).toBeDefined();
      expect(trigger.id).toBe('trigger-1');
      expect(trigger.scriptId).toBe('script-1');
      expect(trigger.expression).toBe('value > 80');
      expect(trigger.tagIds).toEqual(['tag1']);
    });

    it('should set initial timestamps to undefined', () => {
      const trigger = triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 300,
        enabled: true,
      });
      expect(trigger.lastEvaluatedAt).toBeUndefined();
      expect(trigger.lastTriggeredAt).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('should remove a registered trigger', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 300,
        enabled: true,
      });
      triggerManager.unregister('trigger-1');
      expect(triggerManager.getAll()).toHaveLength(0);
    });
  });

  describe('evaluate', () => {
    it('should evaluate trigger when tag matches', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 100,
        enabled: true,
      });

      triggerManager.evaluate('tag1', 85); /* 推进 150ms 触发防抖 */ vi.advanceTimersByTime(150); const triggers = triggerManager.getAll(); expect(triggers[0].lastEvaluatedAt).toBeDefined(); expect(triggers[0].lastTriggeredAt).toBeDefined(); }); it('should not trigger when expression is false', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 100,
        enabled: true,
      });

      triggerManager.evaluate('tag1', 50);

      vi.advanceTimersByTime(150);

      const triggers = triggerManager.getAll();
      expect(triggers[0].lastEvaluatedAt).toBeDefined();
      expect(triggers[0].lastTriggeredAt).toBeUndefined();
    });

    it('should not trigger when tagId does not match', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 100,
        enabled: true,
      });

      triggerManager.evaluate('tag2', 85);

      const triggers = triggerManager.getAll();
      expect(triggers[0].lastEvaluatedAt).toBeUndefined();
    });

    it('should not trigger when disabled', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 100,
        enabled: false,
      });

      triggerManager.evaluate('tag1', 85);

      vi.advanceTimersByTime(150);

      const triggers = triggerManager.getAll();
      expect(triggers[0].lastTriggeredAt).toBeUndefined();
    });

    it('should handle debounce correctly', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'], debounceMs: 500, enabled: true, }); /* 第一次触发 */ triggerManager.evaluate('tag1', 85); vi.advanceTimersByTime(300); /* 第二次触发（重置 debounce） */ triggerManager.evaluate('tag1', 90); vi.advanceTimersByTime(300); /* 还没到 debounce time */ const triggers = triggerManager.getAll(); expect(triggers[0].lastTriggeredAt).toBeUndefined(); /* 推进到 debounce 后 */ vi.advanceTimersByTime(250); expect(triggers[0].lastTriggeredAt).toBeDefined(); }); }); describe('getAll', () => {
    it('should return all triggers', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 300,
        enabled: true,
      });
      triggerManager.register({
        id: 'trigger-2',
        scriptId: 'script-1',
        expression: 'value < 20',
        tagIds: ['tag2'],
        debounceMs: 300,
        enabled: true,
      });
      expect(triggerManager.getAll()).toHaveLength(2);
    });
  });

  describe('destroy', () => {
    it('should clear all triggers', () => {
      triggerManager.register({
        id: 'trigger-1',
        scriptId: 'script-1',
        expression: 'value > 80',
        tagIds: ['tag1'],
        debounceMs: 300,
        enabled: true,
      });
      triggerManager.destroy();
      expect(triggerManager.getAll()).toHaveLength(0);
    });
  });
});