// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { BasePlugin } from '../src/base/BasePlugin';
import { DrawContext } from '../src/types/DrawContext';

class TestPlugin extends BasePlugin<{ label: string; value: number }> {
  renderCalls: DrawContext[] = [];

  render(dc: DrawContext): void {
    this.renderCalls.push(dc);
  }
}

describe('BasePlugin', () => {
  describe('constructor', () => {
    it('should initialize with type', () => {
      const p = new TestPlugin('test-plugin');
      expect(p.type).toBe('test-plugin');
    });

    it('should set default position and size', () => {
      const p = new TestPlugin('test');
      expect(p.getPosition()).toEqual({ x: 0, y: 0 });
      expect(p.getSize()).toEqual({ width: 100, height: 100 });
    });

    it('should accept custom position and size', () => {
      const p = new TestPlugin('test', 10, 20, 200, 300);
      expect(p.getPosition()).toEqual({ x: 10, y: 20 });
      expect(p.getSize()).toEqual({ width: 200, height: 300 });
    });
  });

  describe('props management', () => {
    it('should set and get default props', () => {
      const p = new TestPlugin('test');
      p.setDefaultProps({ label: 'hello', value: 42 });
      expect(p.pluginProps.label).toBe('hello');
      expect(p.pluginProps.value).toBe(42);
    });

    it('should update props partially', () => {
      const p = new TestPlugin('test');
      p.setDefaultProps({ label: 'hello', value: 42 });
      (p as any).setPluginProps({ label: 'world' });
      expect(p.pluginProps.label).toBe('world');
      expect(p.pluginProps.value).toBe(42);
    });

    it('should return readonly copy of props', () => {
      const p = new TestPlugin('test');
      p.setDefaultProps({ label: 'hello', value: 42 });
      const props = p.pluginProps;
      expect(props.label).toBe('hello');
    });
  });

  describe('position', () => {
    it('should get and set position', () => {
      const p = new TestPlugin('test');
      p.setPosition(50, 60);
      expect(p.getPosition()).toEqual({ x: 50, y: 60 });
    });

    it('should update geometry', () => {
      const p = new TestPlugin('test');
      p.setPosition(10, 20);
      p.setSize(200, 300);
      expect(p.getPosition()).toEqual({ x: 10, y: 20 });
      expect(p.getSize()).toEqual({ width: 200, height: 300 });
    });
  });

  describe('size', () => {
    it('should get and set size', () => {
      const p = new TestPlugin('test');
      p.setSize(250, 350);
      expect(p.getSize()).toEqual({ width: 250, height: 350 });
    });
  });

  describe('getId', () => {
    it('should return type as id', () => {
      const p = new TestPlugin('my-id');
      expect(p.type).toBe('my-id');
    });
  });

  describe('toJSON', () => {
    it('should serialize plugin to JSON', () => {
      const p = new TestPlugin('test', 10, 20, 200, 300);
      p.setDefaultProps({ label: 'hello', value: 42 });
      const json = p.toJSON();
      expect(json.type).toBe('test');
      expect(json.config.geometry.x).toBe(10);
      expect(json.config.geometry.y).toBe(20);
      expect(json.config.geometry.width).toBe(200);
      expect(json.config.geometry.height).toBe(300);
      expect(json.config.customProps.label).toBe('hello');
      expect(json.config.customProps.value).toBe(42);
    });
  });

  describe('fromJSON', () => {
    it('should deserialize from JSON', () => {
      const p = new TestPlugin('test');
      p.setDefaultProps({ label: '', value: 0 });
      p.fromJSON({
        type: 'test',
        config: {
          geometry: { x: 30, y: 40, width: 500, height: 600 },
          customProps: { label: 'restored', value: 99 },
        },
      });
      expect(p.getPosition()).toEqual({ x: 30, y: 40 });
      expect(p.getSize()).toEqual({ width: 500, height: 600 });
      expect(p.pluginProps.label).toBe('restored');
      expect(p.pluginProps.value).toBe(99);
    });

    it('should reset to defaults for missing JSON fields', () => {
      const p = new TestPlugin('test', 5, 5, 100, 100);
      p.setDefaultProps({ label: '', value: 0 });
      p.fromJSON({ config: {} });
      expect(p.getPosition()).toEqual({ x: 0, y: 0 });
    });
  });

  describe('lifecycle callbacks', () => {
    it('should call lifecycle hooks (default no-ops)', () => {
      const p = new TestPlugin('test');
      expect(() => p.onMounted()).not.toThrow();
      expect(() => p.onUnmounted()).not.toThrow();
      expect(() => p.onPropertyChanged({})).not.toThrow();
      expect(() => p.onThemeChanged('blue-light')).not.toThrow();
    });
  });
});