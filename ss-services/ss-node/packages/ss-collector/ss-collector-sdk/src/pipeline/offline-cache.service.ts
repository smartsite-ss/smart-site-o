// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PersistWriterRegistry } from './persist-writer-registry';
import { DataPoint } from './interfaces';

export interface OfflineDataPoint {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: number | null;
  quality: string;
  timestamp: Date;
  bufferedAt: number;
}

export interface OfflineCacheStats {
  totalBuffered: number;
  maxCapacity: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  dumpDir: string;
  dumpFileSize: number | null;
}

export interface OfflineCacheConfig {
  maxCapacity: number;
  dumpThreshold: number;
  dumpDir: string;
  autoFlushEnabled: boolean;
}

const DEFAULT_CONFIG: OfflineCacheConfig = {
  maxCapacity: 10000,
  dumpThreshold: 0.8,
  dumpDir: process.env.OFFLINE_CACHE_DIR || './data/offline_data',
  autoFlushEnabled: true,
};

@Injectable()
export class OfflineCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfflineCacheService.name);
  private readonly bufferMap = new Map<string, OfflineDataPoint>();
  private readonly config: OfflineCacheConfig;

  /** dump 限流：上次 dump 时间戳，防止高频同步 I/O */
  private lastDumpTime = 0;
  /** dump 限流间隔（毫秒） */
  private readonly dumpThrottleMs = 5000;
  /** 警告日志限流 */
  private lastWarnTime = 0;
  /** 异步 dump 定时器句柄，用于 debounce */
  private dumpTimer: NodeJS.Timeout | null = null;

  constructor(
    @Optional() config?: Partial<OfflineCacheConfig>,
    @Optional() private readonly writerRegistry?: PersistWriterRegistry,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  onModuleInit(): void {
    this.logger.log(
      `OfflineCacheService initialized (maxCapacity=${this.config.maxCapacity}, dumpDir=${this.config.dumpDir})`,
    );
    this.ensureDumpDir();
    this.loadFromDisk();
  }

  onModuleDestroy(): void {
    this.logger.log('OfflineCacheService destroyed, dumping to disk');
    if (this.dumpTimer) clearTimeout(this.dumpTimer);
    this.dumpToDiskSync();
    this.bufferMap.clear();
  }

  buffer(tagId: string, data: OfflineDataPoint): void {
    const key = `${tagId}:${data.bufferedAt}`;
    this.bufferMap.set(key, data);

    const now = Date.now();

    // 超过容量时触发限流 dump
    if (this.bufferMap.size >= this.config.maxCapacity) {
      // 警告日志限流：30s 最多一次
      if (now - this.lastWarnTime > 30000) {
        this.lastWarnTime = now;
        this.logger.warn(`Buffer full (${this.bufferMap.size}/${this.config.maxCapacity})`);
      }

      // dump 限流：5s 最多一次异步写盘，避免每次 buffer() 都触发同步 I/O
      if (now - this.lastDumpTime > this.dumpThrottleMs) {
        this.lastDumpTime = now;
        this.scheduleAsyncDump();
      }
    }

    // 硬上限保护：超过 2 倍容量时丢弃最旧 25% 数据，防止内存无限增长
    const hardCap = this.config.maxCapacity * 2;
    if (this.bufferMap.size > hardCap) {
      const dropCount = Math.floor(this.bufferMap.size - this.config.maxCapacity * 1.5);
      this.dropOldest(dropCount);
    }
  }

  getBufferedCount(): number {
    return this.bufferMap.size;
  }

  getBufferedData(deviceId?: string): OfflineDataPoint[] {
    const items = Array.from(this.bufferMap.values());

    if (deviceId) {
      return items.filter((item) => item.deviceId === deviceId);
    }

    return items;
  }

  async flush(maxBatch?: number): Promise<OfflineDataPoint[]> {
    const items = Array.from(this.bufferMap.values());
    const batch = maxBatch ? items.slice(0, maxBatch) : items;

    if (batch.length === 0) {
      return [];
    }

    this.logger.log(`Flushing ${batch.length} buffered items`);

    // 通过 PersistWriterRegistry 写回各存储后端
    let allSucceeded = true;
    if (this.writerRegistry) {
      const dataPoints: DataPoint[] = batch.map((item) => ({
        tagId: item.tagId,
        deviceId: item.deviceId,
        projectId: item.projectId,
        value: item.value,
        quality: item.quality,
        timestamp: item.timestamp,
      }));

      const writers = this.writerRegistry.getWriters();
      for (const writer of writers) {
        try {
          await writer.writeBatch(dataPoints);
          this.logger.log(`Flushed ${batch.length} items to ${writer.name}`);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Flush to ${writer.name} failed: ${errMsg}`);
          allSucceeded = false;
        }
      }
    } else {
      this.logger.warn(
        `No PersistWriterRegistry available, ${batch.length} items cannot be flushed`,
      );
      allSucceeded = false;
    }

    if (!allSucceeded) {
      this.logger.warn(`Flush incomplete, ${batch.length} items remain in buffer`);
      return [];
    }

    // 全部 Writer 写入成功，从缓冲区移除
    for (const item of batch) {
      const key = `${item.tagId}:${item.bufferedAt}`;
      this.bufferMap.delete(key);
    }

    if (this.bufferMap.size > 0) {
      this.dumpToDiskSync();
    } else {
      this.clearDiskDump();
    }

    return batch;
  }

  clear(): void {
    this.logger.log(`Clearing ${this.bufferMap.size} buffered items`);
    this.bufferMap.clear();
    this.clearDiskDump();
  }

  isBufferFull(): boolean {
    return this.bufferMap.size >= this.config.maxCapacity;
  }

  getBufferStats(): OfflineCacheStats {
    const items = Array.from(this.bufferMap.values());
    const timestamps = items.map((i) => i.bufferedAt).filter((t) => t > 0);

    let dumpFileSize: number | null = null;
    const dumpPath = this.getDumpFilePath();
    try {
      if (fs.existsSync(dumpPath)) {
        dumpFileSize = fs.statSync(dumpPath).size;
      }
    } catch {
      // 忽略 stat 错误
    }

    return {
      totalBuffered: this.bufferMap.size,
      maxCapacity: this.config.maxCapacity,
      oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : null,
      dumpDir: dumpPath,
      dumpFileSize,
    };
  }

  private ensureDumpDir(): void {
    try {
      if (!fs.existsSync(this.config.dumpDir)) {
        fs.mkdirSync(this.config.dumpDir, { recursive: true });
      }
    } catch (error) {
      this.logger.error(`Failed to create dump directory: ${error.message}`);
    }
  }

  private getDumpFilePath(): string {
    return path.join(this.config.dumpDir, 'offline-cache-dump.json');
  }

  private dumpToDiskSync(): void {
    if (this.bufferMap.size === 0) return;

    try {
      this.ensureDumpDir();
      const items = Array.from(this.bufferMap.values());
      const dumpData = JSON.stringify(items);
      fs.writeFileSync(this.getDumpFilePath(), dumpData, 'utf-8');
    } catch (error) {
      this.logger.error(
        `Failed to dump buffer to disk: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private scheduleAsyncDump(): void {
    if (this.dumpTimer) return; // 已有待执行的 dump
    this.dumpTimer = setTimeout(() => {
      this.dumpTimer = null;
      this.dumpToDiskAsync();
    }, 1000); // 1s debounce：合并短时间内的多次写入
  }

  private async dumpToDiskAsync(): Promise<void> {
    if (this.bufferMap.size === 0) return;

    try {
      this.ensureDumpDir();
      const items = Array.from(this.bufferMap.values());
      const dumpData = JSON.stringify(items);
      await fs.promises.writeFile(this.getDumpFilePath(), dumpData, 'utf-8');
      this.logger.debug(`Async dumped ${items.length} items to disk`);
    } catch (error) {
      this.logger.error(
        `Failed to async dump buffer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 丢弃 buffer 中最旧的 N 条数据（按 bufferedAt 排序），防止内存无限增长
   */
  private dropOldest(count: number): void {
    const entries = Array.from(this.bufferMap.entries());
    entries.sort((a, b) => a[1].bufferedAt - b[1].bufferedAt);
    const toDrop = entries.slice(0, Math.min(count, entries.length));
    for (const [key] of toDrop) {
      this.bufferMap.delete(key);
    }
    this.logger.warn(
      `Dropped ${toDrop.length} oldest items from buffer (remaining: ${this.bufferMap.size})`,
    );
  }

  private loadFromDisk(): void {
    try {
      const dumpPath = this.getDumpFilePath();
      if (!fs.existsSync(dumpPath)) return;

      const raw = fs.readFileSync(dumpPath, 'utf-8');
      const items: OfflineDataPoint[] = JSON.parse(raw);

      if (items.length > 0) {
        // 最多加载 maxCapacity 条到内存，超出部分保留在磁盘文件中
        const toLoad = items.slice(-this.config.maxCapacity);
        const dropped = items.length - toLoad.length;
        for (const item of toLoad) {
          item.timestamp = new Date(item.timestamp);
          const key = `${item.tagId}:${item.bufferedAt}`;
          this.bufferMap.set(key, item);
        }
        this.logger.log(
          `Loaded ${toLoad.length} items from disk dump` +
            (dropped > 0 ? ` (dropped ${dropped} oldest items exceeding maxCapacity)` : ''),
        );
        // 如果截断了，更新磁盘文件
        if (dropped > 0) {
          fs.writeFileSync(dumpPath, JSON.stringify(toLoad), 'utf-8');
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to load buffer from disk: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private clearDiskDump(): void {
    try {
      const dumpPath = this.getDumpFilePath();
      if (fs.existsSync(dumpPath)) {
        fs.unlinkSync(dumpPath);
      }
    } catch (error) {
      this.logger.error(`Failed to clear disk dump: ${error.message}`);
    }
  }
}
