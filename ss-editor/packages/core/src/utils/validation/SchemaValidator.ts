// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema, SchemaField } from '../../config/ConfigTemplateManager';
import { i18n } from '../../locales';

export interface SchemaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

function t(key: string, params?: Record<string, string | number>): string {
  return i18n.global.t(`validation.${key}`, params as Record<string, unknown>) as string;
}

export class SchemaValidator {
  private errors: SchemaValidationError[] = [];

  validate(schema: PluginPropertySchema, pluginName: string): SchemaValidationError[] {
    this.errors = [];

    this.validateBasicStructure(schema, pluginName);
    this.validateFieldUniqueness(schema);

    for (const field of schema.fields) {
      this.validateField(field);
    }

    return this.errors;
  }

  private validateBasicStructure(schema: PluginPropertySchema, name: string): void {
    if (!schema.name) {
      this.addError('(root)', t('schemaMissingName', { name }), 'error');
    }
    if (!schema.fields || schema.fields.length === 0) {
      this.addError('(root)', t('schemaMissingFields', { name }), 'error');
    }
    if (!schema.propsPath) {
      this.addError('(root)', t('schemaMissingPropsPath', { name }), 'warning');
    }
  }

  private validateFieldUniqueness(schema: PluginPropertySchema): void {
    const names = new Set<string>();
    for (const field of schema.fields) {
      if (names.has(field.name)) {
        this.addError(field.name, t('duplicateFieldName'), 'error');
      }
      names.add(field.name);
    }
  }

  private validateField(field: SchemaField): void {
    const name = field.name || '(unnamed)';

    if (!field.name) {
      this.addError(name, t('fieldMissingName'), 'error');
    }
    if (!field.label) {
      this.addError(name, t('fieldMissingLabel'), 'warning');
    }
    if (!field.type) {
      this.addError(name, t('fieldMissingType'), 'error');
      return;
    }

    switch (field.type) {
      case 'select':
        if (!field.options || field.options.length === 0) {
          this.addError(name, t('selectMissingOptions'), 'error');
        }
        break;
      case 'number':
      case 'range':
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
          this.addError(name, t('minGreaterThanMax', { min: field.min, max: field.max }), 'error');
        }
        break;
      case 'color':
        if (field.defaultValue !== undefined && !SchemaValidator.isValidColor(String(field.defaultValue))) {
          this.addError(name, t('invalidColorDefault', { value: String(field.defaultValue) }), 'warning');
        }
        break;
    }

    if (field.defaultValue === undefined) {
      this.addError(name, t('fieldMissingDefaultValue'), 'warning');
    }

    if (field.type === 'number' && field.step === undefined) {
      this.addError(name, t('numberSuggestStep'), 'warning');
    }
  }

  private addError(field: string, message: string, severity: 'error' | 'warning'): void {
    this.errors.push({ field, message, severity });
  }

  static isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);
  }
}