// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Global, Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { DeviceStateManager } from './device-state-manager.service';

/**
 * 设备状态模块（全局）
 *
 * 提供 DeviceStateManager 作为设备状态的唯一权威数据源。
 * 内置 setInterval 心跳检测（每 5 秒）。
 */
@Global()
@Module({
  imports: [EventBusModule],
  providers: [DeviceStateManager],
  exports: [DeviceStateManager],
})
export class DeviceStateModule {}
