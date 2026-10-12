// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

/** 离线缓存消息格式 */
export interface CachedMessage {
  event: string;
  data: unknown;
  timestamp: number;
}

/** 缓存统计信息 */
export interface CacheStats {
  totalClients: number;
  totalMessages: number;
}

/**
 * WebSocket 离线消息缓存服务
 *
 * 使用内存 Map + 环形缓冲区，为每个客户端缓存离线消息。
 * 客户端重连后自动补发待发消息，超过 5 分钟的消息自动清除。
 *
 * - 每个客户端最多缓存 100 条消息，超出时丢弃最旧的消息
 * - 消息过期机制：超过 5 分钟的消息自动清除
 * - 缓存为内存级别，适合单实例部署
 */
@Injectable()
export class OfflineMessageCacheService implements OnModuleInit, OnModuleDestroy {
  /** 每个客户端最多缓存的消息数 */
  private static readonly MAX_MESSAGES_PER_CLIENT = 100;

  /** 消息过期时间（毫秒），默认 5 分钟 */
  private static readonly MESSAGE_TTL_MS = 5 * 60 * 1000;

  /** 自动清理间隔（毫秒），默认 1 分钟 */
  private static readonly CLEANUP_INTERVAL_MS = 60 * 1000;

  private static readonly LOG_CONTEXT = 'OfflineMessageCacheService';

  /** 消息缓存：clientId -> CachedMessage[] */
  private readonly cache = new Map<string, CachedMessage[]>();

  /** 已注册的客户端集合（曾经连接过的客户端） */
  private readonly registeredClients = new Set<string>();

  /** 过期消息清理定时器 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private readonly logger = new Logger(OfflineMessageCacheService.name);

  onModuleInit(): void {
    this.cleanupTimer = setInterval(
      () => this.cleanupExpiredMessages(),
      OfflineMessageCacheService.CLEANUP_INTERVAL_MS,
    );
    this.logger.log(
      `OfflineMessageCacheService initialized (max:${OfflineMessageCacheService.MAX_MESSAGES_PER_CLIENT}/client, ttl:${OfflineMessageCacheService.MESSAGE_TTL_MS / 1000}s)`,
      OfflineMessageCacheService.LOG_CONTEXT,
    );
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 注册客户端（标记为已知客户端，用于离线消息缓存追踪）
   * @param clientId 客户端标识（通常为已认证用户的 userId）
   */
  registerClient(clientId: string): void {
    this.registeredClients.add(clientId);
  }

  /**
   * 注销客户端（同时清除缓存）
   * @param clientId 客户端标识
   */
  unregisterClient(clientId: string): void {
    this.registeredClients.delete(clientId);
    this.cache.delete(clientId);
  }

  /**
   * 缓存离线消息
   * @param clientId 客户端标识
   * @param event 事件名称
   * @param data 消息数据
   */
  cacheMessage(clientId: string, event: string, data: unknown): void {
    if (!this.cache.has(clientId)) {
      this.cache.set(clientId, []);
    }

    const messages = this.cache.get(clientId)!;
    messages.push({ event, data, timestamp: Date.now() });

    // 环形缓冲区：超出上限时丢弃最旧的消息
    if (messages.length > OfflineMessageCacheService.MAX_MESSAGES_PER_CLIENT) {
      const removedCount = messages.length - OfflineMessageCacheService.MAX_MESSAGES_PER_CLIENT;
      messages.splice(0, removedCount);
      this.logger.warn(
        `Message cache overflow for client ${clientId}, removed ${removedCount} oldest messages`,
        OfflineMessageCacheService.LOG_CONTEXT,
      );
    }

    // 同步注册客户端
    this.registeredClients.add(clientId);

    this.logger.debug(
      `Message cached for client ${clientId}: event=${event}`,
      OfflineMessageCacheService.LOG_CONTEXT,
    );
  }

  /**
   * 获取客户端待补发消息（自动过滤已过期消息）
   * @param clientId 客户端标识
   * @returns 未过期的待补发消息列表
   */
  getPendingMessages(clientId: string): CachedMessage[] {
    const messages = this.cache.get(clientId);
    if (!messages || messages.length === 0) {
      return [];
    }

    const now = Date.now();
    const valid = messages.filter(
      (m) => now - m.timestamp < OfflineMessageCacheService.MESSAGE_TTL_MS,
    );

    // 如果有过期消息被过滤，更新缓存
    if (valid.length < messages.length) {
      this.cache.set(clientId, valid);
    }

    return valid;
  }

  /**
   * 清除客户端所有缓存消息（保留客户端注册状态）
   * @param clientId 客户端标识
   */
  clearMessages(clientId: string): void {
    this.cache.set(clientId, []);
    this.logger.debug(
      `Messages cleared for client ${clientId}`,
      OfflineMessageCacheService.LOG_CONTEXT,
    );
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): CacheStats {
    let totalMessages = 0;
    this.cache.forEach((messages) => {
      totalMessages += messages.length;
    });

    return {
      totalClients: this.cache.size,
      totalMessages,
    };
  }

  /**
   * 获取离线客户端列表（已注册但当前不在线的客户端）
   * @param onlineIds 当前在线的客户端标识集合
   * @returns 离线客户端标识列表
   */
  getOfflineClientIds(onlineIds: Set<string>): string[] {
    const offline: string[] = [];
    this.registeredClients.forEach((clientId) => {
      if (!onlineIds.has(clientId)) {
        offline.push(clientId);
      }
    });
    return offline;
  }

  /**
   * 清理所有客户端的过期消息
   * @returns 清理的消息总数
   */
  private cleanupExpiredMessages(): number {
    const now = Date.now();
    let totalCleaned = 0;

    this.cache.forEach((messages, clientId) => {
      const before = messages.length;
      const remaining = messages.filter(
        (m) => now - m.timestamp < OfflineMessageCacheService.MESSAGE_TTL_MS,
      );

      if (remaining.length < before) {
        this.cache.set(clientId, remaining);
        totalCleaned += before - remaining.length;
      }

      // 如果客户端已注销且没有消息，清理缓存条目
      if (remaining.length === 0 && !this.registeredClients.has(clientId)) {
        this.cache.delete(clientId);
      }
    });

    if (totalCleaned > 0) {
      this.logger.log(
        `Cleaned ${totalCleaned} expired offline cache messages`,
        OfflineMessageCacheService.LOG_CONTEXT,
      );
    }

    return totalCleaned;
  }
}
