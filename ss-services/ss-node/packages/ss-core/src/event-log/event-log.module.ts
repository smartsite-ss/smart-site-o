// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventLog } from './entities/event-log.entity';
import { EventLogService } from './event-log.service';
import { EventLogController } from './event-log.controller';
import { EventBusModule } from '../event-bus/event-bus.module';

/**
 * 事件日志模块 — 配置变更类事件持久化 + 订阅者追踪
 *
 * 参考 SystemEventModule 模式：
 * - 通过 TypeOrmModule.forFeature([EventLog]) 注册到全局 ss-node.db
 * - 实体存储在全局 ss-node.db 中，不依赖 projectId
 * - 依赖 EventBusModule（在 onModuleInit 时注册 emit 钩子）
 * - 提供 EventLogController REST API（Phase 4）
 *
 * 必须在 EventBusModule 之后加载（app.module.ts 中顺序控制）
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EventLog]), EventBusModule],
  controllers: [EventLogController],
  providers: [EventLogService],
  exports: [EventLogService, TypeOrmModule.forFeature([EventLog])],
})
export class EventLogModule {}
