// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { WaterpumpPlugin } from '../../industrial/waterpump/WaterpumpPlugin';
import { waterpumpPropertySchema } from '../../industrial/waterpump/waterpumpPropertySchema';
import { PropertyVerifier } from '../test-utils/PropertyVerifier';
import { createMockDrawContext } from '../test-utils/MockDrawContext';

describe('WaterpumpPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(waterpumpPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(waterpumpPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of waterpumpPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = waterpumpPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = waterpumpPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of waterpumpPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = waterpumpPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('WaterpumpPlugin — Property read/write consistency (Layer 2)', () => {
  const verifier = new PropertyVerifier(WaterpumpPlugin, waterpumpPropertySchema);

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

  for (const field of waterpumpPropertySchema.fields.filter(f => f.type === 'number')) {
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

describe('WaterpumpPlugin — Rendering functionality validation (Layer 3)', () => {
  it('render should not throw after being called', () => {
    const plugin = new WaterpumpPlugin(0, 0, 120, 60);
    const { dc } = createMockDrawContext(120, 60);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('render should work after changing bodyColor', () => {
    const plugin = new WaterpumpPlugin(0, 0, 120, 60);
    (plugin as any).setPluginProps({ bodyColor: '#FF0000FF' });

    const { dc } = createMockDrawContext(120, 60);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('render should work after changing impellerColor', () => {
    const plugin = new WaterpumpPlugin(0, 0, 120, 60);
    (plugin as any).setPluginProps({ impellerColor: '#00FF00FF' });

    const { dc } = createMockDrawContext(120, 60);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('setting running status should not throw', () => {
    const plugin = new WaterpumpPlugin(0, 0, 120, 60);
    (plugin as any).setPluginProps({ status: 'running', showAnimation: true });

    const { dc } = createMockDrawContext(120, 60);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });

  it('toggling rotation direction should not throw', () => {
    const plugin = new WaterpumpPlugin(0, 0, 120, 60);
    (plugin as any).setPluginProps({ rotationDirection: 'counterclockwise' });

    const { dc } = createMockDrawContext(120, 60);
    expect(() => (plugin as any).render(dc)).not.toThrow();
  });
});

describe('WaterpumpPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new WaterpumpPlugin();
    expect(plugin.config.type).toBe('waterpump');
    expect(plugin.pluginProps.status).toBe('stopped');
  });

  it('should accept position parameters', () => {
    const plugin = new WaterpumpPlugin(50, 100, 120, 60);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
  });

  it('draw method should be called normally', () => {
    const plugin = new WaterpumpPlugin();
    const { dc } = createMockDrawContext(120, 60);
    plugin.draw(dc.ctx);
    expect(() => {}).not.toThrow();
  });

  it('default properties should include rotationDirection', () => {
    const plugin = new WaterpumpPlugin();
    expect(plugin.pluginProps.rotationDirection).toBe('clockwise');
  });

  it('default properties should include rotationSpeed', () => {
    const plugin = new WaterpumpPlugin();
    expect(plugin.pluginProps.rotationSpeed).toBe(2);
  });
});
