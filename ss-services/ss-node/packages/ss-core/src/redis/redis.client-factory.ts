// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT_OFFLINE, REDIS_CLIENT_PURPOSE, RedisClientToken } from './redis.constants';

/**
 * Redis 客户端工厂
 *
 * 统一所有 Redis 客户端的连接配置，确保：
 * - 相同的 retryStrategy / maxRetriesPerRequest / enableReadyCheck
 * - 按 token 决定 db 索引（默认 0，离线消息 1）
 * - REDIS_HOST 未配置时返回 null（业务方应使用 @Optional() 接收）
 *
 * 重试策略：
 * - 最多重试 5 次，间隔 200ms-2000ms 递增
 * - 超过 5 次后断开连接，触发熔断
 */
const logger = new Logger('RedisClientFactory');

export function createRedisClient(config: ConfigService, token: RedisClientToken): Redis | null {
  const host = config.get<string>('REDIS_HOST');
  if (!host) {
    logger.warn(`Redis client "${token}" disabled (REDIS_HOST not configured)`);
    return null;
  }

  const port = config.get<number>('REDIS_PORT') || 6379;
  const password = config.get<string>('REDIS_PASSWORD');
  // 按 token 决定 db 索引：离线消息使用 db=1，其他使用 db=0（可被 REDIS_DB 覆盖）
  const defaultDb = token === REDIS_CLIENT_OFFLINE ? 1 : 0;
  const db = config.get<number>('REDIS_DB') ?? defaultDb;

  const client = new Redis({
    host,
    port,
    password: password || undefined,
    db,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      if (times > 5) {
        logger.error(`Redis client "${token}" exhausted 5 retries — giving up until reconnect`);
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  client.on('error', (err) => {
    logger.error(`Redis client "${token}" error: ${err.message}`);
  });

  logger.log(
    `Redis client "${token}" created (purpose=${REDIS_CLIENT_PURPOSE[token]}, host=${host}:${port}, db=${db})`,
  );

  return client;
}

/**
 * 在模块销毁时优雅关闭 Redis 连接
 */
export async function closeRedisClient(client: Redis | null): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    // 退出失败时强制断开
    client.disconnect();
  }
}
