// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, OnModuleInit } from '@nestjs/common';
import { EventBusModule } from '@ss-node/ss-core';
import {
  StorageModule,
  StorageEngineRouterService,
  STORAGE_ENGINE_TYPES,
} from '@ss-node/ss-storage';
import { Influxdb3AdapterService } from './influxdb3-adapter.service';
import { Influxdb3DatabaseService } from './influxdb3-database.service';

/**
 * InfluxDB 3 Core 存储模块。
 *
 * 装配内容：
 * - Influxdb3AdapterService：实现 StorageAdapter（引擎类型 influxdb3）；
 * - Influxdb3DatabaseService：项目 → database 映射与自动建库（project.created）；
 * - 向 StorageEngineRouterService 注册 influxdb3 引擎，供 STORAGE_DEFAULT_ENGINE /
 *   项目级覆盖按项目路由。
 */
@Module({
  imports: [StorageModule, EventBusModule],
  providers: [Influxdb3AdapterService, Influxdb3DatabaseService],
  exports: [Influxdb3AdapterService, Influxdb3DatabaseService],
})
export class Influxdb3StorageModule implements OnModuleInit {
  constructor(
    private readonly storageEngineRouter: StorageEngineRouterService,
    private readonly influxdb3Adapter: Influxdb3AdapterService,
  ) {}

  onModuleInit(): void {
    this.storageEngineRouter.registerAdapter(STORAGE_ENGINE_TYPES.INFLUXDB3, this.influxdb3Adapter);
  }
}
