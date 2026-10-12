// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep, PipelineValue } from '../pipeline-orchestrator';
import { PipelineMetricsService } from '../pipeline-metrics.service';

interface CacheRecord {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: PipelineValue;
  quality: string;
  timestamp: Date;
  errorCount: number;
}

@Injectable()
export class CacheUpdateStep implements PipelineStep {
  readonly name = 'CacheUpdate';
  readonly order = 5;

  private readonly logger = new Logger(CacheUpdateStep.name);
  private cache = new Map<string, CacheRecord>();

  constructor(private readonly metricsService?: PipelineMetricsService) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    try {
      const existed = this.cache.has(ctx.tagId);
      const record: CacheRecord = {
        tagId: ctx.tagId,
        deviceId: ctx.deviceId,
        projectId: ctx.projectId,
        value: ctx.transformedValue,
        quality: ctx.quality,
        timestamp: new Date(),
        errorCount: ctx.errors.length,
      };

      this.cache.set(ctx.tagId, record);
      if (existed) {
        this.metricsService?.recordCacheHit();
      } else {
        this.metricsService?.recordCacheMiss();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown cache update error';
      this.logger.error(`Cache update error for tag ${ctx.tagId}: ${errorMsg}`);
      ctx.errors.push({ step: this.name, message: errorMsg, code: 'CACHE_ERROR' });
    }

    return ctx;
  }

  getLatest(tagId: string): CacheRecord | undefined {
    return this.cache.get(tagId);
  }

  getByDevice(deviceId: string): CacheRecord[] {
    return Array.from(this.cache.values()).filter((r) => r.deviceId === deviceId);
  }

  getByProject(projectId: string): CacheRecord[] {
    return Array.from(this.cache.values()).filter((r) => r.projectId === projectId);
  }

  getAll(): CacheRecord[] {
    return Array.from(this.cache.values());
  }

  clearTag(tagId: string): boolean {
    return this.cache.delete(tagId);
  }

  clearDevice(deviceId: string): number {
    let count = 0;
    for (const [tagId, record] of this.cache) {
      if (record.deviceId === deviceId) {
        this.cache.delete(tagId);
        count++;
      }
    }
    return count;
  }

  clearAll(): void {
    this.cache.clear();
  }

  getStats(): { total: number; good: number; bad: number; commError: number } {
    const records = Array.from(this.cache.values());
    return {
      total: records.length,
      good: records.filter((r) => r.quality === 'good').length,
      bad: records.filter((r) => r.quality === 'bad').length,
      commError: records.filter((r) => r.quality === 'comm_error').length,
    };
  }
}
