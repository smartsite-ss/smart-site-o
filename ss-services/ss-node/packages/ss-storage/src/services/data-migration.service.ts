// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { StorageAdapter, DataPoint, QueryOptions } from '../interfaces/storage-adapter.interface';
import * as crypto from 'crypto';

export interface MigrationConfig {
  sourceAdapter: StorageAdapter;
  targetAdapter: StorageAdapter;
  batchSize?: number;
  tagIds?: string[];
  startTime?: Date;
  endTime?: Date;
}

export interface MigrationProgress {
  total: number;
  migrated: number;
  failed: number;
  currentBatch: number;
  percentage: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
}

export interface MigrationCheckpoint {
  lastMigratedTimestamp: Date;
  lastMigratedTagId: string;
  totalMigrated: number;
}

export interface MigrationResult {
  totalMigrated: number;
  totalFailed: number;
  duration: number;
  checksum: string;
  verified: boolean;
}

@Injectable()
export class DataMigrationService {
  private readonly logger = new Logger(DataMigrationService.name);
  private readonly MIGRATION_BATCH_SIZE = 1000;

  private currentProgress: MigrationProgress = {
    total: 0,
    migrated: 0,
    failed: 0,
    currentBatch: 0,
    percentage: 0,
    status: 'idle',
  };

  private checkpoints = new Map<string, MigrationCheckpoint>();
  private cancelFlags = new Map<string, boolean>();

  // ──────────── migrate ────────────

  async migrate(migrationId: string, config: MigrationConfig): Promise<MigrationResult> {
    const { sourceAdapter, targetAdapter, batchSize, tagIds, startTime, endTime } = config;
    const effectiveBatchSize = batchSize || this.MIGRATION_BATCH_SIZE;
    const startDate = Date.now();

    // Don't overwrite an existing cancellation request
    if (!this.cancelFlags.has(migrationId)) {
      this.cancelFlags.set(migrationId, false);
    }
    this.currentProgress = {
      total: 0,
      migrated: 0,
      failed: 0,
      currentBatch: 0,
      percentage: 0,
      status: 'running',
      startedAt: new Date(),
    };

    this.logger.log(
      `Migration ${migrationId} started: ${sourceAdapter.name} -> ${targetAdapter.name}`,
    );

    let totalMigrated = 0;
    let totalFailed = 0;
    const allData: DataPoint[] = [];

    try {
      // Check for existing checkpoint
      const checkpoint = this.checkpoints.get(migrationId);
      let cursor: Date | undefined = checkpoint?.lastMigratedTimestamp || startTime;
      let lastTagId: string | undefined = checkpoint?.lastMigratedTagId;

      if (checkpoint) {
        totalMigrated = checkpoint.totalMigrated;
        this.logger.log(
          `Resuming migration ${migrationId} from checkpoint: ${cursor?.toISOString()}`,
        );
      }

      let hasMore = true;

      while (hasMore) {
        // Check cancellation
        if (this.cancelFlags.get(migrationId)) {
          this.currentProgress.status = 'cancelled';
          this.logger.log(`Migration ${migrationId} cancelled`);
          break;
        }

        const query: QueryOptions = {
          tagIds: tagIds || undefined,
          startTime: cursor,
          endTime: endTime || undefined,
          limit: effectiveBatchSize,
          order: 'asc',
        };

        const batch = await sourceAdapter.read(query);
        this.currentProgress.currentBatch++;

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        this.currentProgress.total += batch.length;

        // Write batch to target
        const writeResult = await targetAdapter.write(batch);
        const written = writeResult.success ? writeResult.written : 0;
        const failed = writeResult.failed;

        totalMigrated += written;
        totalFailed += failed;
        allData.push(...batch);

        this.currentProgress.migrated = totalMigrated;
        this.currentProgress.failed = totalFailed;
        this.currentProgress.percentage =
          this.currentProgress.total > 0
            ? Math.round((totalMigrated / this.currentProgress.total) * 100)
            : 0;

        // Update cursor for checkpoint
        const lastPoint = batch[batch.length - 1];
        cursor = lastPoint.timestamp;
        lastTagId = lastPoint.tagId;

        // Save checkpoint
        this.checkpoints.set(migrationId, {
          lastMigratedTimestamp: cursor,
          lastMigratedTagId: lastTagId,
          totalMigrated,
        });

        this.logger.debug(
          `Migration ${migrationId} batch ${this.currentProgress.currentBatch}: ${written} written, ${failed} failed`,
        );
      }

      // Consistency verification
      const checksum = this.computeChecksum(allData);
      const verified = await this.verifyConsistency(
        sourceAdapter,
        targetAdapter,
        tagIds,
        startTime,
        endTime,
      );

      if (this.currentProgress.status !== 'cancelled') {
        this.currentProgress.status = 'completed';
        this.currentProgress.completedAt = new Date();
        this.currentProgress.percentage = 100;
      }

      // Cleanup checkpoint on success
      if (this.currentProgress.status === 'completed') {
        this.checkpoints.delete(migrationId);
      }

      this.logger.log(
        `Migration ${migrationId} completed: ${totalMigrated} migrated, ${totalFailed} failed, verified=${verified}`,
      );

      return {
        totalMigrated,
        totalFailed,
        duration: Date.now() - startDate,
        checksum,
        verified,
      };
    } catch (error) {
      this.currentProgress.status = 'failed';
      this.logger.error(`Migration ${migrationId} failed: ${error.message}`);
      throw error;
    } finally {
      this.cancelFlags.delete(migrationId);
    }
  }

