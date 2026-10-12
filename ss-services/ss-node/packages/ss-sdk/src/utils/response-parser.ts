// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ApiResponse, PaginatedResult } from '../types';

/**
 * 分页 pageSize 全局上限（与 PaginationDto 的 @Max(100) 校验一致）。
 * 超限会触发 400「must not be greater than 100」。
 * 全部前端列表页统一引用此常量，禁止硬编码超界值（如 200）。
 * 详见架构设计 07-接口设计规范 §2.4 / §4.2。
 */
export const MAX_PAGE_SIZE = 100;

/**
 * 解析 ss-node TransformInterceptor 包装的响应体。
 *
 * 后端包装体结构：`{ code, data: <业务体>, message, timestamp }`
 * 识别特征：**同时存在 `timestamp` 与 `data` 字段**。
 *
 * 解包分支（详见架构设计 07-接口设计规范 §2.3）：
 *   - 含 `pagination` 字段 → 返回完整 `{ data, pagination }`（分页接口，调用方读取 `pagination.totalPages`）
 *   - 不含 `pagination` → 解包 `data`（单对象 / 扁平分页）
 *
 * 历史坑：早期实现一律 `return bodyRecord.data`，导致标签类扁平分页响应被解包成
 * `{ data:[...], total, page, pageSize }`，调用方再读 `pagination` 得到 `undefined` →
 * 抛异常被 catch 误判为"加载失败"。必须以 `pagination` 字段存在性作为分支依据。
 *
 * 兼容：保留对含 `success` 字段的旧 ApiResponse 的解析（早期 ss-data 体系），新代码不应依赖。
 */
export function parseBusinessResponse<T>(body: unknown): T {
  const bodyRecord = body as Record<string, unknown> | null;

  // 旧 ss-data ApiResponse（含 success 字段）——兼容保留，新代码不应使用
  if (bodyRecord !== null && typeof bodyRecord === 'object' && 'success' in bodyRecord) {
    const wrapped = bodyRecord as unknown as { success: boolean; data: T; code: string; message: string };
    if (wrapped.success) {
      return wrapped.data;
    }
    // 旧契约下 success=false 视为业务错误，由调用方/上层错误处理捕获
    return body as T;
  }

  // ss-node TransformInterceptor 包装（{code, data, message, timestamp}，无 success）
  if (
    bodyRecord !== null &&
    typeof bodyRecord === 'object' &&
    'timestamp' in bodyRecord &&
    'data' in bodyRecord
  ) {
    // 分页响应含 pagination：保留完整结构，供调用方读取 pagination.totalPages
    if ('pagination' in bodyRecord) {
      return bodyRecord as unknown as T;
    }
    // 单对象 / 扁平分页：解包 data
    return (bodyRecord as { data: T }).data;
  }

  // 非包装体（如裸数组、裸字符串）原样返回
  return body as T;
}

/**
 * 类型守卫：判断响应体是否为 ss-node TransformInterceptor 包装体。
 */
export function isTransformWrapped(body: unknown): boolean {
  const rec = body as Record<string, unknown> | null;
  return (
    rec !== null &&
    typeof rec === 'object' &&
    'timestamp' in rec &&
    'data' in rec
  );
}

/**
 * 类型守卫：判断响应体是否为分页结果（含 data 数组 + pagination）。
 */
export function isPaginatedResult<T>(body: unknown): body is PaginatedResult<T> {
  const rec = body as Record<string, unknown> | null;
  if (rec === null || typeof rec !== 'object') return false;
  return 'data' in rec && 'pagination' in rec;
}

/**
 * 从任意响应体中提取分页结果（兼容包装体与非包装体）。
 * 用于前端解包后仍需兼容多种结构形态的兜底场景。
 */
export function extractPaginated<T>(body: unknown): PaginatedResult<T> | null {
  if (isPaginatedResult<T>(body)) {
    return body;
  }
  if (isTransformWrapped(body)) {
    const inner = (body as { data: unknown }).data;
    if (isPaginatedResult<T>(inner)) {
      return inner;
    }
  }
  return null;
}

export type { ApiResponse };
