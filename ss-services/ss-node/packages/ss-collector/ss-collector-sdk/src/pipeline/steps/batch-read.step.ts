// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';
import { IDeviceContext, ITagContext } from '../../types';
import { PluginRegistry } from '../../plugins';

export interface BatchItem {
  tagId: string;
  tagConfig: any;
  deviceType: string;
  context: PipelineContext;
}

export interface BatchConfig {
  maxBatchSize: number;
  batchTimeoutMs: number;
  enableAddressMerging: boolean;
  maxMergeSize: number;
  fallbackToSingle: boolean;
}

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 32,
  batchTimeoutMs: 100,
  enableAddressMerging: true,
  maxMergeSize: 64,
  fallbackToSingle: true,
};

@Injectable()
export class BatchProtocolReadStep implements PipelineStep {
  readonly name = 'BatchProtocolRead';
  readonly order = 0;

  private readonly logger = new Logger(BatchProtocolReadStep.name);

  // 待处理队列（按设备分组）
  private pendingBatches = new Map<string, BatchItem[]>();

  // 批量执行Promise（用于等待）
  private batchPromises = new Map<string, Promise<void>>();

  // 配置
  private config: BatchConfig = DEFAULT_BATCH_CONFIG;

  // 连接缓存（按 deviceKey → client）
  private clientCache = new Map<string, any>();

  // 统计
  private stats = {
    totalBatches: 0,
    mergedRequests: 0,
    avgBatchSize: 0,
    fallbackCount: 0,
  };

  constructor(private readonly pluginRegistry: PluginRegistry) {}

  setConfig(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug(`Batch config updated: ${JSON.stringify(config)}`);
  }

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    const deviceKey = ctx.deviceId || 'default';

    // 添加到批次队列
    if (!this.pendingBatches.has(deviceKey)) {
      this.pendingBatches.set(deviceKey, []);

      // 设置延迟执行
      const batchPromise = this.delayedFlush(deviceKey);
      this.batchPromises.set(deviceKey, batchPromise);
    }

    const batch = this.pendingBatches.get(deviceKey)!;

    batch.push({
      tagId: ctx.tagId,
      tagConfig: ctx.tagConfig,
      deviceType: ctx.deviceType || '',
      context: ctx,
    });

    // 如果达到批量大小，立即执行
    if (batch.length >= this.config.maxBatchSize) {
      await this.flushBatch(deviceKey);
    }

    // 等待当前批次完成
    await (this.batchPromises.get(deviceKey) || Promise.resolve());

