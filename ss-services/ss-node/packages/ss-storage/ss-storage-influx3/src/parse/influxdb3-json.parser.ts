// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataPoint } from '@ss-node/ss-storage';

/**
 * InfluxDB 3 Core SQL 查询 JSON 响应解析器（结果归一化）。
 *
 * 兼容三种返回形态（v3 format=json 的具体形态待 P0 实测收敛，见方案 §11-2）：
 * 1. { columns: [...], rows: [[...], ...] }（列名 + 行数组）
 * 2. { series: [{ columns: [...], values: [[...], ...] }] }（InfluxQL 风格）
 * 3. [{ time: ..., tagId: ... }, ...]（对象数组）
 *
 * 列映射：time/window_start → timestamp，value/value_text → value（数值优先）。
 * 聚合结果不含 quality（§6.3 质量聚合语义），归一化时 quality 置 0。
 */
export class Influxdb3JsonParser {
  parse(rawText: string): DataPoint[] {
    const parsed = JSON.parse(rawText);

    if (Array.isArray(parsed)) {
      return parsed
        .map((record) => this.normalizeRecord(record))
        .filter((dataPoint) => dataPoint !== null);
    }

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
        return this.parseColumnarRows(parsed.columns, parsed.rows);
      }
      if (Array.isArray(parsed.series)) {
        return parsed.series.flatMap((seriesItem: any) =>
          Array.isArray(seriesItem?.columns) && Array.isArray(seriesItem?.values)
            ? this.parseColumnarRows(seriesItem.columns, seriesItem.values)
            : [],
        );
      }
      // 单对象（标量聚合等场景无时间列）→ 无法归一化为 DataPoint，返回空
      return [];
    }

    return [];
  }

  // ──────────── 内部方法 ────────────

  private parseColumnarRows(columns: string[], rows: unknown[][]): DataPoint[] {
    const columnIndex = new Map(columns.map((columnName, index) => [columnName, index]));

    return rows
      .map((row) => {
        const record: Record<string, unknown> = {};
        for (const [columnName, index] of columnIndex.entries()) {
          record[columnName] = row[index];
        }
        return this.normalizeRecord(record);
      })
      .filter((dataPoint) => dataPoint !== null);
  }

  private normalizeRecord(record: Record<string, unknown>): DataPoint | null {
    const timestampValue = record['time'] ?? record['window_start'];
    if (timestampValue === undefined || timestampValue === null) {
      return null;
    }

    // value 数值优先，缺失时回退 value_text（§5.1 非数值分流约定）
    const numericValue = record['value'];
    const textValue = record['value_text'];
    let value: number | string;
    if (typeof numericValue === 'number') {
      value = numericValue;
    } else if (
      typeof numericValue === 'string' &&
      numericValue.trim() !== '' &&
      !isNaN(Number(numericValue))
    ) {
      value = Number(numericValue);
    } else if (typeof textValue === 'string') {
      value = textValue;
    } else {
      value = String(numericValue ?? textValue ?? '');
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
