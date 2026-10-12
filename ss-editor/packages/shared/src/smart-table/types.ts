// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { VNode } from 'vue';

// ============================================================
// Column 配置
// ============================================================

/** 内置格式化器 */
export type FormatterType =
  | 'time'      // → "07-09 14:30"
  | 'period'    // → "1.0s" / "30.0s" / "2.0min"
  | 'status'    // → 渲染 status-badge
  | 'bool'      // → "是" / "否"
  | 'number'    // → 千分位
  | 'percent';  // → "85.0%"

/** 列编辑器类型 */
export type ColumnEditor = 'text' | 'number' | 'select' | 'date';

/** 编辑器下拉选项 */
export interface EditorOption {
  label: string;
  value: string | number | boolean;
}

/** 单元格合并信息 */
export interface CellSpan {
  colspan: number;
  rowspan: number;
}

/** 合并单元格方法 */
export type SpanMethod<T = any> = (
  row: T,
  column: SmartTableColumn<T>,
  rowIndex: number,
  columnIndex: number,
) => CellSpan;

/** 列定义 */
export interface SmartTableColumn<T = any> {
  key: string;
  title: string | ((col: SmartTableColumn<T>) => string);
  dataKey?: string;
  width?: number | string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => VNode | string;
  formatter?: FormatterType;
  defaultVisible?: boolean;
  required?: boolean;
  className?: string;
  headerClassName?: string;
  exportTitle?: string;
  excludeFromExport?: boolean;
  /** 该列是否可编辑（需配合 editable prop 开启） */
  editable?: boolean;
  /** 编辑器类型，默认 'text' */
  editor?: ColumnEditor;
  /** select 编辑器的选项 */
  editorOptions?: EditorOption[];
  /** 列级 colspan 计算（返回数字，默认 1） */
  colspan?: (row: T, rowIndex: number) => number;
  /** 列级 rowspan 计算（返回数字，默认 1） */
  rowspan?: (row: T, rowIndex: number) => number;
}

// ============================================================
// 分页
// ============================================================

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  mode: 'client' | 'server';
}

export interface PageChangeEvent {
  page: number;
  pageSize: number;
}

// ============================================================
// 列配置持久化
// ============================================================

export interface ColumnPersist {
  hiddenKeys: string[];
  updatedAt: number;
}

// ============================================================
// 导出
// ============================================================

export type ExportFormat = 'xlsx' | 'csv' | 'png';

export interface ExportEvent {
  format: ExportFormat;
  columns: SmartTableColumn[];
  data: any[];
}

// ============================================================
// 排序
// ============================================================

export interface SortConfig {
  key: string;
  order: 'asc' | 'desc' | '';
}

export interface SortChangeEvent {
  key: string;
  order: 'asc' | 'desc' | '';
}

// ============================================================
// 行编辑
// ============================================================

/** 行编辑事件 payload */
export interface RowEditEvent<T = any> {
  row: T;
  rowId: any;
  changes: Partial<T>;
}

// ============================================================
// 树形表格
// ============================================================

/** 扁平化后的树节点行 */
export interface FlatTreeRow<T = any> {
  row: T;
  level: number;
  hasChildren: boolean;
  rawIndex: number;
  /** 在原始 data 中的父级路径，用于事件回传 */
  parentKey?: any;
}

/** 树展开/折叠事件 payload */
export interface TreeExpandEvent<T = any> {
  row: T;
  rowKey: any;
  expanded: boolean;
  level: number;
}
