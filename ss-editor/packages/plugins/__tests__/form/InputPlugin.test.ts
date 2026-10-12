// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { InputPlugin } from '../../form/input/InputPlugin';
import { inputPropertySchema } from '../../form/input/inputPropertySchema';
import { PropertyVerifier } from '../test-utils/PropertyVerifier';

describe('InputPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(inputPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(inputPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of inputPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = inputPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = inputPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of inputPropertySchema.fields) {
      expect(field.defaultValue, `${field.name} is missing defaultValue`).toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = inputPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('InputPlugin — Property read/write consistency (Layer 2)', () => {
  const verifier = new PropertyVerifier(InputPlugin, inputPropertySchema);

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

  for (const field of inputPropertySchema.fields.filter(f => f.type === 'number')) {
    it(`${field.name} should work within boundary values [${field.min}, ${field.max}]`, () => {
      const results = verifier.verifyBoundaryValues(field);
      expect(results.filter(r => !r.passed)).toHaveLength(0);
    });
  }

  it('onPropertyChanged should fire when properties change', () => {
    const instance = verifier.createInstance();
    let changed = false;
    instance.onPropertyChanged = () => { changed = true; };
    (instance as any).setPluginProps({ placeholder: 'Changed' });
    expect(changed).toBe(true);
  });
});

describe('InputPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new InputPlugin();
    expect(plugin.config.type).toBe('input');
    expect(plugin.pluginProps.placeholder).toBe('请输入...');
  });

  it('should accept position parameters', () => {
    const plugin = new InputPlugin(50, 100, 300, 60);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
  });

  it('getSize 应返回正确尺寸', () => {
    const plugin = new InputPlugin(0, 0, 300, 60);
    const size = plugin.getSize();
    expect(size.width).toBe(300);
    expect(size.height).toBe(60);
  });
});

describe('InputPlugin — features', () => {
  it('dataBindable 应为 true（编辑态数据绑定支持）', () => {
    const meta = (InputPlugin as any).graphicMeta;
    expect(meta).toBeDefined();
    expect(meta.features).toBeDefined();
    expect(meta.features.dataBindable).toBe(true);
  });

  it('应保留其他 feature 标志位', () => {
    const meta = (InputPlugin as any).graphicMeta;
    expect(meta.features.resizable).toBe(true);
    expect(meta.features.cloneable).toBe(true);
    expect(meta.features.groupable).toBe(true);
  });
});
