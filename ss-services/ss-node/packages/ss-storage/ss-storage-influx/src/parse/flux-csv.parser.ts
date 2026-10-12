// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DataPoint } from '@ss-node/ss-storage';

/**
 * InfluxDB 2 Flux CSV 响应解析器（结果归一化）。
 *
 * 从 InfluxdbAdapterService.parseCsvResponse() 抽取，解析逻辑保持不变：
 * - 跳过 # 开头的 annotation 行；
 * - 按 _time/tagId/deviceId/projectId/value/value_text/quality 列取值；
 * - value 列缺失时回退 value_text（§5.1 非数值分流约定）。
 */
export class FluxCsvParser {
  parse(csvText: string): DataPoint[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // 定位表头行（跳过 # 开头的 annotation 行）
    let headerIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('#')) {
        headerIndex = i;
        break;
      }
    }

    const headers = lines[headerIndex].split(',');
    const dataLines = lines.slice(headerIndex + 1).filter((line) => line.trim() !== '');

    const timeIndex = headers.findIndex((header) => header === '_time');
    const tagIdIndex = headers.findIndex((header) => header === 'tagId');
    const deviceIdIndex = headers.findIndex((header) => header === 'deviceId');
    const projectIdIndex = headers.findIndex((header) => header === 'projectId');
    const valueIndex = headers.findIndex((header) => header === 'value');
    const valueTextIndex = headers.findIndex((header) => header === 'value_text');
    const qualityIndex = headers.findIndex((header) => header === 'quality');

    return dataLines.map((line) => {
      const columns = line.split(',');
      const getColumnValue = (index: number) =>
        index >= 0 && index < columns.length ? columns[index] : '';

      // value 数值优先，缺失时回退 value_text（非数值点）
      const rawValue = getColumnValue(valueIndex);
      const fallbackText = getColumnValue(valueTextIndex);
      const value: number | string =
        rawValue !== '' ? parseFloat(rawValue) || rawValue : fallbackText;

      return {
        tagId: getColumnValue(tagIdIndex),
        deviceId: getColumnValue(deviceIdIndex),
        projectId: getColumnValue(projectIdIndex),
        value,
        timestamp: new Date(getColumnValue(timeIndex)),
        quality: parseInt(getColumnValue(qualityIndex), 10) || 0,
      };
    });
  }
}
