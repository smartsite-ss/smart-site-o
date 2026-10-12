// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { HealthCheckerService } from './health-checker.service';
import { EventBusModule } from '../event-bus/event-bus.module';
import { DiskUsageChecker, MemoryUsageChecker, CpuUsageChecker } from './system-resource-checker';

@Module({
  imports: [EventBusModule],
  providers: [HealthCheckerService, DiskUsageChecker, MemoryUsageChecker, CpuUsageChecker],
  exports: [HealthCheckerService],
})
export class HealthModule {
  constructor(
    healthCheckerService: HealthCheckerService,
    diskChecker: DiskUsageChecker,
    memoryChecker: MemoryUsageChecker,
    cpuChecker: CpuUsageChecker,
  ) {
    // 在构造函数中注册检查器（早于 onModuleInit），确保定时检查启动前已注册
    healthCheckerService.registerChecker(diskChecker);
    healthCheckerService.registerChecker(memoryChecker);
    healthCheckerService.registerChecker(cpuChecker);
  }
}
