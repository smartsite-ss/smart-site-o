// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { EventBusService } from '@ss-node/ss-core';
import { PluginLifecycleEvent } from '../events/plugin-events.types';
import { IProtocolAdapter } from '../types';
import { CollectorPluginMeta, RegisteredPlugin, PluginMetrics, PluginFilter } from './plugin.types';
import { PluginConfigService } from './plugin-config.service';

@Injectable()
export class PluginRegistry {
  private readonly logger = new Logger(PluginRegistry.name);
  private plugins = new Map<string, RegisteredPlugin>();

  constructor(
    @Optional() private readonly eventBus?: EventBusService,
    @Optional()
    @Inject(forwardRef(() => PluginConfigService))
    private readonly configService?: PluginConfigService,
  ) {}

  /**
   * 注册采集插件
   */
  register(meta: CollectorPluginMeta, adapter: IProtocolAdapter): void {
    const protocol = meta.protocol.toLowerCase();

    if (this.plugins.has(protocol)) {
      this.logger.warn(
        `Plugin ${protocol} already registered (v${this.plugins.get(protocol)!.meta.version}), ` +
          `replacing with v${meta.version}`,
      );
    }

    const plugin: RegisteredPlugin = {
      meta,
      adapter,
      status: 'registered',
      registeredAt: new Date(),
      metrics: this.createEmptyMetrics(),
    };

    this.plugins.set(protocol, plugin);
    this.logger.log(`Plugin registered: ${meta.displayName} (${meta.protocol} v${meta.version})`);

    this.emitEvent('plugin.registered', {
      protocol: meta.protocol,
      displayName: meta.displayName,
      version: meta.version,
      category: meta.category,
      status: 'registered',
      timestamp: Date.now(),
    });
  }

  /**
   * 激活插件（使其可用于采集）
   */
  async activate(protocol: string): Promise<void> {
    const plugin = this.getRequired(protocol);
    const previousStatus = plugin.status;
    plugin.status = 'active';
    plugin.activatedAt = new Date();
    this.logger.log(`Plugin activated: ${protocol}`);

    // 持久化激活状态，确保重启后自动恢复
    try {
      this.configService?.setActivated(protocol, true);
    } catch (err) {
      this.logger.warn(
        `Failed to persist activation state for "${protocol}": ${(err as Error).message}`,
      );
    }

    // 调用适配器的 onActivate 生命周期钩子（独立于设备加载）
    try {
      if (typeof plugin.adapter?.onActivate === 'function') {
        this.logger.log(`Calling adapter.onActivate() for plugin "${protocol}"...`);
        await plugin.adapter.onActivate();
        this.logger.log(`Adapter.onActivate() completed for plugin "${protocol}"`);
      } else {
        this.logger.warn(`Adapter for plugin "${protocol}" does not implement onActivate()`);
      }
    } catch (err) {
      this.logger.error(
        `Adapter.onActivate() failed for plugin "${protocol}": ${(err as Error).message}`,
      );
      // 激活失败不应阻塞插件状态变更——状态已经设为 active,
      // 但记录错误以便排查
    }

    this.emitEvent('plugin.activated', {
      protocol: plugin.meta.protocol,
      displayName: plugin.meta.displayName,
      version: plugin.meta.version,
      category: plugin.meta.category,
      status: 'active',
      previousStatus,
      timestamp: Date.now(),
    });
  }

