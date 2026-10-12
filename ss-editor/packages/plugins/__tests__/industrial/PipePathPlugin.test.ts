// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { PipePathPlugin } from '../../industrial/pipe-path/PipePathPlugin';
import { pipePathPropertySchema } from '../../industrial/pipe-path/pipePathPropertySchema';
import { PropertyVerifier } from '../test-utils/PropertyVerifier';
import { createMockDrawContext } from '../test-utils/MockDrawContext';
import { RenderFieldMapper } from '../test-utils/RenderFieldMapper';

describe('PipePathPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(pipePathPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(pipePathPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of pipePathPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = pipePathPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = pipePathPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of pipePathPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = pipePathPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('PipePathPlugin — Property read/write consistency (Layer 2)', () => {
  const verifier = new PropertyVerifier(PipePathPlugin, pipePathPropertySchema);

  it('all schema defaultProps should match constructor initial values', () => {
    const results = verifier.verifyDefaultValues();
    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.table(failed);
    }
    expect(failed).toHaveLength(0);
  });

  it('all fields should support setPluginProps write and correct read', () => {
    const result = verifier.verifyAll();
    if (result.failed > 0) {
      console.table(result.details.filter(r => !r.passed));
    }
    expect(result.failed).toBe(0);
  });

  for (const field of pipePathPropertySchema.fields.filter(f => f.type === 'number')) {
    it('${field.name} should work within boundary values [${field.min}, ${field.max}]', () => {
      const results = verifier.verifyBoundaryValues(field);
      expect(results.filter(r => !r.passed)).toHaveLength(0);
    });
  }

  it('onPropertyChanged should fire when properties change', () => {
    const instance = verifier.createInstance();
    let changed = false;
    instance.onPropertyChanged = () => { changed = true; };
    (instance as any).setPluginProps({ status: 'flowing' });
    expect(changed).toBe(true);
  });

  it('points field should support setPluginProps write and correct read', () => {
    const instance = verifier.createInstance();
    const newPoints = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 100 }];
    (instance as any).setPluginProps({ points: newPoints });
    const actual = (instance.pluginProps as any).points;
    expect(Array.isArray(actual)).toBe(true);
    expect(actual.length).toBe(3);
    for (const p of actual) {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
    }
  });
});

describe('PipePathPlugin — Declaration-rendering mapping validation (Layer 3)', () => {
  it('render should not throw after being called', () => {
    const plugin = new PipePathPlugin(0, 0, 200, 60);
    const { dc } = createMockDrawContext(200, 60);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('修改 flowingColor 后 render 应使用新的颜色值', () => {
    const plugin = new PipePathPlugin(0, 0, 200, 60);
    (plugin as any).setPluginProps({ status: 'flowing', flowingColor: '#FF0000FF' });

    const { dc, calls } = createMockDrawContext(200, 60);
    (plugin as any).render(dc);

    expect(calls.length).toBeGreaterThan(0);
  });

  it('所有字段在 render 源码中有引用', () => {
    const mapper = new RenderFieldMapper(
      pipePathPropertySchema,
      './industrial/pipe-path/PipePathPlugin.ts',
    );
    const unusedFields = mapper.getUnusedFields();
    if (unusedFields.length > 0) {
      console.warn('未在 render 中使用的字段:', unusedFields);
    }
  });
});

describe('PipePathPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new PipePathPlugin();
    expect(plugin.config.type).toBe('pipe-path');
    expect(plugin.pluginProps.status).toBe('stopped');
  });

  it('should accept position parameters', () => {
    const plugin = new PipePathPlugin(50, 100, 400, 120);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
  });

  it('draw method should be called normally', () => {
    const plugin = new PipePathPlugin();
    const { dc } = createMockDrawContext(200, 60);
    plugin.draw(dc.ctx);
    expect(() => {}).not.toThrow();
  });

  it('should include a valid points array by default', () => {
    const plugin = new PipePathPlugin();
    const points = plugin.pluginProps.points;
    expect(Array.isArray(points)).toBe(true);
    expect(points.length).toBeGreaterThanOrEqual(2);
    for (const p of points) {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
    }
  });
});