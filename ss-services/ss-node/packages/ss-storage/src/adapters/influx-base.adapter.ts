// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  StorageAdapter,
  DataPoint,
  QueryOptions,
  WriteResult,
  AdapterCapabilities,
} from '../interfaces/storage-adapter.interface';

/**
 * Nest Logger 结构化类型：各子包 pnpm 可能解析到不同的 @nestjs/common 实例
 * （peer 依赖集合不同 → 名义类型不兼容 TS2416），改用结构化声明规避。
 */
interface MinimalLogger {
  log(message: any, ...optionalParams: any[]): void;
  error(message: any, ...optionalParams: any[]): void;
  warn(message: any, ...optionalParams: any[]): void;
  debug(message: any, ...optionalParams: any[]): void;
}

const BATCH_SIZE = 1000;
const FLUSH_INTERVAL = 5000;
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 10000;
// CODE-05: 单次 fetch 超时（ms），避免半挂时无限等待阻塞 event loop
const FETCH_TIMEOUT_MS = 5000;

interface BufferedWrite {
  points: DataPoint[];
  attempts: number;
}

/** 读取请求描述：由各引擎适配器钩子生成，基类统一执行 HTTP 传输 */
export interface EngineReadRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * Line Protocol 系引擎适配器基类（InfluxDB 2 / InfluxDB 3 Core / TDengine 共用）。
 *
 * 从 InfluxdbAdapterService 抽取的工程化骨架：
 * - 内存缓冲（1000 条 / 5s）批写；
 * - 失败重试（3 次 / 10s 间隔），重试耗尽丢弃并记日志；
 * - 关闭时 flush 全量缓冲；
 * - fetch 5s 超时；
 * - read() 统一传输骨架（构建请求 → fetch → 解析归一化）。
 *
 * 子类只需实现传输/方言/解析钩子：
 * - sendBatch：一批点的 HTTP 写入（Line Protocol 报文由 serializeLineProtocol 生成）；
 * - buildReadRequest：QueryOptions → 引擎查询请求；
 * - parseReadResponse：引擎原始返回 → DataPoint[]（结果归一化）。
 */
export abstract class InfluxBaseAdapter implements StorageAdapter {
  abstract readonly name: string;
  abstract readonly engineType: string;
  abstract readonly capabilities: AdapterCapabilities;
  protected abstract readonly logger: MinimalLogger;
  /** read() HTTP 失败时的错误信息前缀（保留各引擎原有错误语义） */
  protected abstract readonly readErrorLabel: string;

  private buffer: DataPoint[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private retryQueue: BufferedWrite[] = [];
  private retryTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private isClosed = false;

  // ──────────── write ────────────

  async write(points: DataPoint[]): Promise<WriteResult> {
    if (this.isClosed) {
      return {
        success: false,
        written: 0,
        failed: points.length,
        errors: [new Error('Adapter is closed')],
      };
    }

    for (const point of points) {
      this.buffer.push(point);
    }

    if (this.buffer.length >= BATCH_SIZE) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), FLUSH_INTERVAL);
    }

    return { success: true, written: points.length, failed: 0 };
  }

  // ──────────── read（统一传输骨架） ────────────

  async read(options: QueryOptions): Promise<DataPoint[]> {
    const request = await this.buildReadRequest(options);

    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        // CODE-05: fetch 加 5s 超时
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'unknown');
        throw new Error(`${this.readErrorLabel} failed (${response.status}): ${errorBody}`);
      }

      const rawText = await response.text();
      return this.parseReadResponse(rawText);
    } catch (error) {
      this.logger.error(`${this.readErrorLabel} error: ${(error as Error).message}`);
      throw error;
    }
  }

  // ──────────── 子类钩子 ────────────

  /** 一批点的 HTTP 写入（缓冲/重试由基类管理） */
  protected abstract sendBatch(points: DataPoint[]): Promise<void>;

  /** QueryOptions → 引擎查询请求（URL/头/体），支持异步（如需解析项目隔离单元） */
  protected abstract buildReadRequest(options: QueryOptions): Promise<EngineReadRequest>;

  /** 引擎原始返回文本 → 统一 DataPoint[]（结果归一化） */
  protected abstract parseReadResponse(rawText: string): DataPoint[];

  // ──────────── 子类钩子：delete / health（各引擎语义不同，由子类实现） ────────────

  abstract delete(options: { tagIds?: string[]; before?: Date }): Promise<number>;

  abstract health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }>;

  // ──────────── close ────────────

  async close(): Promise<void> {
    this.isClosed = true;
    this.flushAll();
    this.clearTimers();
    this.logger.log(`${this.constructor.name} closed`);
  }

  /** 当前待写入缓冲点数（health() 上报用） */
  protected get pendingBufferCount(): number {
    return this.buffer.length;
  }

  // ──────────── Internal: Flush ────────────

  private async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) return;

    this.clearFlushTimer();

    this.isFlushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      await this.sendBatch(batch);
      this.logger.debug(`Flushed ${batch.length} points to ${this.engineType}`);
    } catch (error) {
      this.logger.error(`Flush failed (${batch.length} points): ${(error as Error).message}`);
      this.enqueueRetry(batch);
    } finally {
      this.isFlushing = false;
    }
  }

  private flushAll(): void {
    this.clearFlushTimer();
    if (this.buffer.length > 0) {
      const batch = this.buffer.splice(0, this.buffer.length);
      this.sendBatch(batch).catch((err) => {
        this.logger.error(`Final flush failed: ${err.message}`);
      });
    }
  }

  // ──────────── Internal: Retry ────────────

  private enqueueRetry(points: DataPoint[]): void {
    this.retryQueue.push({ points, attempts: 0 });

    if (!this.retryTimer) {
      this.retryTimer = setInterval(() => this.processRetryQueue(), RETRY_INTERVAL);
    }
  }

  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) {
      this.clearRetryTimer();
      return;
    }

    const remaining: BufferedWrite[] = [];

    for (const entry of this.retryQueue) {
      entry.attempts++;

      try {
        await this.sendBatch(entry.points);
        this.logger.log(
          `Retry succeeded on attempt ${entry.attempts}: ${entry.points.length} points`,
        );
      } catch (error) {
        if (entry.attempts < MAX_RETRIES) {
          remaining.push(entry);
          this.logger.warn(
            `Retry failed (attempt ${entry.attempts}/${MAX_RETRIES}): ${(error as Error).message}`,
          );
        } else {
          this.logger.error(
            `Retry exhausted after ${MAX_RETRIES} attempts, dropping ${entry.points.length} points`,
          );
        }
      }
    }

    this.retryQueue = remaining;
  }

  // ──────────── Internal: Timers ────────────

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearFlushTimer();
    this.clearRetryTimer();
  }
}
