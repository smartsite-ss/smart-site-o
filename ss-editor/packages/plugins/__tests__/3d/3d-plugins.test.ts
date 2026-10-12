// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { ThreeCubePlugin, threeCubePropertySchema } from '../../3d/three-cube';
import { ThreeGaugePlugin, threeGaugePropertySchema } from '../../3d/three-gauge';
import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';

interface Three3dDef {
  name: string;
  PluginClass: new (...args: any[]) => any;
  schema: PluginPropertySchema;
  defaultWidth: number;
  defaultHeight: number;
}

const plugins3d: Three3dDef[] = [
  { name: 'ThreeCube', PluginClass: ThreeCubePlugin, schema: threeCubePropertySchema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'ThreeGauge', PluginClass: ThreeGaugePlugin, schema: threeGaugePropertySchema, defaultWidth: 400, defaultHeight: 400 },
];

for (const item of plugins3d) {
  describe('${item.name} — Schema static validation (Layer 1)', () => {
    it('schema.fields should be a non-empty array', () => {
      expect(item.schema.fields.length).toBeGreaterThan(0);
    });

    it('each field should have name and type', () => {
      for (const field of item.schema.fields) {
        expect(field.name).toBeTruthy();
        expect(field.type).toBeTruthy();
      }
    });

    it('select type should have options', () => {
      const selectFields = item.schema.fields.filter(f => f.type === 'select');
      for (const field of selectFields) {
        expect(field.options).toBeDefined();
        expect(field.options!.length).toBeGreaterThan(0);
      }
    });

    it('number type min should not be greater than max', () => {
      const numFields = item.schema.fields.filter(f => f.type === 'number');
      for (const field of numFields) {
        if (field.min !== undefined && field.max !== undefined) {
          expect(field.min).toBeLessThanOrEqual(field.max);
        }
      }
    });

    it('all fields should have defaultValue', () => {
      for (const field of item.schema.fields) {
        expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
      }
    });

    it('color type defaultValue should be a valid hex', () => {
      const colorFields = item.schema.fields.filter(f => f.type === 'color');
      const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
      for (const field of colorFields) {
        expect(String(field.defaultValue)).toMatch(hexRe);
      }
    });

    it('each field should have labelKey', () => {
      for (const field of item.schema.fields) {
        expect(field.labelKey, '${field.name} missing labelKey').toBeTruthy();
      }
    });
  });

  describe('${item.name} — Construction and basic functionality', () => {
    it('should create instance correctly', () => {
      const plugin = new item.PluginClass();
      expect(plugin.id).toBeTruthy();
      expect(plugin.config.type).toBeTruthy();
    });

    it('should accept position and size parameters', () => {
      const plugin = new item.PluginClass(50, 100, item.defaultWidth, item.defaultHeight);
      const pos = plugin.getPosition();
      expect(pos.x).toBe(50);
      expect(pos.y).toBe(100);
    });

    it('pluginProps should match schema default values', () => {
      const plugin = new item.PluginClass();
      const props = plugin.pluginProps;
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });

    it('getSize should return correct dimensions', () => {
      const plugin = new item.PluginClass(0, 0, item.defaultWidth, item.defaultHeight);
      const size = plugin.getSize();
      expect(size.width).toBe(item.defaultWidth);
      expect(size.height).toBe(item.defaultHeight);
    });
  });

  describe('${item.name} — Property read/write consistency', () => {
    it('setDefaultProps should write configuration', () => {
      const plugin = new item.PluginClass();
      const firstField = item.schema.fields[0];
      const testValue = firstField.type === 'boolean'
        ? !firstField.defaultValue
        : firstField.type === 'number'
          ? 999
          : 'test_value';

      plugin.setDefaultProps({ [firstField.name]: testValue } as any);
      expect((plugin.pluginProps as any)[firstField.name]).toBe(testValue);
    });

    it('onPropertyChanged should fire when properties change', () => {
      const plugin = new item.PluginClass();
      let changed = false;
      plugin.onPropertyChanged = () => { changed = true; };
      (plugin as any).setPluginProps({ cubeSize: 5 });
      expect(changed).toBe(true);
    });
  });

  describe('${item.name} — Method existence check', () => {
    it('loadScene method should exist', () => {
      const plugin = new item.PluginClass();
      expect(typeof plugin.loadScene).toBe('function');
    });

    it('animate method should exist', () => {
      const plugin = new item.PluginClass();
      expect(typeof plugin.animate).toBe('function');
    });

    it('draw method should exist', () => {
      const plugin = new item.PluginClass();
      expect(typeof plugin.draw).toBe('function');
    });

    it('draw method should be callable without throwing', () => {
      const plugin = new item.PluginClass();
      const mockCtx = {
        save: () => {},
        restore: () => {},
        translate: () => {},
      } as any;
      expect(() => plugin.draw(mockCtx)).not.toThrow();
    });
  });
}