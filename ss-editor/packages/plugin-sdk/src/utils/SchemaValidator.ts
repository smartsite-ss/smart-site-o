// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema, PluginPropertySchemaField } from '../types/PluginPropertySchema';
import { I18nProvider } from './I18nProvider';

export interface ValidationError {
  field?: string;
  message: string;
}

export interface SchemaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function fmt(template: string, params: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

export class SchemaValidator {
  static validateDefaults(schema: PluginPropertySchema): ValidationResult {
    const errors: ValidationError[] = [];
    for (const field of schema.fields) {
      if (field.required && (field.defaultValue === undefined || field.defaultValue === null)) {
        errors.push({
          field: field.name,
          message: fmt(I18nProvider.t('__system__', 'validation.requiredFieldMissingDefault'), { field: field.name }),
        });
      }
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        const fieldErrors = this._validateFieldValue(field, field.defaultValue);
        errors.push(...fieldErrors);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  static validate(schema: PluginPropertySchema, props: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    const fieldMap = new Map<string, PluginPropertySchemaField>();
    for (const field of schema.fields) {
      fieldMap.set(field.name, field);
    }

    for (const field of schema.fields) {
      if (!field.required) continue;
      const value = props[field.name];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: field.name,
          message: fmt(I18nProvider.t('__system__', 'validation.requiredFieldMissing'), { field: field.name }),
        });
      }
    }

    for (const [key, value] of Object.entries(props)) {
      const field = fieldMap.get(key);
      if (!field) continue;
      if (value === undefined || value === null) {
        if (!field.required) continue;
      }
      const fieldErrors = this._validateFieldValue(field, value);
      errors.push(...fieldErrors);
    }

    return { valid: errors.length === 0, errors };
  }

  static validateSchemaStructure(schema: PluginPropertySchema & { name?: string }, pluginName: string): SchemaValidationError[] {
    const errors: SchemaValidationError[] = [];

    if (!schema.name) {
      errors.push({ field: '(root)', message: fmt(I18nProvider.t('__system__', 'validation.schemaMissingName'), { pluginName }), severity: 'error' });
    }
    if (!schema.fields || schema.fields.length === 0) {
      errors.push({ field: '(root)', message: fmt(I18nProvider.t('__system__', 'validation.schemaMissingFields'), { pluginName }), severity: 'error' });
    }

    const fieldNames = new Set<string>();
    for (const field of schema.fields) {
      if (fieldNames.has(field.name)) {
        errors.push({ field: field.name, message: fmt(I18nProvider.t('__system__', 'validation.fieldDuplicate'), { field: field.name }), severity: 'error' });
      }
      fieldNames.add(field.name);

      if (!field.name) {
        errors.push({ field: '(unnamed)', message: I18nProvider.t('__system__', 'validation.fieldMissingName'), severity: 'error' });
      }
      if (!field.label) {
        errors.push({ field: field.name || '(unnamed)', message: I18nProvider.t('__system__', 'validation.fieldMissingLabel'), severity: 'warning' });
      }
      if (!field.type) {
        errors.push({ field: field.name, message: I18nProvider.t('__system__', 'validation.fieldMissingType'), severity: 'error' });
        continue;
      }

      switch (field.type) {
        case 'select':
          if (!field.options || field.options.length === 0) {
            errors.push({ field: field.name, message: fmt(I18nProvider.t('__system__', 'validation.selectMissingOptions'), { field: field.name }), severity: 'error' });
          }
          break;
        case 'number':
        case 'range':
          if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
            errors.push({ field: field.name, message: fmt(I18nProvider.t('__system__', 'validation.minGreaterThanMax'), { min: field.min, max: field.max }), severity: 'error' });
          }
          break;
        case 'color':
          if (field.defaultValue !== undefined && !SchemaValidator.isValidColor(String(field.defaultValue))) {
            errors.push({ field: field.name, message: fmt(I18nProvider.t('__system__', 'validation.invalidColorDefault'), { value: String(field.defaultValue) }), severity: 'warning' });
          }
          break;
      }

      if (field.defaultValue === undefined) {
        errors.push({ field: field.name, message: I18nProvider.t('__system__', 'validation.fieldMissingDefault'), severity: 'warning' });
      }
    }

    return errors;
  }

  static isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);
  }

  private static _validateFieldValue(field: PluginPropertySchemaField, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (value === undefined || value === null) {
      if (!field.required) return [];
      errors.push({ field: field.name, message: fmt(I18nProvider.t('__system__', 'validation.fieldCannotBeEmpty'), { field: field.name }) });
      return errors;
    }

    switch (field.type) {
      case 'number':
      case 'range': {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push({
            field: field.name,
            message: fmt(I18nProvider.t('__system__', 'validation.fieldExpectedNumber'), { field: field.name, actual: typeof value }),
          });
        } else {
          if (field.min !== undefined && value < field.min) {
            errors.push({
              field: field.name,
              message: fmt(I18nProvider.t('__system__', 'validation.fieldValueLessThanMin'), { field: field.name, value, min: field.min }),
            });
          }
          if (field.max !== undefined && value > field.max) {
            errors.push({
              field: field.name,
              message: fmt(I18nProvider.t('__system__', 'validation.fieldValueGreaterThanMax'), { field: field.name, value, max: field.max }),
            });
          }
        }
        break;
      }
      case 'text': {
        if (typeof value !== 'string') {
          errors.push({
            field: field.name,
            message: fmt(I18nProvider.t('__system__', 'validation.fieldExpectedString'), { field: field.name, actual: typeof value }),
          });
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push({
            field: field.name,
            message: fmt(I18nProvider.t('__system__', 'validation.fieldExpectedBoolean'), { field: field.name, actual: typeof value }),
          });
        }
        break;
      }
      case 'select': {
        if (Array.isArray(field.options) && field.options.length > 0) {
          const validValues = field.options.map((o) => o.value);
          if (!validValues.includes(value)) {
            errors.push({
              field: field.name,
              message: fmt(I18nProvider.t('__system__', 'validation.fieldValueNotInOptions'), { field: field.name, value: String(value), options: validValues.join(', ') }),
            });
          }
        }
        break;
      }
      case 'color': {
        if (typeof value !== 'string') {
          errors.push({
            field: field.name,
            message: fmt(I18nProvider.t('__system__', 'validation.fieldExpectedColor'), { field: field.name, actual: typeof value }),
          });
        } else if (!/^#[0-9a-fA-F]{3,8}$/.test(value)) {
          errors.push({
            field: field.name,
            message: fmt(I18nProvider.t('__system__', 'validation.invalidColorFormat'), { field: field.name, value }),
          });
        }
        break;
      }
    }

    return errors;
  }
}