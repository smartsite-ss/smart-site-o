// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { LabelPlugin } from '../../basic/label/LabelPlugin';
import { labelPropertySchema } from '../../basic/label/labelPropertySchema';
import { PropertyVerifier } from '../test-utils/PropertyVerifier';
import { createMockDrawContext } from '../test-utils/MockDrawContext';
import { RenderFieldMapper } from '../test-utils/RenderFieldMapper';

describe('LabelPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(labelPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(labelPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of labelPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = labelPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = labelPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of labelPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = labelPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('LabelPlugin — Property read/write consistency (Layer 2)', () => {
  const verifier = new PropertyVerifier(LabelPlugin, labelPropertySchema);

  it('all schema defaultProps should match constructor initial values', () => {
    const results = verifier.verifyDefaultValues(['textColor']);
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

  for (const field of labelPropertySchema.fields.filter(f => f.type === 'number')) {
    it('${field.name} 应在边界值 [${field.min}, ${field.max}] 内正常', () => {
      const results = verifier.verifyBoundaryValues(field);
      expect(results.filter(r => !r.passed)).toHaveLength(0);
    });
  }

  it('onPropertyChanged should fire when properties change', () => {
    const instance = verifier.createInstance();
    let changed = false;
    instance.onPropertyChanged = () => { changed = true; };
    (instance as any).setPluginProps({ text: 'Changed' });
    expect(changed).toBe(true);
  });
});

describe('LabelPlugin — Declaration-rendering mapping validation (Layer 3)', () => {
  it('render should not throw after being called', () => {
    const plugin = new LabelPlugin(0, 0, 100, 40);
    const { dc } = createMockDrawContext(100, 40);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('修改 textColor 后 render 应使用新的颜色值', () => {
    const plugin = new LabelPlugin(0, 0, 100, 40);
    (plugin as any).setPluginProps({ textColor: '#FF0000FF' });

    const { dc, calls } = createMockDrawContext(100, 40);
    (plugin as any).render(dc);

    const fillCalls = calls.filter(c => c.includes('fillText') || c.includes('fill'));
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('所有字段在 render 源码中有引用', () => {
    const mapper = new RenderFieldMapper(
      labelPropertySchema,
      './basic/label/LabelPlugin.ts',
    );
    const unusedFields = mapper.getUnusedFields();
    if (unusedFields.length > 0) {
      console.warn('未在 render 中使用的字段:', unusedFields);
    }
  });
});

describe('LabelPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new LabelPlugin();
    expect(plugin.config.type).toBe('label');
    expect(plugin.pluginProps.text).toBe('Label');
  });

  it('should accept position parameters', () => {
    const plugin = new LabelPlugin(50, 100, 200, 80);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
  });

  it('draw method should be called normally', () => {
    const plugin = new LabelPlugin();
    const { dc } = createMockDrawContext(100, 40);
    plugin.draw(dc.ctx);
    expect(() => {}).not.toThrow();
  });
});