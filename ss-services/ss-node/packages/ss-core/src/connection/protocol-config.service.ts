// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ProtocolConfig {
  deviceId: string;
  protocol: string;
  host: string;
  port: number;
  enabled: boolean;
  params: Record<string, any>;
  updatedAt: number;
}

@Injectable()
export class ProtocolConfigService {
  private readonly logger = new Logger(ProtocolConfigService.name);

  private configs = new Map<string, ProtocolConfig>();
  private changeListeners = new Map<string, Array<(config: ProtocolConfig) => void>>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  registerConfig(config: ProtocolConfig): void {
    this.configs.set(config.deviceId, { ...config, updatedAt: Date.now() });
    this.logger.debug(`Registered protocol config for ${config.deviceId} (${config.protocol})`);
  }

  getConfig(deviceId: string): ProtocolConfig | undefined {
    return this.configs.get(deviceId);
  }

  getAllConfigs(): ProtocolConfig[] {
    return Array.from(this.configs.values());
  }

  getConfigsByProtocol(protocol: string): ProtocolConfig[] {
    return this.getAllConfigs().filter((c) => c.protocol === protocol && c.enabled);
  }

  async updateConfig(deviceId: string, partial: Partial<ProtocolConfig>): Promise<ProtocolConfig> {
    const existing = this.configs.get(deviceId);
    if (!existing) {
      throw new Error(`Config not found for device: ${deviceId}`);
    }

    const updated: ProtocolConfig = {
      ...existing,
      ...partial,
      params: { ...existing.params, ...(partial.params || {}) },
      updatedAt: Date.now(),
    };

    this.configs.set(deviceId, updated);

    this.logger.log(`Protocol config updated for ${deviceId}`);

    this.eventEmitter.emit('protocol.config.updated', updated);

    const listeners = this.changeListeners.get(deviceId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(updated);
        } catch (error) {
          this.logger.error(`Config change listener error for ${deviceId}: ${error.message}`);
        }
      }
    }

    return updated;
  }

  removeConfig(deviceId: string): void {
    this.configs.delete(deviceId);
    this.changeListeners.delete(deviceId);
    this.logger.log(`Protocol config removed for ${deviceId}`);
  }

  enableDevice(deviceId: string): Promise<ProtocolConfig> {
    return this.updateConfig(deviceId, { enabled: true });
  }

  disableDevice(deviceId: string): Promise<ProtocolConfig> {
    return this.updateConfig(deviceId, { enabled: false });
  }

  onChange(deviceId: string, listener: (config: ProtocolConfig) => void): () => void {
    if (!this.changeListeners.has(deviceId)) {
      this.changeListeners.set(deviceId, []);
    }
    this.changeListeners.get(deviceId)!.push(listener);

    return () => {
      const listeners = this.changeListeners.get(deviceId);
      if (listeners) {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    };
  }
}
