// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import type { OfflineMessage } from './offline-message.service';

/**
 * OfflineMessage Redis 持久化辅助类
 *
 * 作为 OfflineMessageService 的可选持久化层，在服务重启后恢复离线消息。
 * 设计原则：
 * - 所有方法 async + try-catch，失败时 warn 日志，不阻断主流程
 * - Redis 不可用时降级为纯内存模式
 * - key 格式：ws:offline:msg:{userId} → JSON string of OfflineMessage[]
 */
@Injectable()
export class OfflineMessageRedisPersistence implements OnModuleDestroy {
  private readonly logger = new Logger(OfflineMessageRedisPersistence.name);
  private readonly keyPrefix = 'ws:offline:msg:';

  constructor(private readonly client: Redis) {}

  private key(userId: string): string {
    return `${this.keyPrefix}${userId}`;
  }

  /**
   * 从 Redis 加载所有用户的离线消息（服务启动时调用）
   * @returns userId → OfflineMessage[] 的 Map
   */
  async loadAllMessages(): Promise<Map<string, OfflineMessage[]>> {
    const result = new Map<string, OfflineMessage[]>();
    try {
      const keys = await this.scanKeys(`${this.keyPrefix}*`);
      if (keys.length === 0) {
        return result;
      }

      const values = await this.client.mget(...keys);
      for (let i = 0; i < keys.length; i++) {
        const userId = keys[i].substring(this.keyPrefix.length);
        const raw = values[i];
        if (raw) {
          try {
            const messages = JSON.parse(raw) as OfflineMessage[];
            if (Array.isArray(messages) && messages.length > 0) {
              result.set(userId, messages);
            }
          } catch {
            this.logger.warn(`Failed to parse messages for user ${userId}, skipping`);
          }
        }
      }

      this.logger.log(`Loaded ${result.size} users' offline messages from Redis`);
    } catch (err) {
      this.logger.warn(`Failed to load offline messages from Redis: ${(err as Error).message}`);
    }
    return result;
  }

  /**
   * 持久化用户的离线消息列表
   */
  async persistMessages(userId: string, messages: OfflineMessage[]): Promise<void> {
    try {
      if (messages.length === 0) {
        await this.client.del(this.key(userId));
        return;
      }
      await this.client.set(this.key(userId), JSON.stringify(messages));
    } catch (err) {
      this.logger.warn(`Failed to persist messages for user ${userId}: ${(err as Error).message}`);
    }
  }

  /**
   * 删除用户的离线消息
   */
  async deleteMessages(userId: string): Promise<void> {
    try {
      await this.client.del(this.key(userId));
    } catch (err) {
      this.logger.warn(`Failed to delete messages for user ${userId}: ${(err as Error).message}`);
    }
  }

  /**
   * 删除所有离线消息（谨慎使用）
   */
  async deleteAllMessages(): Promise<void> {
    try {
      const keys = await this.scanKeys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log(`Deleted ${keys.length} users' offline messages from Redis`);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete all offline messages: ${(err as Error).message}`);
    }
  }

  /**
   * 使用 SCAN 扫描匹配的 key（避免 KEYS 阻塞）
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const result: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      result.push(...batch);
    } while (cursor !== '0');
    return result;
  }

  onModuleDestroy(): void {
    this.client.quit().catch(() => {
      // 忽略关闭错误
    });
  }
}
