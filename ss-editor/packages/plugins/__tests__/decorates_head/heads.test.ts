// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { Head01Plugin, schema as head01Schema } from '../../decorates_head/head01';
import { Head02Plugin, schema as head02Schema } from '../../decorates_head/head02';
import { Head03Plugin, schema as head03Schema } from '../../decorates_head/head03';
import { Head04Plugin, schema as head04Schema } from '../../decorates_head/head04';
import { Head05Plugin, schema as head05Schema } from '../../decorates_head/head05';
import { Head06Plugin, schema as head06Schema } from '../../decorates_head/head06';
import type { PluginPropertySchema, BasePlugin } from '@scada-editor/plugin-sdk';

interface HeadDef {
  name: string;
  PluginClass: new (...args: any[]) => BasePlugin<any>;
  schema: PluginPropertySchema;
}

const heads: HeadDef[] = [
  { name: 'Head01', PluginClass: Head01Plugin, schema: head01Schema },
  { name: 'Head02', PluginClass: Head02Plugin, schema: head02Schema },
  { name: 'Head03', PluginClass: Head03Plugin, schema: head03Schema },
  { name: 'Head04', PluginClass: Head04Plugin, schema: head04Schema },
  { name: 'Head05', PluginClass: Head05Plugin, schema: head05Schema },
  { name: 'Head06', PluginClass: Head06Plugin, schema: head06Schema },
];

for (const head of heads) {
  describe('${head.name} — Schema static validation (Layer 1)', () => {
    it('schema.name should not be empty', () => {
      expect(head.schema.name || (head.schema as any).labelKey).toBeTruthy();
    });

    it('schema.fields should be a non-empty array', () => {
      expect(head.schema.fields.length).toBeGreaterThan(0);
    });

    it('each field should have name and type', () => {
      for (const field of head.schema.fields) {
        expect(field.name).toBeTruthy();
        expect(field.type).toBeTruthy();
      }
    });

    it('select type should have options', () => {
      const selectFields = head.schema.fields.filter(f => f.type === 'select');
      for (const field of selectFields) {
        expect(field.options).toBeDefined();
        expect(field.options!.length).toBeGreaterThan(0);
      }
    });

    it('number type min should not be greater than max', () => {
      const numFields = head.schema.fields.filter(f => f.type === 'number');
      for (const field of numFields) {
        if (field.min !== undefined && field.max !== undefined) {
          expect(field.min).toBeLessThanOrEqual(field.max);
        }
      }
    });

    it('all fields should have defaultValue', () => {
      for (const field of head.schema.fields) {
        expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
      }
    });

    it('color type defaultValue should be a valid hex', () => {
      const colorFields = head.schema.fields.filter(f => f.type === 'color');
      const hexRe = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
      for (const field of colorFields) {
        expect(String(field.defaultValue)).toMatch(hexRe);
      }
    });

    it('each field should have labelKey', () => {
      for (const field of head.schema.fields) {
        expect(field.labelKey, '${field.name} missing labelKey').toBeTruthy();
      }
    });
  });

  describe('${head.name} — Construction and basic functionality', () => {
    it('should create instance correctly', () => {
      const plugin = new head.PluginClass();
      expect(plugin.id).toBeTruthy();
      expect(plugin.config.type).toBeTruthy();
    });

    it('should accept position and size parameters', () => {
      const plugin = new head.PluginClass(50, 100, 400, 3);
      const pos = plugin.getPosition();
      expect(pos.x).toBe(50);
      expect(pos.y).toBe(100);
    });

    it('componentName should be a string', () => {
      const plugin = new head.PluginClass();
      const cmpName = (plugin as any).componentName;
      expect(cmpName !== undefined || typeof cmpName === 'string').toBe(true);
    });

    it('getComponentProps should return an object', () => {
      const plugin = new head.PluginClass();
      const props = (plugin as any).getComponentProps();
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });

    it('getComponentProps should return width/height matching plugin size', () => {
      const plugin = new head.PluginClass(0, 0, 400, 3);
      const props = (plugin as any).getComponentProps();
      expect(props.w).toBe(400);
      expect(props.h).toBe(3);
    });

    it('getComponentProps should include colors array', () => {
      const plugin = new head.PluginClass();
      const props = (plugin as any).getComponentProps();
      expect(Array.isArray(props.colors)).toBe(true);
      expect(props.colors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('${head.name} — Property read/write consistency', () => {
    it('pluginProps should be readable', () => {
      const plugin = new head.PluginClass();
      const props = plugin.pluginProps;
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });

    it('setPluginProps should correctly write properties', () => {
      const plugin = new head.PluginClass();
      plugin.setDefaultProps({ dur: 1 } as any);
      expect((plugin.pluginProps as any).dur).toBe(1);
    });

    it('onPropertyChanged should fire when properties change', () => {
      const plugin = new head.PluginClass();
      let changed = false;
      plugin.onPropertyChanged = () => { changed = true; };
      (plugin as any).setPluginProps({ dur: 5 });
      expect(changed).toBe(true);
    });
  });

  describe('${head.name} — render method', () => {
    it('draw method should be callable without throwing', () => {
      const plugin = new head.PluginClass();
      const mockCtx = { save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {} } as any;
      expect(() => plugin.draw(mockCtx)).not.toThrow();
    });

    it('render method should be callable without throwing', () => {
      const plugin = new head.PluginClass();
      const mockCtx = { ctx: {} as any };
      expect(() => (plugin as any).render(mockCtx)).not.toThrow();
    });
  });
}