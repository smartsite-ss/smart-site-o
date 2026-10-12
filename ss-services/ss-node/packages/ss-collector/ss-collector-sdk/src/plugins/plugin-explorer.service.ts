// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, Logger, Optional, Inject } from '@nestjs/common';
import { COLLECTOR_PLUGIN_META } from './plugin.decorator';
import { PluginRegistry } from './plugin-registry';
import { EventBusService } from '@ss-node/ss-core';
import { PluginLifecycleEvent } from '../events/plugin-events.types';
import { IProtocolAdapter } from '../types';
import { CollectorPluginMeta, IProviderScanner, PROVIDER_SCANNER } from './plugin.types';
import { IsolationFactory } from './isolation/isolation-factory';
import { PluginConfigService } from './plugin-config.service';

/**
 * 插件探索器 — 扫描所有 @CollectorPlugin 装饰的 NestJS Provider 并自动注册
 */
@Injectable()
export class PluginExplorerService implements OnModuleInit {
  private readonly logger = new Logger(PluginExplorerService.name);

  constructor(
    private readonly registry: PluginRegistry,
    @Inject(PROVIDER_SCANNER) private readonly providerScanner: IProviderScanner,
    private readonly configService: PluginConfigService,
    @Optional() private readonly eventBus?: EventBusService,
    @Optional() private readonly isolationFactory?: IsolationFactory,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.exploreAndRegister();
  }

  private async exploreAndRegister(): Promise<void> {
    this.logger.log(
      '========== PluginExplorerService: scanning for @CollectorPlugin providers ==========',
    );
    const providers = this.providerScanner.getProviders();
    this.logger.log(`  Found ${providers.length} provider(s) total`);

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;

      const meta: CollectorPluginMeta | undefined = Reflect.getMetadata(
        COLLECTOR_PLUGIN_META,
        metatype,
      );

      if (meta) {
        await this.registerPlugin(meta, instance as IProtocolAdapter);
      }
    }
  }

  /**
   * 注册插件并应用持久化配置
   *
   * - 从 PluginConfigService 读取已有配置，覆盖装饰器默认值
   * - 然后调用 registry.register() 和 isolationFactory.prepare()
   */
  private async registerPlugin(
    meta: CollectorPluginMeta,
    adapter: IProtocolAdapter,
  ): Promise<void> {
    try {
      // 加载持久化配置并覆盖 isolationMode
      const persistedMode = this.configService.getIsolationMode(meta.protocol);
      if (persistedMode) {
        this.logger.log(
          `Plugin "${meta.protocol}": using persisted isolationMode "${persistedMode}" (decorator default: "${meta.isolationMode ?? 'in_process'}")`,
        );
        meta.isolationMode = persistedMode as CollectorPluginMeta['isolationMode'];
      }

      this.registry.register(meta, adapter);
      this.logger.log(`Auto-registered plugin: ${meta.displayName} (${meta.protocol})`);

      this.emitDiscovered(meta);

      // 决定是否自动激活，优先级：
      // 1. 持久化配置 activated=true  → 恢复之前的激活状态
      // 2. enabledByDefault=true       → 装饰器声明的默认启用
      const persistedActivated = this.configService.getActivated(meta.protocol);
      if (persistedActivated === true) {
        this.logger.log(
          `Plugin "${meta.protocol}": persisted activated=true, restoring activation...`,
        );
        await this.registry.activate(meta.protocol);
        this.logger.log(`Plugin "${meta.protocol}": activation restored`);
      } else if (meta.enabledByDefault) {
        this.logger.log(`Plugin "${meta.protocol}": enabledByDefault=true, auto-activating...`);
        await this.registry.activate(meta.protocol);
        this.logger.log(`Plugin "${meta.protocol}": auto-activated successfully`);
      }

      // 按隔离模式预热 Worker/子进程
      if (this.isolationFactory) {
        await this.isolationFactory.prepare(meta.protocol);
      }
    } catch (error) {
      this.logger.error(
        `Failed to auto-register plugin ${meta.protocol}: ${(error as Error).message}`,
      );
    }
  }

  private emitDiscovered(meta: CollectorPluginMeta): void {
    try {
      const event: PluginLifecycleEvent = {
        protocol: meta.protocol,
        displayName: meta.displayName,
        version: meta.version,
        category: meta.category,
        status: 'discovered',
        timestamp: Date.now(),
      };
      this.eventBus?.emit('plugin.discovered', event);
    } catch {
      // 事件发射失败不应影响插件注册核心逻辑
    }
  }
}
