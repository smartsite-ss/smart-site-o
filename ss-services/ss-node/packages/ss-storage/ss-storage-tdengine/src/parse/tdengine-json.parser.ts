// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataPoint } from '@ss-node/ss-storage';

/** TDengine REST SQL 响应（/rest/sql） */
interface TdengineRestResponse {
  status: string;
  code: number;
  message?: string;
  /** 列元信息：[[列名, 类型, 字节数], ...] */
  column_meta?: [string, string, number][];
  /** 行数据：与 column_meta 顺序一致 */
  data?: unknown[][];
  rows?: number;
}

/**
 * TDengine REST SQL 结果 JSON 解析器（结果归一化）。
 *
 * - 原始返回：{ status, code, column_meta(列名数组), data(行数组), rows }；
 * - status !== 'succ' 时抛错（携带 code/message）；
 * - 列映射：ts/window_start → timestamp，value/value_text → value（数值优先）；
 * - FILL(NULL) 产生的空窗行（value 为 null）跳过，与 v2 raw「空窗跳过」语义对齐；
 * - 聚合结果不含 quality（§6.3 质量聚合语义），归一化时 quality 置 0。
 */
export class TdengineJsonParser {
  parse(rawText: string): DataPoint[] {
    const parsed = JSON.parse(rawText) as TdengineRestResponse;

    if (parsed.status !== 'succ') {
      throw new Error(
        `TDengine query failed (code ${parsed.code}): ${parsed.message || 'unknown error'}`,
      );
    }

    const columnMeta = parsed.column_meta || [];
    const dataRows = parsed.data || [];
    if (columnMeta.length === 0 || dataRows.length === 0) {
      return [];
    }

    const columnIndex = new Map(
      columnMeta.map(([columnName], index) => [columnName, index] as [string, number]),
    );

    return dataRows
      .map((row) => {
        const record: Record<string, unknown> = {};
        for (const [columnName, index] of columnIndex.entries()) {
          record[columnName] = row[index];
        }
        return this.normalizeRecord(record);
      })
      .filter((dataPoint) => dataPoint !== null);
  }

  // ──────────── 内部方法 ────────────

  private normalizeRecord(record: Record<string, unknown>): DataPoint | null {
    const timestampValue = record['ts'] ?? record['window_start'];
    if (timestampValue === undefined || timestampValue === null) {
      return null;
    }

    // FILL(NULL) 空窗行：value/value_text 均为空 → 跳过（对齐 v2 raw 空窗跳过语义）
    const numericValue = record['value'];
    const textValue = record['value_text'];
    if (
      (numericValue === null || numericValue === undefined) &&
      (textValue === null || textValue === undefined)
    ) {
      return null;
    }

    // value 数值优先，缺失时回退 value_text（§5.1 非数值分流约定）
    let value: number | string;
    if (typeof numericValue === 'number') {
      value = numericValue;
    } else if (typeof textValue === 'string' && textValue !== '') {
      value = textValue;
    } else {
      value = String(numericValue ?? '');
    }

    const timestamp =
      timestampValue instanceof Date ? timestampValue : new Date(String(timestampValue));

    return {
      tagId: String(record['tagId'] ?? ''),
      deviceId: String(record['deviceId'] ?? ''),
      projectId: String(record['projectId'] ?? ''),
      value,
      timestamp,
      quality: Number(record['quality'] ?? 0) || 0,
    };
  }
}
