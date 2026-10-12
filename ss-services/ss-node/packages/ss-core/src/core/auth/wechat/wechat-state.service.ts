// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT_DEFAULT } from '../../../redis/redis.constants';
import { ScanState } from './wechat-auth.types';

/**
 * 扫码 state 存储服务 — Redis 优先 + 内存 Map 兜底
 *
 * 设计动机：
 * RedisModule 是 @Global 模块，但 REDIS_CLIENT_DEFAULT 可能为 null
 *（参考 redis.client-factory.ts 第 21-25 行，Redis 未启动时返回 null）。
 * 为保证扫码登录在 Redis 不可用时仍能工作，采用双轨制：
 *   - Redis 可用：使用 SET EX 实现自动过期
 *   - Redis 不可用：内存 Map + get 时检查 expiresAt
 *
 * Key 命名遵循项目规范：ss: 前缀 + 业务域 + 用途，参考 ss:latest:{projectId}:{deviceId}
 */
const STATE_KEY_PREFIX = 'ss:wechat:scan:state:';
const STATE_TTL_SECONDS = 300; // 5 分钟（与微信二维码默认有效期一致）

@Injectable()
export class WechatStateService {
  private readonly logger = new Logger(WechatStateService.name);
  /** 内存兜底存储（Redis 不可用时使用） */
  private readonly memoryStore = new Map<string, ScanState>();

  constructor(
    @Optional() @Inject(REDIS_CLIENT_DEFAULT) private readonly redis: Redis | null,
  ) {
    if (this.redis) {
      this.logger.log('扫码 state 存储使用 Redis（持久化 + 自动过期）');
    } else {
      this.logger.warn('扫码 state 存储使用内存 Map（Redis 不可用，重启后 state 丢失）');
    }
  }

  /** 创建扫码会话状态 */
  async create(state: ScanState): Promise<void> {
    if (this.redis) {
      await this.redis.set(
        STATE_KEY_PREFIX + state.state,
        JSON.stringify(state),
        'EX',
        STATE_TTL_SECONDS,
      );
    } else {
      // 内存模式：expiresAt 已由调用方设置，get 时检查
      this.memoryStore.set(state.state, state);
    }
  }

  /** 查询扫码会话状态（过期自动删除并返回 null） */
  async get(state: string): Promise<ScanState | null> {
    if (this.redis) {
      const raw = await this.redis.get(STATE_KEY_PREFIX + state);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as ScanState;
        // Redis TTL 自动过期，但兜底检查 expiresAt（防止时钟漂移）
        if (Date.now() > parsed.expiresAt && parsed.status === 'pending') {
          await this.update(state, { status: 'expired' });
          parsed.status = 'expired';
        }
        return parsed;
      } catch {
        return null;
      }
    }

    const entry = this.memoryStore.get(state);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt && entry.status === 'pending') {
      entry.status = 'expired';
      this.memoryStore.set(state, entry);
    }
    return entry;
  }

  /** 更新扫码会话状态（保留原 TTL） */
  async update(state: string, patch: Partial<ScanState>): Promise<ScanState | null> {
    const current = await this.get(state);
    if (!current) return null;
    const updated: ScanState = { ...current, ...patch };

    if (this.redis) {
      // 保留剩余 TTL（重新 SET 时按剩余时间设置）
      const remainingTtl = await this.redis.ttl(STATE_KEY_PREFIX + state);
      const ttl = remainingTtl > 0 ? remainingTtl : STATE_TTL_SECONDS;
      await this.redis.set(
        STATE_KEY_PREFIX + state,
        JSON.stringify(updated),
        'EX',
        ttl,
      );
    } else {
      this.memoryStore.set(state, updated);
    }
    return updated;
  }

  /** 删除扫码会话状态（confirmed 后一次性消费） */
  async delete(state: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(STATE_KEY_PREFIX + state);
    } else {
      this.memoryStore.delete(state);
    }
  }
}
