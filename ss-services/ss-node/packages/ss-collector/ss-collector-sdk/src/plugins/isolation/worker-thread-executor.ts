// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import {
  IIsolationExecutor,
  ShardRef,
  RequiredIsolationConfig,
  DEFAULT_ISOLATION_CONFIG,
} from './isolation.types';
import { EventBusService } from '@ss-node/ss-core';
import { ExecutorHealth } from '../../events/plugin-events.types';
import { IDeviceContext, ITagContext } from '../../types';
import { IsolationMode } from '../plugin.types';

type WorkerMsg = {
  type: 'result' | 'error' | 'ready' | 'health' | 'log' | 'fatal';
  requestId?: string;
  payload?: any;
  error?: { message: string; code?: string };
  protocol?: string;
  level?: string;
  message?: string;
};

@Injectable()
export class WorkerThreadExecutor implements IIsolationExecutor, OnModuleDestroy {
  readonly name = 'WorkerThread';
  private readonly logger = new Logger(WorkerThreadExecutor.name);

  private worker: Worker | null = null;
  private protocol = '';
  private requestId = 0;
  private pending = new Map<
    string,
    { resolve: Function; reject: Function; timer: NodeJS.Timeout }
  >();
  private config!: RequiredIsolationConfig;
  private restartCount = 0;
  private startedAt = 0;
  private stats = { requestCount: 0, errorCount: 0, totalLatencyMs: 0 };

  constructor(@Optional() private readonly eventBus?: EventBusService) {}

  async init(
    protocol: string,
    _adapterClass: any,
    config: Partial<RequiredIsolationConfig>,
  ): Promise<void> {
    this.protocol = protocol;
    this.config = { ...DEFAULT_ISOLATION_CONFIG, ...config };

    await this.startWorker();
  }

  private async startWorker(): Promise<void> {
    const workerPath = path.join(__dirname, 'collector-worker.js');
    this.worker = new Worker(workerPath, {
      workerData: {
        protocol: this.protocol,
        adapterModule: this.resolveAdapterModule(this.protocol),
      },
    });

    this.worker.on('message', (msg: WorkerMsg) => this.handleMessage(msg));
    this.worker.on('error', (err) => this.handleCrash(err));
    this.worker.on('exit', (code) => {
      if (code !== 0) this.handleCrash(new Error(`Worker exited with code ${code}`));
    });

    await this.waitForReady();
    this.startedAt = Date.now();
    this.logger.log(`Worker [${this.protocol}] started (mode=worker_thread)`);
  }

  async connect(device: IDeviceContext): Promise<ShardRef> {
    const result = await this.sendRequest('connect', { device });
    return { connectionId: result.connectionId, protocol: result.protocol || this.protocol };
  }

  async readTag(shard: ShardRef, tag: ITagContext): Promise<any> {
    return this.sendRequest('read_tag', { connectionId: shard.connectionId, tag });
  }

  async writeTag(shard: ShardRef, tag: ITagContext, value: any): Promise<void> {
    await this.sendRequest('write_tag', { connectionId: shard.connectionId, tag, value });
  }

  async disconnect(shard: ShardRef): Promise<void> {
    try {
      await this.sendRequest('disconnect', { connectionId: shard.connectionId });
    } catch {}
  }

  async getHealth(): Promise<ExecutorHealth> {
    const threadId = this.worker?.threadId;
    try {
      const health = await this.sendRequest('health', {});
      return { ...health, threadId, restartCount: this.restartCount };
    } catch {
      return {
        mode: IsolationMode.WORKER_THREAD,
        status: this.worker ? 'degraded' : 'dead',
        uptime: Date.now() - this.startedAt,
        requestCount: this.stats.requestCount,
        errorCount: this.stats.errorCount,
        avgLatencyMs: 0,
        threadId,
        restartCount: this.restartCount,
      };
    }
  }

  async destroy(): Promise<void> {
    try {
      this.worker?.postMessage({ type: 'shutdown' });
    } catch {}
    await this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }

  onModuleDestroy(): void {
    this.destroy();
  }

  private sendRequest(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `${type}-${++this.requestId}`;
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Worker request timeout: ${type}`));
      }, this.config.requestTimeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });
      this.worker!.postMessage({ type, requestId, ...payload });
    });
  }

  private handleMessage(msg: WorkerMsg): void {
    if (msg.type === 'ready') {
      this.logger.log(`Worker [${msg.protocol}] ready`);
      return;
    }

    if (msg.type === 'fatal') {
      this.logger.error(`Worker [${this.protocol}] fatal: ${msg.error?.message || 'unknown'}`);
      return;
    }

    if (msg.type === 'log') {
      const level = (msg.level || 'info').toLowerCase();
      if (level === 'error') this.logger.error(`[${this.protocol}] ${msg.message}`);
      else if (level === 'warn') this.logger.warn(`[${this.protocol}] ${msg.message}`);
      else this.logger.debug(`[${this.protocol}] ${msg.message}`);
      return;
    }

    if (!msg.requestId) return;
    const pending = this.pending.get(msg.requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(msg.requestId);
    this.stats.requestCount++;

    if (msg.type === 'result') pending.resolve(msg.payload);
    else if (msg.type === 'error') {
      this.stats.errorCount++;
      pending.reject(new Error(msg.error?.message || 'Worker error'));
    } else if (msg.type === 'health') pending.resolve(msg.payload);
  }

  private handleCrash(err: Error): void {
    this.logger.error(`Worker [${this.protocol}] crashed: ${err.message}`);

    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('Worker crashed'));
    }
    this.pending.clear();

    this.eventBus?.emit('plugin.isolation.crash', {
      protocol: this.protocol,
      mode: IsolationMode.WORKER_THREAD,
      restartCount: this.restartCount,
      error: err.message,
      timestamp: Date.now(),
    } as any);

    if (this.config.autoRestart && this.restartCount < this.config.maxRestarts) {
      this.restartCount++;
      setTimeout(() => this.startWorker(), 3000);
    }
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker [${this.protocol}] startup timeout`));
      }, this.config.startupTimeoutMs);

      const handler = (msg: WorkerMsg) => {
        if (msg.type === 'ready') {
          clearTimeout(timeout);
          this.worker?.off('message', handler);
          resolve();
        } else if (msg.type === 'fatal') {
          clearTimeout(timeout);
          this.worker?.off('message', handler);
          reject(new Error(msg.error?.message || 'Worker startup failed'));
        }
      };
      this.worker!.on('message', handler);
    });
  }

  private resolveAdapterModule(protocol: string): string {
    const moduleMap: Record<string, string> = {
      modbus_tcp: '@ss-node/ss-collector-modbus',
      modbus_rtu: '@ss-node/ss-collector-modbus',
      modbus: '@ss-node/ss-collector-modbus',
      s7: '@ss-node/ss-collector-s7',
      mqtt: '@ss-node/ss-collector-mqtt',
      opcua: '@ss-node/ss-collector-opcua',
      virtual: '@ss-node/ss-collector-virtual',
    };
    return moduleMap[protocol] || `@ss-node/ss-collector-${protocol}`;
  }
}
