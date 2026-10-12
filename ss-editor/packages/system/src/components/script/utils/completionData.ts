// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 脚本编辑器补全数据定义 (system 包)
 *
 * 核心 API 数据来自远程知识库 JSON，加载失败时回退到本地 api-definitions.ts。
 * 支持图元属性智能感知（根据图元插件类型提供 customProps 补全）。
 */

import type { ScriptEditorMode, ScriptCompletionItem } from '../ScriptEditor.types';
import { API_DEFINITIONS, type ApiMethodDefinition } from './api-definitions';
import type { GraphicSchema, GraphicFieldDef } from '../composables/useKnowledgeBase';

// ── Driver 模式专属：当前图元直接操作 API（10 个） ──

const DRIVER_GRAPHIC_COMPLETIONS: ScriptCompletionItem[] = [
  { label: 'api.setText', kind: 'function', detail: '(text: string) => void', documentation: '设置图元文本内容', insertText: 'setText(${1:text})', sortText: 'a0' },
  { label: 'api.setBackground', kind: 'function', detail: '(color: string) => void', documentation: '设置图元背景色', insertText: 'setBackground(${1:color})', sortText: 'a0' },
  { label: 'api.setVisible', kind: 'function', detail: '(visible: boolean) => void', documentation: '设置图元显隐', insertText: 'setVisible(${1:true})', sortText: 'a0' },
  { label: 'api.setBorder', kind: 'function', detail: '(color: string, width?: number) => void', documentation: '设置边框', insertText: 'setBorder(${1:color}, ${2:width})', sortText: 'a0' },
  { label: 'api.setFontSize', kind: 'function', detail: '(size: number) => void', documentation: '设置文字大小', insertText: 'setFontSize(${1:14})', sortText: 'a0' },
  { label: 'api.setFontColor', kind: 'function', detail: '(color: string) => void', documentation: '设置文字颜色', insertText: 'setFontColor(${1:color})', sortText: 'a0' },
  { label: 'api.setRotation', kind: 'function', detail: '(degrees: number) => void', documentation: '设置旋转角度', insertText: 'setRotation(${1:0})', sortText: 'a0' },
  { label: 'api.setOpacity', kind: 'function', detail: '(opacity: number) => void', documentation: '设置不透明度(0-1)', insertText: 'setOpacity(${1:1})', sortText: 'a0' },
  { label: 'api.setPosition', kind: 'function', detail: '(x: number, y: number) => void', documentation: '设置坐标', insertText: 'setPosition(${1:x}, ${2:y})', sortText: 'a0' },
  { label: 'api.setSize', kind: 'function', detail: '(w: number, h: number) => void', documentation: '设置宽高', insertText: 'setSize(${1:w}, ${2:h})', sortText: 'a0' },
];

// ── 上下文变量 ──

const COMMON_CONTEXT_COMPLETIONS: ScriptCompletionItem[] = [
  { label: 'data', kind: 'variable', detail: '{ number, unit, color, text, raw }', documentation: '当前数据点', insertText: 'data', sortText: 'y' },
  { label: 'context', kind: 'variable', detail: '{ graphicId, tagValues, triggerType }', documentation: '脚本上下文', insertText: 'context', sortText: 'y' },
];

/**
 * 将 ApiMethodDefinition 转换为 Monaco ScriptCompletionItem
 */
function apiDefToCompletion(api: ApiMethodDefinition): ScriptCompletionItem {
  return {
    label: api.label,
    kind: api.kind,
    detail: api.detail,
    documentation: api.documentation,
    insertText: api.insertText,
    sortText: api.sortText,
  };
}

/** 从知识库注册表或本地定义生成所有 API 补全项 */
function getCommonApiCompletions(apiRegistry?: ApiMethodDefinition[]): ScriptCompletionItem[] {
  const registry = apiRegistry ?? API_DEFINITIONS;
  return registry.map(apiDefToCompletion);
}

// ═══════════════════════════════════════════════════════════════
// 图元属性智能感知（新增）
// ═══════════════════════════════════════════════════════════════

/**
 * 将 GraphicFieldDef 转换为补全项
 */
