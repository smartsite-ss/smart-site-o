// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';

import { IPersistWriter, DataPoint } from '../interfaces';
import { PersistWriterRegistry } from '../persist-writer-registry';
import { PipelineMetricsService } from '../pipeline-metrics.service';
import { OfflineCacheService } from '../offline-cache.service';

/**
 * PersistStep — 持久化步骤
 *
 * 改造历史（P0-1 + P2-1 + P2-2 + P3）：
 * 原先每个 ctx 调用所有 writer 的 write() 单条写入，导致：
 * - 1000 tags × 1Hz = 1000 次/秒 HSET 网络往返
 * - InfluxDB 慢写入（50ms+）通过 Promise.all 拖累整个 Pipeline 周期
 *
 * 现在改为「周期批量聚合」模式：
 * 1. process(ctx) 时构造 DataPoint，追加到每个 writer 的缓冲区
 * 2. 触发条件（缓冲区满 maxBatchSize 或定时器 maxFlushIntervalMs 到期）执行 flush()
 * 3. flush() 按优先级处理：
 *    - critical writer (Redis/SQLite)：await writer.writeBatch(points)
 *    - best_effort writer (InfluxDB)：void writer.writeBatch(points)（fire-and-forget）
 * 4. 使用 Promise.allSettled 替代 Promise.all，单个 writer 失败不影响其他 writer
 * 5. flush 失败的错误记录到 lastBatchErrors，下次 process(ctx) 时透传到 ctx.errors
 *
 * 错误透传策略（P1-2）：
 * 由于批量聚合后无法精确归属错误到具体 ctx，采用「下次 ctx 携带」策略：
 * - flush 失败时记录 { writerName, message, timestamp } 到 lastBatchErrors
 * - 下次 process(ctx) 开头检查并写入 ctx.errors，然后清空
 * - 这样 PublishStep 可以通过 ctx.errors 感知持久化异常
 *
 * 精度控制（P3 — 2026-07-27）：
 * PersistStep 存储前按 tagConfig.displayFormat 精度 round 数值：
 * - %.Nf → 保留 N 位小数（如 3.14159, %.2f → 3.14）
 * - %d / %i / %.0f / %X → 整数
 * - 空 / 不支持的格式 → 保留原值
 * 这样历史数据查询返回的值天然就是可展示精度，前端无需大量 formatTagValue 调用。
 * 注意：只影响 DataPoint.value（存库），ctx.transformedValue 不动（FormatStep/PublishStep 继续使用）。
 */
@Injectable()
export class PersistStep implements PipelineStep, OnModuleInit, OnModuleDestroy {
  readonly name = 'Persist';
  readonly order = 6;

  private readonly logger = new Logger(PersistStep.name);

  /** 单 writer 缓冲区达到此阈值时立即 flush（避免内存堆积） */
  private readonly maxBatchSize = 200;
  /** 定时 flush 间隔（ms），保证最长延迟不超过此值 */
  private readonly maxFlushIntervalMs = 200;

  /** 每个 writer 的待写入缓冲区：writerName → DataPoint[] */
  private readonly bufferByWriter = new Map<string, DataPoint[]>();
  /** 定时器句柄 */
  private flushTimer: NodeJS.Timeout | null = null;
  /** flush 正在进行中标记（防止重入） */
  private flushing = false;

  /** 上次 flush 产生的错误（下次 process 时透传到 ctx.errors） */
  private lastBatchErrors: Array<{ step: string; message: string; code?: string }> = [];

  constructor(
    private readonly writerRegistry: PersistWriterRegistry,
    private readonly metricsService?: PipelineMetricsService,
    private readonly offlineCache?: OfflineCacheService,
  ) {}

