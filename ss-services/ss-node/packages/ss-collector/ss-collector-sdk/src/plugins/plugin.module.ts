// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventBusModule } from '@ss-node/ss-core';
import { PluginRegistry } from './plugin-registry';
import { PluginDiscoveryService } from './plugin-discovery.service';
import { PluginUpdaterService } from './plugin-updater.service';
import { PluginManagerService } from './plugin-manager.service';
import { PluginMonitorService } from './plugin-monitor.service';
import { PluginConfigService } from './plugin-config.service';
import { PluginController } from './plugin.controller';
import { PluginModuleOptions } from './plugin.types';
import { IsolationFactory } from './isolation/isolation-factory';

@Global()
@Module({})
export class PluginModule {
  /**
   * 注册插件管理模块
   *
   * PluginExplorerService 通过 PROVIDER_SCANNER 字符串令牌注入提供者扫描能力，
   * 实物实现由 app.module.ts 在根上下文提供，避免 pnpm 重复 @nestjs/core 导致 DI 令牌不匹配。
   *
   * @param options.autoDiscover 是否启用启动时自动发现（默认 true）
   */
  static forRoot(options?: PluginModuleOptions): DynamicModule {
    return {
      module: PluginModule,
      imports: [ConfigModule, EventBusModule],
      providers: [
        PluginConfigService,
        PluginRegistry,
        PluginDiscoveryService,
        PluginUpdaterService,
        PluginManagerService,
        PluginMonitorService,
        IsolationFactory,
        {
          provide: 'PLUGIN_MODULE_OPTIONS',
          useValue: { autoDiscover: true, scanExternal: false, ...options },
        },
      ],
      controllers: [PluginController],
      exports: [
        PluginConfigService,
        PluginRegistry,
        PluginManagerService,
        PluginUpdaterService,
        PluginMonitorService,
        IsolationFactory,
      ],
    };
  }
}
