// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { PipeHPlugin, pipeHPropertySchema } from '../../industrial/pipe-h';

describe('PipeHPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(pipeHPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(pipeHPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of pipeHPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = pipeHPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = pipeHPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of pipeHPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = pipeHPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });

  it('each field should have labelKey', () => {
    for (const field of pipeHPropertySchema.fields) {
      expect(field.labelKey, '${field.name} 缺少 labelKey').toBeTruthy();
    }
  });
});

describe('PipeHPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new PipeHPlugin();
    expect(plugin.id).toBeTruthy();
    expect(plugin.config.type).toBe('pipe-h');
  });

  it('应接受位置和大小参数', () => {
    const plugin = new PipeHPlugin(50, 100, 200, 40);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
  });

  it('getSize 应返回正确尺寸', () => {
    const plugin = new PipeHPlugin(0, 0, 200, 40);
    const size = plugin.getSize();
    expect(size.width).toBe(200);
    expect(size.height).toBe(40);
  });

  it('default status should be stopped', () => {
    const plugin = new PipeHPlugin();
    expect(plugin.pluginProps.status).toBe('stopped');
  });
});

describe('PipeHPlugin — Property read/write consistency', () => {
  it('setPluginProps 应正确写入属性', () => {
    const plugin = new PipeHPlugin();
    (plugin as any).setPluginProps({ pipeColor: '#FF0000FF' });
    expect(plugin.pluginProps.pipeColor).toBe('#FF0000FF');
  });

  it('onPropertyChanged should fire when properties change', () => {
    const plugin = new PipeHPlugin();
    let changed = false;
    plugin.onPropertyChanged = () => { changed = true; };
    (plugin as any).setPluginProps({ status: 'flowing' });
    expect(changed).toBe(true);
  });

  it('切换 status 应正确更新', () => {
    const plugin = new PipeHPlugin();
    (plugin as any).setPluginProps({ status: 'blocked' });
    expect(plugin.pluginProps.status).toBe('blocked');
  });
});

describe('PipeHPlugin — render method', () => {
  it('draw 方法应可调用不抛错', () => {
    const plugin = new PipeHPlugin();
    const mockCtx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillStyle: '',
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      clip: () => {},
    } as any;
    expect(() => plugin.draw(mockCtx)).not.toThrow();
  });

  it('render method should be callable without throwing', () => {
    const plugin = new PipeHPlugin();
    const mockCtx = { ctx: {
      save: () => {},
      restore: () => {},
      fillStyle: '',
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      clip: () => {},
      translate: () => {},
    } as any };
    const dc = { ...mockCtx, bounds: { x: 0, y: 0, width: 200, height: 40 }, debug: false } as any;
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });
});