  onModuleInit(): void {
    const writers = this.writerRegistry.getWriters();
    const names = writers.map((w) => `${w.name}(${w.priority ?? 'critical'})`).join(', ');
    this.logger.log(
      `PersistStep initialized — ${writers.length} persist writer(s): [${names}]` +
        ` (batchSize=${this.maxBatchSize}, flushInterval=${this.maxFlushIntervalMs}ms)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    // 模块销毁时 flush 残留缓冲区，避免数据丢失
    this.logger.log('PersistStep destroying — flushing remaining buffer');
    this.stopTimer();
    await this.flushAll();
    // 通知每个 writer 自身 flush（如 SQLite writer 仍有内部 buffer 需刷盘）
    await Promise.allSettled(
      this.writers.map((w) =>
        w.flush().catch((err) => {
          this.logger.error(`${w.name} flush on destroy failed: ${err.message}`);
        }),
      ),
    );
  }

  private get writers(): IPersistWriter[] {
    return this.writerRegistry.getWriters();
  }

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.shouldPersist) {
      return ctx;
    }

    // 透传上次 flush 的批量错误（P1-2 错误透传机制）
    if (this.lastBatchErrors.length > 0) {
      for (const err of this.lastBatchErrors) {
        ctx.errors.push(err);
      }
      this.lastBatchErrors = [];
    }

    // 按 displayFormat 精度 round 后再存储（P3），不修改 ctx.transformedValue
    const roundedValue = this.roundByDisplayFormat(
      ctx.transformedValue,
      ctx.tagConfig?.displayFormat,
    );

    const dataPoint: DataPoint = {
      tagId: ctx.tagId,
      deviceId: ctx.deviceId,
      projectId: ctx.projectId,
      deviceCode: ctx.deviceCode,
      deviceName: ctx.deviceName,
      value: roundedValue,
      quality: ctx.quality,
      timestamp: new Date(),
    };

    // 追加到每个激活 writer 的缓冲区（禁用的 writer 跳过，避免 no-op 计入指标）
    for (const writer of this.writers) {
      if (writer.isActive && !writer.isActive()) continue;
      const buf = this.bufferByWriter.get(writer.name) ?? [];
      buf.push(dataPoint);
      this.bufferByWriter.set(writer.name, buf);
    }

    // 触发条件 1：任一 writer 缓冲区满 → 立即 flush
    const shouldFlushImmediately = Array.from(this.bufferByWriter.values()).some(
      (buf) => buf.length >= this.maxBatchSize,
    );

    if (shouldFlushImmediately) {
      await this.flushAll();
    } else {
      // 触发条件 2：定时器未启动 → 启动
      this.ensureTimer();
    }

    return ctx;
  }

  /**
   * 立即 flush 所有 writer 的缓冲区
   *
   * 实现细节：
   * - 使用 Promise.allSettled 替代 Promise.all，单个 writer 失败不影响其他
   * - critical writer：await writeBatch
   * - best_effort writer：void writeBatch（fire-and-forget，不阻塞）
   * - 错误统一记录到 lastBatchErrors，下次 process 时透传到 ctx.errors
   */
  async flushAll(): Promise<void> {
    // 防止重入：若上次 flush 尚未完成，跳过（定时器会在下个周期再触发）
    if (this.flushing) {
      return;
    }
    this.flushing = true;

    // 快照当前缓冲区并清空（避免迭代中被修改）
    const snapshot = new Map(this.bufferByWriter);
    this.bufferByWriter.clear();
    this.stopTimer();

    if (snapshot.size === 0) {
      this.flushing = false;
      return;
    }

    const writers = this.writers;
    const criticalTasks: Array<Promise<void>> = [];
    const bestEffortTasks: Array<Promise<void>> = [];

    for (const writer of writers) {
      const points = snapshot.get(writer.name);
      if (!points || points.length === 0) continue;

      const task = this.executeWriterWriteBatch(writer, points);
      if (writer.priority === 'best_effort') {
        bestEffortTasks.push(task);
      } else {
        criticalTasks.push(task);
      }
    }

    // critical writer 同步等待（保证关键数据落盘）
    if (criticalTasks.length > 0) {
      await Promise.allSettled(criticalTasks);
    }

    // best_effort writer 异步触发，不等待（避免 InfluxDB 慢写入拖累 Pipeline）
    // 错误会在 task 内部捕获并记录到 lastBatchErrors
    for (const task of bestEffortTasks) {
      void task;
    }

    this.flushing = false;
  }

  /**
   * 执行单个 writer 的 writeBatch，捕获错误到 lastBatchErrors
   */
  private async executeWriterWriteBatch(
    writer: IPersistWriter,
    points: DataPoint[],
  ): Promise<void> {
    // 仅对 ACTIVE 的历史存储 Writer（InfluxDB / SQLite）按数据点计数，
    // 非历史 Writer（RedisLatestValue 等缓存层）或禁用的 Writer 不计入持久化写入指标
    const isHistorical = writer.name === 'InfluxDB' || writer.name === 'SQLite';
    const shouldRecord = isHistorical && (!writer.isActive || writer.isActive());
    try {
      await writer.writeBatch(points);
      if (shouldRecord) {
        for (let i = 0; i < points.length; i++) {
          this.metricsService?.recordPersistWrite(true);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : `${writer.name} writeBatch failed`;
      this.logger.error(`${writer.name} writeBatch error (${points.length} points): ${errorMsg}`);
      if (shouldRecord) {
        for (let i = 0; i < points.length; i++) {
          this.metricsService?.recordPersistWrite(false);
        }
      }
      this.lastBatchErrors.push({
        step: `${this.name}:${writer.name}`,
        message: errorMsg,
        code: 'PERSIST_ERROR',
      });
      // 写入失败 → 缓冲到离线缓存，等待后续恢复后重试
      if (this.offlineCache) {
        for (const p of points) {
          this.offlineCache.buffer(p.tagId, {
            tagId: p.tagId,
            deviceId: p.deviceId,
            projectId: p.projectId,
            value: p.value === undefined || p.value === null ? null : Number(p.value),
            quality: p.quality || 'bad',
            timestamp: p.timestamp,
            bufferedAt: Date.now(),
          });
        }
      }
    }
  }

  private ensureTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      // 异步触发，不阻塞当前调用栈
      void this.flushAll();
    }, this.maxFlushIntervalMs);
  }

  private stopTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** 透传接口：暴露缓冲区状态供监控/诊断使用 */
  getBufferStats(): Array<{ writer: string; buffered: number }> {
    return this.writers.map((w) => ({
      writer: w.name,
      buffered: this.bufferByWriter.get(w.name)?.length ?? 0,
    }));
  }

  /** 透传接口：暴露最近一次 flush 的错误（供诊断端点使用） */
  getLastError(): Array<{ step: string; message: string; code?: string }> {
    return [...this.lastBatchErrors];
  }

  getWriters(): string[] {
    return this.writers.map((w) => w.name);
  }

  /**
   * 按 displayFormat 精度对数值进行 round。
   *
   * 与 FormatStep 格式语义一致，但仅做精度控制（保留 number 类型），不生成字符串：
   * - %.Nf → 保留 N 位小数（toFixed + Number 去尾零）
   * - %d / %i / %.0f → 整数
   * - %X / %x（含宽度如 %04X）→ 整数
   * - 空 / 不支持的格式 → 返回原值
   *
   * 注意：bool / string 类型值不做精度处理，原样返回，保留类型语义。
   */
  private roundByDisplayFormat(
    value: number | boolean | string | null,
    displayFormat?: string,
  ): number | boolean | string | null {
    // 非数值类型直接返回，不应用精度控制
    if (typeof value === 'boolean' || typeof value === 'string') return value;
    if (value === null || value === undefined || !displayFormat) return value;

    const num = Number(value);
    if (Number.isNaN(num)) return value;

    // 浮点格式：%.Nf
    const floatMatch = displayFormat.match(/^%\.(\d+)f$/);
    if (floatMatch) {
      const decimals = parseInt(floatMatch[1], 10);
      return Number(num.toFixed(decimals));
    }

    // 整数格式 + 十六进制格式
    if (
      displayFormat === '%d' ||
      displayFormat === '%i' ||
      displayFormat === '%.0f' ||
      /^%\d*[Xx]$/.test(displayFormat)
    ) {
      return Math.round(num);
    }

    return value;
  }
}
