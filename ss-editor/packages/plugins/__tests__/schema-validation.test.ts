// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '@scada-editor/plugin-sdk';

import { buttonPropertySchema } from '../basic/button/buttonPropertySchema';
import { shapePropertySchema } from '../basic/shape/shapePropertySchema';
import { labelPropertySchema } from '../basic/label/labelPropertySchema';
import { textboxPropertySchema } from '../basic/textbox/textboxPropertySchema';
import { imagePropertySchema } from '../basic/image/imagePropertySchema';
import { naiveButtonPropertySchema } from '../basic/naive-button/naiveButtonPropertySchema';
import { inputPropertySchema } from '../form/input/inputPropertySchema';
import { checkboxPropertySchema } from '../form/checkbox/checkboxPropertySchema';
import { gaugePropertySchema } from '../industrial/gauge/gaugePropertySchema';
import { pumpPropertySchema } from '../industrial/pump/pumpPropertySchema';
import { pipePropertySchema } from '../industrial/pipe-v/pipePropertySchema';
import { valvePropertySchema } from '../industrial/valve/valvePropertySchema';
import { tankPropertySchema } from '../industrial/tank/tankPropertySchema';
import { indicatorPropertySchema } from '../industrial/indicator/indicatorPropertySchema';
import { pipePathPropertySchema } from '../industrial/pipe-path/pipePathPropertySchema';
import { chartPropertySchema } from '../chart/chart/chartPropertySchema';
import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';

const schemaEntries: [string, PluginPropertySchema][] = [
  ['Button', buttonPropertySchema],
  ['Shape', shapePropertySchema],
  ['Label', labelPropertySchema],
  ['Textbox', textboxPropertySchema],
  ['Image', imagePropertySchema],
  ['NaiveButton', naiveButtonPropertySchema],
  ['Input', inputPropertySchema],
  ['Checkbox', checkboxPropertySchema],
  ['Gauge', gaugePropertySchema],
  ['Pump', pumpPropertySchema],
  ['Pipe', pipePropertySchema],
  ['Valve', valvePropertySchema],
  ['Tank', tankPropertySchema],
  ['Indicator', indicatorPropertySchema],
  ['PipePath', pipePathPropertySchema],
  ['Chart', chartPropertySchema],
];

describe('Schema static validation (Phase 1 / Layer 1)', () => {
  for (const [name, schema] of schemaEntries) {
    describe(`${name}PropertySchema`, () => {
      const errors = SchemaValidator.validateSchemaStructure(schema, name);

      it('schema should pass validation (0 errors)', () => {
        const errs = errors.filter(e => e.severity === 'error');
        if (errs.length > 0) {
          console.table(errs);
        }
        expect(errs).toHaveLength(0);
      });

      it('schema.name should not be empty', () => {
        expect(schema.name).toBeTruthy();
      });

      it('schema.fields should be a non-empty array', () => {
        expect(schema.fields).toBeDefined();
        expect(schema.fields.length).toBeGreaterThan(0);
      });

      it('each field should have name and type', () => {
        for (const field of schema.fields) {
          expect(field.name, 'field ${JSON.stringify(field)} is missing name').toBeTruthy();
          expect(field.type, 'field ${field.name} is missing type').toBeTruthy();
        }
      });

      it('select type should have options', () => {
        const selectFields = schema.fields.filter(f => f.type === 'select');
        for (const field of selectFields) {
          expect(field.options, '${field.name} is missing options').toBeDefined();
          expect(field.options!.length, '${field.name} options is empty').toBeGreaterThan(0);
        }
      });

      it('number type min should not be greater than max', () => {
        const numFields = schema.fields.filter(f => f.type === 'number');
        for (const field of numFields) {
          if (field.min !== undefined && field.max !== undefined) {
            expect(field.min, `${field.name} min > max`).toBeLessThanOrEqual(field.max);
          }
        }
      });

      it('all fields should have defaultValue', () => {
        for (const field of schema.fields) {
          expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
        }
      });

      it('color type defaultValue should be a valid hex', () => {
        const colorFields = schema.fields.filter(f => f.type === 'color');
        const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
        for (const field of colorFields) {
          expect(
            String(field.defaultValue),
            `${field.name}: "${field.defaultValue}" is not a valid hex`,
          ).toMatch(hexRe);
        }
      });

      it('field names should not be duplicated', () => {
        const names = schema.fields.map(f => f.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size, 'duplicate fields: ${names.filter((n, i) => names.indexOf(n) !== i)}').toBe(names.length);
      });
    });
  }

  it('should include all 16 schemas', () => {
    expect(schemaEntries.length).toBe(16);
  });
});