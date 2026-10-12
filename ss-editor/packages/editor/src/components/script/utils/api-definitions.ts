// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 脚本引擎 API 定义（兼容层）
 *
 * 本文件是向后兼容的包装层，所有数据源来自 rules/script-api-registry.ts。
 * 原有的 API_DEFINITIONS、ApiCategory 等导出保持不变，确保现有代码无需修改。
 *
 * === 数据源 ===
 * 修改接口定义请直接更新 rules/script-api-registry.ts 中的 API_REGISTRY 数组，
 * 本文件会自动同步，无需手动修改。
 *
 * === 更新指南 ===
 * 1. 新增 API → rules/script-api-registry.ts 的 API_REGISTRY 数组
 * 2. 修改签名/注释 → 更新 rules/script-api-registry.ts 中对应项
 * 3. 移除 API → 从 API_REGISTRY 数组中删除
 * 4. 新增示例 → rules/examples/ 目录下对应分类文件
 * 5. 无需修改 Vue 组件代码
 */

import {
  API_REGISTRY,
  type ApiCategory,
  type ApiMethodDef,
} from '../rules/script-api-registry';

import { API_CATEGORY_LABELS } from '../rules/script-api-registry';

// 重新导出类型和常量（保持向后兼容）
export type { ApiCategory } from '../rules/script-api-registry';
export { API_CATEGORY_LABELS } from '../rules/script-api-registry';

/** API 方法定义（兼容旧格式） */
export interface ApiMethodDefinition {
  label: string;
  kind: 'function';
  detail: string;
  documentation: string;
  insertText: string;
  sortText: string;
  category: ApiCategory;
  signature: string;
}

/** 从规则注册表生成兼容格式的 API 定义列表 */
function buildApiDefinitions(): ApiMethodDefinition[] {
  return API_REGISTRY.map((api: ApiMethodDef) => ({
    label: `api.${api.name}`,
    kind: 'function' as const,
    detail: api.detail,
    documentation: api.summary,
    insertText: api.insertText,
    sortText: api.sortText,
    category: api.category,
    signature: api.signature,
  }));
}

/** 所有 API 方法定义（兼容旧格式，26 个） */
export const API_DEFINITIONS: ApiMethodDefinition[] = buildApiDefinitions();

/** 按分类分组获取 API 定义 */
export function getApiDefinitionsByCategory(): Record<string, ApiMethodDefinition[]> {
  const groups: Record<string, ApiMethodDefinition[]> = {};
  for (const def of API_DEFINITIONS) {
    const catLabel = API_CATEGORY_LABELS[def.category];
    if (!groups[catLabel]) groups[catLabel] = [];
    groups[catLabel].push(def);
  }
  return groups;
}