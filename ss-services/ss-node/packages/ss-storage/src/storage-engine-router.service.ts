// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { StorageAdapter } from './interfaces/storage-adapter.interface';
import { StorageEngineConfigService } from './storage-engine-config.service';
import { StorageEngineType, resolveStorageEngineType } from './storage-engine-types';

@Injectable()
export class StorageEngineRouterService {
  private readonly logger = new Logger(StorageEngineRouterService.name);
  private readonly adapterMap = new Map<StorageEngineType, StorageAdapter>();

  constructor(private readonly engineConfig: StorageEngineConfigService) {}

  // ──────────── getAdapter ────────────

  getAdapter(projectId: string): StorageAdapter {
    const engine = this.engineConfig.getProjectEngine(projectId);
    return this.getAdapterForEngine(engine);
  }

  // ──────────── getAdapterForEngine ────────────

  getAdapterForEngine(engine: StorageEngineType): StorageAdapter {
    // 兼容存量 'influxdb' 别名（归一化为 'influxdb2'）
    const resolvedEngine = resolveStorageEngineType(engine) ?? engine;
    const adapter = this.adapterMap.get(resolvedEngine);
    if (!adapter) {
      throw new Error(`No storage adapter registered for engine: ${resolvedEngine}`);
    }
    return adapter;
  }

  // ──────────── registerAdapter ────────────

  registerAdapter(engine: StorageEngineType, adapter: StorageAdapter): void {
    this.adapterMap.set(engine, adapter);
    this.logger.log(`Registered adapter for engine: ${engine} (${adapter.name})`);
  }

  // ──────────── getAvailableEngines ────────────

  getAvailableEngines(): StorageEngineType[] {
    return Array.from(this.adapterMap.keys());
  }
}
