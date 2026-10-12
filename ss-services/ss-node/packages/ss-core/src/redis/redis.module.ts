// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Global, Module, OnModuleDestroy, Inject, Optional, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { closeRedisClient, createRedisClient } from './redis.client-factory';
import { REDIS_CLIENT_DEFAULT, REDIS_CLIENT_OFFLINE, RedisClientToken } from './redis.constants';
import { LatestValueRedisService } from './latest-value-redis.service';

/**
 * Redis 模块 — 全局共享 Redis 客户端 Provider
 *
 * 设计动机：
 * 原先 DeviceModule 与 WebSocketModule 各自通过 useFactory 创建独立的
 * ioredis 实例（PERSIST_REDIS_CLIENT / OFFLINE_REDIS_CLIENT），存在以下问题：
 * 1. 连接数翻倍，资源浪费
 * 2. 配置代码重复（retryStrategy / maxRetriesPerRequest 等）
 * 3. 故障时各 client 独立重试，无法统一观测
 *
 * 改造后：
 * - 所有 Redis client 在 RedisModule 中统一创建，按 token 区分用途
 * - DeviceModule / WebSocketModule 仅需 imports RedisModule 即可使用
 * - 配置一处修改，全局生效
 *
 * 全局模块（@Global）：避免每个业务模块都需 Imports RedisModule。
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT_DEFAULT,
      useFactory: (config: ConfigService): Redis | null =>
        createRedisClient(config, REDIS_CLIENT_DEFAULT as RedisClientToken),
      inject: [ConfigService],
    },
    {
      provide: REDIS_CLIENT_OFFLINE,
      useFactory: (config: ConfigService): Redis | null =>
        createRedisClient(config, REDIS_CLIENT_OFFLINE as RedisClientToken),
      inject: [ConfigService],
    },
    LatestValueRedisService,
  ],
  exports: [REDIS_CLIENT_DEFAULT, REDIS_CLIENT_OFFLINE, LatestValueRedisService],
})
export class RedisModule implements OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(
    @Optional() @Inject(REDIS_CLIENT_DEFAULT) private readonly defaultClient: Redis | null,
    @Optional() @Inject(REDIS_CLIENT_OFFLINE) private readonly offlineClient: Redis | null,
  ) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing all Redis clients on module destroy');
    await Promise.all([closeRedisClient(this.defaultClient), closeRedisClient(this.offlineClient)]);
  }
}
