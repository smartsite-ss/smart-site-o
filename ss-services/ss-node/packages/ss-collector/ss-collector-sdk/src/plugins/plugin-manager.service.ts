// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PluginRegistry } from './plugin-registry';
import { PluginDiscoveryService } from './plugin-discovery.service';
import { PluginUpdaterService } from './plugin-updater.service';
import { PluginConfigService, PluginRuntimeConfig } from './plugin-config.service';
import {
  RegisteredPlugin,
  PluginMetrics,
  ACTIVE_DEVICE_TRACKER,
  IActiveDeviceTracker,
  ActiveDeviceInfo,
  DeviceStats,
} from './plugin.types';
import { ChannelValidationResult } from '../types';
import { PluginMonitorService, MonitorData, ClearLogsResult } from './plugin-monitor.service';
import { IsolationFactory } from './isolation/isolation-factory';
import type { PipelineMetricsService } from '../pipeline/pipeline-metrics.service';

export interface PluginInfo {
  protocol: string;
  displayName: string;
  version: string;
  description: string;
  category: string;
  transport: string;
  status: string;
  isolationMode: string;
  supportedDataTypes: string[];
  defaultConnection: Record<string, any>;
  icon?: string;
  metrics: PluginMetrics;
  registeredAt: string;
  activatedAt?: string;
  /** 运行时进程名（child_process / in_process 模式） */
  processName?: string;
  /** 运行时进程 PID（child_process / in_process 模式） */
  processId?: number;
  /** 运行时线程 ID（仅 worker_thread 模式） */
  threadId?: number;
}

export interface PluginStatus {
  protocol: string;
  status: string;
  uptime: number;
  metrics: PluginMetrics;
  registeredAt: string;
  activatedAt?: string;
}

export interface PluginHealthReport {
  totalPlugins: number;
  activePlugins: number;
  results: PluginHealthResult[];
}

export interface PluginHealthResult {
  protocol: string;
  status: 'healthy' | 'unhealthy';
  message: string;
}

/**
 * 插件管理服务 — 面向 Controller 层的业务编排
 */
@Injectable()
export class PluginManagerService {
  private readonly logger = new Logger(PluginManagerService.name);

  /** PipelineMetricsService 实例（由 PipelineInitializer 通过 setter 注入） */
  private pipelineMetricsService?: PipelineMetricsService;

  constructor(
    private readonly registry: PluginRegistry,
    private readonly discovery: PluginDiscoveryService,
    private readonly updater: PluginUpdaterService,
    private readonly monitor: PluginMonitorService,
    private readonly configService: PluginConfigService,
    @Optional() private readonly isolationFactory?: IsolationFactory,
    @Optional()
    @Inject(forwardRef(() => ACTIVE_DEVICE_TRACKER))
    private readonly activeDeviceTracker?: IActiveDeviceTracker,
  ) {}

  /**
   * 注入 PipelineMetricsService（由 PipelineInitializer.onModuleInit 调用）
   *
   * 采用 setter 注入模式避免 PluginModule 静态依赖 PipelineModule，
   * 与 EnhancedScheduler.setPipelineMetricsService() 保持一致。
   */
  setPipelineMetricsService(service: PipelineMetricsService): void {
    this.pipelineMetricsService = service;
  }

  listPlugins(filter?: { status?: string; category?: string }): PluginInfo[] {
    return this.registry.listPlugins(filter as any).map((p) => this.toPluginInfo(p));
  }

  /**
   * 获取插件列表（含运行时进程/线程信息和真实 Pipeline 指标）
   *
   * 隔离模式下从 executor 获取子进程 PID 或线程 ID；
   * in_process 模式下返回主进程信息。
   * 同时从 PipelineMetricsService 合并按协议维度的真实采集指标。
   */
  async listPluginsWithRuntime(filter?: {
    status?: string;
    category?: string;
  }): Promise<PluginInfo[]> {
    const plugins = this.listPlugins(filter);
    if (!this.isolationFactory) return plugins;

    // 合并 Pipeline 真实采集指标（由 PipelineInitializer 通过 setter 注入）
    const metricsService = this.pipelineMetricsService;

    const results = await Promise.all(
      plugins.map(async (plugin) => {
        // 合并 Pipeline 真实指标
        if (metricsService) {
          const realMetrics = metricsService.getProtocolMetrics(plugin.protocol);
          if (realMetrics) {
            plugin.metrics = {
              ...plugin.metrics,
              totalConnections: realMetrics.totalConnections,
              activeConnections: realMetrics.activeConnections,
              totalReads: realMetrics.totalReads,
              totalErrors: realMetrics.totalErrors,
              avgResponseTime: realMetrics.avgResponseTime,
              lastActivity: realMetrics.lastActivity,
            };
          }
        }

        if (plugin.isolationMode === 'in_process') {
          plugin.processName = `node (main: ${plugin.protocol})`;
          plugin.processId = process.pid;
          return plugin;
        }
        try {
          const executor = this.isolationFactory!.getExecutor(plugin.protocol);
          const health = await executor.getHealth();
          if (health.pid) {
            plugin.processId = health.pid;
            // 与 ensureNodeExe 一致：Windows 下为 ss-collector-{protocol}.exe
            const isWin = process.platform === 'win32';
            plugin.processName = isWin
              ? `ss-collector-${plugin.protocol}.exe`
              : `ss-collector-${plugin.protocol}`;
          }
          if (health.threadId) {
            plugin.threadId = health.threadId;
            plugin.processName = `worker (${plugin.protocol})`;
          }
        } catch {
          // executor 未启动，保持 undefined
        }
        return plugin;
      }),
    );
    return results;
  }

