// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Global, Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { ProjectDatabaseService } from './project-database.service';

/**
 * 项目数据库管理全局模块
 *
 * 提供 ProjectDatabaseService 作为全局单例，
 * 所有需要访问项目级 system.db 的模块都通过 DI 注入此服务。
 *
 * 注意：此模块依赖 EventBusModule 用于监听 project.beforeDelete 事件。
 */
@Global()
@Module({
  imports: [EventBusModule],
  providers: [ProjectDatabaseService],
  exports: [ProjectDatabaseService],
})
export class DatabaseModule {}
