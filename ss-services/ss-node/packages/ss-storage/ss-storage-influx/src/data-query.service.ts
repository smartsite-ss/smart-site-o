// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, Between } from 'typeorm';
import { HistoricalData } from './entities/historical-data.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { InfluxQueryService, InfluxQueryRow } from './influx-query.service';

export enum AggregationType {
  AVG = 'avg',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  COUNT = 'count',
}

/** 插值类型 */
export enum InterpolationType {
  /** 原始值 — 不做插值处理，直接返回采集到的数据点 */
  RAW = 'raw',
  /** 线性插值 — 在相邻数据点之间按时间间隔线性填充 */
  LINEAR = 'linear',
  /** 阶梯插值（前值填充）— 缺失时间段沿用上一个已知值 */
  STEP = 'step',
}

export interface AggregationResult {
  aggregation: AggregationType;
  value: number;
  tagId: string;
  startTime: string;
  endTime: string;
}

export interface TagDataPoint {
  /** 历史数据点值 — 保留原始类型语义（number/boolean/string） */
  value: number | boolean | string | null;
  timestamp: string;
}

export interface TagDataPage {
  tagId: string;
  data: TagDataPoint[];
}

/** 趋势查询结果 */
export interface TrendDataResult {
  /** 各标签的查询数据 */
  data: TagDataPage[];
  /** 元数据 — 使用 pagination 模式以便 TransformInterceptor 扁平化响应：
   *  返回 { data: [...], pagination: { total } } → 客户端收到
   *  { code, data: [...], pagination: { total }, message } */
  pagination: { total: number };
}

export interface TrendQueryOptions {
  tagIds: string[];
  startTime: Date;
  endTime: Date;
  /** 最大数据点数（触发 LTTB 降采样），默认 1000 */
  maxPoints?: number;
  projectId?: string;
  /** 插值方式，默认 raw */
  interpolation?: InterpolationType;
  /** 插值间隔（毫秒），linear/step 模式生效，默认 1000ms */
  interval?: number;
  /** 窗口聚合参数（可选）：携带时逐标签按窗口聚合，跳过插值与 LTTB 降采样 */
  aggregation?: TrendAggregationOptions;
}

/** 趋势查询窗口聚合参数（三期增强：08 #6 聚合查询） */
export interface TrendAggregationOptions {
  /** 聚合函数：avg/max/min/sum/count */
  type: AggregationType;
  /** 聚合窗口大小（毫秒），必须为正整数 */
  windowMs: number;
}

export interface TimeRangeQuery {
  tagId: string;
  startTime: Date;
  endTime: Date;
  page?: number;
  pageSize?: number;
  projectId?: string;
}

/**
 * Aggregation function names for InfluxDB Flux queries
 */
const INFLUX_FN_MAP: Record<AggregationType, 'mean' | 'max' | 'min' | 'sum' | 'count'> = {
  [AggregationType.AVG]: 'mean',
  [AggregationType.MAX]: 'max',
  [AggregationType.MIN]: 'min',
  [AggregationType.SUM]: 'sum',
  [AggregationType.COUNT]: 'count',
};

@Injectable()
export class DataQueryService {
  private readonly logger = new Logger(DataQueryService.name);
  /** 历史数据查询后端：influxdb | sqlite | mysql */
  private readonly backend: string;

  constructor(
    @Inject(getRepositoryToken(HistoricalData))
    private globalRepo: Repository<HistoricalData>,
    @Inject(ProjectDatabaseService)
    private projectDbService: ProjectDatabaseService,
    @Optional()
    private readonly configService?: ConfigService,
    @Optional()
    private readonly influxQueryService?: InfluxQueryService,
  ) {
    this.backend = this.configService?.get('HISTORICAL_DATA_BACKEND', 'influxdb') ?? 'influxdb';
  }

  /** 是否使用 SQLite 查询后端 */
  private get useSqlite(): boolean {
    return this.backend !== 'influxdb';
  }

