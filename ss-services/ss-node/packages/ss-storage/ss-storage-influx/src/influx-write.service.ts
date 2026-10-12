// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { InfluxBucketService } from './influx-bucket.service';

export interface InfluxWritePoint {
  measurement: string;
  tags: Record<string, string>;
  fields: Record<string, number | string | boolean>;
  timestamp?: Date | number;
}

interface BatchBuffer {
  points: InfluxWritePoint[];
  timer: NodeJS.Timeout | null;
}

/**
 * CODE-03: 自定义 InfluxDB HTTP 错误，携带 HTTP status 与 bucket 名，
 * 供上层区分 404（bucket 不存在）与其它网络/服务端错误。
 */
export class InfluxHttpException extends Error {
  constructor(
    public readonly status: number,
    public readonly bucket: string,
    message: string,
  ) {
    super(message);
    this.name = 'InfluxHttpException';
  }
}

@Injectable()
export class InfluxWriteService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InfluxWriteService.name);

  private batchBuffer = new Map<string, BatchBuffer>();
  private flushTimeoutMs = 5000;
  private maxBatchSize = 1000;
  private enabled = true;

  private totalWritten = 0;
  private totalErrors = 0;

  /** 后端是否不可达（持久标志：失败时置 true，成功时置 false） */
  private _backendUnreachable = false;

  /** CODE-02: 熔断静默期 — 上次错误/摘要日志时间戳，30s 内不重复打 error/warn */
  private _lastErrorLogTime = 0;
  private readonly _silenceWindowMs = 30_000;
  /** 熔断静默期间累积的丢弃点数（用于周期性摘要输出） */
  private _silencedErrorCount = 0;
  /** CODE-02: 指数退避 — 下次允许尝试写入的时间戳（ms） */
  private _nextRetryTime = 0;
  private _consecutiveFailures = 0;

  /** CODE-03: 已知不可用的 bucket（404 等） — 后续写入直接跳过，不再重试 */
  private readonly _unavailableBuckets = new Set<string>();

  /** CODE-05: 单次 fetch 超时（ms），避免 InfluxDB 半挂时无限等待阻塞 event loop */
  private readonly fetchTimeoutMs = 5000;

  constructor(@Optional() private readonly bucketService?: InfluxBucketService) {}

  onModuleInit(): void {
    this.logger.log(
      `InfluxWriteService initialized (enabled: ${this.enabled}, batch: ${this.maxBatchSize}, flush: ${this.flushTimeoutMs}ms, fetchTimeout: ${this.fetchTimeoutMs}ms, per-project buckets: ${!!this.bucketService})`,
    );
  }

  onModuleDestroy(): void {
    this.flushAll();
  }

  configure(options: { enabled?: boolean; flushTimeoutMs?: number; maxBatchSize?: number }): void {
    if (options.enabled !== undefined) this.enabled = options.enabled;
    if (options.flushTimeoutMs) this.flushTimeoutMs = options.flushTimeoutMs;
    if (options.maxBatchSize) this.maxBatchSize = options.maxBatchSize;
  }

  async writePoint(point: InfluxWritePoint): Promise<void> {
    if (!this.enabled) return;

    const key = `${point.measurement}:${point.tags?.projectId || 'default'}`;

    let buffer = this.batchBuffer.get(key);
    if (!buffer) {
      buffer = { points: [], timer: null };
      this.batchBuffer.set(key, buffer);
    }

    buffer.points.push(point);

    if (buffer.points.length >= this.maxBatchSize) {
      await this.flushBuffer(key);
    } else if (!buffer.timer) {
      buffer.timer = setTimeout(() => {
        // 异步 flush 时捕获错误（已通过 lastFlushError 记录，供下次 writeBatch 检查）
        this.flushBuffer(key).catch(() => {});
      }, this.flushTimeoutMs);
    }
  }

  async writePoints(points: InfluxWritePoint[]): Promise<void> {
    for (const point of points) {
      await this.writePoint(point);
    }
  }

  private async flushBuffer(key: string): Promise<void> {
    const buffer = this.batchBuffer.get(key);
    if (!buffer || buffer.points.length === 0) return;

    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
    }

    const points = buffer.points.splice(0);
    this.batchBuffer.delete(key);

    // CODE-02: 熔断退避期内直接放弃本批（点已从 buffer 移除），
    // 避免熔断打开后仍每 5s 触发一次 fetch 失败 + 日志刷屏。
    // 不抛错 → 不触发上层 PersistStep 熔断，仅本服务内部静默丢弃。
    if (this._backendUnreachable && Date.now() < this._nextRetryTime) {
      this._silencedErrorCount += points.length;
      this.maybeLogSilencedSummary();
      return;
    }

    try {
      // 按 bucket 分组发送
      const projectId = points[0]?.tags?.projectId;
      const bucket =
        projectId && this.bucketService
          ? await this.bucketService.getBucket(projectId)
          : this.getDefaultBucket();

      // CODE-03: 已知 404 的 bucket 直接跳过，不再无效重试
      if (this._unavailableBuckets.has(bucket)) {
        this._silencedErrorCount += points.length;
        this.maybeLogSilencedSummary();
        return;
      }

      await this.sendToInfluxDB(points, bucket);
      this.totalWritten += points.length;

      // 写入成功：复位熔断、退避与静默计数
      if (this._backendUnreachable || this._silencedErrorCount > 0) {
        this.logger.warn(
          `InfluxDB recovered after ${this._silencedErrorCount} points dropped during circuit-open window`,
        );
      }
      this._backendUnreachable = false;
      this._consecutiveFailures = 0;
      this._nextRetryTime = 0;
      this._silencedErrorCount = 0;
      this._lastErrorLogTime = 0;

      if (this.totalWritten % 1000 === 0) {
        this.logger.log(`InfluxDB write progress: ${this.totalWritten} points written`);
      }
    } catch (error) {
      this.totalErrors += points.length;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // CODE-03: 404（bucket 不存在）— 标记该 bucket 不可用，不再重试；
      // 不设置 _backendUnreachable（后端本身可达，仅 bucket 配置错误），
      // 不抛错以避免上层 PersistStep 熔断。
      if (error instanceof InfluxHttpException && error.status === 404) {
        if (!this._unavailableBuckets.has(error.bucket)) {
          this._unavailableBuckets.add(error.bucket);
          this.logger.error(
            `InfluxDB bucket "${error.bucket}" not found (HTTP 404) — future writes to this bucket will be skipped. ` +
              `Please verify INFLUXDB_BUCKET / per-project bucket configuration.`,
          );
        }
        return;
      }

      // CODE-02: 网络错误 → 熔断 + 指数退避 + 错误日志限频
      this._backendUnreachable = true;
      this._consecutiveFailures += 1;
      // 指数退避：1s, 2s, 4s, 8s, ... 上限 60s
      const backoffMs = Math.min(
        1000 * Math.pow(2, this._consecutiveFailures - 1),
        60_000,
      );
      this._nextRetryTime = Date.now() + backoffMs;
      this._silencedErrorCount += points.length;

      // 错误日志限频：30s 内首条 error，后续仅 debug（生产 LOG_LEVEL=info 时不入文件）
      const now = Date.now();
      if (now - this._lastErrorLogTime >= this._silenceWindowMs) {
        this.logger.error(
          `InfluxDB write failed (${points.length} points, backoff=${backoffMs}ms): ${errorMsg}`,
        );
        this._lastErrorLogTime = now;
      } else {
        this.logger.debug(
          `InfluxDB write failed (suppressed, ${points.length} points): ${errorMsg}`,
        );
      }
      throw error;
    }
  }

  /**
   * CODE-02: 静默期内周期性输出 warn 摘要，
   * 避免完全无日志（便于运维感知），但不再每秒 error 刷屏。
   */
  private maybeLogSilencedSummary(): void {
    const now = Date.now();
    if (now - this._lastErrorLogTime >= this._silenceWindowMs) {
      const nextRetryIn = Math.max(0, this._nextRetryTime - now);
      this.logger.warn(
        `InfluxDB backend unreachable — ${this._silencedErrorCount} points dropped during silence window (next retry in ${nextRetryIn}ms)`,
      );
      this._lastErrorLogTime = now;
      this._silencedErrorCount = 0;
    }
  }

  private getDefaultBucket(): string {
    return process.env.INFLUXDB_BUCKET || 'ss_node_data';
  }

  private async sendToInfluxDB(points: InfluxWritePoint[], bucket: string): Promise<void> {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN || '';
    const org = process.env.INFLUXDB_ORG || 'ss-org';

    const lines = points
      .map((point) => {
        const measurement = point.measurement;
        const tagStr = Object.entries(point.tags || {})
          .map(([k, v]) => `${k}=${String(v).replace(/[,= ]/g, '\\$&')}`)
          .join(',');

        const fieldStr = Object.entries(point.fields || {})
          .map(([k, v]) => {
            if (typeof v === 'string') return `${k}="${v}"`;
            if (typeof v === 'boolean') return `${k}=${v}`;
            return `${k}=${v}`;
          })
          .join(',');

        const ts = point.timestamp
          ? ` ${point.timestamp instanceof Date ? point.timestamp.getTime() * 1000000 : point.timestamp}`
          : '';

        return `${measurement},${tagStr} ${fieldStr}${ts}`;
      })
      .join('\n');

    // CODE-05: fetch 加 5s 超时（AbortSignal.timeout），避免 InfluxDB 半挂时无限等待阻塞 event loop
    let response: Response;
    try {
      response = await fetch(`${url}/api/v2/write?org=${org}&bucket=${bucket}&precision=ns`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: lines,
        signal: AbortSignal.timeout(this.fetchTimeoutMs),
      });
    } catch (err) {
      // 包装超时/网络错误信息（保留原始 message 便于诊断）
      throw new Error(`InfluxDB write fetch failed: ${(err as Error).message}`);
    }

    if (!response.ok && response.status !== 204) {
      const errorBody = await response.text().catch(() => 'unknown');
      // CODE-03: 抛出带 HTTP status 的错误，调用方据此区分 404 与网络错误
      throw new InfluxHttpException(
        response.status,
        bucket,
        `InfluxDB HTTP ${response.status}: ${errorBody}`,
      );
    }
  }

  flushAll(): void {
    for (const key of this.batchBuffer.keys()) {
      this.flushBuffer(key).catch(() => {});
    }
  }

  /** 后端是否可达（持久标志：任一失败即 false，成功后恢复 true） */
  get isBackendReachable(): boolean {
    return !this._backendUnreachable;
  }

  getStats() {
    return {
      enabled: this.enabled,
      totalWritten: this.totalWritten,
      totalErrors: this.totalErrors,
      pendingBuffers: this.batchBuffer.size,
      maxBatchSize: this.maxBatchSize,
      backendUnreachable: this._backendUnreachable,
      unavailableBuckets: Array.from(this._unavailableBuckets),
      nextRetryInMs: Math.max(0, this._nextRetryTime - Date.now()),
    };
  }
}
