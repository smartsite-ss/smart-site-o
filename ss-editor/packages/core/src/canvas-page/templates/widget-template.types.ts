// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 组件模板（Widget Template）类型定义
 *
 * 与页面模板（PageTemplate）平行，但组件模板聚合的是"图元集合"（通常是一个分组），
 * 并通过 `variables` 暴露参数化占位符（{{key}}），供实例化时注入。
 */

/** 变量类型 */
export type WidgetTemplateVariableType = 'text' | 'number' | 'color' | 'bind-tag';

/** 组件模板变量定义 */
export interface WidgetTemplateVariable {
  key: string; // 占位符键，如 "title"
  label: string; // 展示名
  type: WidgetTemplateVariableType;
  defaultValue?: string | number;
  targetPath?: string; // 注入目标，如 "graphics[0].props.text"
}

/** 组件模板完整数据 */
export interface WidgetTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  author: string;
  source: 'builtin' | 'user' | 'market';
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
  schemaVersion: number;
  graphics: any[]; // IGraphicJSON[] 序列化结果
  variables: WidgetTemplateVariable[];
  tags?: string[];
}

/** 组件模板元数据（列表项，不含 graphics） */
export interface WidgetTemplateMeta {
  id: string;
  name: string;
  description?: string;
  category: string;
  author: string;
  source: 'builtin' | 'user' | 'market';
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
  schemaVersion: number;
  hasVariables: boolean;
  variableCount: number;
  tags?: string[];
}

/** 组件模板分类（与页面模板共享） */
export type WidgetTemplateCategory =
  | 'common'
  | 'industry'
  | 'energy'
  | 'monitor'
  | 'custom';
