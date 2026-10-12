// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Component } from 'vue';

export interface SchemaField {
  name: string;
  label: string;
  labelKey?: string;
  type: 'text' | 'number' | 'color' | 'select' | 'checkbox' | 'textarea' | 'range' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string; labelKey?: string }[];
  /** 动态选项提供者：string key 由属性面板解析，函数由运行时调用 */
  optionsProvider?: string | (() => { value: any; label: string }[]);
  defaultValue?: any;
  group?: string;
  groupKey?: string;
  /** 标记此字段可被数据源绑定（与 plugin-sdk PluginPropertySchemaField.dataBindable 对齐） */
  dataBindable?: boolean;
}

export interface PluginPropertySchema {
  name: string;
  layout?: 'vertical' | 'grid';
  columns?: number;
  fields: SchemaField[];
  propsPath?: string;
  defaultValueFactory?: () => Record<string, any>;
}

class ConfigTemplateManager {
  private static configComponents: Map<string, Component> = new Map();
  private static pluginSchemas: Map<string, PluginPropertySchema> = new Map();

  static registerPluginSchema(graphicType: string, schema: PluginPropertySchema): void {
    this.pluginSchemas.set(graphicType, schema);
  }

  static unregisterPluginSchema(graphicType: string): void {
    this.pluginSchemas.delete(graphicType);
  }

  static getPluginSchema(graphicType: string): PluginPropertySchema | null {
    return this.pluginSchemas.get(graphicType) || null;
  }

  static hasPluginSchema(graphicType: string): boolean {
    return this.pluginSchemas.has(graphicType);
  }

  static getAllPluginSchemas(): Record<string, PluginPropertySchema> {
    return Object.fromEntries(this.pluginSchemas);
  }

  static getTemplate(graphicType: string): PluginPropertySchema | null {
    return this.pluginSchemas.get(graphicType) || null;
  }

  static getConfigComponent(graphicType: string): Component | undefined {
    return this.configComponents.get(graphicType);
  }

  static registerConfigComponent(graphicType: string, component: Component): void {
    this.configComponents.set(graphicType, component);
  }

  static getPropsPath(graphicType: string): string | undefined {
    const schema = this.pluginSchemas.get(graphicType);
    return schema?.propsPath;
  }

  static getDefaultValueFactory(graphicType: string): (() => Record<string, any>) | undefined {
    const schema = this.pluginSchemas.get(graphicType);
    if (!schema) return undefined;
    if (schema.defaultValueFactory) return schema.defaultValueFactory;
    return () => {
      const result: Record<string, any> = {};
      for (const field of schema.fields) {
        if (field.defaultValue !== undefined) {
          result[field.name] = field.defaultValue;
        }
      }
      return result;
    };
  }
}

export { ConfigTemplateManager };

export const SCHEMA_GROUP = {
  IDENTITY: 'basic',
  BEHAVIOR: 'behavior',
  VISUAL: 'visual',
  STATUS: 'status',
  ANIMATION: 'animation',
  DISPLAY: 'display',
  COLOR: 'color',
  VALUE: 'value',
  GAUGE: 'gauge',
  TICKS: 'ticks',
  ALARM: 'alarm',
  BINDING: 'binding',
} as const;