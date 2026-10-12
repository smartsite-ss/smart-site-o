// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 脚本引擎规则文件 — 统一导出入口
 *
 * === 文件结构 ===
 * rules/
 * ├── index.ts                       ← 本文件（统一导出）
 * ├── types.ts                       ← 类型定义
 * ├── script-api-registry.ts         ← API 接口注册表（26 个方法）
 * └── examples/
 *     ├── data-driven.examples.ts     ← 数据驱动示例
 *     ├── scheduled-task.examples.ts  ← 定时任务示例
 *     ├── event-driven.examples.ts    ← 事件驱动示例
 *     ├── multi-tag-linking.examples.ts ← 多标签联动示例
 *     ├── graphic-operation.examples.ts ← 图元操作示例
 *     └── alarm-management.examples.ts  ← 告警管理示例
 *
 * === 使用方式 ===
 * 在 Vue 组件中导入：
 *   import { API_REGISTRY, getApiGroupedByCategory, ALL_EXAMPLES, getExamplesByCategory } from '../rules';
 *
 * === 更新流程 ===
 * 1. 新增 API：修改 script-api-registry.ts 中的 API_REGISTRY 数组
 * 2. 新增示例：在对应分类的 examples/*.ts 文件中添加
 * 3. 新增分类：创建新的 examples/*.ts，在下面的 ALL_EXAMPLES 中导入
 * 4. 无需修改任何 Vue 组件代码
 */

// ═══════════════════════════════════════════════════════════════
// 导出类型
// ═══════════════════════════════════════════════════════════════
export type {
  ApiCategory,
  ApiMethodDef,
  ApiParamDef,
} from './script-api-registry';

export type {
  ExampleCategory,
  ScriptExample,
  ExampleGroup,
  TriggerType,
} from './types';

export {
  API_CATEGORY_LABELS,
  API_CATEGORY_ICONS,
} from './script-api-registry';

export {
  EXAMPLE_CATEGORY_LABELS,
  EXAMPLE_CATEGORY_ICONS,
} from './types';

// ═══════════════════════════════════════════════════════════════
// 导出 API 注册表
// ═══════════════════════════════════════════════════════════════
export {
  API_REGISTRY,
  getApiByCategory,
  getApiGroupedByCategory,
  getApiByEnvironment,
  getApiByName,
  getApiNames,
  getApiCount,
} from './script-api-registry';

// ═══════════════════════════════════════════════════════════════
// 导出所有示例
// ═══════════════════════════════════════════════════════════════
import { dataDrivenExamples } from './examples/data-driven.examples';
import { scheduledTaskExamples } from './examples/scheduled-task.examples';
import { eventDrivenExamples } from './examples/event-driven.examples';
import { multiTagLinkingExamples } from './examples/multi-tag-linking.examples';
import { graphicOperationExamples } from './examples/graphic-operation.examples';
import { alarmManagementExamples } from './examples/alarm-management.examples';
import type { ScriptExample, ExampleGroup, ExampleCategory } from './types';
import { EXAMPLE_CATEGORY_LABELS, EXAMPLE_CATEGORY_ICONS } from './types';

/** 所有示例的扁平列表 */
export const ALL_EXAMPLES: ScriptExample[] = [
  ...dataDrivenExamples,
  ...scheduledTaskExamples,
  ...eventDrivenExamples,
  ...multiTagLinkingExamples,
  ...graphicOperationExamples,
  ...alarmManagementExamples,
];

/** 按分类分组的示例 */
export const ALL_EXAMPLE_GROUPS: ExampleGroup[] = [
  { category: 'data-driven', label: EXAMPLE_CATEGORY_LABELS['data-driven'], icon: EXAMPLE_CATEGORY_ICONS['data-driven'], examples: dataDrivenExamples },
  { category: 'scheduled-task', label: EXAMPLE_CATEGORY_LABELS['scheduled-task'], icon: EXAMPLE_CATEGORY_ICONS['scheduled-task'], examples: scheduledTaskExamples },
  { category: 'event-driven', label: EXAMPLE_CATEGORY_LABELS['event-driven'], icon: EXAMPLE_CATEGORY_ICONS['event-driven'], examples: eventDrivenExamples },
  { category: 'multi-tag-linking', label: EXAMPLE_CATEGORY_LABELS['multi-tag-linking'], icon: EXAMPLE_CATEGORY_ICONS['multi-tag-linking'], examples: multiTagLinkingExamples },
  { category: 'graphic-operation', label: EXAMPLE_CATEGORY_LABELS['graphic-operation'], icon: EXAMPLE_CATEGORY_ICONS['graphic-operation'], examples: graphicOperationExamples },
  { category: 'alarm-management', label: EXAMPLE_CATEGORY_LABELS['alarm-management'], icon: EXAMPLE_CATEGORY_ICONS['alarm-management'], examples: alarmManagementExamples },
];

/** 按分类获取示例 */
export function getExamplesByCategory(category: ExampleCategory): ScriptExample[] {
  return ALL_EXAMPLES.filter((e) => e.category === category);
}

/** 按难度获取示例 */
export function getExamplesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): ScriptExample[] {
  return ALL_EXAMPLES.filter((e) => e.difficulty === difficulty);
}

/** 按标签筛选示例 */
export function getExamplesByTag(tag: string): ScriptExample[] {
  return ALL_EXAMPLES.filter((e) => e.tags.includes(tag));
}

/** 获取示例总数 */
export function getExampleCount(): number {
  return ALL_EXAMPLES.length;
}

/** 获取所有标签列表 */
export function getAllExampleTags(): string[] {
  const tagSet = new Set<string>();
  for (const example of ALL_EXAMPLES) {
    for (const tag of example.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}