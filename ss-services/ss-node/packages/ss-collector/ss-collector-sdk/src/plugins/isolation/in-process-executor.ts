// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { IIsolationExecutor, ShardRef, RequiredIsolationConfig } from './isolation.types';
import { ExecutorHealth } from '../../events/plugin-events.types';
import { IProtocolAdapter, IDeviceContext, ITagContext } from '../../types';
import { IsolationMode } from '../plugin.types';

/**
 * 进程内执行器 —— 直接调用 adapter，零开销
 * 本质是对 adapter 的薄封装 + 连接池管理
 */
@Injectable()
export class InProcessExecutor implements IIsolationExecutor {
  readonly name = 'InProcess';
  private readonly logger = new Logger(InProcessExecutor.name);

  private adapter: IProtocolAdapter | null = null;
  private protocol = '';
  private connections = new Map<string, any>();
  private stats = { requestCount: 0, errorCount: 0, totalLatencyMs: 0, startTime: Date.now() };

  async init(
    protocol: string,
    adapter: IProtocolAdapter,
    _config: Partial<RequiredIsolationConfig>,
  ): Promise<void> {
    this.protocol = protocol;
    this.adapter = adapter;
  }

  async connect(device: IDeviceContext): Promise<ShardRef> {
    const client = await this.adapter!.connect(device);
    const connectionId =
      device.id || `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.connections.set(connectionId, client);
    return { connectionId, protocol: this.protocol };
  }

  async readTag(shard: ShardRef, tag: ITagContext): Promise<any> {
    const start = Date.now();
    this.stats.requestCount++;
    try {
      const client = this.connections.get(shard.connectionId);
      if (!client) throw new Error(`Connection not found: ${shard.connectionId}`);
      const result = await this.adapter!.readTag(client, tag);
      this.stats.totalLatencyMs += Date.now() - start;
      return result;
    } catch (error) {
      this.stats.errorCount++;
      this.stats.totalLatencyMs += Date.now() - start;
      throw error;
    }
  }

  async writeTag(shard: ShardRef, tag: ITagContext, value: any): Promise<void> {
    const client = this.connections.get(shard.connectionId);
    if (!client) throw new Error(`Connection not found: ${shard.connectionId}`);
    await this.adapter!.writeTag(client, tag, value);
  }

  async disconnect(shard: ShardRef): Promise<void> {
    const client = this.connections.get(shard.connectionId);
    if (client) {
      try {
        await this.adapter!.disconnect(client);
      } catch {}
      this.connections.delete(shard.connectionId);
    }
  }

  async getHealth(): Promise<ExecutorHealth> {
    const uptime = Date.now() - this.stats.startTime;
    return {
      mode: IsolationMode.IN_PROCESS,
      status: this.adapter ? 'healthy' : 'starting',
      uptime,
      requestCount: this.stats.requestCount,
      errorCount: this.stats.errorCount,
      avgLatencyMs:
        this.stats.requestCount > 0 ? this.stats.totalLatencyMs / this.stats.requestCount : 0,
      restartCount: 0,
    };
  }

  async destroy(): Promise<void> {
    for (const [, client] of this.connections) {
      try {
        await this.adapter!.disconnect(client);
      } catch {}
    }
    this.connections.clear();
    this.adapter = null;
  }
}
