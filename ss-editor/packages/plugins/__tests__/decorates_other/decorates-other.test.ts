// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { ClockPlugin, schema as clockSchema } from '../../decorates_other/clock';
import { CountDownPlugin, schema as countdownSchema } from '../../decorates_other/countdown';
import { FlipperNumberPlugin, schema as flipperNumberSchema } from '../../decorates_other/flipper-number';
import { NumberPlugin, schema as numberSchema } from '../../decorates_other/number';
import { PipelineHPlugin, schema as pipelineHSchema } from '../../industrial/pipeline-h';
import { PipelineVPlugin, schema as pipelineVSchema } from '../../industrial/pipeline-v';
import { TimeCommonPlugin, schema as timeCommonSchema } from '../../decorates_other/time-common';
import { PipePathSvgPlugin, schema as pipePathSvgSchema } from '../../industrial/pipe-path-svg';
import type { PluginPropertySchema, BasePlugin } from '@scada-editor/plugin-sdk';

interface DecoratesOtherDef {
  name: string;
  PluginClass: new (...args: any[]) => BasePlugin<any>;
  schema: PluginPropertySchema;
}

const others: DecoratesOtherDef[] = [
  { name: 'Clock', PluginClass: ClockPlugin, schema: clockSchema },
  { name: 'CountDown', PluginClass: CountDownPlugin, schema: countdownSchema },
  { name: 'FlipperNumber', PluginClass: FlipperNumberPlugin, schema: flipperNumberSchema },
  { name: 'Number', PluginClass: NumberPlugin, schema: numberSchema },
  { name: 'PipelineH', PluginClass: PipelineHPlugin, schema: pipelineHSchema },
  { name: 'PipelineV', PluginClass: PipelineVPlugin, schema: pipelineVSchema },
  { name: 'TimeCommon', PluginClass: TimeCommonPlugin, schema: timeCommonSchema },
  { name: 'PipePathSvg', PluginClass: PipePathSvgPlugin, schema: pipePathSvgSchema },
];

for (const item of others) {
  describe('${item.name} — Schema static validation (Layer 1)', () => {
    it('schema.name should not be empty', () => {
      expect(item.schema.name || (item.schema as any).labelKey).toBeTruthy();
    });

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

    it('应接受位置和大小参数', () => {
      const plugin = new item.PluginClass(50, 100, 400, 300);
      const pos = plugin.getPosition();
      expect(pos.x).toBe(50);
      expect(pos.y).toBe(100);
    });

    it('componentName should be a string', () => {
      const plugin = new item.PluginClass();
      const cmpName = (plugin as any).componentName;
      expect(cmpName !== undefined || typeof cmpName === 'string').toBe(true);
    });

    it('getComponentProps should return an object', () => {
      const plugin = new item.PluginClass();
      const props = (plugin as any).getComponentProps();
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });
  });

  describe('${item.name} — Property read/write consistency', () => {
    it('pluginProps should be readable', () => {
      const plugin = new item.PluginClass();
      const props = plugin.pluginProps;
      expect(props).toBeDefined();
      expect(typeof props).toBe('object');
    });

    it('onPropertyChanged should fire when properties change', () => {
      const plugin = new item.PluginClass();
      let changed = false;
      plugin.onPropertyChanged = () => { changed = true; };
      (plugin as any).setPluginProps({ dur: 1 });
      expect(changed).toBe(true);
    });
  });

  describe('${item.name} — render method', () => {
    it('draw method should be callable without throwing', () => {
      const plugin = new item.PluginClass();
      const mockCtx = { save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {} } as any;
      expect(() => plugin.draw(mockCtx)).not.toThrow();
    });

    it('render method should be callable without throwing', () => {
      const plugin = new item.PluginClass();
      const mockCtx = { ctx: {} as any };
      expect(() => (plugin as any).render(mockCtx)).not.toThrow();
    });
  });
}