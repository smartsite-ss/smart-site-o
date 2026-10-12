// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 脚本示例类型定义
 *
 * 所有示例文件的统一类型接口，用于在 Vue 组件中渲染示例列表。
 */

/** 脚本示例分类 */
export type ExampleCategory =
  | 'data-driven'        // 数据驱动
  | 'scheduled-task'     // 定时任务
  | 'event-driven'       // 事件驱动
  | 'multi-tag-linking'  // 多标签联动
  | 'graphic-operation'  // 图元操作
  | 'alarm-management';  // 告警管理

/** 示例分类中文标签 */
export const EXAMPLE_CATEGORY_LABELS: Record<ExampleCategory, string> = {
  'data-driven': '数据驱动',
  'scheduled-task': '定时任务',
  'event-driven': '事件驱动',
  'multi-tag-linking': '多标签联动',
  'graphic-operation': '图元操作',
  'alarm-management': '告警管理',
};

/** 示例分类图标 */
export const EXAMPLE_CATEGORY_ICONS: Record<ExampleCategory, string> = {
  'data-driven': '📊',
  'scheduled-task': '⏱',
  'event-driven': '⚡',
  'multi-tag-linking': '🔗',
  'graphic-operation': '🎨',
  'alarm-management': '🔔',
};

/** 触发方式 */
export type TriggerType = 'dataChange' | 'schedule' | 'event' | 'manual' | 'expression';

/** 单个脚本示例 */
export interface ScriptExample {
  /** 唯一标识 */
  id: string;
  /** 示例标题 */
  title: string;
  /** 示例描述 */
  description: string;
  /** 所属分类 */
  category: ExampleCategory;
  /** 触发方式 */
  triggerType: TriggerType;
  /** Cron 表达式（定时任务时使用） */
  cronExpression?: string;
  /** 事件名称（事件驱动时使用） */
  eventName?: string;
  /** 依赖的标签列表 */
  requiredTags?: string[];
  /** 标签（用于筛选） */
  tags: string[];
  /** 难度等级 */
  difficulty: 'easy' | 'medium' | 'hard';
  /** 脚本代码 */
  code: string;
}

/** 按分类分组的示例集合 */
export interface ExampleGroup {
  category: ExampleCategory;
  label: string;
  icon: string;
  examples: ScriptExample[];
}