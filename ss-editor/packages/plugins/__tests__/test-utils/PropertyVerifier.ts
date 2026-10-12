// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { BasePlugin, PluginPropertySchema, SchemaField } from '@scada-editor/plugin-sdk';

export interface PropertyVerifyResult {
  property: string;
  passed: boolean;
  defaultValue: any;
  valueAfterSet?: any;
  onPropertyChangedFired?: boolean;
  error?: string;
}

export interface VerifyAllResult {
  pluginName: string;
  total: number;
  passed: number;
  failed: number;
  details: PropertyVerifyResult[];
}

export class PropertyVerifier<T extends BasePlugin<any>> {

  constructor(
    private PluginClass: new (...args: any[]) => T,
    private schema: PluginPropertySchema,
  ) {}

  createInstance(x = 0, y = 0, w = 100, h = 100): T {
    return new this.PluginClass(x, y, w, h);
  }

  verifyDefaultValues(skipFields: string[] = []): PropertyVerifyResult[] {
    const instance = this.createInstance();
    const results: PropertyVerifyResult[] = [];

    for (const field of this.schema.fields) {
      if (skipFields.includes(field.name)) continue;
      const schemaDefault = field.defaultValue;
      const actualDefault = (instance.pluginProps as any)[field.name];

      results.push({
        property: field.name,
        passed: isEqual(schemaDefault, actualDefault),
        defaultValue: schemaDefault,
        valueAfterSet: actualDefault,
        error: isEqual(schemaDefault, actualDefault)
          ? undefined
          : `默认值不匹配: schema=${JSON.stringify(schemaDefault)}, actual=${JSON.stringify(actualDefault)}`,
      });
    }

    return results;
  }

  verifyWriteRead(field: SchemaField, testValues: any[]): PropertyVerifyResult[] {
    const results: PropertyVerifyResult[] = [];

    for (const value of testValues) {
      const instance = this.createInstance();
      let onPropChangedFired = false;

      instance.onPropertyChanged = () => { onPropChangedFired = true; };

      try {
        (instance as any).setPluginProps({ [field.name]: value });
        const actual = (instance.pluginProps as any)[field.name];

        results.push({
          property: field.name,
          passed: isEqual(value, actual) && onPropChangedFired,
          defaultValue: field.defaultValue,
          valueAfterSet: actual,
          onPropertyChangedFired: onPropChangedFired,
          error: !isEqual(value, actual)
            ? `写入值=${JSON.stringify(value)}, 读取值=${JSON.stringify(actual)}`
            : !onPropChangedFired
              ? `onPropertyChanged 未触发`
              : undefined,
        });
      } catch (err: any) {
        results.push({
          property: field.name,
          passed: false,
          defaultValue: field.defaultValue,
          error: `写入失败: ${err.message}`,
        });
      }
    }

    return results;
  }

  verifyBoundaryValues(field: SchemaField): PropertyVerifyResult[] {
    if (field.type !== 'number' && field.type !== 'range') {
      return [];
    }

    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const values = [min, max, min - 1, max + 1, min + (max - min) / 2];
    return this.verifyWriteRead(field, values);
  }

  verifyAll(): VerifyAllResult {
    const details: PropertyVerifyResult[] = [];

    for (const field of this.schema.fields) {
      const testValues = generateTestValues(field);
      const fieldResults = this.verifyWriteRead(field, testValues);
      details.push(...fieldResults);
    }

    const passed = details.filter(r => r.passed).length;
    return {
      pluginName: this.schema.name as string,
      total: details.length,
      passed,
      failed: details.length - passed,
      details,
    };
  }
}

function generateTestValues(field: SchemaField): any[] {
  switch (field.type) {
    case 'number':
    case 'range': {
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      const mid = min + Math.floor((max - min) / (2 * step)) * step;
      return [min, mid, max];
    }
    case 'boolean':
    case 'checkbox':
      return [true, false];
    case 'color':
      return ['#FF0000FF', '#00FF00FF', '#0000FFFF'];
    case 'select':
      return field.options?.slice(0, 2).map(o => o.value) || [];
    case 'text':
    case 'textarea':
      return ['test_value', ''];
    default:
      return ['test_value'];
  }
}

function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-10;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}