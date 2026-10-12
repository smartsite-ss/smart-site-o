// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { definePlugin, type PluginDefinition } from './define-plugin';
import { GraphicComponentRegistry } from './GraphicComponentRegistry';
import type { PluginPropertySchema, SchemaField } from '../types/PluginPropertySchema';
import type { Component } from 'vue';
import { I18nProvider } from '../utils/I18nProvider';

export type InferSchemaProps<S extends PluginPropertySchema> = {
  [F in S['fields'][number] as F['name']]: InferFieldType<F>;
};

type InferFieldType<F extends SchemaField> =
  F['type'] extends 'number' | 'range' ? number :
  F['type'] extends 'boolean' | 'checkbox' ? boolean :
  F['type'] extends 'select' ? (F extends { options: Array<{ value: infer V }> } ? V : string) :
  string;

export function buildDefaultsFromSchema(schema: PluginPropertySchema): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      result[field.name] = field.defaultValue;
    }
  }
  return result;
}

export interface CreatePluginOptions {
  type: string;
  category: string;
  version?: string;
  label: string | (() => string);
  plugin: new (...args: any[]) => any;
  schema: PluginPropertySchema;
  icon?: any;
  config?: any;
  graphicComponent?: Component;
  graphicComponentName?: string;
  locales?: Record<string, () => Promise<Record<string, any>>>;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function createPlugin(options: CreatePluginOptions) {
  if (options.graphicComponent) {
    const comp = options.graphicComponent as any;
    const rawName = options.graphicComponentName || comp.name || comp.__name;
    if (rawName) {
      const uniqueName = `${options.category}-${rawName}`;
      GraphicComponentRegistry.register(uniqueName, options.graphicComponent);
    } else {
      console.warn(
        `[createPlugin] ${I18nProvider.t('__system__', 'createPlugin.cannotExtractComponentName', 'Cannot extract component name, please specify via graphicComponentName')}`,
        options.type,
      );
    }
  }

  const def: PluginDefinition = {
    type: options.type,
    category: options.category,
    version: options.version,
    label: options.label,
    graphic: options.plugin,
    schema: options.schema,
    icon: options.icon,
    config: options.config,
    graphicComponent: options.graphicComponent,
    graphicComponentName: options.graphicComponentName,
    defaultWidth: options.defaultWidth,
    defaultHeight: options.defaultHeight,
  };
  return definePlugin(def);
}