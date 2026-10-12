// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { StorageEngineConfigService } from './storage-engine-config.service';
import { StorageEngineRouterService } from './storage-engine-router.service';
import { StorageArchiveService } from './storage-archive.service';
import { StorageHealthService } from './storage-health.service';
import { DownsamplingService } from './services/downsampling.service';

/**
 * 存储管理 NestJS 模块。
 *
 * 注册存储引擎路由、归档、健康检查和降采样服务。
 * 降采样服务依赖 InfluxDB 适配器（可选注入），当适配器未注册时优雅降级。
 */
@Module({
  providers: [
    StorageEngineConfigService,
    StorageEngineRouterService,
    StorageArchiveService,
    StorageHealthService,
    DownsamplingService,
  ],
  exports: [
    StorageEngineConfigService,
    StorageEngineRouterService,
    StorageArchiveService,
    StorageHealthService,
    DownsamplingService,
  ],
})
export class StorageModule {}
