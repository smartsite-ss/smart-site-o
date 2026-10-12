// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface SchemaMigration {
  from: number;
  to: number;
  migrate: (props: Record<string, any>) => Record<string, any>;
}

export interface PluginTestDefinition {
  defaultProps: Record<string, any>;
  propCombinations?: Record<string, any>[];
  checkpoints?: { name: string; x: string; y: string; expected: string }[];
  migrationTests?: {
    fromVersion: number;
    inputProps: Record<string, any>;
    assertProps: Record<string, any>;
  }[];
}

export interface PluginPropertySchemaField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'range' | 'checkbox' | 'textarea' | 'color-array' | 'string' | 'image';
  label: string;
  labelKey?: string;
  defaultValue?: any;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: any; label: string; labelKey?: string }[];
  /** 动态选项提供者。
   * - 字符串 key：由属性面板根据已知 key 解析（如 'pageStore.pages'）
   * - 函数：运行时调用返回选项列表（需确保在 Vue setup 上下文中调用）
   */
  optionsProvider?: string | (() => { value: any; label: string }[]);
  group?: string;
  groupKey?: string;
  /** 标记此字段可被数据源绑定。
   * - true：该字段出现在 DataPanel 属性选择 UI 的候选列表中
   * - 未设置：默认不参与数据绑定候选（保守策略，避免误绑定语义不符的字段）
   * 典型可绑定字段：text / type / disabled / backgroundColor / fontColor / borderColor / targetPage
   */
  dataBindable?: boolean;
}

export type SchemaField = PluginPropertySchemaField

export interface PluginPropertySchema {
  name?: string;
  layout?: 'vertical' | 'grid';
  columns?: number;
  fields: PluginPropertySchemaField[];
  propsPath?: string;
  defaultValueFactory?: () => Record<string, any>;
}

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