  getPlugin(protocol: string): PluginInfo | null {
    const plugin = this.registry.getPlugin(protocol);
    return plugin ? this.toPluginInfo(plugin) : null;
  }

  async activate(protocol: string): Promise<PluginInfo> {
    await this.registry.activate(protocol);
    return this.getPlugin(protocol)!;
  }

  async deactivate(protocol: string): Promise<PluginInfo> {
    await this.registry.deactivate(protocol);
    return this.getPlugin(protocol)!;
  }

  async rediscover(): Promise<PluginInfo[]> {
    await this.discovery.discoverPlugins();
    return this.listPlugins();
  }

  async hotReload(protocol: string) {
    return this.updater.hotReload(protocol);
  }

  /**
   * 重启插件（用于隔离模式等需要重新初始化 executor 的配置变更）
   *
   * 流程：deactivate → 销毁旧 executor → activate
   * 下次 getExecutor() 将按最新的 isolationMode 创建新 executor
   */
  async restartPlugin(
    protocol: string,
  ): Promise<{ protocol: string; isolationMode: string; elapsed: number }> {
    const start = Date.now();
    const plugin = this.registry.getPlugin(protocol);
    if (!plugin) throw new Error(`Plugin not found: ${protocol}`);

    const wasActive = plugin.status === 'active';
    const newMode = plugin.meta.isolationMode ?? 'in_process';

    this.logger.log(`Restarting plugin "${protocol}" (wasActive=${wasActive}, mode=${newMode})`);

    // 1. 停用
    if (wasActive) {
      await this.deactivate(protocol);
    }

    // 2. 销毁旧隔离执行器，确保下次用新模式重建
    if (this.isolationFactory) {
      await this.isolationFactory.destroyExecutor(protocol);
    }

    // 3. 重新激活
    if (wasActive) {
      await this.activate(protocol);
    }

    const elapsed = Date.now() - start;
    this.logger.log(`Plugin "${protocol}" restarted in ${elapsed}ms (mode=${newMode})`);
    return { protocol, isolationMode: newMode, elapsed };
  }

  async checkUpdate(protocol: string) {
    return this.updater.checkUpdate(protocol);
  }

  async rollback(protocol: string) {
    return this.updater.rollback(protocol);
  }

  getPluginStatus(protocol: string): PluginStatus {
    const plugin = this.registry.getPlugin(protocol);
    if (!plugin) throw new Error(`Plugin not found: ${protocol}`);

    return {
      protocol,
      status: plugin.status,
      uptime: plugin.metrics.uptime,
      metrics: plugin.metrics,
      registeredAt:
        plugin.registeredAt instanceof Date
          ? plugin.registeredAt.toISOString()
          : String(plugin.registeredAt),
      activatedAt:
        plugin.activatedAt instanceof Date
          ? plugin.activatedAt.toISOString()
          : plugin.activatedAt
            ? String(plugin.activatedAt)
            : undefined,
    };
  }

  async healthCheck(): Promise<PluginHealthReport> {
    const activePlugins = this.registry.listPlugins({ status: 'active' });
    const results: PluginHealthResult[] = [];

    for (const plugin of activePlugins) {
      try {
        results.push({
          protocol: plugin.meta.protocol,
          status: 'healthy',
          message: 'OK',
        });
      } catch (error) {
        results.push({
          protocol: plugin.meta.protocol,
          status: 'unhealthy',
          message: String(error),
        });
      }
    }

    return {
      totalPlugins: this.registry.listPlugins().length,
      activePlugins: activePlugins.length,
      results,
    };
  }

  getConnectionSchema(protocol: string): Record<string, any> | null {
    const plugin = this.registry.getPlugin(protocol);
    return plugin?.meta.connectionSchema ?? null;
  }

  /** 调用采集插件的 validateChannelConfig() 校验通道配置 */
  async validateChannelConfig(
    protocol: string,
    config: Record<string, any>,
  ): Promise<ChannelValidationResult> {
    const adapter = this.registry.getAdapter(protocol);
    return adapter.validateChannelConfig(config);
  }

  /** 获取插件正在采集的活跃设备列表 */
  getPluginActiveDevices(protocol: string): ActiveDeviceInfo[] {
    if (!this.activeDeviceTracker) {
      return [];
    }
    const deviceIds = this.activeDeviceTracker.getActiveDeviceIds(protocol);
    return deviceIds
      .map((id) => this.activeDeviceTracker!.getActiveDeviceInfo(id))
      .filter(Boolean) as ActiveDeviceInfo[];
  }

