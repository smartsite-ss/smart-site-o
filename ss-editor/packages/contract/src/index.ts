// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 跨端接口契约共享解包器（单一来源）
 *
 * 后端统一经 TransformInterceptor 包装列表接口为：
 *   { code, data: { data: [...], pagination }, message, timestamp }
 * 部分历史/扁平接口直接返回数组或 { data: [...] }。
 * 本模块提供统一的提取入口，消除各前端重复编写兼容分支。
 */

/** 标准分页结构（来自 TransformInterceptor） */
export interface StandardPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
}

/** 标准包装响应 */
export interface StandardListEnvelope<T> {
  code?: number;
  message?: string;
  timestamp?: number;
  data?: T[] | { data: T[]; pagination?: StandardPagination };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 从响应中提取列表数组。
 * 兼容以下几种结构：
 *   - 标准包装：{ data: { data: [...], pagination } }
 *   - 半包装：{ data: [...] }
 *   - 直接数组：[...]
 *   - 包装在 data 上的对象：{ data: [...] }
 * 提取不到时返回空数组，绝不抛错。
 */
export function extractListData<T = any>(payload: unknown): T[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload as T[];

  if (!isPlainObject(payload)) return [];

  const data = (payload as Record<string, unknown>).data;

  // 标准包装：data 是 { data: [...], pagination }
  if (isPlainObject(data)) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner as T[];
  }

  // 半包装：data 直接是数组
  if (Array.isArray(data)) return data as T[];

  return [];
}

/**
 * 从响应中提取分页信息（若不存在则返回 undefined）。
 */
export function extractPagination(
  payload: unknown,
): StandardPagination | undefined {
  if (!isPlainObject(payload)) return undefined;
  const data = (payload as Record<string, unknown>).data;
  if (isPlainObject(data)) {
    const pagination = (data as Record<string, unknown>).pagination;
    if (isPlainObject(pagination)) return pagination as unknown as StandardPagination;
  }
  return undefined;
}