  /**
   * 获取项目级 HistoricalData Repository
   * - 提供 projectId 时：查询项目数据库（ss-project/{project}/db/system.db）
   * - 不提供 projectId 时：回退到全局数据库（兼容旧行为）
   */
  private async getRepo(projectId?: string): Promise<Repository<HistoricalData>> {
    if (projectId) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return ds.getRepository(HistoricalData);
    }
    return this.globalRepo;
  }

  /**
   * 从 HistoricalData 记录中提取 value — 按列优先级返回非空值
   *
   * 写入时按类型分写到 numericValue/booleanValue/stringValue 三列，
   * 读取时按非空列返回，保证类型语义不丢失。
   */
  private pickValueFromRecord(record: HistoricalData): number | boolean | string | null {
    if (record.booleanValue !== null && record.booleanValue !== undefined) {
      return record.booleanValue;
    }
    if (record.stringValue !== null && record.stringValue !== undefined) {
      return record.stringValue;
    }
    if (record.numericValue !== null && record.numericValue !== undefined) {
      return record.numericValue;
    }
    return null;
  }

  /**
   * 从 InfluxQueryRow[] 提取为 TagDataPage 的 data 数组格式
   */
  private rowsToDataPoints(rows: InfluxQueryRow[]): TagDataPoint[] {
    return rows.map((r) => ({
      value: r.value,
      timestamp: r.timestamp.toISOString(),
    }));
  }

  /**
   * 将 InfluxQueryRow[] 按 tagId 分组为 TagDataPage[]
   */
  private groupRowsByTag(rows: InfluxQueryRow[]): TagDataPage[] {
    const groups = new Map<string, InfluxQueryRow[]>();
    for (const row of rows) {
      if (!groups.has(row.tagId)) groups.set(row.tagId, []);
      groups.get(row.tagId)!.push(row);
    }
    return Array.from(groups.entries()).map(([tagId, tagRows]) => ({
      tagId,
      data: this.rowsToDataPoints(tagRows),
    }));
  }

  // ──────────── 时间范围查询 (带分页) ────────────

  async queryTimeRange(query: TimeRangeQuery): Promise<{ data: HistoricalData[]; total: number }> {
    if (this.useSqlite) return this.queryTimeRangeSqlite(query);
    return this.queryTimeRangeInflux(query);
  }

  private async queryTimeRangeSqlite(
    query: TimeRangeQuery,
  ): Promise<{ data: HistoricalData[]; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const repo = await this.getRepo(query.projectId);

    const [data, total] = await repo.findAndCount({
      where: {
        tagId: query.tagId,
        timestamp: Between(query.startTime, query.endTime),
      },
      order: { timestamp: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { data, total };
  }

  private async queryTimeRangeInflux(
    query: TimeRangeQuery,
  ): Promise<{ data: HistoricalData[]; total: number }> {
    const projectId = query.projectId || 'default';
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const offset = (page - 1) * pageSize;

    const rows = await this.influxQueryService!.queryRange(
      projectId,
      query.tagId,
      query.startTime,
      query.endTime,
      pageSize,
      offset,
    );

    // 再查询总数（不带 limit/offset）
    const allRows = await this.influxQueryService!.queryRange(
      projectId,
      query.tagId,
      query.startTime,
      query.endTime,
    );

    const data = rows.map((r) => {
      const h = new HistoricalData();
      h.tagId = r.tagId;
      h.numericValue = r.value;
      h.stringValue = null;
      h.booleanValue = null;
      h.timestamp = r.timestamp;
      return h;
    });

    return { data, total: allRows.length };
  }

  // ──────────── 聚合查询 ────────────

  async aggregate(
    tagId: string,
    startTime: Date,
    endTime: Date,
    type: AggregationType,
    projectId?: string,
  ): Promise<AggregationResult> {
    if (this.useSqlite) return this.aggregateSqlite(tagId, startTime, endTime, type, projectId);
    return this.aggregateInflux(tagId, startTime, endTime, type, projectId);
  }

  private async aggregateSqlite(
    tagId: string,
    startTime: Date,
    endTime: Date,
    type: AggregationType,
    projectId?: string,
  ): Promise<AggregationResult> {
    const repo = await this.getRepo(projectId);
    const qb = repo
      .createQueryBuilder('h')
      .where('h.tagId = :tagId', { tagId })
      .andWhere('h.timestamp BETWEEN :startTime AND :endTime', { startTime, endTime });

    let value: number;

    switch (type) {
      case AggregationType.AVG:
        ({ avg: value } = await qb
          .select('AVG(h.numericValue)', 'avg')
          .getRawOne<{ avg: number }>());
        break;
      case AggregationType.MAX:
        ({ max: value } = await qb
          .select('MAX(h.numericValue)', 'max')
          .getRawOne<{ max: number }>());
        break;
      case AggregationType.MIN:
        ({ min: value } = await qb
          .select('MIN(h.numericValue)', 'min')
          .getRawOne<{ min: number }>());
        break;
      case AggregationType.SUM:
        ({ sum: value } = await qb
          .select('SUM(h.numericValue)', 'sum')
          .getRawOne<{ sum: number }>());
        break;
      case AggregationType.COUNT:
        value = await qb.getCount();
        break;
      default:
        throw new Error(`Unknown aggregation type: ${type}`);
    }

    return {
      aggregation: type,
      value: value ?? 0,
      tagId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }

  private async aggregateInflux(
    tagId: string,
    startTime: Date,
    endTime: Date,
    type: AggregationType,
    projectId?: string,
  ): Promise<AggregationResult> {
    const effectiveProjectId = projectId || 'default';
    const value = await this.influxQueryService!.queryAggregate(
      effectiveProjectId,
      tagId,
      startTime,
      endTime,
      INFLUX_FN_MAP[type],
    );
    return {
      aggregation: type,
      value,
      tagId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }

  // ──────────── 窗口聚合 (按时间间隔分组) ────────────

  async aggregateWindow(
    tagId: string,
    startTime: Date,
    endTime: Date,
    windowMs: number,
    type: AggregationType,
    projectId?: string,
  ): Promise<{ interval: string; value: number }[]> {
    if (this.useSqlite)
      return this.aggregateWindowSqlite(tagId, startTime, endTime, windowMs, type, projectId);
    return this.aggregateWindowInflux(tagId, startTime, endTime, windowMs, type, projectId);
  }

  private async aggregateWindowSqlite(
    tagId: string,
    startTime: Date,
    endTime: Date,
    windowMs: number,
    type: AggregationType,
    projectId?: string,
  ): Promise<{ interval: string; value: number }[]> {
    const repo = await this.getRepo(projectId);
    const raw = await repo.find({
      where: { tagId, timestamp: Between(startTime, endTime) },
      order: { timestamp: 'ASC' },
    });

    const buckets = new Map<number, number[]>();

    for (const record of raw) {
      const ts = record.timestamp.getTime();
      const bucketKey = Math.floor(ts / windowMs) * windowMs;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      if (record.numericValue !== null) {
        buckets.get(bucketKey)!.push(record.numericValue);
      }
    }

    const results: { interval: string; value: number }[] = [];

    for (const [bucketKey, values] of buckets) {
      if (values.length === 0) continue;

      let value = 0;
      switch (type) {
        case AggregationType.AVG:
          value = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case AggregationType.MAX:
          value = Math.max(...values);
          break;
        case AggregationType.MIN:
          value = Math.min(...values);
          break;
        case AggregationType.SUM:
          value = values.reduce((a, b) => a + b, 0);
          break;
        case AggregationType.COUNT:
          value = values.length;
          break;
      }

      results.push({
        interval: new Date(bucketKey).toISOString(),
        value,
      });
    }

    return results.sort((a, b) => a.interval.localeCompare(b.interval));
  }

  private async aggregateWindowInflux(
    tagId: string,
    startTime: Date,
    endTime: Date,
    windowMs: number,
    type: AggregationType,
    projectId?: string,
  ): Promise<{ interval: string; value: number }[]> {
    const effectiveProjectId = projectId || 'default';
    return this.influxQueryService!.queryAggregateWindow(
      effectiveProjectId,
      tagId,
      startTime,
      endTime,
      windowMs,
      INFLUX_FN_MAP[type],
    );
  }

  // ──────────── 批量查询 ────────────

  async batchQueryLatest(
    tagIds: string[],
    projectId?: string,
  ): Promise<Map<string, number | null>> {
    if (this.useSqlite) return this.batchQueryLatestSqlite(tagIds, projectId);
    return this.batchQueryLatestInflux(tagIds, projectId);
  }

  private async batchQueryLatestSqlite(
    tagIds: string[],
    projectId?: string,
  ): Promise<Map<string, number | null>> {
    const repo = await this.getRepo(projectId);
    const result = new Map<string, number | null>();

    for (const tagId of tagIds) {
      const record = await repo.findOne({
        where: { tagId },
        order: { timestamp: 'DESC' },
        // 读取三列，按非空列返回
        select: ['tagId', 'numericValue', 'stringValue', 'booleanValue', 'timestamp'],
      });

      result.set(tagId, record ? (this.pickValueFromRecord(record) as number | null) : null);
    }

    return result;
  }

  private async batchQueryLatestInflux(
    tagIds: string[],
    projectId?: string,
  ): Promise<Map<string, number | null>> {
    if (tagIds.length === 0) return new Map();
    const effectiveProjectId = projectId || 'default';
    const rows = await this.influxQueryService!.queryLatest(effectiveProjectId, tagIds);
    const result = new Map<string, number | null>();
    for (const tagId of tagIds) {
      const row = rows.get(tagId);
      result.set(tagId, row?.value ?? null);
    }
    return result;
  }

  async batchQueryTimeRange(
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<TagDataPage[]> {
    if (this.useSqlite)
      return this.batchQueryTimeRangeSqlite(tagIds, startTime, endTime, projectId);
    return this.batchQueryTimeRangeInflux(tagIds, startTime, endTime, projectId);
  }

  private async batchQueryTimeRangeSqlite(
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<TagDataPage[]> {
    const repo = await this.getRepo(projectId);
    const results: TagDataPage[] = [];

    for (const tagId of tagIds) {
      const [data] = await repo.findAndCount({
        where: { tagId, timestamp: Between(startTime, endTime) },
        order: { timestamp: 'ASC' },
        take: 500,
      });

      results.push({
        tagId,
        data: data.map((d) => ({
          value: this.pickValueFromRecord(d),
          timestamp: d.timestamp.toISOString(),
        })),
      });
    }

    return results;
  }

  private async batchQueryTimeRangeInflux(
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<TagDataPage[]> {
    if (tagIds.length === 0) return [];
    const effectiveProjectId = projectId || 'default';
    const rows = await this.influxQueryService!.queryRangeBatch(
      effectiveProjectId,
      tagIds,
      startTime,
      endTime,
      500,
    );
    return this.groupRowsByTag(rows);
  }

  // ──────────── 趋势图专用批量查询（带 LTTB 降采样 + 插值） ────────────

  /**
   * 趋势图批量查询
   *
   * 流程：获取原始数据 → 插值填充 → LTTB 降采样 → 返回结果（含记录数）
   *
   * @param opts.interpolation 插值方式：raw（不插值）| linear（线性插值）| step（前值填充）
   * @param opts.interval 插值间隔（毫秒），仅 linear/step 模式生效，默认 1000
   */
  async queryTrendData(opts: TrendQueryOptions): Promise<TrendDataResult> {
    if (opts.aggregation) return this.queryTrendDataAggregated(opts);
    if (this.useSqlite) return this.queryTrendDataSqlite(opts);
    return this.queryTrendDataInflux(opts);
  }

  /**
   * 窗口聚合趋势查询（三期增强：08 #6）
   *
   * 逐标签调用窗口聚合（自动适配 sqlite/InfluxDB 存储后端），
   * 聚合结果的窗口起始时间作为数据点时间戳；跳过插值与 LTTB 降采样
   * （聚合窗口本身已控制点数）。返回结构与原始趋势查询一致。
   */
  private async queryTrendDataAggregated(opts: TrendQueryOptions): Promise<TrendDataResult> {
    const { type: aggregationType, windowMs } = opts.aggregation!;
    const pages: TagDataPage[] = [];
    let total = 0;

    for (const tagId of opts.tagIds) {
      const windowPoints = await this.aggregateWindow(
        tagId,
        opts.startTime,
        opts.endTime,
        windowMs,
        aggregationType,
        opts.projectId,
      );
      const dataPoints: TagDataPoint[] = windowPoints.map((windowPoint) => ({
        value: windowPoint.value,
        timestamp: windowPoint.interval,
      }));
      pages.push({ tagId, data: dataPoints });
      total += dataPoints.length;
    }

    return { data: pages, pagination: { total } };
  }

  private async queryTrendDataSqlite(opts: TrendQueryOptions): Promise<TrendDataResult> {
    const repo = await this.getRepo(opts.projectId);
    const pages: TagDataPage[] = [];
    let total = 0;

    for (const tagId of opts.tagIds) {
      const records = await repo.find({
        where: { tagId, timestamp: Between(opts.startTime, opts.endTime) },
        order: { timestamp: 'ASC' },
      });

      let dataPoints: TagDataPoint[] = records.map((d) => ({
        value: this.pickValueFromRecord(d),
        timestamp: d.timestamp.toISOString(),
      }));

      dataPoints = this.applyInterpolation(
        dataPoints,
        opts.startTime,
        opts.endTime,
        opts.interpolation ?? InterpolationType.RAW,
        opts.interval ?? 1000,
      );

      if (dataPoints.length > (opts.maxPoints ?? 1000)) {
        dataPoints = this.lttbDownsample(dataPoints, opts.maxPoints ?? 1000);
      }

      pages.push({ tagId, data: dataPoints });
      total += dataPoints.length;
    }

    return { data: pages, pagination: { total } };
  }

  private async queryTrendDataInflux(opts: TrendQueryOptions): Promise<TrendDataResult> {
    if (opts.tagIds.length === 0) return { data: [], pagination: { total: 0 } };
    const effectiveProjectId = opts.projectId || 'default';
    const rows = await this.influxQueryService!.queryRangeBatch(
      effectiveProjectId,
      opts.tagIds,
      opts.startTime,
      opts.endTime,
    );
    const pages = this.groupRowsByTag(rows);
    let total = 0;

    // Apply interpolation + LTTB downsampling per tag
    const resultPages = pages.map((page) => {
      let points = this.applyInterpolation(
        page.data,
        opts.startTime,
        opts.endTime,
        opts.interpolation ?? InterpolationType.RAW,
        opts.interval ?? 1000,
      );

      if (points.length > (opts.maxPoints ?? 1000)) {
        points = this.lttbDownsample(points, opts.maxPoints ?? 1000);
      }

      total += points.length;
      return { tagId: page.tagId, data: points };
    });

    return { data: resultPages, pagination: { total } };
  }

  // ──────────── 插值算法 ────────────

  /**
   * 对原始数据点应用插值
   *
   * @param rawData 按时间升序排列的原始数据点
   * @param startTime 查询起止时间（插值范围）
   * @param endTime 查询结束时间
   * @param type 插值类型
   * @param intervalMs 插值间隔（毫秒）
   */
  private applyInterpolation(
    rawData: TagDataPoint[],
    startTime: Date,
    endTime: Date,
    type: InterpolationType,
    intervalMs: number,
  ): TagDataPoint[] {
    if (type === InterpolationType.RAW || rawData.length === 0) {
      return rawData;
    }

    // 过滤有效数值（仅数值型可参与线性/阶梯插值）
    // bool/string 类型保留原样，不参与插值计算
    const validData = rawData
      .filter((d) => typeof d.value === 'number' && d.value !== null)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (validData.length === 0) return rawData;

    const startMs = startTime.getTime();
    const endMs = endTime.getTime();

    if (type === InterpolationType.LINEAR) {
      return this.linearInterpolate(validData as TagDataPoint[], startMs, endMs, intervalMs);
    }

    if (type === InterpolationType.STEP) {
      return this.stepInterpolate(validData as TagDataPoint[], startMs, endMs, intervalMs);
    }

    return rawData;
  }

  /** 线性插值 */
  private linearInterpolate(
    sortedData: TagDataPoint[],
    startMs: number,
    endMs: number,
    intervalMs: number,
  ): TagDataPoint[] {
    const result: TagDataPoint[] = [];
    const first = sortedData[0];

    // 起始时间之前的点：沿用第一个值
    let t = startMs;
    while (t < new Date(first.timestamp).getTime() && t <= endMs) {
      result.push({ value: first.value, timestamp: new Date(t).toISOString() });
      t += intervalMs;
    }

    // 相邻点之间线性插值
    for (let i = 0; i < sortedData.length - 1; i++) {
      const cur = sortedData[i];
      const next = sortedData[i + 1];
      const curTs = new Date(cur.timestamp).getTime();
      const nextTs = new Date(next.timestamp).getTime();

      t = Math.max(t, curTs);

      while (t < nextTs && t <= endMs) {
        const ratio = (t - curTs) / (nextTs - curTs);
        const curNum = Number(cur.value ?? 0);
        const nextNum = Number(next.value ?? 0);
        const value = curNum + (nextNum - curNum) * ratio;
        result.push({ value: Math.round(value * 1e6) / 1e6, timestamp: new Date(t).toISOString() });
        t += intervalMs;
      }
    }

    // 最后一个点之后：沿用最后一个值
    const last = sortedData[sortedData.length - 1];
    const lastTs = new Date(last.timestamp).getTime();
    t = Math.max(t, lastTs);
    while (t <= endMs) {
      result.push({ value: last.value, timestamp: new Date(t).toISOString() });
      t += intervalMs;
    }

    return result;
  }

  /** 阶梯插值（前值填充） */
  private stepInterpolate(
    sortedData: TagDataPoint[],
    startMs: number,
    endMs: number,
    intervalMs: number,
  ): TagDataPoint[] {
    const result: TagDataPoint[] = [];
    let dataIdx = 0;
    let lastValue = sortedData[0].value;

    for (let t = startMs; t <= endMs; t += intervalMs) {
      // 推进到当前时间之后的最新数据点
      while (
        dataIdx < sortedData.length &&
        new Date(sortedData[dataIdx].timestamp).getTime() <= t
      ) {
        lastValue = sortedData[dataIdx].value;
        dataIdx++;
      }
      result.push({ value: lastValue, timestamp: new Date(t).toISOString() });
    }

    return result;
  }

  /**
   * LTTB (Largest Triangle Three Buckets) 降采样算法
   */
  private lttbDownsample(data: TagDataPoint[], threshold: number): TagDataPoint[] {
    if (data.length <= threshold || threshold < 3) {
      return data;
    }

    const result: typeof data = [];
    const bucketSize = (data.length - 2) / (threshold - 2);
    let a = 0;
    result.push(data[0]);

    for (let i = 0; i < threshold - 2; i++) {
      const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
      const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

      let avgX = 0;
      let avgY = 0;
      const avgCount = avgRangeEnd - avgRangeStart;
      if (avgCount <= 0) {
        const fallbackIndex = Math.min(rangeStart, data.length - 1);
        result.push(data[fallbackIndex]);
        a = fallbackIndex;
        continue;
      }

      for (let j = avgRangeStart; j < avgRangeEnd; j++) {
        avgX += new Date(data[j].timestamp).getTime();
        avgY += Number(data[j].value ?? 0);
      }
      avgX /= avgCount;
      avgY /= avgCount;

      let maxArea = -1;
      let maxAreaIndex = rangeStart;
      const pointAX = new Date(data[a].timestamp).getTime();
      const pointAY = Number(data[a].value ?? 0);
      const actualRangeEnd = Math.min(rangeEnd, data.length);

      for (let j = rangeStart; j < actualRangeEnd; j++) {
        const pointBX = new Date(data[j].timestamp).getTime();
        const pointBY = Number(data[j].value ?? 0);
        const area =
          Math.abs(
            (pointAX - avgX) * (pointBY - pointAY) - (pointAX - pointBX) * (avgY - pointAY),
          ) * 0.5;
        if (area > maxArea) {
          maxArea = area;
          maxAreaIndex = j;
        }
      }
      result.push(data[maxAreaIndex]);
      a = maxAreaIndex;
    }

    result.push(data[data.length - 1]);
    return result;
  }

  // ──────────── 数据导出 ────────────

  async exportCsv(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ csv: string; filename: string }> {
    if (this.useSqlite) return this.exportCsvSqlite(tagId, startTime, endTime, projectId);
    return this.exportCsvInflux(tagId, startTime, endTime, projectId);
  }

  private async exportCsvSqlite(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ csv: string; filename: string }> {
    const repo = await this.getRepo(projectId);
    const records = await repo.find({
      where: { tagId, timestamp: Between(startTime, endTime) },
      order: { timestamp: 'ASC' },
    });

    const header = 'timestamp,value,quality\n';
    const rows = records
      .map(
        (r) =>
          `${r.timestamp.toISOString()},${this.pickValueFromRecord(r) ?? ''},${r.stringValue ?? 'good'}`,
      )
      .join('\n');

    const filename = `${tagId}_${startTime.toISOString().slice(0, 10)}_${endTime.toISOString().slice(0, 10)}.csv`;
    return { csv: header + rows, filename };
  }

  private async exportCsvInflux(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ csv: string; filename: string }> {
    const effectiveProjectId = projectId || 'default';
    const rows = await this.influxQueryService!.queryRange(effectiveProjectId, tagId, startTime, endTime);

    const header = 'timestamp,value,quality\n';
    const csvRows = rows
      .map((r) => `${r.timestamp.toISOString()},${r.value ?? ''},${r.quality ?? 'good'}`)
      .join('\n');

    const filename = `${tagId}_${startTime.toISOString().slice(0, 10)}_${endTime.toISOString().slice(0, 10)}.csv`;
    return { csv: header + csvRows, filename };
  }

  async exportJson(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ json: string; filename: string }> {
    if (this.useSqlite) return this.exportJsonSqlite(tagId, startTime, endTime, projectId);
    return this.exportJsonInflux(tagId, startTime, endTime, projectId);
  }

  private async exportJsonSqlite(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ json: string; filename: string }> {
    const repo = await this.getRepo(projectId);
    const records = await repo.find({
      where: { tagId, timestamp: Between(startTime, endTime) },
      order: { timestamp: 'ASC' },
    });

    const data = records.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      value: this.pickValueFromRecord(r),
      quality: r.stringValue ?? 'good',
    }));

    const filename = `${tagId}_${startTime.toISOString().slice(0, 10)}_${endTime.toISOString().slice(0, 10)}.json`;
    return { json: JSON.stringify(data, null, 2), filename };
  }

  private async exportJsonInflux(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ json: string; filename: string }> {
    const effectiveProjectId = projectId || 'default';
    const rows = await this.influxQueryService!.queryRange(effectiveProjectId, tagId, startTime, endTime);

    const data = rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      value: r.value,
      quality: r.quality ?? 'good',
    }));

    const filename = `${tagId}_${startTime.toISOString().slice(0, 10)}_${endTime.toISOString().slice(0, 10)}.json`;
    return { json: JSON.stringify(data, null, 2), filename };
  }

  async exportBatchJson(
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ json: string; filename: string }> {
    if (this.useSqlite) return this.exportBatchJsonSqlite(tagIds, startTime, endTime, projectId);
    return this.exportBatchJsonInflux(tagIds, startTime, endTime, projectId);
  }

  private async exportBatchJsonSqlite(
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ json: string; filename: string }> {
    const repo = await this.getRepo(projectId);
    const result: Record<
      string,
      { timestamp: string; value: number | boolean | string | null; quality: string }[]
    > = {};

    for (const tagId of tagIds) {
      const records = await repo.find({
        where: { tagId, timestamp: Between(startTime, endTime) },
        order: { timestamp: 'ASC' },
      });
      result[tagId] = records.map((r) => ({
        timestamp: r.timestamp.toISOString(),
        value: this.pickValueFromRecord(r),
        quality: r.stringValue ?? 'good',
      }));
    }

    const filename = `batch_export_${startTime.toISOString().slice(0, 10)}_${endTime.toISOString().slice(0, 10)}.json`;
    return { json: JSON.stringify(result, null, 2), filename };
  }

  private async exportBatchJsonInflux(
    tagIds: string[],
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ json: string; filename: string }> {
    if (tagIds.length === 0) {
      return {
        json: '{}',
        filename: `batch_export_${startTime.toISOString().slice(0, 10)}_${endTime.toISOString().slice(0, 10)}.json`,
      };
    }
    const effectiveProjectId = projectId || 'default';
    const rows = await this.influxQueryService!.queryRangeBatch(effectiveProjectId, tagIds, startTime, endTime);

    const groups = new Map<
      string,
      { timestamp: string; value: number | null; quality: string }[]
    >();
    for (const row of rows) {
      if (!groups.has(row.tagId)) groups.set(row.tagId, []);
      groups.get(row.tagId)!.push({
        timestamp: row.timestamp.toISOString(),
        value: row.value,
        quality: row.quality ?? 'good',
      });
    }

    const result: Record<string, { timestamp: string; value: number | null; quality: string }[]> =
      {};
    for (const tagId of tagIds) {
      result[tagId] = groups.get(tagId) || [];
    }

    const filename = `batch_export_${startTime.toISOString().slice(0, 10)}_${endTime.toISOString().slice(0, 10)}.json`;
    return { json: JSON.stringify(result, null, 2), filename };
  }

  // ──────────── 统计概览 ────────────

  async getTagStats(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{
    avg: number;
    max: number;
    min: number;
    sum: number;
    count: number;
    tagId: string;
  }> {
    if (this.useSqlite) return this.getTagStatsSqlite(tagId, startTime, endTime, projectId);
    return this.getTagStatsInflux(tagId, startTime, endTime, projectId);
  }

  private async getTagStatsSqlite(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ avg: number; max: number; min: number; sum: number; count: number; tagId: string }> {
    const repo = await this.getRepo(projectId);
    const [avgResult, maxResult, minResult, sumResult, count] = await Promise.all([
      this.aggregateSqlite(tagId, startTime, endTime, AggregationType.AVG, projectId),
      this.aggregateSqlite(tagId, startTime, endTime, AggregationType.MAX, projectId),
      this.aggregateSqlite(tagId, startTime, endTime, AggregationType.MIN, projectId),
      this.aggregateSqlite(tagId, startTime, endTime, AggregationType.SUM, projectId),
      repo.count({ where: { tagId, timestamp: Between(startTime, endTime) } }),
    ]);

    return {
      tagId,
      avg: avgResult.value,
      max: maxResult.value,
      min: minResult.value,
      sum: sumResult.value,
      count,
    };
  }

  private async getTagStatsInflux(
    tagId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
  ): Promise<{ avg: number; max: number; min: number; sum: number; count: number; tagId: string }> {
    const effectiveProjectId = projectId || 'default';
    const s = this.influxQueryService!;
    const [avg, max, min, sum, count] = await Promise.all([
      s.queryAggregate(effectiveProjectId, tagId, startTime, endTime, 'mean'),
      s.queryAggregate(effectiveProjectId, tagId, startTime, endTime, 'max'),
      s.queryAggregate(effectiveProjectId, tagId, startTime, endTime, 'min'),
      s.queryAggregate(effectiveProjectId, tagId, startTime, endTime, 'sum'),
      s.queryAggregate(effectiveProjectId, tagId, startTime, endTime, 'count'),
    ]);
    return { tagId, avg, max, min, sum, count };
  }
}
