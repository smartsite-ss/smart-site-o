// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { fork, ChildProcess } from 'child_process';
import * as fs from 'fs';
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
import { PluginMonitorService } from '../plugin-monitor.service';
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

/**
 * 子进程执行器 —— 与 WorkerThreadExecutor 共享同一条消息协议、同一个 worker 脚本
 * 区别：fork() vs new Worker()、child.kill() vs worker.terminate()
 */
@Injectable()
export class ChildProcessExecutor implements IIsolationExecutor, OnModuleDestroy {
  readonly name = 'ChildProcess';
  private readonly logger = new Logger(ChildProcessExecutor.name);

  private child: ChildProcess | null = null;
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
  /** 子进程启动阶段的 fatal 错误（供 waitForReady 立即 reject 使用） */
  private _fatalError: Error | null = null;

  constructor(
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly pluginMonitor?: PluginMonitorService,
  ) {}

  /** 同时输出到 NestJS Logger 和插件日志文件 */
  private writeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
    const prefix = `[${this.protocol}]`;
    const msg = `${prefix} ${message}`;
    if (level === 'ERROR') this.logger.error(msg);
    else if (level === 'WARN') this.logger.warn(msg);
    else this.logger.log(msg);
    // 写入插件专属日志文件
    if (this.pluginMonitor && this.protocol) {
      try {
        this.pluginMonitor.writeLog(this.protocol, level, message);
      } catch {}
    }
  }

  /**
   * 确保子进程显示名称 exe 副本存在（仅 Windows）。
   *
   * 设计决策：
   *   - 不随发布包分发（避免多协议时包体积膨胀 80MB×N）
   *   - 首次启动时从 node.exe 复制到应用目录的 .ss-collector-isolation/ 下
   *   - 应用目录（cwd）由 start.bat / start-service.bat 固定，通常可写
   *   - node.exe 所在目录（如 C:\Program Files\nodejs\）在发布环境通常不可写，
   *     只作为开发环境的候选
   *
   * 最终效果：tasklist / 任务管理器显示 ss-collector-{protocol}.exe
   */
  private ensureNodeExe(protocol: string): string {
    if (process.platform !== 'win32') return process.execPath;

    const exeName = `ss-collector-${protocol}.exe`;

    // 候选位置：应用目录优先（发布/开发均可写），node.exe 目录作为旧副本兼容
    const candidates = [
      path.join(process.cwd(), '.ss-collector-isolation', exeName),
      path.join(path.dirname(process.execPath), '.ss-collector-isolation', exeName),
    ];

    // Phase 1 — 检查是否已有副本
    for (const f of candidates) {
      if (fs.existsSync(f)) return f;
    }

    // Phase 2 — 没有副本则创建一份到应用目录（始终可写）
    const targetDir = path.join(process.cwd(), '.ss-collector-isolation');
    const targetPath = path.join(targetDir, exeName);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(process.execPath, targetPath);
      this.logger.log(`Copied node.exe → .ss-collector-isolation/${exeName}`);
      return targetPath;
    } catch (err) {
      this.logger.warn(
        `Failed to copy node.exe to [${targetDir}], using original (Task Manager will show "node.exe"): ${(err as Error).message}`,
      );
      return process.execPath;
    }
  }

  async init(
    protocol: string,
    _adapterClass: any,
    config: Partial<RequiredIsolationConfig>,
  ): Promise<void> {
    this.protocol = protocol;
    this.config = { ...DEFAULT_ISOLATION_CONFIG, ...config };

    await this.startChild();
  }

  private async startChild(): Promise<void> {
    const workerPath = this.config.entryScript || path.join(__dirname, 'collector-worker.js');

    // Windows: 使用重命名的 node.exe 使进程在 tasklist/任务管理器中显示为 ss-collector-{protocol}.exe
    const execPath = this.ensureNodeExe(this.protocol);

    this.writeLog(
      'INFO',
      `Starting child process: ${workerPath} (execPath=${path.basename(execPath)})`,
    );
    this.child = fork(workerPath, [], {
      execPath,
      env: {
        ...process.env,
        COLLECTOR_PROTOCOL: this.protocol,
        COLLECTOR_ADAPTER_MODULE: this.resolveAdapterModule(this.protocol),
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    this.child.stdout?.on('data', (d) => this.writeLog('INFO', `stdout: ${d.toString().trim()}`));
    this.child.stderr?.on('data', (d) => this.writeLog('WARN', `stderr: ${d.toString().trim()}`));

    this.child.on('message', (msg: WorkerMsg) => this.handleMessage(msg));
    this.child.on('exit', (code, signal) => {
      if (code !== 0 || signal) this.handleCrash(code, signal);
    });

    await this.waitForReady();
    this.startedAt = Date.now();
    this.writeLog('INFO', `Child process started (PID: ${this.child.pid}, mode=child_process)`);
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
    try {
      const health = await this.sendRequest('health', {});
      return { ...health, restartCount: this.restartCount, pid: this.child?.pid };
    } catch {
      return {
        mode: IsolationMode.CHILD_PROCESS,
        status: this.child ? 'degraded' : 'dead',
        uptime: Date.now() - this.startedAt,
        requestCount: this.stats.requestCount,
        errorCount: this.stats.errorCount,
        avgLatencyMs: 0,
        pid: this.child?.pid,
        restartCount: this.restartCount,
      };
    }
  }

  async destroy(): Promise<void> {
    try {
      this.child?.send({ type: 'shutdown' });
    } catch {}
    this.child?.kill('SIGTERM');
    setTimeout(() => {
      if (!this.child?.killed) this.child?.kill('SIGKILL');
    }, 5000);
    this.child = null;
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
        reject(new Error(`Child process request timeout: ${type}`));
      }, this.config.requestTimeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });
      this.child!.send({ type, requestId, ...payload });
    });
  }

  private handleMessage(msg: WorkerMsg): void {
    if (msg.type === 'ready') {
      this.writeLog('INFO', `Child process [${msg.protocol}] ready`);
      return;
    }

    if (msg.type === 'fatal') {
      this.writeLog('ERROR', `Child process fatal: ${msg.error?.message || 'unknown'}`);
      // 存储 fatal 错误供 waitForReady 消费
      this._fatalError = new Error(msg.error?.message || 'Child process fatal error');
      return;
    }

    if (msg.type === 'log') {
      const level = (msg.level || 'info').toLowerCase();
      if (level === 'error') this.writeLog('ERROR', `Worker: ${msg.message}`);
      else if (level === 'warn') this.writeLog('WARN', `Worker: ${msg.message}`);
      else this.writeLog('INFO', `Worker: ${msg.message}`);
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
      pending.reject(new Error(msg.error?.message || 'Child process error'));
    } else if (msg.type === 'health') pending.resolve(msg.payload);
  }

  private handleCrash(code: number | null, signal: string | null): void {
    this.writeLog('ERROR', `Child process exited: code=${code}, signal=${signal}`);

    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('Child process crashed'));
    }
    this.pending.clear();

    this.eventBus?.emit('plugin.isolation.crash', {
      protocol: this.protocol,
      mode: IsolationMode.CHILD_PROCESS,
      restartCount: this.restartCount,
      error: `Exit code=${code}, signal=${signal}`,
      timestamp: Date.now(),
    } as any);

    if (this.config.autoRestart && this.restartCount < this.config.maxRestarts) {
      this.restartCount++;
      setTimeout(() => this.startChild(), 3000);
    }
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Child process [${this.protocol}] startup timeout`));
      }, this.config.startupTimeoutMs);

      const handler = (msg: WorkerMsg) => {
        if (msg.type === 'ready') {
          clearTimeout(timeout);
          this.child?.off('message', handler as any);
          resolve();
        } else if (msg.type === 'fatal') {
          clearTimeout(timeout);
          this.child?.off('message', handler as any);
          reject(new Error(msg.error?.message || 'Child process startup failed'));
        }
      };
      this.child!.on('message', handler as any);
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
