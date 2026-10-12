// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import {
  generateSchemaFromProps,
} from '../src/schema-generator';

describe('generateSchemaFromProps', () => {
  describe('Type Auto-Deduction', () => {
    it('should derive boolean as switch', () => {
      const props = { enabled: true };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields.length).toBe(1);
      expect(schema.fields[0].key).toBe('enabled');
      expect(schema.fields[0].type).toBe('switch');
    });

    it('should derive number as number', () => {
      const props = { size: 100 };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields[0].type).toBe('number');
    });

    it('should derive hex color string as color', () => {
      const props = { bodyColor: '#4A90A4' };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields[0].type).toBe('color');
    });

    it('should derive hex color with alpha as color', () => {
      const props = { fillColor: '#FFFFFFFF' };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields[0].type).toBe('color');
    });

    it('should derive 3-digit hex as color', () => {
      const props = { color: '#FFF' };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields[0].type).toBe('color');
    });

    it('should derive regular string as text', () => {
      const props = { label: 'Hello' };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields[0].type).toBe('text');
    });

    it('should derive array as select', () => {
      const props = { options: ['a', 'b', 'c'] };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields[0].type).toBe('select');
    });
  });

  describe('label generation', () => {
    it('should generate label from key name', () => {
      const props = { bodyColor: '#FF0000' };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields[0].label).toBe('Body Color');
    });

    it('should camelCase key to spaced words', () => {
      const props = { animationSpeed: 1 };
      const schema = generateSchemaFromProps(props);
      const label = schema.fields[0].label;
      expect(label).toBe('Animation Speed');
    });
  });

  describe('overrides override', () => {
    it('should override label via overrides', () => {
      const props = { text: 'Hello' };
      const schema = generateSchemaFromProps(props, {
        overrides: { text: { label: 'Button Text' } },
      });
      expect(schema.fields[0].label).toBe('Button Text');
    });

    it('should override type via overrides', () => {
      const props = { status: 'running' };
      const schema = generateSchemaFromProps(props, {
        overrides: {
          status: {
            label: 'Status',
            type: 'select',
            options: [
              { value: 'running', label: 'Running' },
              { value: 'stopped', label: 'Stopped' },
            ],
          },
        },
      });
      const field = schema.fields[0];
      expect(field.type).toBe('select');
      expect(field.label).toBe('Status');
      expect(field.options).toHaveLength(2);
    });

    it('should override min/max for number type', () => {
      const props = { speed: 1 };
      const schema = generateSchemaFromProps(props, {
        overrides: {
          speed: { type: 'slider', min: 0, max: 5, step: 0.5 },
        },
      });
      const field = schema.fields[0];
      expect(field.type).toBe('slider');
      expect(field.min).toBe(0);
      expect(field.max).toBe(5);
      expect(field.step).toBe(0.5);
    });

    it('should preserve non-overridden fields unchanged', () => {
      const props = { label: 'Test', enabled: true };
      const schema = generateSchemaFromProps(props, {
        overrides: { label: { label: 'Name' } },
      });
      expect(schema.fields.length).toBe(2);
      const labelField = schema.fields.find(f => f.key === 'label');
      const enabledField = schema.fields.find(f => f.key === 'enabled');
      expect(labelField?.label).toBe('Name');
      expect(enabledField?.type).toBe('switch');
    });
  });

  describe('groups', () => {
    it('should assign groups to fields', () => {
      const props = { bodyColor: '#FF0000', label: 'Test' };
      const schema = generateSchemaFromProps(props, {
        groups: { bodyColor: 'Appearance' },
      });
      const bodyField = schema.fields.find(f => f.key === 'bodyColor');
      expect(bodyField?.group).toBe('Appearance');
    });

    it('should return groups in schema', () => {
      const props = { bodyColor: '#FF0000' };
      const schema = generateSchemaFromProps(props, {
        groups: { bodyColor: 'Appearance' },
      });
      expect(schema.groups).toEqual({ bodyColor: 'Appearance' });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty props object', () => {
      const props = {};
      const schema = generateSchemaFromProps(props);
      expect(schema.fields.length).toBe(0);
    });

    it('should handle multiple props of different types', () => {
      const props = {
        name: 'Pump',
        count: 5,
        active: true,
        color: '#4CAF50',
        modes: ['auto', 'manual'],
      };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields.length).toBe(5);

      const types = schema.fields.map(f => f.type);
      expect(types).toContain('text');
      expect(types).toContain('number');
      expect(types).toContain('switch');
      expect(types).toContain('color');
      expect(types).toContain('select');
    });

    it('should handle null/undefined values gracefully', () => {
      const props = { value: null as any };
      const schema = generateSchemaFromProps(props);
      expect(schema.fields.length).toBe(1);
      expect(schema.fields[0].type).toBe('text');
    });
  });
});