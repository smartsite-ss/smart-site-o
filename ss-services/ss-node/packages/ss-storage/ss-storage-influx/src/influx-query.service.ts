// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxBucketService } from './influx-bucket.service';

/**
 * InfluxDB 查询结果行（从 Flux pivot 后的 CSV 解析）
 */
export interface InfluxQueryRow {
  tagId: string;
  value: number;
  quality: string;
  timestamp: Date;
  deviceId?: string;
  projectId?: string;
}

/**
 * InfluxDB Flux 查询服务
 *
 * 职责：
 * - 构建 Flux 查询语句
 * - 通过 InfluxDB HTTP API 执行查询
 * - 解析 CSV 响应为 InfluxQueryRow[]
 * - 支持按项目 bucket 查询
 *
 * 容错：InfluxDB 不可用时抛出错误，由调用方（DataQueryService）处理降级。
 */
@Injectable()
export class InfluxQueryService {
  private readonly logger = new Logger(InfluxQueryService.name);

  private readonly influxUrl: string;
  private readonly influxToken: string;
  private readonly influxOrg: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly bucketService: InfluxBucketService,
  ) {
    this.influxUrl = this.configService.get('INFLUXDB_URL', 'http://localhost:8086');
    this.influxToken = this.configService.get('INFLUXDB_TOKEN', '');
    this.influxOrg = this.configService.get('INFLUXDB_ORG', 'ss-org');
  }

  // ──────────── 时间范围查询 ────────────

  /**
   * 查询单个标签在时间范围内的所有数据点
   */
  async queryRange(
    projectId: string,
    tagId: string,
    startTime: Date,
    endTime: Date,
    limit?: number,
    offset?: number,
  ): Promise<InfluxQueryRow[]> {
    const bucket = await this.bucketService.getBucket(projectId);
    const flux = this.buildRangeQuery(bucket, [tagId], startTime, endTime, limit, offset);
    return this.executeFluxQuery(flux);
  }

  /**
   * 批量查询多个标签在时间范围内的数据
   */
  async queryRangeBatch(
    projectId: string,
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    limit?: number,
  ): Promise<InfluxQueryRow[]> {
    if (tagIds.length === 0) return [];
    const bucket = await this.bucketService.getBucket(projectId);
    const flux = this.buildRangeQuery(bucket, tagIds, startTime, endTime, limit);
    return this.executeFluxQuery(flux);
  }

  // ──────────── 聚合查询 ────────────

  /**
   * 单一聚合函数：mean / max / min / sum / count
   */
  async queryAggregate(
    projectId: string,
    tagId: string,
    startTime: Date,
    endTime: Date,
    fn: 'mean' | 'max' | 'min' | 'sum' | 'count',
  ): Promise<number> {
    const bucket = await this.bucketService.getBucket(projectId);
    const flux = this.buildAggregateQuery(bucket, tagId, startTime, endTime, fn);
    const rows = await this.executeFluxQuery(flux);
    // Flux aggregate 结果 pivot 后 value 列为聚合值，_time=startTime
    if (rows.length === 0) return 0;
    const tagValue = rows[0].value;
    return tagValue ?? 0;
  }

  /**
   * 时间窗口聚合
   * @returns 按时间排序的 { interval, value } 数组
   */
  async queryAggregateWindow(
    projectId: string,
    tagId: string,
    startTime: Date,
    endTime: Date,
    windowMs: number,
    fn: 'mean' | 'max' | 'min' | 'sum' | 'count',
  ): Promise<{ interval: string; value: number }[]> {
    const bucket = await this.bucketService.getBucket(projectId);
    const windowDuration = this.formatWindowDuration(windowMs);
    const flux = this.buildAggregateWindowQuery(
      bucket,
      tagId,
      startTime,
      endTime,
      windowDuration,
      fn,
    );
    const rows = await this.executeFluxQuery(flux);
    return rows.map((r) => ({
      interval: r.timestamp.toISOString(),
      value: r.value ?? 0,
    }));
  }

  // ──────────── 最新值查询 ────────────

  /**
   * 批量查询多个标签的最新值
   */
  async queryLatest(
    projectId: string,
    tagIds: string[],
  ): Promise<Map<string, { value: number | null; timestamp: Date }>> {
    if (tagIds.length === 0) return new Map();
    const bucket = await this.bucketService.getBucket(projectId);
    const flux = this.buildLatestQuery(bucket, tagIds);
    const rows = await this.executeFluxQuery(flux);
    const result = new Map<string, { value: number | null; timestamp: Date }>();
    for (const row of rows) {
      result.set(row.tagId, { value: row.value, timestamp: row.timestamp });
    }
    return result;
  }

  // ──────────── Flux Query Builders ────────────

  private buildRangeQuery(
    bucket: string,
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    limit?: number,
    offset?: number,
  ): string {
    const tagFilter =
      tagIds.length === 1
        ? `r["tagId"] == "${tagIds[0]}"`
        : tagIds.map((id) => `r["tagId"] == "${id}"`).join(' or ');

    let flux = `from(bucket: "${bucket}")`;
    flux += `\n  |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})`;
    flux += `\n  |> filter(fn: (r) => r["_measurement"] == "tag_values")`;
    flux += `\n  |> filter(fn: (r) => ${tagFilter})`;
    flux += `\n  |> filter(fn: (r) => r["_field"] == "value" or r["_field"] == "quality")`;
    if (limit) {
      flux += `\n  |> limit(n: ${limit}${offset ? `, offset: ${offset}` : ''})`;
    }
    flux += `\n  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")`;
    // keep tag columns for identification
    flux += `\n  |> group(columns: ["tagId", "deviceId", "projectId"])`;
    return flux;
  }

  private buildAggregateQuery(
    bucket: string,
    tagId: string,
    startTime: Date,
    endTime: Date,
    fn: string,
  ): string {
    const fluxFn = fn === 'count' ? 'count' : fn; // 'mean' for avg
    let flux = `from(bucket: "${bucket}")`;
    flux += `\n  |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})`;
    flux += `\n  |> filter(fn: (r) => r["_measurement"] == "tag_values")`;
    flux += `\n  |> filter(fn: (r) => r["tagId"] == "${tagId}")`;
    flux += `\n  |> filter(fn: (r) => r["_field"] == "value")`;
    flux += `\n  |> ${fluxFn}()`;
    return flux;
  }

  private buildAggregateWindowQuery(
    bucket: string,
    tagId: string,
    startTime: Date,
    endTime: Date,
    windowDuration: string,
    fn: string,
  ): string {
    const fluxFn = fn === 'count' ? 'count' : fn;
    let flux = `from(bucket: "${bucket}")`;
    flux += `\n  |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})`;
    flux += `\n  |> filter(fn: (r) => r["_measurement"] == "tag_values")`;
    flux += `\n  |> filter(fn: (r) => r["tagId"] == "${tagId}")`;
    flux += `\n  |> filter(fn: (r) => r["_field"] == "value")`;
    flux += `\n  |> aggregateWindow(every: ${windowDuration}, fn: ${fluxFn}, createEmpty: false)`;
    return flux;
  }

  private buildLatestQuery(bucket: string, tagIds: string[]): string {
    const tagFilter =
      tagIds.length === 1
        ? `r["tagId"] == "${tagIds[0]}"`
        : tagIds.map((id) => `r["tagId"] == "${id}"`).join(' or ');

    let flux = `from(bucket: "${bucket}")`;
    flux += `\n  |> range(start: -30d)`;
    flux += `\n  |> filter(fn: (r) => r["_measurement"] == "tag_values")`;
    flux += `\n  |> filter(fn: (r) => ${tagFilter})`;
    flux += `\n  |> filter(fn: (r) => r["_field"] == "value" or r["_field"] == "quality")`;
    flux += `\n  |> last()`;
    flux += `\n  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")`;
    return flux;
  }

  // ──────────── Flux Execution ────────────

  /**
   * CODE-05: Flux 查询 fetch 超时（ms）。
   * 查询可能扫描大时间范围，给 15s（比写入 5s 更宽松，避免误杀合法长查询）。
   */
  private readonly queryTimeoutMs = 15000;

  private async executeFluxQuery(flux: string): Promise<InfluxQueryRow[]> {
    try {
      const response = await fetch(
        `${this.influxUrl}/api/v2/query?org=${encodeURIComponent(this.influxOrg)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${this.influxToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/csv',
          },
          body: JSON.stringify({ query: flux }),
          // CODE-05: fetch 加超时，避免 InfluxDB 半挂时无限等待阻塞 event loop
          signal: AbortSignal.timeout(this.queryTimeoutMs),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'unknown');
        throw new Error(`InfluxDB query failed (${response.status}): ${errorBody}`);
      }

      const csvText = await response.text();
      return this.parseCsvResponse(csvText);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`InfluxDB Flux query error: ${errMsg}`);
      throw error;
    }
  }

  // ──────────── CSV Parsing ────────────

  /**
   * 解析 InfluxDB CSV 响应为 InfluxQueryRow[]
   *
   * Flux 查询经过 pivot 后，CSV 表头包含：
   * #datatype,string,long,dateTime:RFC3339,...
   * ,result,table,_time,tagId,deviceId,projectId,value,quality
   *
   * 没有 pivot 的聚合查询：
   * ,result,table,_time,_value
   */
  private parseCsvResponse(csvText: string): InfluxQueryRow[] {
    // 归一化换行符（InfluxDB 返回 \r\n，但 split('\n') 会在行尾保留 \r）
    const lines = csvText.replace(/\r\n/g, '\n').trim().split('\n');
    if (lines.length < 2) return [];

    // 跳过注释行（# 开头），找到表头和数据行
    let headerIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('#')) {
        headerIdx = i;
        break;
      }
    }

    // 解析表头索引
    const headers = lines[headerIdx].split(',');
    const dataLines = lines.slice(headerIdx + 1).filter((l) => l.trim() !== '');

    // 如果只有一行注释头和数据头（没有数据行），直接返回空
    if (dataLines.length === 0) return [];

    // 检查是否是聚合结果（没有 pivot）：_time, _value 列
    const timeIdx = headers.indexOf('_time');
    const valueIdx = headers.indexOf('_value');
    const tagIdIdx = headers.indexOf('tagId');
    const deviceIdIdx = headers.indexOf('deviceId');
    const projectIdIdx = headers.indexOf('projectId');
    const qualityIdx = headers.indexOf('quality');

    // 如果 pivot 后的 value 列找不到，尝试用 _value 列
    const actualValueIdx = valueIdx >= 0 ? valueIdx : headers.indexOf('value');

    const parsed = dataLines.map((line, lineIdx) => {
      const cols = line.split(',');
      const getVal = (index: number): string => (index >= 0 && index < cols.length ? cols[index] : '');

      const rawValue = getVal(actualValueIdx);
      let numericValue: number;
      // 聚合查询可能直接返回 _value 数值
      if (rawValue === '' || rawValue === undefined) {
        // 尝试从 pivoted 'value' 列获取
        const pivotedValue =
          headers.indexOf('value') >= 0 ? getVal(headers.indexOf('value')) : rawValue;
        numericValue = pivotedValue ? parseFloat(pivotedValue) : 0;
      } else {
        numericValue = parseFloat(rawValue);
      }
      if (isNaN(numericValue)) numericValue = 0;

      const timeStr = getVal(timeIdx);
      const timestamp = timeStr ? new Date(timeStr) : new Date();

      return {
        tagId: getVal(tagIdIdx),
        value: numericValue,
        quality: getVal(qualityIdx) || '0',
        timestamp,
        deviceId: deviceIdIdx >= 0 ? getVal(deviceIdIdx) : undefined,
        projectId: projectIdIdx >= 0 ? getVal(projectIdIdx) : undefined,
      };
    });

    return parsed;
  }

  // ──────────── Helpers ────────────

  /**
   * 将毫秒窗口转换为 Flux 时间字面量
   * 60000 → "1m", 3600000 → "1h", 600000 → "10m"
   */
  private formatWindowDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
}
