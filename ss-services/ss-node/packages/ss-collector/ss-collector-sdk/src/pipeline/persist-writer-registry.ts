// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { IPersistWriter } from './interfaces';

/**
 * 持久化 Writer 注册表（跨模块通信桥梁）
 *
 * 问题背景：NestJS 模块封装性导致 PersistStep（PipelineModule/ss-core）
 * 无法通过 @Inject(PERSIST_WRITER) 获取 DeviceModule（ss-device）中注册的
 * RedisLatestValuePersistWriter。
 *
 * 注册表模式让 Writer 在 onModuleInit 时主动注册自己，
 * PersistStep 从注册表获取所有已注册的 Writer，解耦模块依赖。
 */
@Injectable()
export class PersistWriterRegistry {
  private readonly logger = new Logger(PersistWriterRegistry.name);
  private writers: IPersistWriter[] = [];

  register(writer: IPersistWriter): void {
    if (!this.writers.includes(writer)) {
      this.writers.push(writer);
      this.logger.log(`Writer registered: ${writer.name} (total: ${this.writers.length})`);
    }
  }

  unregister(writer: IPersistWriter): void {
    const idx = this.writers.indexOf(writer);
    if (idx >= 0) {
      this.writers.splice(idx, 1);
      this.logger.log(`Writer unregistered: ${writer.name}`);
    }
  }

  getWriters(): IPersistWriter[] {
    return [...this.writers];
  }
}
