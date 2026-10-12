// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 模板变量注入与解析
 *
 * 组件模板（WidgetTemplate）图元 JSON 中以 `{{key}}` 形式书写占位符，
 * 实例化时根据 variables 定义进行替换。
 *
 * 与设备模板变量（DeviceTemplateVariable，${expr} 采集点）完全不同：
 * 此处仅做 UI 占位符的字符串/数值替换，不生成 DataTag、不做采集。
 */

import type { WidgetTemplateVariable } from './widget-template.types';

const PLACEHOLDER_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** 提取字符串中的所有占位符键 */
export function extractPlaceholders(text: string): string[] {
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE);
  while ((m = re.exec(text)) !== null) {
    if (!keys.includes(m[1])) keys.push(m[1]);
  }
  return keys;
}

/** 将单个字符串中的占位符替换为变量值 */
export function resolveText(
  text: string,
  values: Record<string, string | number>,
): string {
  if (typeof text !== 'string') return text;
  return text.replace(PLACEHOLDER_RE, (_, key: string) => {
    const v = values[key];
    return v === undefined ? '' : String(v);
  });
}

/**
 * 深度遍历 graphics JSON，对 props / text / fill 等字段执行占位符替换。
 * 同时处理 targetPath 形式的精确注入（覆盖默认文本替换）。
 */
export function applyVariables(
  graphics: any[],
  variables: WidgetTemplateVariable[],
  values: Record<string, string | number>,
): any[] {
  const merged: Record<string, string | number> = {};
  for (const v of variables) {
    merged[v.key] =
      values[v.key] !== undefined ? values[v.key] : v.defaultValue ?? '';
  }

  const clone = JSON.parse(JSON.stringify(graphics));

  // 1) 默认：对字符串字段做占位符替换
  deepResolve(clone, merged);

  // 2) 精确注入：targetPath 显式指定路径
  for (const v of variables) {
    if (v.targetPath) {
      setByPath(clone, v.targetPath, merged[v.key] ?? '');
    }
  }

  return clone;
}

function deepResolve(node: any, values: Record<string, string | number>): void {
  if (Array.isArray(node)) {
    node.forEach((n) => deepResolve(n, values));
    return;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      const val = node[k];
      if (typeof val === 'string') {
        if (val.includes('{{')) node[k] = resolveText(val, values);
      } else if (typeof val === 'object' && val !== null) {
        deepResolve(val, values);
      }
    }
  }
}

/** 按路径设置值，如 "graphics[0].props.text" */
function setByPath(root: any, path: string, value: any): void {
  const segs = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let cur = root;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur == null) return;
    cur = cur[segs[i]];
  }
  if (cur != null) cur[segs[segs.length - 1]] = value;
}