  // ──────────── cancelMigration ────────────

  cancelMigration(migrationId: string): void {
    this.cancelFlags.set(migrationId, true);
    this.logger.log(`Cancellation requested for migration ${migrationId}`);
  }

  // ──────────── getProgress ────────────

  getProgress(): MigrationProgress {
    return { ...this.currentProgress };
  }

  // ──────────── getCheckpoint ────────────

  getCheckpoint(migrationId: string): MigrationCheckpoint | undefined {
    const checkpoint = this.checkpoints.get(migrationId);
    return checkpoint ? { ...checkpoint } : undefined;
  }

  // ──────────── clearCheckpoint ────────────

  clearCheckpoint(migrationId: string): void {
    this.checkpoints.delete(migrationId);
    this.logger.log(`Checkpoint cleared for migration ${migrationId}`);
  }

  // ──────────── verifyConsistency ────────────

  async verifyConsistency(
    sourceAdapter: StorageAdapter,
    targetAdapter: StorageAdapter,
    tagIds?: string[],
    startTime?: Date,
    endTime?: Date,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Verifying consistency between ${sourceAdapter.name} and ${targetAdapter.name}`,
      );

      const sourceData = await sourceAdapter.read({
        tagIds,
        startTime,
        endTime,
        limit: 10000,
        order: 'asc',
      });

      const targetData = await targetAdapter.read({
        tagIds,
        startTime,
        endTime,
        limit: 10000,
        order: 'asc',
      });

      const sourceChecksum = this.computeChecksum(sourceData);
      const targetChecksum = this.computeChecksum(targetData);

      const consistent = sourceChecksum === targetChecksum;
      this.logger.log(
        `Consistency check: ${consistent ? 'PASSED' : 'FAILED'} (source: ${sourceChecksum}, target: ${targetChecksum})`,
      );

      return consistent;
    } catch (error) {
      this.logger.error(`Consistency verification failed: ${error.message}`);
      return false;
    }
  }

  // ──────────── computeChecksum ────────────

  computeChecksum(data: DataPoint[]): string {
    const sorted = [...data].sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.tagId.localeCompare(b.tagId);
    });

    const normalized = sorted.map((p) => ({
      tagId: p.tagId,
      deviceId: p.deviceId,
      projectId: p.projectId,
      value: p.value,
      timestamp: p.timestamp.toISOString(),
      quality: p.quality,
    }));

    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(normalized));
    return hash.digest('hex');
  }
}
