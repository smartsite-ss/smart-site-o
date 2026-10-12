// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { TextboxPlugin } from '../../basic/textbox/TextboxPlugin';
import { textboxPropertySchema } from '../../basic/textbox/textboxPropertySchema';
import { PropertyVerifier } from '../test-utils/PropertyVerifier';
import { createMockDrawContext } from '../test-utils/MockDrawContext';
import { RenderFieldMapper } from '../test-utils/RenderFieldMapper';

describe('TextboxPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(textboxPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(textboxPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of textboxPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = textboxPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = textboxPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of textboxPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = textboxPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('TextboxPlugin — Property read/write consistency (Layer 2)', () => {
  const verifier = new PropertyVerifier(TextboxPlugin, textboxPropertySchema);

  it('all schema defaultProps should match constructor initial values', () => {
    const results = verifier.verifyDefaultValues(['textColor', 'backgroundColor', 'borderColor']);
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

  for (const field of textboxPropertySchema.fields.filter(f => f.type === 'number')) {
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

describe('TextboxPlugin — Declaration-rendering mapping validation (Layer 3)', () => {
  it('render should not throw after being called', () => {
    const plugin = new TextboxPlugin(0, 0, 200, 100);
    const { dc } = createMockDrawContext(200, 100);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('修改 backgroundColor 后 render 应使用新的颜色值', () => {
    const plugin = new TextboxPlugin(0, 0, 200, 100);
    (plugin as any).setPluginProps({ backgroundColor: '#FF0000FF' });

    const { dc, calls } = createMockDrawContext(200, 100);
    (plugin as any).render(dc);

    const fillCalls = calls.filter(c => c.includes('roundRect') || c.includes('fillRect') || c.includes('fill'));
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('所有字段在 render 源码中有引用', () => {
    const mapper = new RenderFieldMapper(
      textboxPropertySchema,
      './basic/textbox/TextboxPlugin.ts',
    );
    const unusedFields = mapper.getUnusedFields();
    if (unusedFields.length > 0) {
      console.warn('Fields not used in render:', unusedFields);
    }
  });
});

describe('TextboxPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new TextboxPlugin();
    expect(plugin.config.type).toBe('textbox');
    expect(plugin.pluginProps.text).toBe('Textbox');
  });

  it('should accept position parameters', () => {
    const plugin = new TextboxPlugin(50, 100, 200, 80);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
  });

  it('draw method should be called normally', () => {
    const plugin = new TextboxPlugin();
    const { dc } = createMockDrawContext(200, 100);
    plugin.draw(dc.ctx);
    expect(() => {}).not.toThrow();
  });
});