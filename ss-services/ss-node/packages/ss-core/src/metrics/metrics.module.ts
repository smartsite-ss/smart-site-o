// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { MetricsCollectorService } from './metrics-collector.service';
import { MetricsController } from './metrics.controller';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [EventBusModule],
  controllers: [MetricsController],
  providers: [MetricsCollectorService],
  exports: [MetricsCollectorService],
})
export class MetricsModule {}
