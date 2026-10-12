// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeAll } from 'vitest';
import { SchemaValidator } from '../src/utils/SchemaValidator';
import { I18nProvider } from '../src/utils/I18nProvider';
import { enUS } from '../src/locales';
import type { PluginPropertySchema } from '../src/types/PluginPropertySchema';

beforeAll(async () => {
  I18nProvider.registerPluginLocale('__system__', async () => ({
    default: enUS,
  }));
  await I18nProvider.setLocale('en-US');
});

const numberSchema: PluginPropertySchema = {
  fields: [
    { name: 'count', type: 'number', defaultValue: 10, min: 0, max: 100, required: true },
    { name: 'label', type: 'text', defaultValue: 'hello' },
    { name: 'active', type: 'boolean', defaultValue: true },
    { name: 'status', type: 'select', options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], defaultValue: 'on' },
    { name: 'color', type: 'color', defaultValue: '#FF0000' },
  ],
};

describe('SchemaValidator.validateDefaults', () => {
  it('should pass valid defaults', () => {
    const result = SchemaValidator.validateDefaults(numberSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when required field has no defaultValue', () => {
    const schema: PluginPropertySchema = {
      fields: [{ name: 'count', type: 'number', required: true }],
    };
    const result = SchemaValidator.validateDefaults(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'count')).toBe(true);
  });

  it('should fail when defaultValue violates min constraint', () => {
    const schema: PluginPropertySchema = {
      fields: [{ name: 'count', type: 'number', defaultValue: -1, min: 0 }],
    };
    const result = SchemaValidator.validateDefaults(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('minimum'))).toBe(true);
  });
});

describe('SchemaValidator.validate', () => {
  it('should pass valid props', () => {
    const result = SchemaValidator.validate(numberSchema, {
      count: 50,
      label: 'test',
      active: false,
      status: 'off',
      color: '#00FF00',
    });
    expect(result.valid).toBe(true);
  });

  it('should fail missing required field', () => {
    const result = SchemaValidator.validate(numberSchema, {});
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'count' && e.message.includes('missing'))).toBe(true);
  });

  it('should fail type mismatch (number expected, got string)', () => {
    const result = SchemaValidator.validate(numberSchema, { count: 'abc', label: 'ok' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'count' && e.message.includes('number'))).toBe(true);
  });

  it('should fail NaN as number', () => {
    const result = SchemaValidator.validate(numberSchema, { count: NaN, label: 'ok' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'count' && e.message.includes('number'))).toBe(true);
  });

  it('should fail value below min', () => {
    const result = SchemaValidator.validate(numberSchema, { count: -1, label: 'ok' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'count' && e.message.includes('minimum'))).toBe(true);
  });

  it('should fail value above max', () => {
    const result = SchemaValidator.validate(numberSchema, { count: 200, label: 'ok' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'count' && e.message.includes('maximum'))).toBe(true);
  });

  it('should fail boolean expected, got string', () => {
    const result = SchemaValidator.validate(numberSchema, { count: 10, active: 'yes' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'active' && e.message.includes('boolean'))).toBe(true);
  });

  it('should fail select value not in options', () => {
    const result = SchemaValidator.validate(numberSchema, { count: 10, status: 'unknown' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'status' && e.message.includes('valid options'))).toBe(true);
  });

  it('should fail invalid color format', () => {
    const result = SchemaValidator.validate(numberSchema, { count: 10, color: 'red' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'color' && e.message.includes('valid color'))).toBe(true);
  });
});