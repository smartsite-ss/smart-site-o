// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';
import { IDeviceContext, ITagContext } from '../../types';
import { PluginRegistry, IsolationFactory } from '../../plugins';
import { IsolationMode } from '../../plugins';
import type { ShardRef } from '../../plugins/isolation/isolation.types';

export interface ProtocolReadResult {
  tagId: string;
  value: any;
  rawValue: any;
  timestamp: Date;
  quality: string;
  error?: string;
}

@Injectable()
export class ProtocolReadStep implements PipelineStep {
  readonly name = 'ProtocolRead';
  readonly order = 0;

  private readonly logger = new Logger(ProtocolReadStep.name);

  /** 隔离模式下设备 → ShardRef 缓存（避免每次 connect） */
  private shardCache = new Map<string, ShardRef>();

  /** 进程内模式下设备 → client 缓存（避免每次 connect） */
  private clientCache = new Map<string, any>();

  constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly isolationFactory: IsolationFactory,
  ) {}

  async process(ctx: PipelineContext): Promise<PipelineContext> {
    try {
      const deviceType = ctx.deviceType;

      // 1. 检查设备协议是否已注册插件
      if (!deviceType || !this.pluginRegistry.isSupported(deviceType)) {
        const supported = this.pluginRegistry.getSupportedProtocols().join(', ');
        const msg = `No plugin registered for device type "${deviceType}". Supported: [${supported}]`;
        this.logger.warn(msg);
        return this.markCommError(ctx, msg);
      }

      const plugin = this.pluginRegistry.getPlugin(deviceType)!;
      const mode = plugin.meta?.isolationMode ?? IsolationMode.IN_PROCESS;

      // 2. 进程内模式：直接调用 adapter
      if (mode === IsolationMode.IN_PROCESS) {
        const adapter = this.pluginRegistry.getAdapter(deviceType);
        const result = await this.readViaAdapter(adapter, ctx);
        if (result) return result;
        return this.markCommError(ctx, `Adapter read returned null for ${deviceType}`);
      }

      // 3. 隔离模式：通过 executor 执行
      try {
        const executor = this.isolationFactory.getExecutor(deviceType);
        const deviceKey = ctx.deviceId;
        let shard = this.shardCache.get(deviceKey);
        if (!shard) {
          const deviceCtx: IDeviceContext = {
            id: ctx.deviceId,
            name: ctx.tagConfig?.deviceName || ctx.deviceId,
            protocol: deviceType,
            connection: ctx.deviceConnection || {},
            projectId: ctx.projectId,
          };
          shard = await executor.connect(deviceCtx);
          this.shardCache.set(deviceKey, shard);
        }

        const tagCtx: ITagContext = ctx.tagConfig || {
          id: ctx.tagId,
          name: ctx.tagId,
          address: '',
          dataType: 'float32',
        };
        const result = await executor.readTag(shard, tagCtx);
        ctx.rawValue = result.rawValue ?? result.value;
        ctx.rawTimestamp = result.timestamp || new Date();
        ctx.quality = (result as any).quality || 'good';
        return ctx;
      } catch (isoError) {
        // 隔离模式失败（worker 崩溃/超时），降级到进程内 adapter
        this.shardCache.delete(ctx.deviceId);
        this.logger.warn(
          `Isolation mode failed for [${deviceType}], falling back to in-process: ${(isoError as Error).message}`,
        );
        const adapter = this.pluginRegistry.getAdapter(deviceType);
        const result = await this.readViaAdapter(adapter, ctx);
        if (result) return result;
        return this.markCommError(
          ctx,
          `Both isolation and in-process reads failed for ${deviceType}: ${(isoError as Error).message}`,
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Protocol read error for tag ${ctx.tagId}: ${errorMsg}`, {
        deviceId: ctx.deviceId,
        tagId: ctx.tagId,
      });
      return this.markCommError(ctx, errorMsg);
    }
  }

  private async readViaAdapter(
    adapter: any,
    ctx: PipelineContext,
  ): Promise<PipelineContext | null> {
    try {
      const device: IDeviceContext = {
        id: ctx.deviceId,
        name: ctx.tagConfig?.deviceName || ctx.deviceId,
        protocol: ctx.deviceType || '',
        connection: ctx.deviceConnection || {},
        projectId: ctx.projectId,
      };

      let client = this.clientCache.get(ctx.deviceId);
      if (!client) {
        client = await adapter.connect(device);
        this.clientCache.set(ctx.deviceId, client);
      }

      const tag: ITagContext = ctx.tagConfig || {
        id: ctx.tagId,
        name: ctx.tagId,
        address: '',
        dataType: 'float32',
      };
      const result = await adapter.readTag(client, tag);

      if (result) {
        ctx.rawValue = result.rawValue ?? result.value;
        ctx.rawTimestamp = result.timestamp || new Date();
        ctx.quality = (result as any).quality || 'good';
        return ctx;
      }
    } catch {
      this.clientCache.delete(ctx.deviceId);
    }
    return null;
  }

  private markCommError(ctx: PipelineContext, message: string): PipelineContext {
    ctx.rawValue = null;
    ctx.quality = 'comm_error';
    ctx.errors.push({ step: this.name, message, code: 'COMM_ERROR' });
    return ctx;
  }
}
