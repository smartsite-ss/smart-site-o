// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptEngine } from '../../scada-data/engine/ScriptEngine';
import type { ScriptDefinition, ScriptContext } from '../../scada-data/types/script.types';

describe('ScriptEngine', () => {
  let engine: ScriptEngine;

  beforeEach(() => {
    // 重建单例
    engine = ScriptEngine.getInstance();
    engine.destroy();
    engine = ScriptEngine.getInstance();
  });

  describe('getInstance', () => {
    it('should return same instance', () => {
      const a = ScriptEngine.getInstance();
      const b = ScriptEngine.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('registerScript', () => {
    it('should register a script definition', () => {
      const def: ScriptDefinition = {
        id: 'script-1',
        name: 'Test Script',
        script: 'return api.log("info", "hello");',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      };
      engine.registerScript(def);
      expect(engine.getScript('script-1')).toEqual(def);
    });

    it('should list all registered scripts', () => {
      const def1: ScriptDefinition = {
        id: 'script-1',
        name: 'Script 1',
        script: 'return 1+1;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      };
      const def2: ScriptDefinition = {
        id: 'script-2',
        name: 'Script 2',
        script: 'return 2+2;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      };
      engine.registerScript(def1);
      engine.registerScript(def2);
      expect(engine.getAllScripts()).toHaveLength(2);
    });
  });

  describe('unregisterScript', () => {
    it('should remove a registered script', () => {
      const def: ScriptDefinition = {
        id: 'script-1',
        name: 'Test Script',
        script: 'return 1+1;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      };
      engine.registerScript(def);
      engine.unregisterScript('script-1');
      expect(engine.getScript('script-1')).toBeUndefined();
    });
  });

  describe('executeScript', () => {
    it('should execute simple script with return value', () => {
      const context: ScriptContext = {
        graphicId: 'g1',
        tagValues: {},
        triggerType: 'manual',
      };

      const result = engine.executeScript('return 42;', context);
      expect(result.success).toBe(true);
      expect(result.output).toBe(42);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should return error for invalid script', () => {
      const context: ScriptContext = {
        graphicId: 'g1',
        tagValues: {},
        triggerType: 'manual',
      };

      const result = engine.executeScript('invalid syntax {{', context);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide sandbox context and api', () => {
      const context: ScriptContext = {
        graphicId: 'g-test',
        tagValues: { tag1: 100 },
        triggerType: 'manual',
      };

      const script = `
        const val = api.readTag("tag1");
        return val;
      `;
      const result = engine.executeScript(script, context);
      expect(result.success).toBe(true);
      expect(result.output).toBe(100);
    });

    it('should allow built-in Math functions', () => {
      const context: ScriptContext = {
        graphicId: 'g1',
        tagValues: {},
        triggerType: 'manual',
      };

      const result = engine.executeScript('return Math.abs(-5);', context);
      expect(result.success).toBe(true);
      expect(result.output).toBe(5);
    });

    it('should allow JSON operations', () => {
      const context: ScriptContext = {
        graphicId: 'g1',
        tagValues: {},
        triggerType: 'manual',
      };

      const result = engine.executeScript('return JSON.parse("{\\"a\\":1}").a;', context);
      expect(result.success).toBe(true);
      expect(result.output).toBe(1);
    });

    it('should execute script with api.log', () => {
      const context: ScriptContext = {
        graphicId: 'g1',
        tagValues: {},
        triggerType: 'manual',
      };

      const result = engine.executeScript('api.log("info", "test"); return "ok";', context);
      expect(result.success).toBe(true);
      expect(result.output).toBe('ok');
    });

    it('should allow access to api.writeTag', () => {
      const context: ScriptContext = {
        graphicId: 'g1',
        tagValues: {},
        triggerType: 'manual',
      };

      const result = engine.executeScript('api.writeTag("tag1", 999); return true;', context);
      expect(result.success).toBe(true);
      expect(result.output).toBe(true);
    });
  });

  describe('executeAsync', () => {
    it('should execute registered script asynchronously', async () => {
      engine.registerScript({
        id: 'script-1',
        name: 'Async Script',
        script: 'return 84;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      const result = await engine.executeAsync('script-1', 'manual');
      expect(result.success).toBe(true);
      expect(result.output).toBe(84);
    });

    it('should return error for non-existent script', async () => {
      const result = await engine.executeAsync('non-existent', 'manual');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error for disabled script', async () => {
      engine.registerScript({
        id: 'script-1',
        name: 'Disabled',
        script: 'return 42;',
        type: 'client',
        mode: 'interaction',
        enabled: false,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      const result = await engine.executeAsync('script-1', 'manual');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should record execution history', async () => {
      engine.registerScript({
        id: 'script-1',
        name: 'History',
        script: 'return 123;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      await engine.executeAsync('script-1', 'manual');
      const history = engine.getExecutionHistory('script-1');
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('success');
    });
  });

  describe('testExecute', () => {
    it('should execute script without recording history', () => {
      const context: ScriptContext = {
        graphicId: 'g1',
        tagValues: {},
        triggerType: 'manual',
      };

      const result = engine.testExecute('return 42;', context);
      expect(result.success).toBe(true);
      expect(result.output).toBe(42);
    });
  });

  describe('validateScript', () => {
    it('should validate correct script', () => {
      const result = engine.validateScript('var x = 1; return x + 2;');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid script', () => {
      const result = engine.validateScript('{{{ invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate empty script', () => {
      const result = engine.validateScript('');
      expect(result.valid).toBe(true);
    });
  });

  describe('event binding', () => {
    it('should bind script to event', () => {
      engine.registerScript({
        id: 'script-1',
        name: 'Event Script',
        script: 'return api.log("info", "event");',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      const binding = engine.bindToEvent('script-1', 'tag.changed');
      expect(binding).toBeDefined();
      expect(binding.scriptId).toBe('script-1');
      expect(binding.eventFullName).toBe('tag.changed');
    });

    it('should return same binding for duplicate event', () => {
      engine.registerScript({
        id: 'script-1',
        name: 'Event Script',
        script: 'return api.log("info", "event");',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      const b1 = engine.bindToEvent('script-1', 'tag.changed');
      const b2 = engine.bindToEvent('script-1', 'tag.changed');
      expect(b1).toBe(b2);
    });

    it('should unbind from event', () => {
      engine.registerScript({
        id: 'script-1',
        name: 'Event Script',
        script: 'return api.log("info", "event");',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      engine.bindToEvent('script-1', 'tag.changed');
      engine.unbindFromEvent('script-1', 'tag.changed');
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('logs', () => {
    it('should record logs', async () => {
      engine.registerScript({
        id: 'script-1',
        name: 'Log Script',
        script: 'api.log("info", "hello"); return 1;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      await engine.executeAsync('script-1', 'manual');
      const logs = engine.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('destroy', () => {
    it('should clear all state on destroy', () => {
      engine.registerScript({
        id: 'script-1',
        name: 'Test',
        script: 'return 1;',
        type: 'client',
        mode: 'interaction',
        enabled: true,
        maxRetries: 0,
        timeout: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        executeCount: 0,
      });

      engine.destroy();
      expect(engine.getAllScripts()).toHaveLength(0);
      expect(engine.getLogs()).toHaveLength(0);
    });
  });
});