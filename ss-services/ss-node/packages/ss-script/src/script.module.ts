// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Script, ScriptExecution } from './entities/script.entity';
import { ScriptTemplate } from './entities/script-template.entity';
import { ScriptService } from './script.service';
import { ScriptController } from './script.controller';
import { ScriptEngineService } from './script-engine.service';
import { ScriptApiService } from './script-api.service';
import { ScriptSchedulerService } from './script-scheduler.service';
import { ScriptEventService } from './script-event.service';
import { ScriptValidatorService } from './script-validator.service';
import { ScriptTransformStep, ScriptAlarmConditionStep } from './pipeline/script-transform.step';
import { ExecutionQueueService } from './execution-queue.service';
import { ScriptMetricsService } from './script-metrics.service';
import { ScriptAuditService } from './script-audit.service';
import { ScriptTemplateService } from './script-template.service';
import { EventBusModule, CacheModule } from '@ss-node/ss-core';
import { DatatagModule } from '@ss-node/ss-datatag';
import { AlarmModule } from '@ss-node/ss-alarm';
// DataModule（@ss-node/ss-storage-influx）是 @Global，DataQueryService 全局可注入，无需显式导入

@Module({
  imports: [
    TypeOrmModule.forFeature([Script, ScriptExecution, ScriptTemplate]),
    ScheduleModule.forRoot(),
    EventBusModule,
    CacheModule,
    DatatagModule,
    AlarmModule,
  ],
  controllers: [ScriptController],
  providers: [
    ScriptService,
    ScriptEngineService,
    ScriptApiService,
    ScriptSchedulerService,
    ScriptEventService,
    ScriptValidatorService,
    ScriptTransformStep,
    ScriptAlarmConditionStep,
    ExecutionQueueService,
    ScriptMetricsService,
    ScriptAuditService,
    ScriptTemplateService,
  ],
  exports: [
    ScriptService,
    ScriptEngineService,
    ScriptApiService,
    ScriptSchedulerService,
    ScriptEventService,
    ScriptValidatorService,
    ScriptTransformStep,
    ScriptAlarmConditionStep,
    ExecutionQueueService,
    ScriptMetricsService,
    ScriptAuditService,
    ScriptTemplateService,
  ],
})
export class ScriptModule {}
