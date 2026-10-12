// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';
import { OfflineMessageRedisPersistence } from './offline-message-redis.persistence';

export interface OfflineMessage {
  id: string;
  type: 'alarm_trigger' | 'alarm_acknowledged' | 'alarm_cleared' | 'device_status_change';
  userId: string;
  projectId: string;
  data: Record<string, any>;
  createdAt: number;
  confirmed: boolean;
  confirmedAt?: number;
}

export interface OfflineMessageStats {
  totalMessages: number;
  unconfirmedMessages: number;
  expiredMessages: number;
  activeUsers: number;
}

export interface OfflineMessageConfig {
  /** 消息过期时间（毫秒），默认 7 天 */
  expireAfterMs: number;
  /** 自动清理间隔（毫秒），默认 1 小时 */
  cleanupIntervalMs: number;
  /** 最大缓存消息数，默认 10000 */
  maxCacheSize: number;
}

export const DEFAULT_OFFLINE_MESSAGE_CONFIG: OfflineMessageConfig = {
  expireAfterMs: 7 * 24 * 60 * 60 * 1000,
  cleanupIntervalMs: 60 * 60 * 1000,
  maxCacheSize: 10000,
};

@Injectable()
export class OfflineMessageService implements OnModuleInit {
  private readonly logger = new Logger(OfflineMessageService.name);

  /** 离线消息存储：userId -> OfflineMessage[] */
  private readonly messageStore = new Map<string, OfflineMessage[]>();

  private config: OfflineMessageConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private messageIdCounter = 0;

  constructor(
    @Inject(I18nService)
    private readonly i18n: I18nService,
    @Optional()
    private readonly redisPersistence: OfflineMessageRedisPersistence | null = null,
  ) {
    this.config = { ...DEFAULT_OFFLINE_MESSAGE_CONFIG };
  }

  async onModuleInit(): Promise<void> {
    // 从 Redis 恢复离线消息到内存
    if (this.redisPersistence) {
      const restored = await this.redisPersistence.loadAllMessages();
      if (restored.size > 0) {
        restored.forEach((messages, userId) => {
          this.messageStore.set(userId, messages);
        });
        this.logger.log(`Restored offline messages for ${restored.size} users from Redis`);
      }
    }

    this.logger.log(
      `OfflineMessageService initialized (expire:${this.config.expireAfterMs / 86400000}d, max:${this.config.maxCacheSize}, redis:${this.redisPersistence ? 'enabled' : 'disabled'})`,
    );

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredMessages();
    }, this.config.cleanupIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  updateConfig(partial: Partial<OfflineMessageConfig>): void {
    this.config = { ...this.config, ...partial };
    this.logger.log(`OfflineMessage config updated: ${JSON.stringify(this.config)}`);
  }

  getConfig(): OfflineMessageConfig {
    return { ...this.config };
  }

  /**
   * Fire-and-forget 持久化到 Redis（不阻塞主流程）
   */
  private persistToRedis(userId: string): void {
    if (this.redisPersistence) {
      const messages = this.messageStore.get(userId) || [];
      this.redisPersistence.persistMessages(userId, messages).catch(() => {
        // 错误已在 persistence 类中记录
      });
    }
  }

  /**
   * 缓存离线消息
   */
  cacheMessage(
    userId: string,
    type: OfflineMessage['type'],
    projectId: string,
    data: Record<string, any>,
  ): OfflineMessage {
    const message: OfflineMessage = {
      id: this.generateMessageId(),
      type,
      userId,
      projectId,
      data,
      createdAt: Date.now(),
      confirmed: false,
    };

    if (!this.messageStore.has(userId)) {
      this.messageStore.set(userId, []);
    }

    const messages = this.messageStore.get(userId)!;
    messages.push(message);

    // 限制缓存大小
    if (messages.length > this.config.maxCacheSize) {
      const removed = messages.splice(0, messages.length - this.config.maxCacheSize);
      this.logger.warn(
        `Message cache overflow for user ${userId}, removed ${removed.length} oldest messages`,
      );
    }

    this.logger.debug(`Offline message cached: ${message.id} for user ${userId}`);
    this.persistToRedis(userId);
    return message;
  }

