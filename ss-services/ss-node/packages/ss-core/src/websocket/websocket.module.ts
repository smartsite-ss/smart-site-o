// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type Redis from 'ioredis';
import { ScadaWebSocketGateway } from './websocket.gateway';
import { DataPushBridge } from './data-push-bridge';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventBusModule } from '../event-bus/event-bus.module';
import { ConnectionLimiterService } from './connection-limiter.service';
import { RoomService } from './room/room.service';
import { ConnectionMonitorService } from './connection-monitor.service';
import { OfflineMessageService } from './offline-message.service';
import { OfflineMessageCacheService } from './offline-message-cache.service';
import { OfflineMessageRedisPersistence } from './offline-message-redis.persistence';
import { WebSocketMetricsService } from './websocket-metrics.service';
import { WebSocketMetricsController } from './websocket-metrics.controller';
import { WebSocketAdminController } from './websocket-admin.controller';
import { REDIS_CLIENT_OFFLINE } from '../redis/redis.constants';

/**
 * WebSocket 模块
 *
 * Redis 客户端改造（P1-1）：
 * 原先在模块内 useFactory 创建 OFFLINE_REDIS_CLIENT，现改用全局 RedisModule
 * 提供的 REDIS_CLIENT_OFFLINE token（db=1）。RedisModule 在 AppModule 中注册为
 * @Global，无需在此 imports。
 *
 * 离线消息 Redis 持久化是可选的：REDIS_HOST 未配置时 client 为 null，
 * OfflineMessageRedisPersistence 也为 null，OfflineMessageService 内部需容忍此情况。
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'ss-data-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    EventBusModule,
  ],
  providers: [
    ScadaWebSocketGateway,
    DataPushBridge,
    ConnectionLimiterService,
    RoomService,
    ConnectionMonitorService,
    OfflineMessageService,
    OfflineMessageCacheService,
    WebSocketMetricsService,
    // 离线消息持久化：依赖全局 REDIS_CLIENT_OFFLINE（由 RedisModule 提供）
    {
      provide: OfflineMessageRedisPersistence,
      useFactory: (client: Redis | null): OfflineMessageRedisPersistence | null => {
        if (!client) return null;
        return new OfflineMessageRedisPersistence(client);
      },
      inject: [REDIS_CLIENT_OFFLINE],
    },
  ],
  controllers: [WebSocketMetricsController, WebSocketAdminController],
  exports: [
    ScadaWebSocketGateway,
    DataPushBridge,
    ConnectionLimiterService,
    RoomService,
    ConnectionMonitorService,
    OfflineMessageService,
    OfflineMessageCacheService,
    WebSocketMetricsService,
    OfflineMessageRedisPersistence,
  ],
})
export class WebSocketModule {}
