// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { FormatterType } from '../types';

/**
 * 从嵌套路径取值  e.g. "user.profile.name"
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

/**
 * 内置格式化器注册表
 */
const formatterMap: Record<FormatterType, (value: any, _row?: any) => string> = {
  time: (v) => {
    if (!v) return '-';
    try {
      let dateValue = v;
      if (typeof v === 'object') {
        if (v instanceof Date) {
          dateValue = v;
        } else if (typeof v.toISOString === 'function') {
          dateValue = v;
        } else if (v.value) {
          dateValue = v.value;
        } else if (v.date) {
          dateValue = v.date;
        } else if (v.time) {
          dateValue = v.time;
        } else if (v.timestamp) {
          dateValue = v.timestamp;
        } else if (v.createdAt) {
          dateValue = v.createdAt;
        } else if (v.updatedAt) {
          dateValue = v.updatedAt;
        } else {
          dateValue = JSON.stringify(v);
        }
      }
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return String(v);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return String(v);
    }
  },
  period: (v) => {
    if (v == null || v <= 0) return '-';
    if (v < 1000) return `${v}ms`;
    if (v < 60000) return `${(v / 1000).toFixed(1)}s`;
    return `${(v / 60000).toFixed(1)}min`;
  },
  status: (v) => String(v ?? '-'),
  bool: (v) => (v ? '是' : '否'),
  number: (v) => {
    if (v == null || v === '') return '-';
    const n = Number(v);
    return isNaN(n) ? String(v) : n.toLocaleString('zh-CN');
  },
  percent: (v) => {
    if (v == null || v === '') return '-';
    const n = Number(v);
    return isNaN(n) ? String(v) : `${(n * 100).toFixed(1)}%`;
  },
};

/**
 * 应用格式化器
 */
export function applyFormatter(
  value: any,
  formatter?: FormatterType,
  render?: (value: any, row: any, index: number) => any,
  row?: any,
  index?: number,
): string {
  if (render) {
    const result = render(value, row, index ?? 0);
    return String(result ?? '');
  }
  if (formatter) {
    return formatterMap[formatter](value, row);
  }
  if (value === null || value === undefined || value === '') return '-';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