    return ctx;
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalBatches: 0,
      mergedRequests: 0,
      avgBatchSize: 0,
      fallbackCount: 0,
    };
  }

  private delayedFlush(deviceKey: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await this.flushBatch(deviceKey);
        } catch (error) {
          this.logger.error(`Batch flush error for ${deviceKey}: ${(error as Error).message}`);
        }
        resolve();
      }, this.config.batchTimeoutMs);
    });
  }

  private async flushBatch(deviceKey: string): Promise<void> {
    const batch = this.pendingBatches.get(deviceKey);
    if (!batch || batch.length === 0) return;

    // 清空队列并移除Promise
    this.pendingBatches.set(deviceKey, []);
    this.batchPromises.delete(deviceKey);

    try {
      // 尝试智能合并（如果启用）
      let results: Array<{ tagId: string; value: any; quality: string; error?: string }>;

      if (this.config.enableAddressMerging && this.canMergeAddresses(batch)) {
        results = await this.executeMergedBatch(deviceKey, batch);
        this.stats.mergedRequests += batch.length;
      } else {
        results = await this.executeRegularBatch(deviceKey, batch);
      }

      // 更新统计
      this.stats.totalBatches++;
      this.stats.avgBatchSize =
        (this.stats.avgBatchSize * (this.stats.totalBatches - 1) + batch.length) /
        this.stats.totalBatches;

      // 将结果回填到各个context
      for (let i = 0; i < batch.length; i++) {
        const result = results[i];
        if (result) {
          batch[i].context.rawValue = result.value;
          batch[i].context.quality = result.quality;
          if (result.error) {
            batch[i].context.errors.push({ step: 'BatchProtocolRead', message: result.error });
          }
        }
      }

      this.logger.debug(
        `Batch read completed for ${deviceKey}: ${batch.length} tags` +
          (this.config.enableAddressMerging ? ' (merged)' : ''),
      );
    } catch (error) {
      this.logger.error(`Batch read failed for ${deviceKey}: ${(error as Error).message}`);

      // 回退到逐个读取
      if (this.config.fallbackToSingle) {
        await this.fallbackToSingleReads(batch);
        this.stats.fallbackCount++;
      } else {
        // 标记所有为失败
        for (const item of batch) {
          item.context.rawValue = null;
          item.context.quality = 'bad';
          item.context.errors.push({
            step: 'BatchProtocolRead',
            message: `Batch read failed: ${(error as Error).message}`,
          });
        }
      }
    }
  }

  private canMergeAddresses(batch: BatchItem[]): boolean {
    // 检查是否所有标签都有地址信息且是数字类型
    return batch.every(
      (item) => item.tagConfig?.address && !isNaN(parseInt(item.tagConfig.address)),
    );
  }

  private async executeMergedBatch(
    deviceKey: string,
    batch: BatchItem[],
  ): Promise<Array<{ tagId: string; value: any; quality: string; error?: string }>> {
    // 按地址排序
    const sortedBatch = [...batch].sort(
      (a, b) => parseInt(a.tagConfig.address) - parseInt(b.tagConfig.address),
    );

    const results: Array<{ tagId: string; value: any; quality: string; error?: string }> = [];

    // 合并连续地址后逐组读取
    let i = 0;
    while (i < sortedBatch.length) {
      const currentGroup: BatchItem[] = [sortedBatch[i]];
      let j = i + 1;

      while (
        j < sortedBatch.length &&
        currentGroup.length < this.config.maxMergeSize &&
        parseInt(sortedBatch[j].tagConfig.address) ===
          parseInt(sortedBatch[j - 1].tagConfig.address) + 1
      ) {
        currentGroup.push(sortedBatch[j]);
        j++;
      }

      // 逐项读取（adapter 接口目前只有 readTag，无原生 readBatch）
      for (const groupItem of currentGroup) {
        try {
          const { value, quality, error } = await this.readSingleTag(deviceKey, groupItem);
          const originalIndex = batch.findIndex((item) => item.tagId === groupItem.tagId);
          if (originalIndex !== -1) {
            results[originalIndex] = { tagId: groupItem.tagId, value, quality, error };
          }
        } catch (err) {
          const originalIndex = batch.findIndex((item) => item.tagId === groupItem.tagId);
          if (originalIndex !== -1) {
            results[originalIndex] = {
              tagId: groupItem.tagId,
              value: null,
              quality: 'bad',
              error: (err as Error).message,
            };
          }
        }
      }

      i = j;
    }

    return results;
  }

  private async executeRegularBatch(
    deviceKey: string,
    batch: BatchItem[],
  ): Promise<Array<{ tagId: string; value: any; quality: string; error?: string }>> {
    const results: Array<{ tagId: string; value: any; quality: string; error?: string }> = [];

    // 并发读取（限制并发数以避免过载）
    const concurrency = Math.min(batch.length, 10);

    for (let i = 0; i < batch.length; i += concurrency) {
      const chunk = batch.slice(i, i + concurrency);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (item) => {
          return await this.readSingleTag(deviceKey, item);
        }),
      );

      // 处理结果
      for (const settledResult of chunkResults) {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          results.push({
            tagId: 'unknown',
            value: null,
            quality: 'bad',
            error: settledResult.reason?.message || 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  private async fallbackToSingleReads(batch: BatchItem[]): Promise<void> {
    this.logger.warn(`Falling back to single reads for ${batch.length} tags on device`);

    for (const item of batch) {
      try {
        const deviceKey = item.context.deviceId || 'default';
        const result = await this.readSingleTag(deviceKey, item);

        item.context.rawValue = result.value;
        item.context.quality = result.quality;
        if (result.error) {
          item.context.errors.push({ step: 'BatchProtocolRead', message: result.error });
        }
      } catch (error) {
        item.context.rawValue = null;
        item.context.quality = 'bad';
        item.context.errors.push({
          step: 'BatchProtocolRead',
          message: (error as Error).message,
        });
      }
    }
  }

  /**
   * 通过 PluginRegistry adapter 读取单个标签
   */
  private async readSingleTag(
    deviceKey: string,
    item: BatchItem,
  ): Promise<{ tagId: string; value: any; quality: string; error?: string }> {
    const deviceType = item.deviceType;

    if (!deviceType || !this.pluginRegistry.isSupported(deviceType)) {
      return {
        tagId: item.tagId,
        value: null,
        quality: 'bad',
        error: `No plugin for device type: ${deviceType}`,
      };
    }

    const adapter = this.pluginRegistry.getAdapter(deviceType);

    // 获取或创建连接
    let client = this.clientCache.get(deviceKey);
    if (!client) {
      const deviceCtx: IDeviceContext = {
        id: deviceKey,
        name: item.tagConfig?.deviceName || deviceKey,
        protocol: deviceType,
        connection: item.context.deviceConnection || {},
        projectId: item.context.projectId,
      };
      client = await adapter.connect(deviceCtx);
      this.clientCache.set(deviceKey, client);
    }

    const tagCtx: ITagContext = item.tagConfig || {
      id: item.tagId,
      name: item.tagId,
      address: '',
      dataType: 'float32',
    };

    try {
      const result = await adapter.readTag(client, tagCtx);
      return {
        tagId: item.tagId,
        value: result.value ?? (result as any).rawValue,
        quality: (result as any).quality || 'good',
      };
    } catch (err) {
      this.clientCache.delete(deviceKey);
      return {
        tagId: item.tagId,
        value: null,
        quality: 'bad',
        error: (err as Error).message,
      };
    }
  }
}
