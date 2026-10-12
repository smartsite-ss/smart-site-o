// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { StorageAdapter, DataPoint } from '../interfaces/storage-adapter.interface';
import { StorageEngineRouterService } from '../storage-engine-router.service';
import * as crypto from 'crypto';

export interface BackupConfig {
  projectId: string;
  type: 'full' | 'incremental';
  scheduledAt?: Date;
}

export interface BackupFile {
  id: string;
  projectId: string;
  type: 'full' | 'incremental';
  size: number;
  recordCount: number;
  checksum: string;
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  baseBackupId?: string; // For incremental backups, references the full backup
}

export interface BackupResult {
  backupId: string;
  type: 'full' | 'incremental';
  recordCount: number;
  size: number;
  checksum: string;
  duration: number;
}

export interface RestoreOptions {
  backupId: string;
  projectId: string;
  targetAdapter?: StorageAdapter;
  validateIntegrity?: boolean;
  checkSpace?: boolean;
  maxSpaceGb?: number;
}

export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  warnings: string[];
  conflicts: string[];
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly MAX_BACKUP_SIZE_GB = 10;

  // In-memory backup store (in production, this would be persistent)
  private backups = new Map<string, BackupFile>();
  private backupData = new Map<string, DataPoint[]>();

  constructor(private readonly router: StorageEngineRouterService) {}

  // ──────────── createFullBackup ────────────

  async createFullBackup(projectId: string): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId('full');

    this.logger.log(`Creating full backup ${backupId} for project ${projectId}`);

    const backupFile: BackupFile = {
      id: backupId,
      projectId,
      type: 'full',
      size: 0,
      recordCount: 0,
      checksum: '',
      createdAt: new Date(),
      status: 'in_progress',
    };

    try {
      const adapter = this.router.getAdapter(projectId);

      // Read all data for the project
      const allData = await this.readAllData(adapter, projectId);

      // Check space
      const estimatedSize = this.estimateSize(allData);
      const spaceCheck = this.checkBackupSpace(estimatedSize);
      if (!spaceCheck.ok) {
        throw new Error(`Insufficient space for backup: ${spaceCheck.message}`);
      }

      // Store backup data
      this.backupData.set(backupId, allData);

      // Compute checksum
      const checksum = this.computeBackupChecksum(allData);

      backupFile.size = estimatedSize;
      backupFile.recordCount = allData.length;
      backupFile.checksum = checksum;
      backupFile.status = 'completed';

      this.backups.set(backupId, backupFile);

      this.logger.log(
        `Full backup ${backupId} completed: ${allData.length} records, ${estimatedSize} bytes`,
      );

      return {
        backupId,
        type: 'full',
        recordCount: allData.length,
        size: estimatedSize,
        checksum,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      backupFile.status = 'failed';
      this.backups.set(backupId, backupFile);
      this.logger.error(`Full backup ${backupId} failed: ${error.message}`);
      throw error;
    }
  }

  // ──────────── createIncrementalBackup ────────────

  async createIncrementalBackup(projectId: string, baseBackupId: string): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId('incr');

    this.logger.log(
      `Creating incremental backup ${backupId} for project ${projectId} (base: ${baseBackupId})`,
    );

    const baseBackup = this.backups.get(baseBackupId);
    if (!baseBackup) {
      throw new Error(`Base backup ${baseBackupId} not found`);
    }
    if (baseBackup.status !== 'completed') {
      throw new Error(`Base backup ${baseBackupId} is not in completed state`);
    }

    const backupFile: BackupFile = {
      id: backupId,
      projectId,
      type: 'incremental',
      size: 0,
      recordCount: 0,
      checksum: '',
      createdAt: new Date(),
      status: 'in_progress',
      baseBackupId,
    };

    try {
      const adapter = this.router.getAdapter(projectId);

      // Read data since last backup
      const sinceDate = baseBackup.createdAt;
      const newData = await adapter.read({
        startTime: sinceDate,
        limit: 100000,
        order: 'asc',
      });

      // Check for conflicts with base backup
      const baseData = this.backupData.get(baseBackupId) || [];
      const conflicts = this.detectConflicts(baseData, newData);

      if (conflicts.length > 0) {
        this.logger.warn(`Incremental backup ${backupId} detected ${conflicts.length} conflicts`);
      }

      const estimatedSize = this.estimateSize(newData);
      const spaceCheck = this.checkBackupSpace(estimatedSize);
      if (!spaceCheck.ok) {
        throw new Error(`Insufficient space for backup: ${spaceCheck.message}`);
      }

      this.backupData.set(backupId, newData);

      const checksum = this.computeBackupChecksum(newData);

      backupFile.size = estimatedSize;
      backupFile.recordCount = newData.length;
      backupFile.checksum = checksum;
      backupFile.status = 'completed';

      this.backups.set(backupId, backupFile);

      this.logger.log(`Incremental backup ${backupId} completed: ${newData.length} records`);

      return {
        backupId,
        type: 'incremental',
        recordCount: newData.length,
        size: estimatedSize,
        checksum,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      backupFile.status = 'failed';
      this.backups.set(backupId, backupFile);
      this.logger.error(`Incremental backup ${backupId} failed: ${error.message}`);
      throw error;
    }
  }

  // ──────────── restore ────────────

  async restore(options: RestoreOptions): Promise<RestoreResult> {
    const { backupId, projectId, targetAdapter, validateIntegrity, checkSpace } = options;
    const warnings: string[] = [];
    const conflicts: string[] = [];

    this.logger.log(`Restoring backup ${backupId} for project ${projectId}`);

    const backupFile = this.backups.get(backupId);
    if (!backupFile) {
      throw new Error(`Backup ${backupId} not found`);
    }
    if (backupFile.status !== 'completed') {
      throw new Error(`Backup ${backupId} is not in completed state`);
    }

    const data = this.backupData.get(backupId);
    if (!data || data.length === 0) {
      return { success: true, restoredCount: 0, warnings, conflicts };
    }

    const adapter = targetAdapter || this.router.getAdapter(projectId);

    try {
      // Integrity check
      if (validateIntegrity !== false) {
        const currentChecksum = this.computeBackupChecksum(data);
        if (currentChecksum !== backupFile.checksum) {
          throw new Error(`Backup integrity check failed: checksum mismatch for ${backupId}`);
        }
        this.logger.log(`Integrity check passed for backup ${backupId}`);
      }

      // Space check
      if (checkSpace !== false) {
        const estimatedSize = this.estimateSize(data);
        const maxGb = options.maxSpaceGb || this.MAX_BACKUP_SIZE_GB;
        if (estimatedSize > maxGb * 1024 * 1024 * 1024) {
          warnings.push(`Backup size (${estimatedSize} bytes) exceeds max space (${maxGb} GB)`);
        }
      }

      // Detect conflicts: check if target already has overlapping data
      const existingData = await adapter.read({
        startTime: data[0].timestamp,
        endTime: data[data.length - 1].timestamp,
        limit: data.length,
        order: 'asc',
      });

      if (existingData.length > 0) {
        const conflictTagIds = existingData.map((p) => p.tagId);
        const uniqueConflicts = [...new Set(conflictTagIds)];
        conflicts.push(...uniqueConflicts);
        warnings.push(`Detected ${conflicts.length} conflicting tag IDs in target`);
      }

      // Write restored data
      const writeResult = await adapter.write(data);

      if (!writeResult.success) {
        throw new Error(
          `Restore write failed: ${writeResult.errors?.map((e) => e.message).join(', ')}`,
        );
      }

      this.logger.log(`Restore ${backupId} completed: ${writeResult.written} records restored`);

      return {
        success: true,
        restoredCount: writeResult.written,
        warnings,
        conflicts,
      };
    } catch (error) {
      this.logger.error(`Restore ${backupId} failed: ${error.message}`);
      throw error;
    }
  }

  // ──────────── listBackups ────────────

  listBackups(projectId?: string): BackupFile[] {
    const all = Array.from(this.backups.values());
    if (projectId) {
      return all.filter((b) => b.projectId === projectId);
    }
    return all;
  }

  // ──────────── getBackup ────────────

  getBackup(backupId: string): BackupFile | undefined {
    const backup = this.backups.get(backupId);
    return backup ? { ...backup } : undefined;
  }

  // ──────────── deleteBackup ────────────

  deleteBackup(backupId: string): boolean {
    this.backupData.delete(backupId);
    const deleted = this.backups.delete(backupId);
    if (deleted) {
      this.logger.log(`Backup ${backupId} deleted`);
    }
    return deleted;
  }

  // ──────────── Internal ────────────

  private async readAllData(adapter: StorageAdapter, _projectId: string): Promise<DataPoint[]> {
    const allData: DataPoint[] = [];
    let hasMore = true;
    const batchSize = 10000;

    while (hasMore) {
      const batch = await adapter.read({
        limit: batchSize,
        order: 'asc',
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        allData.push(...batch);
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }

    return allData;
  }

  private computeBackupChecksum(data: DataPoint[]): string {
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

  private estimateSize(data: DataPoint[]): number {
    return data.reduce((sum, point) => {
      const raw = JSON.stringify(point);
      return sum + raw.length;
    }, 0);
  }

  private checkBackupSpace(estimatedSize: number): { ok: boolean; message: string } {
    const maxBytes = this.MAX_BACKUP_SIZE_GB * 1024 * 1024 * 1024;
    if (estimatedSize > maxBytes) {
      return {
        ok: false,
        message: `Estimated backup size ${estimatedSize} bytes exceeds max ${this.MAX_BACKUP_SIZE_GB} GB`,
      };
    }
    return { ok: true, message: 'Space OK' };
  }

  private detectConflicts(baseData: DataPoint[], newData: DataPoint[]): string[] {
    const baseTagIds = new Set(baseData.map((p) => p.tagId));
    const newTagIds = new Set(newData.map((p) => p.tagId));
    const conflicts: string[] = [];

    for (const tagId of newTagIds) {
      if (baseTagIds.has(tagId)) {
        conflicts.push(tagId);
      }
    }

    return conflicts;
  }

  private generateBackupId(type: 'full' | 'incr'): string {
    const prefix = type === 'full' ? 'bkf' : 'bki';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }
}
