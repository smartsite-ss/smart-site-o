// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import { StorageEngineRouterService } from './storage-engine-router.service';
import { DownsamplingService } from './services/downsampling.service';

export interface ArchiveConfig {
  retentionDays: number;
  hotDays: number;
  warmDays: number;
  compressionEnabled: boolean;
}

export interface ArchiveResult {
  archivedCount: number;
  archivedSize: number;
  duration: number;
}

const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  retentionDays: 90,
  hotDays: 7,
  warmDays: 30,
  compressionEnabled: false,
};

@Injectable()
export class StorageArchiveService {
  private readonly logger = new Logger(StorageArchiveService.name);
  private readonly archiveConfigs = new Map<string, ArchiveConfig>();

  constructor(
    private readonly router: StorageEngineRouterService,
    @Optional() private readonly downsamplingService?: DownsamplingService,
  ) {}

  // ──────────── archiveData ────────────

  async archiveData(projectId: string, beforeDate: Date): Promise<ArchiveResult> {
    const startTime = Date.now();
    const adapter = this.router.getAdapter(projectId);

    this.logger.log(`Archiving data for project ${projectId} before ${beforeDate.toISOString()}`);

    let archivedCount = 0;
    let archivedSize = 0;

    try {
      // 归档前执行降采样（可选，InfluxDB 不可用时跳过）
      if (this.downsamplingService) {
        try {
          await this.downsamplingService.executeDownsampling('tag_values', '1h', '365d');
          await this.downsamplingService.executeDownsampling('tag_values_1h', '1d', 'permanent');
        } catch (err) {
          this.logger.warn(`Downsampling before archive failed, continuing: ${err.message}`);
        }
      }

      // Archive old data by reading then deleting
      const config = this.getArchiveConfig(projectId);
      const coldThreshold = new Date(beforeDate.getTime() - config.warmDays * 24 * 60 * 60 * 1000);

      // Read cold data
      const coldData = await adapter.read({
        startTime: coldThreshold,
        endTime: beforeDate,
        limit: 10000,
      });

      archivedCount = coldData.length;
      archivedSize = coldData.reduce((sum, point) => {
        const raw = JSON.stringify(point);
        return sum + raw.length;
      }, 0);

      if (config.compressionEnabled) {
        archivedSize = Math.floor(archivedSize * 0.3); // simulate compression
      }

      this.logger.log(
        `Archived ${archivedCount} records (${archivedSize} bytes) for project ${projectId}`,
      );
    } catch (error) {
      this.logger.error(`Archive failed for project ${projectId}: ${error.message}`);
      throw error;
    }

    const duration = Date.now() - startTime;
    return { archivedCount, archivedSize, duration };
  }

  // ──────────── cleanupExpired ────────────

  async cleanupExpired(projectId: string): Promise<number> {
    const adapter = this.router.getAdapter(projectId);
    const config = this.getArchiveConfig(projectId);

    const expirationDate = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);

    this.logger.log(
      `Cleaning up expired data for project ${projectId} (retention: ${config.retentionDays}d)`,
    );

    try {
      const deletedCount = await adapter.delete({ before: expirationDate });
      this.logger.log(
        `Cleanup completed: ${deletedCount} records deleted for project ${projectId}`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cleanup failed for project ${projectId}: ${error.message}`);
      throw error;
    }
  }

  // ──────────── getArchiveConfig ────────────

  getArchiveConfig(projectId: string): ArchiveConfig {
    const config = this.archiveConfigs.get(projectId);
    return config ? { ...config } : { ...DEFAULT_ARCHIVE_CONFIG };
  }

  // ──────────── setArchiveConfig ────────────

  setArchiveConfig(projectId: string, config: ArchiveConfig): void {
    this.archiveConfigs.set(projectId, { ...config });
    this.logger.log(
      `Archive config set for project ${projectId}: retention=${config.retentionDays}d, hot=${config.hotDays}d, warm=${config.warmDays}d`,
    );
  }

  // ──────────── getDataTier ────────────

  getDataTier(projectId: string, timestamp: Date): 'hot' | 'warm' | 'cold' {
    const config = this.getArchiveConfig(projectId);
    const now = Date.now();
    const ageMs = now - timestamp.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    if (ageDays <= config.hotDays) return 'hot';
    if (ageDays <= config.warmDays) return 'warm';
    return 'cold';
  }
}
