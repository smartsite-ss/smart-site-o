// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { PluginRegistry } from '../plugin-registry';
import { IsolationMode, IsolationConfig } from '../plugin.types';
import { IIsolationExecutor } from './isolation.types';
import { InProcessExecutor } from './in-process-executor';
import { WorkerThreadExecutor } from './worker-thread-executor';
import { ChildProcessExecutor } from './child-process-executor';
import { EventBusService } from '@ss-node/ss-core';
import { PluginMonitorService } from '../plugin-monitor.service';

/**
 * 隔离执行器工厂 —— 按插件配置创建/获取对应的执行器
 *
 * 设计：
 * - 每个协议维护一个 executor 实例（懒加载）
 * - in_process 模式：InProcessExecutor 直接调用 adapter
 * - worker_thread / child_process 模式：调用 prepare() 提前启动
 * - onModuleDestroy 时销毁所有 executor
 */
@Injectable()
export class IsolationFactory implements OnModuleDestroy {
  private readonly logger = new Logger(IsolationFactory.name);
  private executors = new Map<string, IIsolationExecutor>();

  constructor(
    private readonly pluginRegistry: PluginRegistry,
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly pluginMonitor?: PluginMonitorService,
  ) {}

  /**
   * 获取或创建指定协议的隔离执行器
   */
  getExecutor(protocol: string): IIsolationExecutor {
    const existing = this.executors.get(protocol);
    if (existing) return existing;

    const plugin = this.pluginRegistry.getPlugin(protocol);
    const mode = plugin?.meta?.isolationMode ?? IsolationMode.IN_PROCESS;

    let executor: IIsolationExecutor;
    switch (mode) {
      case IsolationMode.WORKER_THREAD:
        executor = new WorkerThreadExecutor(this.eventBus);
        break;
      case IsolationMode.CHILD_PROCESS:
        executor = new ChildProcessExecutor(this.eventBus, this.pluginMonitor);
        break;
      case IsolationMode.IN_PROCESS:
      default: {
        const adapter = this.pluginRegistry.getAdapter(protocol);
        executor = new InProcessExecutor();
        executor.init(protocol, adapter, {});
        break;
      }
    }

    this.executors.set(protocol, executor);
    this.logger.log(`Executor created for [${protocol}]: mode=${mode}`);
    return executor;
  }

  /**
   * 在插件发现后提前启动 Worker/子进程
   * 在 PluginExplorerService 发现插件后调用
   */
  async prepare(protocol: string): Promise<void> {
    const plugin = this.pluginRegistry.getPlugin(protocol);
    if (!plugin) return;

    const mode = plugin.meta?.isolationMode ?? IsolationMode.IN_PROCESS;
    if (mode === IsolationMode.IN_PROCESS) return; // 无需预热

    try {
      const executor = this.getExecutor(protocol);
      const config: Partial<IsolationConfig> = plugin.meta?.isolation || {};
      await executor.init(protocol, null, config);
    } catch (err) {
      // 初始化失败不应导致应用崩溃，后续读取会降级到进程内模式
      this.logger.error(
        `Failed to prepare executor for [${protocol}]: ${(err as Error).message} — will fallback to in-process`,
      );
      this.executors.delete(protocol);
    }
  }

  /**
   * 销毁指定协议的隔离执行器，下次 getExecutor() 将按最新 isolationMode 重建
   */
  async destroyExecutor(protocol: string): Promise<void> {
    const executor = this.executors.get(protocol);
    if (executor) {
      try {
        await executor.destroy();
      } catch {
        // 静默处理 destroy 失败
      }
      this.executors.delete(protocol);
      this.logger.log(`Executor destroyed for [${protocol}], will recreate on next use`);
    }
  }

  /**
   * 获取所有 executor 的健康状态
   */
  async getAllHealth(): Promise<Map<string, any>> {
    const health = new Map<string, any>();
    for (const [protocol, executor] of this.executors) {
      try {
        health.set(protocol, await executor.getHealth());
      } catch {
        health.set(protocol, { status: 'error' });
      }
    }
    return health;
  }

  /**
   * 检查协议是否使用隔离模式
   */
  isIsolated(protocol: string): boolean {
    const plugin = this.pluginRegistry.getPlugin(protocol);
    const mode = plugin?.meta?.isolationMode ?? IsolationMode.IN_PROCESS;
    return mode !== IsolationMode.IN_PROCESS;
  }

  async onModuleDestroy(): Promise<void> {
    for (const [protocol, executor] of this.executors) {
      try {
        await executor.destroy();
        this.logger.log(`Executor [${protocol}] destroyed`);
      } catch {}
    }
    this.executors.clear();
  }
}
