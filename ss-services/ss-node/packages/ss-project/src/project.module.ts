// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventBusModule } from '@ss-node/ss-core';
import { DeviceModule } from '@ss-node/ss-device';
import { AlarmModule } from '@ss-node/ss-alarm';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { PageSaveService } from './page-save.service';
import { PageSaveController } from './page-save.controller';
import { DbMigrationService } from './services/db-migration.service';
import { ProjectRepositoryService } from './services/project-repository.service';
import { DataMigrationService } from './services/data-migration.service';
import { EventCleanupService } from './services/event-cleanup.service';
import { InfluxdbProjectIsolationService } from './services/influxdb-project-isolation.service';
import { CanvasTemplateService } from './canvas-template.service';
import { CanvasTemplateController, ProjectCanvasTemplateController } from './canvas-template.controller';
import { WidgetTemplateService } from './widget-template.service';
import { WidgetTemplateController, ProjectWidgetTemplateController } from './widget-template.controller';

@Module({
  imports: [ConfigModule, EventBusModule, DeviceModule, forwardRef(() => AlarmModule)],
  controllers: [ProjectController, PageSaveController, CanvasTemplateController, ProjectCanvasTemplateController, WidgetTemplateController, ProjectWidgetTemplateController],
  providers: [
    ProjectService,
    PageSaveService,
    CanvasTemplateService,
    WidgetTemplateService,
    DbMigrationService,
    ProjectRepositoryService,
    DataMigrationService,
    EventCleanupService,
    InfluxdbProjectIsolationService,
  ],
  exports: [
    ProjectService,
    PageSaveService,
    CanvasTemplateService,
    DbMigrationService,
    ProjectRepositoryService,
    DataMigrationService,
    EventCleanupService,
    InfluxdbProjectIsolationService,
  ],
})
export class ProjectModule {}
