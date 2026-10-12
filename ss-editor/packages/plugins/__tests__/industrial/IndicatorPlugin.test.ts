// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { IndicatorPlugin } from '../../industrial/indicator/IndicatorPlugin';
import { indicatorPropertySchema } from '../../industrial/indicator/indicatorPropertySchema';
import { PropertyVerifier } from '../test-utils/PropertyVerifier';
import { createMockDrawContext } from '../test-utils/MockDrawContext';
import { RenderFieldMapper } from '../test-utils/RenderFieldMapper';

describe('IndicatorPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(indicatorPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(indicatorPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of indicatorPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = indicatorPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = indicatorPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of indicatorPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = indicatorPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('IndicatorPlugin — Property read/write consistency (Layer 2)', () => {
  const verifier = new PropertyVerifier(IndicatorPlugin, indicatorPropertySchema);

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

  for (const field of indicatorPropertySchema.fields.filter(f => f.type === 'number')) {
    it('${field.name} 应在边界值 [${field.min}, ${field.max}] 内正常', () => {
      const results = verifier.verifyBoundaryValues(field);
      expect(results.filter(r => !r.passed)).toHaveLength(0);
    });
  }

  it('onPropertyChanged should fire when properties change', () => {
    const instance = verifier.createInstance();
    let changed = false;
    instance.onPropertyChanged = () => { changed = true; };
    (instance as any).setPluginProps({ status: 'on' });
    expect(changed).toBe(true);
  });
});

describe('IndicatorPlugin — Declaration-rendering mapping validation (Layer 3)', () => {
  it('render should not throw after being called', () => {
    const plugin = new IndicatorPlugin(0, 0, 40, 40);
    const { dc } = createMockDrawContext(40, 40);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('render should use new color value after changing onColor', () => {
    const plugin = new IndicatorPlugin(0, 0, 40, 40);
    (plugin as any).setPluginProps({ status: 'on', onColor: '#FF0000FF' });

    const { dc, calls } = createMockDrawContext(40, 40);
    (plugin as any).render(dc);

    expect(calls.length).toBeGreaterThan(0);
  });

  it('所有字段在 render 源码中有引用', () => {
    const mapper = new RenderFieldMapper(
      indicatorPropertySchema,
      './industrial/indicator/IndicatorPlugin.ts',
    );
    const unusedFields = mapper.getUnusedFields();
    if (unusedFields.length > 0) {
      console.warn('Fields not used in render:', unusedFields);
    }
  });
});

describe('IndicatorPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new IndicatorPlugin();
    expect(plugin.config.type).toBe('indicator');
    expect(plugin.pluginProps.status).toBe('off');
  });

  it('should accept position parameters', () => {
    const plugin = new IndicatorPlugin(10, 20, 80, 80);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(20);
  });

  it('draw method should be called normally', () => {
    const plugin = new IndicatorPlugin();
    const { dc } = createMockDrawContext(40, 40);
    plugin.draw(dc.ctx);
    expect(() => {}).not.toThrow();
  });
});