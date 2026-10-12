// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Redis 客户端注入 Token 常量
 *
 * 设计原则：
 * - 按用途区分 client，便于按 db 索引隔离、独立监控、独立熔断
 * - 所有 token 字符串以 REDIS_CLIENT_ 为前缀，避免与业务 token 冲突
 * - Provider 在 RedisModule 中统一注册，业务模块通过 imports 引入
 */

/**
 * 默认 Redis 客户端（db=0）
 * 用途：Pipeline latest value 写入（ss:latest:{projectId}:{deviceId}）
 */
export const REDIS_CLIENT_DEFAULT = 'REDIS_CLIENT_DEFAULT';

/**
 * 离线消息 Redis 客户端（db=1）
 * 用途：WebSocket 离线消息缓存
 */
export const REDIS_CLIENT_OFFLINE = 'REDIS_CLIENT_OFFLINE';

/**
 * Redis client 用途描述（用于日志诊断）
 */
export const REDIS_CLIENT_PURPOSE = {
  [REDIS_CLIENT_DEFAULT]: 'latest-value',
  [REDIS_CLIENT_OFFLINE]: 'offline-message',
} as const;

export type RedisClientToken = typeof REDIS_CLIENT_DEFAULT | typeof REDIS_CLIENT_OFFLINE;
