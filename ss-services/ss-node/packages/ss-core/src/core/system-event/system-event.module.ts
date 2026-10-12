// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemEvent } from '../entities/system-event.entity';
import { SystemEventService } from './system-event.service';

/**
 * 全局系统事件模块
 *
 * 注册 SystemEvent 实体和 SystemEventService，供全局使用。
 * 实体存储在全局 ss-node.db 中，不依赖 projectId。
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemEvent])],
  providers: [SystemEventService],
  exports: [SystemEventService],
})
export class SystemEventModule {}