  /**
   * 停用插件
   */
  async deactivate(protocol: string): Promise<void> {
    const plugin = this.getRequired(protocol);
    const previousStatus = plugin.status;
    plugin.status = 'inactive';
    this.logger.log(`Plugin deactivated: ${protocol}`);

    // 持久化停用状态，确保重启后不会自动激活
    try {
      this.configService?.setActivated(protocol, false);
    } catch (err) {
      this.logger.warn(
        `Failed to persist deactivation state for "${protocol}": ${(err as Error).message}`,
      );
    }

    // 调用适配器的 onDeactivate 生命周期钩子
    try {
      if (typeof plugin.adapter?.onDeactivate === 'function') {
        await plugin.adapter.onDeactivate();
      }
    } catch (err) {
      this.logger.error(
        `Adapter.onDeactivate() failed for plugin "${protocol}": ${(err as Error).message}`,
      );
    }

    this.emitEvent('plugin.deactivated', {
      protocol: plugin.meta.protocol,
      displayName: plugin.meta.displayName,
      version: plugin.meta.version,
      category: plugin.meta.category,
      status: 'inactive',
      previousStatus,
      timestamp: Date.now(),
    });
  }

  /**
   * 注销插件
   */
  unregister(protocol: string): void {
    const plugin = this.plugins.get(protocol.toLowerCase());
    this.plugins.delete(protocol.toLowerCase());
    this.logger.log(`Plugin unregistered: ${protocol}`);

    if (plugin) {
      this.emitEvent('plugin.unregistered', {
        protocol: plugin.meta.protocol,
        displayName: plugin.meta.displayName,
        version: plugin.meta.version,
        category: plugin.meta.category,
        status: 'unregistered',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 标记插件为错误状态
   */
  markError(protocol: string, errorMessage: string): void {
    const plugin = this.plugins.get(protocol.toLowerCase());
    if (!plugin) return;
    const previousStatus = plugin.status;
    plugin.status = 'error';
    plugin.errorMessage = errorMessage;
    this.logger.error(`Plugin error: ${protocol} - ${errorMessage}`);

    this.emitEvent('plugin.error', {
      protocol: plugin.meta.protocol,
      displayName: plugin.meta.displayName,
      version: plugin.meta.version,
      category: plugin.meta.category,
      status: 'error',
      previousStatus,
      errorMessage,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射插件生命周期事件
   */
  private emitEvent(
    eventType:
      | 'plugin.registered'
      | 'plugin.activated'
      | 'plugin.deactivated'
      | 'plugin.unregistered'
      | 'plugin.error',
    event: PluginLifecycleEvent,
  ): void {
    try {
      this.eventBus?.emit(eventType, event);
    } catch {
      // 事件发射失败不应影响插件管理核心逻辑
    }
  }

  /**
   * 获取指定协议的适配器
   */
  getAdapter(protocol: string): IProtocolAdapter {
    const plugin = this.getRequired(protocol);
    if (plugin.status !== 'active' && plugin.status !== 'registered') {
      throw new Error(`Plugin is not active: ${protocol}`);
    }
    return plugin.adapter;
  }

  /**
   * 获取插件详情
   */
  getPlugin(protocol: string): RegisteredPlugin | undefined {
    return this.plugins.get(protocol.toLowerCase());
  }

  /**
   * 获取所有已注册插件
   */
  listPlugins(filter?: PluginFilter): RegisteredPlugin[] {
    let plugins = Array.from(this.plugins.values());
    if (filter?.status) {
      plugins = plugins.filter((p) => p.status === filter.status);
    }
    if (filter?.category) {
      plugins = plugins.filter((p) => p.meta.category === filter.category);
    }
    return plugins;
  }

  /**
   * 获取所有支持的协议类型
   */
  getSupportedProtocols(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * 检查协议是否支持
   */
  isSupported(protocol: string): boolean {
    return this.plugins.has(protocol.toLowerCase());
  }

  /**
   * 获取插件数量
   */
  get count(): number {
    return this.plugins.size;
  }

  private getRequired(protocol: string): RegisteredPlugin {
    const plugin = this.plugins.get(protocol.toLowerCase());
    if (!plugin) {
      throw new Error(`Plugin not found for protocol: ${protocol}`);
    }
    return plugin;
  }

  private createEmptyMetrics(): PluginMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      totalReads: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      uptime: 0,
      lastActivity: null,
    };
  }
}
