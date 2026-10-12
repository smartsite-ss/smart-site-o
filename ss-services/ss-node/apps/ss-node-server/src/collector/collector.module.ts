// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, Global } from '@nestjs/common';
import { SchedulerModule } from '@ss-node/ss-collector-sdk';
import { EventBusModule } from '@ss-node/ss-core';
import { DeviceModule } from '@ss-node/ss-device';
import { SystemModule } from '@ss-node/ss-system';
import { DeviceCollectorBootstrap } from './collector-bootstrap.service';
import { DeviceLoadingService } from './device-loading.service';
import { TaskRegistrationService } from './task-registration.service';
import { DevicePersistenceService } from './device-persistence.service';
import { PluginEventAdapter } from './plugin-event-adapter';
import { ACTIVE_DEVICE_TRACKER } from '@ss-node/ss-collector-sdk';

/**
 * 采集启动模块
 *
 * 标记为 @Global() 以使 ACTIVE_DEVICE_TRACKER 令牌对 PluginModule（ss-core）中的
 * PluginManagerService 可见。否则 @Optional() 注入会静默返回 undefined，
 * 导致 getAllDeviceStats() 返回空对象，前端设备统计始终为 0。
 *
 * PluginRegistry 通过 @Global PluginModule（AppModule 中 forRoot）全局注入。
 *
 * 显式导入的模块：
 * - SystemModule    → TemplateLoaderService（设备模板标签加载）
 * - SchedulerModule → EnhancedScheduler
 * - EventBusModule  → EventBusService
 * - DeviceModule    → Device/DataTag/DeviceGroup 实体（向全局 ProjectDatabaseService 注册）
 *
 * 内部服务拆分：
 * - DeviceLoadingService       → 设备加载与状态注册
 * - TaskRegistrationService    → 采集任务注册与管理
 * - DevicePersistenceService   → 设备状态持久化
 * - PluginEventAdapter         → 插件事件处理
 * - DeviceCollectorBootstrap   → 协调层（IActiveDeviceTracker 实现）
 */
@Global()
@Module({
  imports: [SystemModule, SchedulerModule, EventBusModule, DeviceModule],
  providers: [
    DeviceLoadingService,
    TaskRegistrationService,
    DevicePersistenceService,
    PluginEventAdapter,
    DeviceCollectorBootstrap,
    {
      provide: ACTIVE_DEVICE_TRACKER,
      useExisting: DeviceCollectorBootstrap,
    },
  ],
  exports: [DeviceCollectorBootstrap, ACTIVE_DEVICE_TRACKER],
})
export class CollectorModule {}