  /** 获取所有插件的设备统计（在线/离线数量） */
  getAllDeviceStats(): Record<string, DeviceStats> {
    const result: Record<string, DeviceStats> = {};
    if (!this.activeDeviceTracker) {
      this.logger.warn('getAllDeviceStats: activeDeviceTracker is not injected (DI issue)');
      return result;
    }
    const plugins = this.registry.listPlugins();
    for (const plugin of plugins) {
      const stats = this.activeDeviceTracker.getDeviceStats(plugin.meta.protocol);
      result[plugin.meta.protocol] = stats;
      this.logger.debug(
        `Device stats for "${plugin.meta.protocol}": total=${stats.total} online=${stats.online} offline=${stats.offline} error=${stats.error}`,
      );
    }
    return result;
  }

  /**
   * 获取插件运行监控数据（内存/CPU + 采集日志）
   *
   * 隔离模式下从子进程 executor 获取实际 PID 和运行指标；
   * in_process 模式下返回主进程指标。
   */
  async getMonitorData(protocol: string): Promise<MonitorData> {
    const plugin = this.registry.getPlugin(protocol);
    const isolationMode = plugin?.meta?.isolationMode ?? 'in_process';
    const data = this.monitor.getMonitorData(protocol, isolationMode);

    // 隔离模式：从 executor 获取子进程实际 PID/线程 ID 和运行指标
    if (this.isolationFactory && isolationMode !== 'in_process') {
      try {
        const executor = this.isolationFactory.getExecutor(protocol);
        const health = await executor.getHealth();
        if (health.pid) {
          data.processId = health.pid;
          // 与实际 execPath 一致：Windows 下为 ss-collector-{protocol}.exe，Linux/macOS 为 node
          const isWin = process.platform === 'win32';
          data.processName = isWin ? `ss-collector-${protocol}.exe` : `ss-collector-${protocol}`;
        }
        if (health.threadId) {
          data.threadId = health.threadId;
          data.processName = `worker (${protocol})`;
        }
        // 用 executor 的运行统计覆盖（requestCount/errorCount/uptime 更准确）
        if (health.uptime) {
          data.metrics.uptime = Math.round(health.uptime / 1000);
        }
      } catch {
        // executor 未启动或已销毁，保持主进程数据
      }
    }

    return data;
  }

  /** 清空插件采集日志 */
  clearPluginLogs(protocol: string): ClearLogsResult {
    return this.monitor.clearLogs(protocol);
  }

  /** 写入采集日志 */
  writePluginLog(
    protocol: string,
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    message: string,
  ): void {
    this.monitor.writeLog(protocol, level, message);
  }

  // -----------------------------------------------------------------------
  //  运行时配置持久化（隔离模式等）
  // -----------------------------------------------------------------------

  /** 获取插件运行时配置 */
  getPluginConfig(protocol: string): PluginRuntimeConfig {
    return this.configService.getConfig(protocol);
  }

  /**
   * 更新插件运行时配置
   *
   * - 持久化到磁盘 JSON 文件
   * - 若修改了 isolationMode，同步更新内存中的 meta，下次 readTag 生效
   * - 若当前插件已激活且模式变化为 worker_thread/child_process，需要重启隔离
   */
  async updatePluginConfig(
    protocol: string,
    partial: Partial<PluginRuntimeConfig>,
  ): Promise<PluginRuntimeConfig> {
    const merged = this.configService.saveConfig(protocol, partial);
    const plugin = this.registry.getPlugin(protocol);

    // 同步更新内存中的 meta，使 ProtocolReadStep 读取最新 isolationMode
    if (plugin && merged.isolationMode) {
      (plugin.meta as any).isolationMode = merged.isolationMode;
      this.logger.log(
        `Plugin "${protocol}" isolationMode updated in-memory → ${merged.isolationMode}`,
      );
    }

    return merged;
  }

  /** 便捷方法：设置插件隔离模式 */
  async setPluginIsolationMode(protocol: string, mode: string): Promise<PluginRuntimeConfig> {
    return this.updatePluginConfig(protocol, { isolationMode: mode });
  }

  private toPluginInfo(plugin: RegisteredPlugin): PluginInfo {
    return {
      protocol: plugin.meta.protocol,
      displayName: plugin.meta.displayName,
      version: plugin.meta.version,
      description: plugin.meta.description,
      category: plugin.meta.category,
      transport: plugin.meta.transport,
      status: plugin.status,
      isolationMode: plugin.meta.isolationMode ?? 'in_process',
      supportedDataTypes: plugin.meta.supportedDataTypes,
      defaultConnection: plugin.meta.defaultConnection,
      icon: plugin.meta.icon,
      metrics: plugin.metrics,
      registeredAt:
        plugin.registeredAt instanceof Date
          ? plugin.registeredAt.toISOString()
          : String(plugin.registeredAt),
      activatedAt:
        plugin.activatedAt instanceof Date
          ? plugin.activatedAt.toISOString()
          : plugin.activatedAt
            ? String(plugin.activatedAt)
            : undefined,
    };
  }
}