  /**
   * 获取用户未读消息
   */
  getUnreadMessages(userId: string): OfflineMessage[] {
    const messages = this.messageStore.get(userId);
    if (!messages) return [];
    return messages.filter((m) => !m.confirmed);
  }

  /**
   * 获取用户所有消息
   */
  getAllMessages(userId: string): OfflineMessage[] {
    return this.messageStore.get(userId) || [];
  }

  /**
   * 重连补发：推送未读消息并返回消息列表
   */
  replayMessages(userId: string): OfflineMessage[] {
    const unreadMessages = this.getUnreadMessages(userId);
    if (unreadMessages.length > 0) {
      this.logger.log(
        this.i18n.tSync('websocket.offline.message_replayed', {
          count: String(unreadMessages.length),
        }),
      );
    }
    return unreadMessages;
  }

  /**
   * 确认消息已读
   */
  confirmMessage(messageId: string): boolean {
    for (const [userId, messages] of this.messageStore) {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.confirmed = true;
        message.confirmedAt = Date.now();
        this.persistToRedis(userId);
        return true;
      }
    }
    return false;
  }

  /**
   * 批量确认消息已读
   */
  confirmMessages(messageIds: string[]): number {
    let count = 0;
    for (const id of messageIds) {
      if (this.confirmMessage(id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 确认用户所有消息已读
   */
  confirmAllMessages(userId: string): number {
    const messages = this.messageStore.get(userId);
    if (!messages) return 0;

    let count = 0;
    for (const message of messages) {
      if (!message.confirmed) {
        message.confirmed = true;
        message.confirmedAt = Date.now();
        count++;
      }
    }
    this.persistToRedis(userId);
    return count;
  }

  /**
   * 清理过期消息
   */
  cleanupExpiredMessages(): number {
    const now = Date.now();
    const expireBefore = now - this.config.expireAfterMs;
    let totalCleaned = 0;
    const affectedUsers: string[] = [];

    this.messageStore.forEach((messages, userId) => {
      const before = messages.length;
      const remaining = messages.filter((m) => m.createdAt >= expireBefore);
      const cleaned = before - remaining.length;

      if (cleaned > 0) {
        this.messageStore.set(userId, remaining);
        totalCleaned += cleaned;
        affectedUsers.push(userId);
      }

      // 清理空用户条目
      if (remaining.length === 0) {
        this.messageStore.delete(userId);
      }
    });

    if (totalCleaned > 0) {
      this.logger.log(`Cleaned ${totalCleaned} expired offline messages`);
    }

    // 持久化清理后的状态到 Redis
    for (const userId of affectedUsers) {
      this.persistToRedis(userId);
    }

    return totalCleaned;
  }

  /**
   * 删除用户所有消息
   */
  deleteUserMessages(userId: string): number {
    const messages = this.messageStore.get(userId);
    if (!messages) return 0;

    const count = messages.length;
    this.messageStore.delete(userId);

    // 从 Redis 删除
    if (this.redisPersistence) {
      this.redisPersistence.deleteMessages(userId).catch(() => {});
    }

    return count;
  }

  /**
   * 删除单条消息
   */
  deleteMessage(messageId: string): boolean {
    for (const [userId, messages] of this.messageStore) {
      const index = messages.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        messages.splice(index, 1);
        if (messages.length === 0) {
          this.messageStore.delete(userId);
        }
        this.persistToRedis(userId);
        return true;
      }
    }
    return false;
  }

  /**
   * 获取消息统计
   */
  getStats(): OfflineMessageStats {
    let totalMessages = 0;
    let unconfirmedMessages = 0;
    let expiredMessages = 0;
    const now = Date.now();
    const expireBefore = now - this.config.expireAfterMs;

    this.messageStore.forEach((messages) => {
      totalMessages += messages.length;
      for (const msg of messages) {
        if (!msg.confirmed) {
          unconfirmedMessages++;
        }
        if (msg.createdAt < expireBefore) {
          expiredMessages++;
        }
      }
    });

    return {
      totalMessages,
      unconfirmedMessages,
      expiredMessages,
      activeUsers: this.messageStore.size,
    };
  }

  private generateMessageId(): string {
    this.messageIdCounter++;
    return `offline-${Date.now()}-${this.messageIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
