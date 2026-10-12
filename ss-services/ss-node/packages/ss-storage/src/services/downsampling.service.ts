// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Optional, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StructuredLogger } from '@ss-node/ss-core';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import {
  DownsamplingConfig,
  DownsamplingTask,
  DownsamplingResult,
  DownsamplingGranularity,
  DownsamplingAggregation,
  INFLUXDB_ADAPTER,
} from '../interfaces/downsampling.interface';

/** 每天定时执行的间隔（24 小时） */
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** 降采样查询的时间范围映射 */
const GRANULARITY_RANGE: Record<DownsamplingGranularity, string> = {
  '1h': '-24h',
  '1d': '-7d',
};

/** 默认聚合函数 */
const DEFAULT_AGGREGATION: DownsamplingAggregation = 'mean';

/** 降采样后目标 measurement 前缀 */
const TARGET_MEASUREMENT_PREFIX = 'tag_values';

/**
 * InfluxDB 自动降采样服务。
 *
 * 将原始时序数据按小时/天聚合（mean/min/max/last），写入降采样 measurement，
 * 实现多级数据保留策略。当 InfluxDB 不可用时优雅降级。
 *
 * 降采样策略（参考设计文档）：
 *   原始数据 tag_values (30天保留)
 *     ↓ 1h 聚合 → tag_values_1h (365天保留)
 *     ↓ 1d 聚合 → tag_values_1d (永久保留)
 */
