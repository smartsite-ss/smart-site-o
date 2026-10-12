// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { StoragePluginRegistry } from '../interfaces/storage-plugin.interface';

@Injectable()
export class StoragePluginRegistryService implements StoragePluginRegistry {
  private readonly logger = new Logger(StoragePluginRegistryService.name);
  private readonly adapters = new Map<string, StorageAdapter>();
  private defaultAdapterName: string | null = null;

  // ──────────── register ────────────

  register(adapter: StorageAdapter): void {
    if (this.adapters.has(adapter.name)) {
      this.logger.warn(`Adapter "${adapter.name}" is already registered, replacing`);
    }
    this.adapters.set(adapter.name, adapter);
    this.logger.log(`Registered storage adapter: ${adapter.name}`);

    // Set first adapter as default
    if (!this.defaultAdapterName) {
      this.defaultAdapterName = adapter.name;
    }
  }

  // ──────────── get ────────────

  get(name: string): StorageAdapter | undefined {
    return this.adapters.get(name);
  }

  // ──────────── list ────────────

  list(): StorageAdapter[] {
    return Array.from(this.adapters.values());
  }

  // ──────────── getDefault ────────────

  getDefault(): StorageAdapter {
    if (!this.defaultAdapterName || !this.adapters.has(this.defaultAdapterName)) {
      throw new Error('No default storage adapter configured');
    }
    return this.adapters.get(this.defaultAdapterName)!;
  }

  // ──────────── setDefault ────────────

  setDefault(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Storage adapter "${name}" is not registered`);
    }
    this.defaultAdapterName = name;
    this.logger.log(`Default storage adapter set to: ${name}`);
  }

  // ──────────── unregister ────────────

  unregister(name: string): boolean {
    const deleted = this.adapters.delete(name);
    if (deleted) {
      this.logger.log(`Unregistered storage adapter: ${name}`);
      if (this.defaultAdapterName === name) {
        this.defaultAdapterName =
          this.adapters.size > 0 ? this.adapters.keys().next().value! : null;
        this.logger.log(`Default adapter reset to: ${this.defaultAdapterName || 'none'}`);
      }
    }
    return deleted;
  }

  // ──────────── healthCheckAll ────────────

  async healthCheckAll(): Promise<Map<string, { status: string; details?: any }>> {
    const results = new Map<string, { status: string; details?: any }>();

    for (const [name, adapter] of this.adapters) {
      try {
        const health = await adapter.health();
        results.set(name, health);
      } catch (error) {
        results.set(name, { status: 'unhealthy', details: { error: error.message } });
      }
    }

    return results;
  }

  // ──────────── closeAll ────────────

  async closeAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.close();
        this.logger.log(`Closed adapter: ${name}`);
      } catch (error) {
        this.logger.error(`Error closing adapter ${name}: ${error.message}`);
      }
    }
    this.adapters.clear();
    this.defaultAdapterName = null;
  }
}
