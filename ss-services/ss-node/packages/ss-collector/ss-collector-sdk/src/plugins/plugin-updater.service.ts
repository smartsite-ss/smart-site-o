// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import { PluginRegistry } from './plugin-registry';
import { PluginDiscoveryService } from './plugin-discovery.service';
import { CollectorPluginMeta } from './plugin.types';
import { EventBusService } from '@ss-node/ss-core';
import { PluginLifecycleEvent } from '../events/plugin-events.types';

export interface HotReloadResult {
  protocol: string;
  oldVersion: string;
  newVersion: string;
  elapsed: number;
  success: boolean;
  error?: string;
}

export interface UpdateCheckResult {
  protocol: string;
  currentVersion: string;
  latestVersion: string;
  changelog?: string;
  updateAvailable: boolean;
}

/**
 * 插件更新服务 — 支持热重载、版本检查和回滚
 */
@Injectable()
export class PluginUpdaterService {
  private readonly logger = new Logger(PluginUpdaterService.name);
  private versionHistory = new Map<string, Array<{ version: string; adapter: any }>>();

  constructor(
    private readonly registry: PluginRegistry,
    private readonly discovery: PluginDiscoveryService,
    @Optional() private readonly eventBus?: EventBusService,
  ) {}

  /**
   * 热重载插件（零停机更新）
   *
   * 流程：
   *  1. 停用目标插件
   *  2. 等待活跃连接自然关闭（最多 30s）
   *  3. 清除模块缓存
   *  4. 重新发现并加载新版本
   *  5. 激活插件
   */
  async hotReload(protocol: string): Promise<HotReloadResult> {
    const startTime = Date.now();
    const oldPlugin = this.registry.getPlugin(protocol);
    if (!oldPlugin) {
      return {
        protocol,
        oldVersion: 'unknown',
        newVersion: 'unknown',
        elapsed: 0,
        success: false,
        error: 'Plugin not found',
      };
    }

    const oldVersion = oldPlugin.meta.version;

    // 保存到版本历史
    this.saveVersion(protocol, oldVersion, oldPlugin.adapter);

    try {
      // 1. 停用
      await this.registry.deactivate(protocol);
      this.logger.log(`Plugin ${protocol} deactivated for hot reload`);

      // 2. 等待连接排空
      await this.drainConnections(protocol, 30000);

      // 3. 清除 Node.js 模块缓存
      this.clearModuleCache(protocol);

      // 4. 重新发现
      const newPlugins = await this.discovery.discoverPlugins();
      const newPlugin = newPlugins.find((p) => p.meta.protocol === protocol);
      if (!newPlugin) throw new Error(`Plugin ${protocol} not found after reload`);

      // 5. 重新注册
      this.registry.register(newPlugin.meta, newPlugin.adapter || oldPlugin.adapter);
      await this.registry.activate(protocol);

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `Plugin ${protocol} hot reloaded: ${oldVersion} → ${newPlugin.meta.version} (${elapsed}ms)`,
      );

      this.emitUpdated(newPlugin.meta, oldVersion);

      return {
        protocol,
        oldVersion,
        newVersion: newPlugin.meta.version,
        elapsed,
        success: true,
      };
    } catch (error) {
      // 回滚
      this.registry.register(oldPlugin.meta, oldPlugin.adapter);
      await this.registry.activate(protocol);
      this.logger.error(
        `Plugin ${protocol} hot reload failed, rolled back: ${(error as Error).message}`,
      );

      return {
        protocol,
        oldVersion,
        newVersion: oldVersion,
        elapsed: Date.now() - startTime,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 回滚到上一版本
   */
  async rollback(protocol: string): Promise<HotReloadResult> {
    const history = this.versionHistory.get(protocol);
    if (!history || history.length === 0) {
      return {
        protocol,
        oldVersion: 'unknown',
        newVersion: 'unknown',
        elapsed: 0,
        success: false,
        error: 'No version history available',
      };
    }

    const prev = history.pop()!;
    const current = this.registry.getPlugin(protocol);
    const oldVersion = current?.meta.version || 'unknown';

    if (current) {
      this.registry.register({ ...current.meta, version: prev.version }, prev.adapter);
      await this.registry.activate(protocol);
      this.logger.log(`Plugin ${protocol} rolled back to v${prev.version}`);
    }

    return {
      protocol,
      oldVersion,
      newVersion: prev.version,
      elapsed: 0,
      success: true,
    };
  }

  /**
   * 检查插件是否有可用更新
   */
  async checkUpdate(protocol: string): Promise<UpdateCheckResult | null> {
    const installed = this.registry.getPlugin(protocol);
    if (!installed) return null;

    try {
      const pkgName = `@ss-node/ss-collector-${protocol}`;
      const response = await fetch(`https://npm.ss-data.local/${pkgName}/latest`);

      if (!response.ok) return null;

      const latest = await response.json();

      if (latest.version !== installed.meta.version) {
        return {
          protocol,
          currentVersion: installed.meta.version,
          latestVersion: latest.version,
          changelog: latest.changelog,
          updateAvailable: true,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async drainConnections(protocol: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const plugin = this.registry.getPlugin(protocol);
    if (!plugin) return;

    while (Date.now() < deadline) {
      if (plugin.metrics.activeConnections === 0) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    this.logger.warn(`Plugin ${protocol} drain timeout, forcing reload`);
  }

  private clearModuleCache(protocol: string): void {
    try {
      const pkgName = `@ss-node/ss-collector-${protocol}`;
      const cacheKey = require.resolve(pkgName);
      if (cacheKey) {
        delete require.cache[cacheKey];
        this.logger.debug(`Cleared module cache for ${pkgName}`);
      }
    } catch {
      this.logger.debug(`No module cache to clear for ${protocol}`);
    }
  }

  private saveVersion(protocol: string, version: string, adapter: any): void {
    const history = this.versionHistory.get(protocol) || [];
    history.push({ version, adapter });
    if (history.length > 5) history.shift(); // 只保留最近 5 个版本
    this.versionHistory.set(protocol, history);
  }

  private emitUpdated(meta: CollectorPluginMeta, oldVersion: string): void {
    try {
      const event: PluginLifecycleEvent = {
        protocol: meta.protocol,
        displayName: meta.displayName,
        version: meta.version,
        category: meta.category,
        status: 'active',
        oldVersion,
        newVersion: meta.version,
        timestamp: Date.now(),
      };
      this.eventBus?.emit('plugin.updated', event);
    } catch {
      // 事件发射失败不应影响插件热更新核心逻辑
    }
  }
}