@Injectable()
export class DownsamplingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger();

  /** 定时器引用（初始延迟触发器） */
  private scheduleTimer: NodeJS.Timeout | null = null;
  /** 定时器引用（每日重复执行器） */
  private dailyTimer: NodeJS.Timeout | null = null;
  /** 是否正在执行降采样（防止并发） */
  private isRunning = false;

  /** InfluxDB 连接配置 */
  private readonly influxUrl: string;
  private readonly influxToken: string;
  private readonly influxOrg: string;
  private readonly influxBucket: string;

  constructor(@Optional() @Inject(INFLUXDB_ADAPTER) private readonly adapter?: StorageAdapter) {
    this.influxUrl = process.env.INFLUXDB_URL || 'http://localhost:8086';
    this.influxToken = process.env.INFLUXDB_TOKEN || '';
    this.influxOrg = process.env.INFLUXDB_ORG || 'ss-org';
    this.influxBucket = process.env.INFLUXDB_BUCKET || 'ss_node_data';
  }

  // ──────────── 生命周期 ────────────

  onModuleInit(): void {
    const config = this.getDownsamplingConfig();
    if (config.enabled) {
      this.logger.log(
        `DownsamplingService initialized (auto-schedule enabled, ${config.tasks.length} tasks)`,
        'DownsamplingService',
      );
    } else {
      this.logger.log('DownsamplingService initialized (disabled)', 'DownsamplingService');
    }
  }

  onModuleDestroy(): void {
    this.clearTimers();
    this.logger.log('DownsamplingService destroyed', 'DownsamplingService');
  }

  // ──────────── 公开方法 ────────────

  /**
   * 执行降采样：从源 measurement 读取数据，按指定粒度聚合后写入目标 measurement。
   *
   * @param measurement 源 measurement 名称（如 "tag_values"）
   * @param granularity 聚合粒度（'1h' 或 '1d'）
   * @param retention 目标保留策略描述（如 "365d"、"permanent"），用于日志记录
   */
  async executeDownsampling(
    measurement: string,
    granularity: DownsamplingGranularity,
    retention: string,
  ): Promise<void> {
    const targetMeasurement = this.deriveTargetMeasurement(granularity);
    const result = await this.executeDownsamplingTask({
      measurement,
      granularity,
      aggregation: DEFAULT_AGGREGATION,
      retentionDays: this.parseRetentionDays(retention),
      targetMeasurement,
    });

    if (result.success) {
      this.logger.log(
        `Downsampling completed: ${measurement} → ${targetMeasurement} ` +
          `(${result.processedCount} points aggregated, ${result.writtenCount} written, ${result.duration}ms)`,
        'DownsamplingService',
      );
    } else {
      this.logger.warn(
        `Downsampling failed: ${measurement} → ${targetMeasurement}: ${result.error}`,
        'DownsamplingService',
      );
    }
  }

  /**
   * 注册定时任务，每天凌晨执行所有配置的降采样任务。
   * 如果已有定时器在运行，先清除旧定时器再重新注册。
   */
  scheduleDownsampling(): void {
    this.clearTimers();

    const config = this.getDownsamplingConfig();
    if (!config.enabled) {
      this.logger.log('Downsampling scheduling skipped (disabled)', 'DownsamplingService');
      return;
    }

    const delayMs = this.getMsUntilNextMidnight();
    this.scheduleTimer = setTimeout(() => {
      this.runAllTasks().catch((err) => {
        this.logger.error(
          `Scheduled downsampling failed: ${err.message}`,
          err.stack,
          'DownsamplingService',
        );
      });
      this.dailyTimer = setInterval(() => {
        this.runAllTasks().catch((err) => {
          this.logger.error(
            `Scheduled downsampling failed: ${err.message}`,
            err.stack,
            'DownsamplingService',
          );
        });
      }, DAILY_INTERVAL_MS);
    }, delayMs);

    const nextRun = new Date(Date.now() + delayMs);
    this.logger.log(
      `Downsampling scheduled: next run at ${nextRun.toISOString()} (${config.tasks.length} tasks)`,
      'DownsamplingService',
    );
  }

  /**
   * 获取降采样配置。
   * 配置基于设计文档定义的默认策略，未来可扩展为从环境变量或数据库读取。
   */
  getDownsamplingConfig(): DownsamplingConfig {
    const enabled = (process.env.DOWNSAMPLING_ENABLED || 'true').toLowerCase() !== 'false';

    const tasks: DownsamplingTask[] = [
      {
        measurement: 'tag_values',
        granularity: '1h',
        aggregation: 'mean',
        retentionDays: 365,
        targetMeasurement: 'tag_values_1h',
      },
      {
        measurement: 'tag_values_1h',
        granularity: '1d',
        aggregation: 'mean',
        retentionDays: 0,
        targetMeasurement: 'tag_values_1d',
      },
    ];

    return { enabled, tasks };
  }

  /**
   * 执行所有配置的降采样任务（由定时器调用）。
   */
  async runAllTasks(): Promise<DownsamplingResult[]> {
    if (this.isRunning) {
      this.logger.warn('Downsampling already in progress, skipping', 'DownsamplingService');
      return [];
    }

    const config = this.getDownsamplingConfig();
    if (!config.enabled) {
      return [];
    }

    this.isRunning = true;
    const results: DownsamplingResult[] = [];

    try {
      if (!(await this.isInfluxDbAvailable())) {
        this.logger.warn('InfluxDB not available, downsampling skipped', 'DownsamplingService');
        return config.tasks.map((task) => ({
          measurement: task.measurement,
          targetMeasurement: task.targetMeasurement,
          granularity: task.granularity,
          processedCount: 0,
          writtenCount: 0,
          duration: 0,
          success: false,
          error: 'InfluxDB not available',
        }));
      }

      for (const task of config.tasks) {
        const result = await this.executeDownsamplingTask(task);
        results.push(result);

        if (result.success) {
          this.logger.log(
            `Task done: ${task.measurement} → ${task.targetMeasurement} ` +
              `(${result.processedCount} → ${result.writtenCount}, ${result.duration}ms)`,
            'DownsamplingService',
          );
        } else {
          this.logger.warn(
            `Task failed: ${task.measurement} → ${task.targetMeasurement}: ${result.error}`,
            'DownsamplingService',
          );
        }
      }
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  // ──────────── 内部：任务执行 ────────────

  /**
   * 执行单个降采样任务：查询 → 聚合 → 写回。
   */
  private async executeDownsamplingTask(task: DownsamplingTask): Promise<DownsamplingResult> {
    const startTime = Date.now();
    const result: DownsamplingResult = {
      measurement: task.measurement,
      targetMeasurement: task.targetMeasurement,
      granularity: task.granularity,
      processedCount: 0,
      writtenCount: 0,
      duration: 0,
      success: false,
    };

    if (!this.influxToken) {
      result.error = 'INFLUXDB_TOKEN is not configured';
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      // 1. 构建并执行 Flux 聚合查询
      const fluxQuery = this.buildAggregationFluxQuery(
        task.measurement,
        task.granularity,
        task.aggregation,
      );
      const csvResponse = await this.executeFluxQuery(fluxQuery);

      // 2. 解析 CSV 结果为降采样数据点
      const aggregatedPoints = this.parseAggregationCsv(csvResponse);
      result.processedCount = aggregatedPoints.length;

      if (aggregatedPoints.length === 0) {
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // 3. 将聚合结果写入目标 measurement
      const written = await this.writeAggregatedPoints(task.targetMeasurement, aggregatedPoints);
      result.writtenCount = written;
      result.success = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      result.error = error.message;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // ──────────── 内部：Flux 查询构建 ────────────

  /**
   * 构建 Flux 聚合查询语句。
   *
   * 查询逻辑：
   *   1. 从 bucket 读取源 measurement 的 value 字段
   *   2. 按 tagId/deviceId/projectId 分组
   *   3. 使用 aggregateWindow 按指定粒度和函数聚合
   */
  private buildAggregationFluxQuery(
    measurement: string,
    granularity: string,
    aggregation: DownsamplingAggregation,
  ): string {
    const range = this.getRangeForGranularity(granularity);
    const fluxFn = aggregation === 'last' ? 'last' : aggregation;

    return [
      `from(bucket: "${this.influxBucket}")`,
      `  |> range(start: ${range})`,
      `  |> filter(fn: (r) => r["_measurement"] == "${measurement}")`,
      `  |> filter(fn: (r) => r["_field"] == "value")`,
      `  |> group(columns: ["tagId", "deviceId", "projectId", "_field"])`,
      `  |> aggregateWindow(every: ${granularity}, fn: ${fluxFn}, createEmpty: false)`,
    ].join('\n');
  }

  // ──────────── 内部：InfluxDB HTTP 通信 ────────────

  /**
   * 通过 InfluxDB /api/v2/query 接口执行 Flux 查询，返回 CSV 文本。
   */
  private async executeFluxQuery(query: string): Promise<string> {
    const url = `${this.influxUrl}/api/v2/query?org=${this.influxOrg}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.influxToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/csv',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`InfluxDB query failed (${response.status}): ${errorBody}`);
    }

    return response.text();
  }

  /**
   * 将聚合后的数据点通过 Line Protocol 批量写入目标 measurement。
   */
  private async writeAggregatedPoints(
    targetMeasurement: string,
    points: AggregatedPoint[],
  ): Promise<number> {
    if (points.length === 0) return 0;

    const lines = points.map((p) => this.toLineProtocol(targetMeasurement, p)).join('\n');
    const url = `${this.influxUrl}/api/v2/write?org=${this.influxOrg}&bucket=${this.influxBucket}&precision=ns`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.influxToken}`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: lines,
    });

    if (!response.ok && response.status !== 204) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`InfluxDB write failed (${response.status}): ${errorBody}`);
    }

    return points.length;
  }

  /**
   * 将单个聚合数据点转换为 InfluxDB Line Protocol 格式。
   */
  private toLineProtocol(measurement: string, point: AggregatedPoint): string {
    const escapeTag = (v: string): string => v.replace(/[,= ]/g, '\\$&');
    const tags = [
      `tagId=${escapeTag(point.tagId)}`,
      `deviceId=${escapeTag(point.deviceId)}`,
      `projectId=${escapeTag(point.projectId)}`,
    ].join(',');

    const ts = point.timestamp.getTime() * 1000000; // ns

    return `${measurement},${tags} value=${point.value} ${ts}`;
  }

  // ──────────── 内部：CSV 解析 ────────────

  /**
   * 解析 InfluxDB Flux 查询返回的 CSV，提取聚合数据点。
   *
   * CSV 格式示例：
   *   #group,false,false,true,...
   *   #datatype,string,long,dateTime:RFC3339,double,...
   *   ,result,table,_time,_value,tagId,deviceId,projectId,_field,_measurement
   *   ,,0,2025-01-01T00:00:00Z,42.5,tag-001,dev-001,proj-001,value,tag_values
   */
  private parseAggregationCsv(csvText: string): AggregatedPoint[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // 跳过以 # 开头的注释行，找到表头行
    let headerIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('#')) {
        headerIdx = i;
        break;
      }
    }

    const headers = lines[headerIdx].split(',');
    const dataLines = lines
      .slice(headerIdx + 1)
      .filter((l) => l.trim() !== '' && !l.startsWith('#'));

    const timeIdx = headers.findIndex((h) => h === '_time');
    const valueIdx = headers.findIndex((h) => h === '_value');
    const tagIdIdx = headers.findIndex((h) => h === 'tagId');
    const deviceIdIdx = headers.findIndex((h) => h === 'deviceId');
    const projectIdIdx = headers.findIndex((h) => h === 'projectId');

    if (timeIdx < 0 || valueIdx < 0) return [];

    const points: AggregatedPoint[] = [];

    for (const line of dataLines) {
      const cols = line.split(',');
      const getVal = (idx: number): string => (idx >= 0 && idx < cols.length ? cols[idx] : '');

      const timeStr = getVal(timeIdx);
      const valueStr = getVal(valueIdx);
      if (!timeStr || !valueStr) continue;

      const value = parseFloat(valueStr);
      if (Number.isNaN(value)) continue;

      points.push({
        timestamp: new Date(timeStr),
        value,
        tagId: getVal(tagIdIdx),
        deviceId: getVal(deviceIdIdx),
        projectId: getVal(projectIdIdx),
      });
    }

    return points;
  }

  // ──────────── 内部：辅助方法 ────────────

  /**
   * 检查 InfluxDB 是否可用（配置了 Token 且健康检查通过）。
   * 如果注入了 StorageAdapter，优先使用其 health() 方法。
   */
  private async isInfluxDbAvailable(): Promise<boolean> {
    if (!this.influxToken) return false;

    if (this.adapter) {
      try {
        const health = await this.adapter.health();
        return health.status === 'healthy' || health.status === 'degraded';
      } catch {
        return false;
      }
    }

    try {
      const response = await fetch(`${this.influxUrl}/health`, {
        method: 'GET',
        headers: { Authorization: `Token ${this.influxToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 根据粒度获取 Flux range 时间范围。
   */
  private getRangeForGranularity(granularity: string): string {
    if (granularity === '1h') return GRANULARITY_RANGE['1h'];
    if (granularity === '1d') return GRANULARITY_RANGE['1d'];
    // 默认查询最近 24 小时
    return '-24h';
  }

  /**
   * 从粒度推导目标 measurement 名称。
   * tag_values + 1h → tag_values_1h
   * tag_values_1h + 1d → tag_values_1d
   */
  private deriveTargetMeasurement(granularity: DownsamplingGranularity): string {
    return `${TARGET_MEASUREMENT_PREFIX}_${granularity}`;
  }

  /**
   * 将 retention 字符串解析为天数。
   * "365d" → 365, "permanent" → 0, "" → 0
   */
  private parseRetentionDays(retention: string): number {
    const match = retention.match(/^(\d+)d?$/i);
    if (match) return parseInt(match[1], 10);
    return 0;
  }

  /**
   * 计算距离下一个午夜（本地时间 00:00:00）的毫秒数。
   */
  private getMsUntilNextMidnight(): number {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return nextMidnight.getTime() - now.getTime();
  }

  /**
   * 清除所有定时器。
   */
  private clearTimers(): void {
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    if (this.dailyTimer) {
      clearInterval(this.dailyTimer);
      this.dailyTimer = null;
    }
  }
}

// ──────────── 内部类型 ────────────

/**
 * 聚合后的数据点（内部使用，用于写入目标 measurement）。
 */
interface AggregatedPoint {
  timestamp: Date;
  value: number;
  tagId: string;
  deviceId: string;
  projectId: string;
}