function graphicFieldToCompletion(field: GraphicFieldDef): ScriptCompletionItem {
  let typeDetail = field.type;
  if (field.options && field.options.length > 0) {
    typeDetail += ' | ' + field.options.map((o) => o.value).join(' | ');
  }

  const docParts = [`类型: ${field.type}`];
  if (field.defaultValue !== undefined) {
    docParts.push(`默认值: ${JSON.stringify(field.defaultValue)}`);
  }
  if (field.min !== undefined) docParts.push(`最小值: ${field.min}`);
  if (field.max !== undefined) docParts.push(`最大值: ${field.max}`);

  return {
    label: field.name,
    kind: 'variable',
    detail: typeDetail,
    documentation: docParts.join('\n'),
    insertText: `${field.name}: \${1:${field.defaultValue ?? ''}}`,
    sortText: 'b',
  };
}

/**
 * 根据图元插件类型获取 customProps 补全项
 */
export function getGraphicPropCompletions(
  pluginType: string,
  schemas?: GraphicSchema[]
): ScriptCompletionItem[] {
  const schema = schemas?.find((s) => s.pluginType === pluginType);
  if (!schema || !schema.fields.length) return [];

  return schema.fields.map(graphicFieldToCompletion);
}

/**
 * 获取所有图元类型的补全提示
 */
export function getGraphicTypeCompletions(
  schemas?: GraphicSchema[]
): ScriptCompletionItem[] {
  return (schemas ?? []).map((s) => ({
    label: s.pluginType,
    kind: 'keyword',
    detail: s.displayName,
    documentation: `${s.displayName} (${s.category})\n支持 ${s.fields.length} 个自定义属性`,
    insertText: s.pluginType,
    sortText: 'b',
  }));
}

// ═══════════════════════════════════════════════════════════════
// 模式补全导出
// ═══════════════════════════════════════════════════════════════

export function getCompletionsByMode(
  mode: ScriptEditorMode,
  apiRegistry?: ApiMethodDefinition[],
  graphicSchemas?: GraphicSchema[],
  graphicPluginType?: string
): ScriptCompletionItem[] {
  switch (mode) {
    case 'filter':
      return getFilterCompletions(apiRegistry);
    case 'driver':
      return getDriverCompletions(apiRegistry, graphicSchemas, graphicPluginType);
    case 'interaction':
      return getInteractionCompletions(apiRegistry);
    case 'timer':
      return getTimerCompletions(apiRegistry);
    case 'expression':
      return [];
    default:
      return [];
  }
}

function getDriverCompletions(
  apiRegistry?: ApiMethodDefinition[],
  graphicSchemas?: GraphicSchema[],
  graphicPluginType?: string
): ScriptCompletionItem[] {
  const completions: ScriptCompletionItem[] = [
    ...DRIVER_GRAPHIC_COMPLETIONS,
    ...getCommonApiCompletions(apiRegistry),
    ...COMMON_CONTEXT_COMPLETIONS,
  ];

  // 如果有指定图元类型，附加其 customProps 补全
  if (graphicPluginType) {
    completions.push(...getGraphicPropCompletions(graphicPluginType, graphicSchemas));
  }

  return completions;
}

function getFilterCompletions(apiRegistry?: ApiMethodDefinition[]): ScriptCompletionItem[] {
  return [
    ...getCommonApiCompletions(apiRegistry),
    { label: 'data', kind: 'variable', detail: '{ number, unit, color, text, raw }', documentation: '数据对象', insertText: 'data', sortText: 'a' },
    { label: 'return', kind: 'keyword', detail: 'return statement', documentation: '返回数据', insertText: 'return ${1:data};', sortText: 'a' },
  ];
}

function getInteractionCompletions(apiRegistry?: ApiMethodDefinition[]): ScriptCompletionItem[] {
  return [
    ...getCommonApiCompletions(apiRegistry),
    { label: 'event', kind: 'variable', detail: '{ graphicId, x, y, type }', documentation: '事件数据', insertText: 'event', sortText: 'y' },
    ...COMMON_CONTEXT_COMPLETIONS,
  ];
}

function getTimerCompletions(apiRegistry?: ApiMethodDefinition[]): ScriptCompletionItem[] {
  return [
    ...getCommonApiCompletions(apiRegistry),
    { label: 'page', kind: 'variable', detail: '{ getGraphics, getCurrentPageId, switchPage }', documentation: '页面 API', insertText: 'page', sortText: 'y' },
    { label: 'timer', kind: 'variable', detail: '{ interval, count }', documentation: '定时器信息', insertText: 'timer', sortText: 'y' },
    ...COMMON_CONTEXT_COMPLETIONS,
  ];
}