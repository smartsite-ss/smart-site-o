// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface PluginSchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'switch' | 'slider' | 'font' | 'component' | 'checkbox';
  group?: string;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  pattern?: string;
  visibleWhen?: string;
  defaultValue?: any;
  componentName?: string;
}

export interface PluginSchema {
  fields: PluginSchemaField[];
  groups?: Record<string, string>;
  configComponent?: string;
}

export interface GenerateSchemaOptions {
  overrides?: Record<string, Partial<PluginSchemaField>>;
  groups?: Record<string, string>;
}

export function generateSchemaFromProps<T extends Record<string, any>>(
  props: T,
  options?: GenerateSchemaOptions,
): PluginSchema {
  const fields: PluginSchemaField[] = [];
  const overrideMap = options?.overrides || {};
  const groupMap = options?.groups || {};

  for (const key of Object.keys(props)) {
    const override = overrideMap[key] || {};
    const value = props[key];
    const field: PluginSchemaField = {
      key,
      label: override.label || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      type: override.type || deriveType(value),
      ...override,
    };

    if (groupMap[key]) {
      field.group = groupMap[key];
    }

    fields.push(field);
  }

  return {
    fields,
    groups: options?.groups,
  };
}

function deriveType(value: any): PluginSchemaField['type'] {
  if (typeof value === 'boolean') return 'switch';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value)) return 'color';
    return 'text';
  }
  if (Array.isArray(value)) return 'select';
  return 'text';
}