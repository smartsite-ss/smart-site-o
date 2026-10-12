// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import {
  STORAGE_ENGINE_TYPES,
  StorageEngineType,
  resolveStorageEngineType,
} from './storage-engine-types';

export { STORAGE_ENGINE_TYPES, StorageEngineType };

interface ProjectEngineEntry {
  engine: StorageEngineType;
  updatedAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class StorageEngineConfigService {
  private readonly logger = new Logger(StorageEngineConfigService.name);
  private readonly projectConfigs = new Map<string, ProjectEngineEntry>();
  private readonly ttlMs: number;

  constructor() {
    this.ttlMs = parseInt(process.env.STORAGE_CONFIG_TTL_MS || '', 10) || DEFAULT_TTL_MS;
  }

  // ──────────── getDefaultEngine ────────────

  getDefaultEngine(): StorageEngineType {
    const envValue = process.env.STORAGE_DEFAULT_ENGINE || '';
    if (!envValue) {
      return STORAGE_ENGINE_TYPES.INFLUXDB2;
    }
    // 兼容存量 'influxdb' 别名（归一化为 'influxdb2'）
    const resolved = resolveStorageEngineType(envValue);
    if (resolved) {
      return resolved;
    }
    this.logger.warn(
      `Unknown STORAGE_DEFAULT_ENGINE "${envValue}", falling back to ${STORAGE_ENGINE_TYPES.INFLUXDB2}`,
    );
    return STORAGE_ENGINE_TYPES.INFLUXDB2;
  }

  // ──────────── getProjectEngine ────────────

  getProjectEngine(projectId: string): StorageEngineType {
    const entry = this.projectConfigs.get(projectId);
    if (entry) {
      if (Date.now() - entry.updatedAt > this.ttlMs) {
        this.projectConfigs.delete(projectId);
        this.logger.debug(`Project engine config expired for ${projectId}`);
      } else {
        return entry.engine;
      }
    }
    return this.getDefaultEngine();
  }

  // ──────────── setProjectEngine ────────────

  setProjectEngine(projectId: string, engine: StorageEngineType): void {
    this.projectConfigs.set(projectId, { engine, updatedAt: Date.now() });
    this.logger.log(`Project engine config set: ${projectId} -> ${engine}`);
  }

  // ──────────── removeProjectEngine ────────────

  removeProjectEngine(projectId: string): void {
    const existed = this.projectConfigs.delete(projectId);
    if (existed) {
      this.logger.log(`Project engine config removed for ${projectId}`);
    }
  }
}
