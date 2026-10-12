// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { EnhancedScheduler } from './enhanced-scheduler';
import { EventBusModule } from '@ss-node/ss-core';

@Module({
  imports: [EventBusModule],
  providers: [EnhancedScheduler],
  exports: [EnhancedScheduler],
})
export class SchedulerModule {}
