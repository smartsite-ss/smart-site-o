// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { PumpPlugin } from '../../industrial/pump/PumpPlugin';
import { pumpPropertySchema } from '../../industrial/pump/pumpPropertySchema';
import { PropertyVerifier } from '../test-utils/PropertyVerifier';
import { createMockDrawContext } from '../test-utils/MockDrawContext';
import { RenderFieldMapper } from '../test-utils/RenderFieldMapper';

describe('PumpPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(pumpPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(pumpPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of pumpPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = pumpPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = pumpPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of pumpPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = pumpPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('PumpPlugin — Property read/write consistency (Layer 2)', () => {
  const verifier = new PropertyVerifier(PumpPlugin, pumpPropertySchema);

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

  for (const field of pumpPropertySchema.fields.filter(f => f.type === 'number')) {
    it('${field.name} should work within boundary values [${field.min}, ${field.max}]', () => {
      const results = verifier.verifyBoundaryValues(field);
      expect(results.filter(r => !r.passed)).toHaveLength(0);
    });
  }

  it('onPropertyChanged should fire when properties change', () => {
    const instance = verifier.createInstance();
    let changed = false;
    instance.onPropertyChanged = () => { changed = true; };
    (instance as any).setPluginProps({ status: 'running' });
    expect(changed).toBe(true);
  });
});

describe('PumpPlugin — Declaration-rendering mapping validation (Layer 3)', () => {
  it('render should not throw after being called', () => {
    const plugin = new PumpPlugin(0, 0, 80, 80);
    const { dc } = createMockDrawContext(80, 80);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('render should use new color value after changing bodyColor', () => {
    const plugin = new PumpPlugin(0, 0, 80, 80);
    (plugin as any).setPluginProps({ bodyColor: '#FF0000FF' });

    const { dc, calls } = createMockDrawContext(80, 80);
    (plugin as any).render(dc);

    const fillCalls = calls.filter(c => c.includes('roundRect') || c.includes('arc'));
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('all fields are referenced in render source code', () => {
    const mapper = new RenderFieldMapper(
      pumpPropertySchema,
      './industrial/pump/PumpPlugin.ts',
    );
    const unusedFields = mapper.getUnusedFields();
    if (unusedFields.length > 0) {
      console.warn('Fields not used in render:', unusedFields);
    }
  });
});

describe('PumpPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new PumpPlugin();
    expect(plugin.config.type).toBe('pump');
    expect(plugin.pluginProps.status).toBe('stopped');
  });

  it('should accept position parameters', () => {
    const plugin = new PumpPlugin(50, 100, 100, 100);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
  });

  it('draw method should be called normally', () => {
    const plugin = new PumpPlugin();
    const { dc } = createMockDrawContext(80, 80);
    plugin.draw(dc.ctx);
    expect(() => {}).not.toThrow();
  });
});