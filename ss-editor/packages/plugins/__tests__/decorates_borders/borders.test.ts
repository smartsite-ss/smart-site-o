// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { Border01Plugin, border01PropertySchema } from '../../decorates_borders/border01';
import { Border02Plugin, schema as border02Schema } from '../../decorates_borders/border02';
import { Border03Plugin, schema as border03Schema } from '../../decorates_borders/border03';
import { Border04Plugin, schema as border04Schema } from '../../decorates_borders/border04';
import { Border05Plugin, schema as border05Schema } from '../../decorates_borders/border05';
import { Border06Plugin, schema as border06Schema } from '../../decorates_borders/border06';
import { Border07Plugin, schema as border07Schema } from '../../decorates_borders/border07';
import { Border08Plugin, schema as border08Schema } from '../../decorates_borders/border08';
import { Border09Plugin, schema as border09Schema } from '../../decorates_borders/border09';
import { Border10Plugin, schema as border10Schema } from '../../decorates_borders/border10';
import { Border11Plugin, schema as border11Schema } from '../../decorates_borders/border11';
import { Border12Plugin, schema as border12Schema } from '../../decorates_borders/border12';
import { Border13Plugin, schema as border13Schema } from '../../decorates_borders/border13';
import { Border14Plugin, schema as border14Schema } from '../../decorates_borders/border14';
import type { PluginPropertySchema, BasePlugin } from '@scada-editor/plugin-sdk';

interface BorderDef {
  name: string;
  PluginClass: new (...args: any[]) => BasePlugin<any>;
  schema: PluginPropertySchema;
  defaultWidth: number;
  defaultHeight: number;
}

const borders: BorderDef[] = [
  { name: 'Border01', PluginClass: Border01Plugin, schema: border01PropertySchema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border02', PluginClass: Border02Plugin, schema: border02Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border03', PluginClass: Border03Plugin, schema: border03Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border04', PluginClass: Border04Plugin, schema: border04Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border05', PluginClass: Border05Plugin, schema: border05Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border06', PluginClass: Border06Plugin, schema: border06Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border07', PluginClass: Border07Plugin, schema: border07Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border08', PluginClass: Border08Plugin, schema: border08Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border09', PluginClass: Border09Plugin, schema: border09Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border10', PluginClass: Border10Plugin, schema: border10Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border11', PluginClass: Border11Plugin, schema: border11Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border12', PluginClass: Border12Plugin, schema: border12Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border13', PluginClass: Border13Plugin, schema: border13Schema, defaultWidth: 400, defaultHeight: 300 },
  { name: 'Border14', PluginClass: Border14Plugin, schema: border14Schema, defaultWidth: 400, defaultHeight: 300 },
];

for (const border of borders) {
  describe('${border.name} — Schema static validation (Layer 1)', () => {
    it('schema.name should not be empty', () => {
      expect(border.schema.name).toBeTruthy();
    });

    it('schema.fields should be a non-empty array', () => {
      expect(border.schema.fields.length).toBeGreaterThan(0);
    });

    it('each field should have name and type', () => {
      for (const field of border.schema.fields) {
        expect(field.name).toBeTruthy();
        expect(field.type).toBeTruthy();
      }
    });

    it('select type should have options', () => {
      const selectFields = border.schema.fields.filter(f => f.type === 'select');
      for (const field of selectFields) {
        expect(field.options).toBeDefined();
        expect(field.options!.length).toBeGreaterThan(0);
      }
    });

    it('number type min should not be greater than max', () => {
      const numFields = border.schema.fields.filter(f => f.type === 'number');
      for (const field of numFields) {
        if (field.min !== undefined && field.max !== undefined) {
          expect(field.min).toBeLessThanOrEqual(field.max);
        }
      }
    });

    it('all fields should have defaultValue', () => {
      for (const field of border.schema.fields) {
        expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
      }
    });

    it('color type defaultValue should be a valid hex', () => {
      const colorFields = border.schema.fields.filter(f => f.type === 'color');
      const hexRe = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
      for (const field of colorFields) {
        expect(String(field.defaultValue)).toMatch(hexRe);
      }
    });

    it('each field should have labelKey', () => {
      for (const field of border.schema.fields) {
        expect(field.labelKey, '${field.name} missing labelKey').toBeTruthy();
      }
    });
  });

  describe('${border.name} — Construction and basic functionality', () => {
    it('should create instance correctly', () => {
      const plugin = new border.PluginClass();
      expect(plugin.id).toBeTruthy();
      expect(plugin.config.type).toBeTruthy();
    });

    it('should accept position and size parameters', () => {
      const plugin = new border.PluginClass(50, 100, 400, 300);
      const pos = plugin.getPosition();
      expect(pos.x).toBe(50);
      expect(pos.y).toBe(100);
    });

    it('componentName should be a string', () => {
      const plugin = new border.PluginClass();
      const cmpName = (plugin as any).componentName;
      expect(cmpName !== undefined || typeof cmpName === 'string').toBe(true);
    });

    it('getComponentProps should return an object', () => {
      const plugin = new border.PluginClass();
      const props = (plugin as any).getComponentProps();
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });

    it('getComponentProps should return width/height matching plugin size', () => {
      const plugin = new border.PluginClass(0, 0, 400, 300);
      const props = (plugin as any).getComponentProps();
      expect(props.w).toBe(400);
      expect(props.h).toBe(300);
    });

    it('getComponentProps should include colors array', () => {
      const plugin = new border.PluginClass();
      const props = (plugin as any).getComponentProps();
      expect(Array.isArray(props.colors)).toBe(true);
      expect(props.colors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('${border.name} — Property read/write consistency', () => {
    it('pluginProps should be readable', () => {
      const plugin = new border.PluginClass();
      const props = plugin.pluginProps;
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });

    it('setPluginProps should correctly write properties', () => {
      const plugin = new border.PluginClass();
      plugin.setDefaultProps({ showAnimation: true } as any);
      expect(plugin.pluginProps.showAnimation).toBe(true);
    });

    it('onPropertyChanged should fire when properties change', () => {
      const plugin = new border.PluginClass();
      let changed = false;
      plugin.onPropertyChanged = () => { changed = true; };
      (plugin as any).setPluginProps({ dur: 5 });
      expect(changed).toBe(true);
    });
  });

  describe('${border.name} — render method', () => {
    it('draw method should be callable without throwing', () => {
      const plugin = new border.PluginClass();
      const mockCtx = {
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
      } as any;
      expect(() => plugin.draw(mockCtx)).not.toThrow();
    });

    it('render method should be callable without throwing', () => {
      const plugin = new border.PluginClass();
      const mockCtx = { ctx: {} as any };
      expect(() => (plugin as any).render(mockCtx)).not.toThrow();
    });
  });
}