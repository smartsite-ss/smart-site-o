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
import { TdengineAdapterService } from './tdengine-adapter.service';
import { TdengineDatabaseService } from './tdengine-database.service';

/**
 * TDengine 存储模块。
 *
 * 装配内容：
 * - TdengineAdapterService：实现 StorageAdapter（引擎类型 tdengine）；
 * - TdengineDatabaseService：项目 → database + 超级表/子表管理与自动建库建表；
 * - 向 StorageEngineRouterService 注册 tdengine 引擎，供 STORAGE_DEFAULT_ENGINE /
 *   项目级覆盖按项目路由。
 */
@Module({
  imports: [StorageModule, EventBusModule],
  providers: [TdengineAdapterService, TdengineDatabaseService],
  exports: [TdengineAdapterService, TdengineDatabaseService],
})
export class TdengineStorageModule implements OnModuleInit {
  constructor(
    private readonly storageEngineRouter: StorageEngineRouterService,
    private readonly tdengineAdapter: TdengineAdapterService,
  ) {}

  onModuleInit(): void {
    this.storageEngineRouter.registerAdapter(STORAGE_ENGINE_TYPES.TDENGINE, this.tdengineAdapter);
  }
}
