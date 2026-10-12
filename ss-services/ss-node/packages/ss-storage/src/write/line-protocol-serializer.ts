// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataPoint } from '../interfaces/storage-adapter.interface';

/**
 * Line Protocol 序列化器（v2 / v3 / TDengine 共用）。
 *
 * 报文格式（从 InfluxdbAdapterService.sendToInfluxDB 抽取）：
 * - measurement：tag_values
 * - tags：tagId / deviceId / projectId
 * - fields：value / value_text / quality / metadata(JSON)
 * - 时间戳：纳秒（precision=ns）
 *
 * value 类型约束（写入契约，§5.1/§8.3）：
 * Line Protocol 同一 field 在同一 shard 内只能保持单一类型。
 * 约定 value 以数值为主（number）；非数值（string / boolean）写入独立的
 * value_text field，禁止同 field 混写类型。TDengine 侧 value 固定 DOUBLE，
 * 强模式下混写类型直接报错，序列化层在此统一分流。
 */

function escapeTagValue(value: string): string {
  return value.replace(/[,= ]/g, '\\$&');
}

function escapeFieldValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

/** 序列化选项 */
export interface SerializeLineProtocolOptions {
  /**
   * 跳过字符串 field（value_text / metadata）。
   * InfluxDB 3 Core 不支持字符串 field 值（P0 实测：写入报
   * "No fields were provided"，且连累同行的数值 field 一并失败），
   * v3 引擎写入时必须开启；v2 / TDengine 保持关闭。
   */
  skipStringFields?: boolean;
}

export function serializeLineProtocol(
  points: DataPoint[],
  options: SerializeLineProtocolOptions = {},
): string {
  return points
    .map((point) => {
      const measurement = 'tag_values';
      const tags: Record<string, string> = {
        tagId: point.tagId,
        deviceId: point.deviceId,
        projectId: point.projectId,
      };
      const tagStr = Object.entries(tags)
        .map(([tagName, tagValue]) => `${tagName}=${escapeTagValue(String(tagValue))}`)
        .join(',');

      // 类型分流：数值走 value，非数值走 value_text，避免同 field 混写类型；
      // v3（skipStringFields）不支持字符串 field，非数值值直接跳过该 field
      const fields: Record<string, number | string | boolean> = {};
      if (typeof point.value === 'number') {
        fields.value = point.value;
      } else if (!options.skipStringFields) {
        if (typeof point.value === 'boolean') {
          fields.value_text = point.value ? 'true' : 'false';
        } else {
          fields.value_text = String(point.value);
        }
      }
      fields.quality = point.quality;
      if (point.metadata && !options.skipStringFields) {
        fields.metadata = JSON.stringify(point.metadata);
      }
      const fieldStr = Object.entries(fields)
        .map(([fieldName, fieldValue]) => {
          if (typeof fieldValue === 'string') {
            return `${fieldName}="${escapeFieldValue(fieldValue)}"`;
          }
          return `${fieldName}=${fieldValue}`;
        })
        .join(',');

      const timestampNanoseconds = point.timestamp ? ` ${point.timestamp.getTime() * 1000000}` : '';

      return `${measurement},${tagStr} ${fieldStr}${timestampNanoseconds}`;
    })
    .join('\n');
}
