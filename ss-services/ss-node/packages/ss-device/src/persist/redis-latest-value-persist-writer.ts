// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type Redis from 'ioredis';
import { IPersistWriter, DataPoint, PersistWriterRegistry } from '@ss-node/ss-collector-sdk';
import { REDIS_CLIENT_DEFAULT, LatestValueRedisService } from '@ss-node/ss-core';

/**
 * Redis 最新值 PersistWriter 实现
 *
 * 数据流：
 *   Pipeline DataPoint → write()/writeBatch() → Redis HSET 覆盖写入
 *
 * Key 设计（v3 — 体现 项目→设备→变量 层级）：
 *   - 设备 Key：ss:latest:{projectId}:{deviceCode}  （Hash，field={tagId}，value=JSON 全语义）
 *   - tree 索引：ss:latest:tree:{projectId}         （Hash，field={deviceId}，value=JSON{deviceCode,deviceName}）
 *   - 值：JSON { projectId, deviceCode, deviceId, tagId, value, quality, timestamp }
 *   - TTL：7 天滚动过期（每次写入刷新），项目删除时主动 DEL
 *
 * v2 → v3 变更：
 *   - 设备 Key 用 deviceCode（人类可读编码）替代 deviceId（UUID），一眼可看出 `项目→设备` 层级
 *   - value JSON 增加 projectId / deviceCode / tagId，单条值即可自描述层级位置
 *   - tree 索引（Hash）替换 flat Set（ss:latest:index:{projectId}），
 *     HGETALL tree 一次获取项目下所有设备的 {deviceCode, deviceName}，同时支持 deviceId→deviceCode 反查
 *
 * 设计理由（v1 → v2 保留）：
 *   - 解决热 Key 问题：大项目（1000+ 标签）写入分散到 N 个设备 Key，避免单 Key 争用
 *   - Redis Cluster 友好：不同设备的 Key 自动分布到不同 Slot，支持水平扩展
 *   - 设备级数据生命周期管理：删除设备一条 DEL，设备离线可独立 TTL
 *
 * 覆盖语义：HSET 相同 key+field 自动覆盖旧值，天然保证"最新一条"。
 *
 * 容错策略（三层防护）：
 * 1. Redis 客户端不可用时（REDIS_HOST 未配置），所有方法为 no-op
 * 2. 内置熔断器：连续失败 N 次后 OPEN，期间 write 直接 no-op，避免雪崩
 * 3. write/writeBatch 错误不向上抛出（保持 Pipeline 主流程不中断），
 *    但通过 lastError 字段暴露最近错误，PersistStep 可查询并写入 ctx.errors
 */
@Injectable()
export class RedisLatestValuePersistWriter implements IPersistWriter, OnModuleInit {
  readonly name = 'RedisLatestValue';
  private readonly logger = new Logger(RedisLatestValuePersistWriter.name);

  /** latest value key 的 TTL（7 天滚动刷新，防止项目/设备/标签删除后残留） */
  private static readonly KEY_TTL_SECONDS = 7 * 24 * 3600;

  /**
   * 简易熔断器配置
   * - 连续失败 >= FAILURE_THRESHOLD 进入 OPEN
   * - OPEN 持续 RESET_TIMEOUT_MS 后进入 HALF_OPEN，放行 1 次试探
   * - 试探成功 → CLOSED；试探失败 → OPEN
   */
  private static readonly FAILURE_THRESHOLD = 5;
  private static readonly RESET_TIMEOUT_MS = 30_000;

  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private consecutiveFailures = 0;
  private circuitOpenedAt = 0;

  /** 最近一次错误（供 PersistStep 查询并透传到 ctx.errors） */
  private lastError: { message: string; timestamp: number } | null = null;

  /** 每个 key（设备 Key 或 索引 Key）最近一次刷新 TTL 的时间（避免每次写入都 EXPIRE） */
  private readonly ttlRefreshedAt = new Map<string, number>();
  /** TTL 刷新节流间隔（同一 key 5 分钟内只刷新一次） */
  private static readonly TTL_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT_DEFAULT)
    private readonly redisClient: Redis | null,
    private readonly writerRegistry: PersistWriterRegistry,
    private readonly latestValueRedisService: LatestValueRedisService,
  ) {}

  onModuleInit(): void {
    this.writerRegistry.register(this);
    this.logger.log(
      `RedisLatestValuePersistWriter registered (redis=${this.redisClient ? 'enabled' : 'disabled'})`,
    );
  }

  /** 暴露给 PersistStep 查询，用于把 Redis 错误透传到 ctx.errors */
  getLastError(): { message: string; timestamp: number } | null {
    return this.lastError;
  }

  /** 暴露熔断器状态供监控/诊断使用 */
  getCircuitState(): typeof this.circuitState {
    return this.circuitState;
  }

  private get enabled(): boolean {
    return this.redisClient !== null;
  }

  /** 判断熔断器是否允许放行（HALF_OPEN 仅放行一次试探） */
  private allowRequest(): boolean {
    if (this.circuitState === 'CLOSED') return true;
    if (this.circuitState === 'OPEN') {
      const elapsed = Date.now() - this.circuitOpenedAt;
      if (elapsed >= RedisLatestValuePersistWriter.RESET_TIMEOUT_MS) {
        this.circuitState = 'HALF_OPEN';
        this.logger.warn('Redis circuit → HALF_OPEN (probing)');
        return true;
      }
      return false;
    }
    // HALF_OPEN：已放行一次试探，等待结果，拒绝其他请求
    return false;
  }

  private recordSuccess(): void {
    if (this.circuitState !== 'CLOSED') {
      this.logger.log('Redis circuit → CLOSED (recovered)');
    }
    this.circuitState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastError = null;
  }

  private recordFailure(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unknown';
    this.consecutiveFailures += 1;
    this.lastError = { message, timestamp: Date.now() };

    if (this.circuitState === 'HALF_OPEN') {
      this.openCircuit();
      return;
    }
    if (
      this.circuitState === 'CLOSED' &&
      this.consecutiveFailures >= RedisLatestValuePersistWriter.FAILURE_THRESHOLD
    ) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.circuitState = 'OPEN';
    this.circuitOpenedAt = Date.now();
    this.logger.error(
      `Redis circuit → OPEN (failures=${this.consecutiveFailures}, reset in ${RedisLatestValuePersistWriter.RESET_TIMEOUT_MS}ms)`,
    );
  }

  /**
   * 刷新指定 key 的 TTL（节流：同一 key 5 分钟内只刷新一次）
   * 在 HSET / SADD 成功后异步执行，不阻塞主流程
   *
   * 容错：EXPIRE 失败（含 client 不支持 expire 方法）不影响主写入，
   * 同步异常和异步 rejection 都被捕获。
   */
  private refreshTTL(rawKey: string): void {
    const now = Date.now();
    const last = this.ttlRefreshedAt.get(rawKey) ?? 0;
    if (now - last < RedisLatestValuePersistWriter.TTL_REFRESH_INTERVAL_MS) return;

    const client = this.redisClient;
    if (!client || typeof client.expire !== 'function') return;

    this.ttlRefreshedAt.set(rawKey, now);
    try {
      const result = client.expire(rawKey, RedisLatestValuePersistWriter.KEY_TTL_SECONDS);
      // 兼容 Promise 和非 Promise 返回值（expire 返回 Promise<number>）
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).catch((err: Error) => {
          // TTL 刷新失败不影响主写入，仅 debug 日志
          this.logger.debug(`Redis EXPIRE failed for ${rawKey}: ${err.message}`);
        });
      }
    } catch (syncErr) {
      // 同步异常也捕获，避免影响 write() 主流程
      this.logger.debug(
        `Redis EXPIRE sync error for ${rawKey}: ${syncErr instanceof Error ? syncErr.message : 'Unknown'}`,
      );
    }
  }

  async write(point: DataPoint): Promise<void> {
    if (!this.enabled) return;
    if (!this.allowRequest()) return;

    // deviceCode 缺失时回退到 deviceId（兼容旧代码路径/测试 mock）
    const deviceCode = point.deviceCode || point.deviceId;
    const dKey = this.latestValueRedisService.deviceKey(point.projectId, deviceCode);
    const tKey = this.latestValueRedisService.treeKey(point.projectId);

    try {
      await this.redisClient!.hset(
        dKey,
        point.tagId,
        this.latestValueRedisService.serialize(
          point.projectId,
          deviceCode,
          point.deviceId,
          point.tagId,
          point.value,
          point.quality,
          point.timestamp,
        ),
      );
      // 更新 tree 索引：deviceId → {deviceCode, deviceName}（fire-and-forget，非关键路径）
      this.redisClient!.hset(
        tKey,
        point.deviceId,
        JSON.stringify({ deviceCode, deviceName: point.deviceName ?? '' }),
      ).catch(() => {});
      this.recordSuccess();
      this.refreshTTL(dKey);
      this.refreshTTL(tKey);
    } catch (error) {
      this.recordFailure(error);
      this.logger.error(
        `Redis latest value write failed (tag=${point.tagId}, device=${point.deviceId}): ${this.lastError!.message}`,
      );
      // 容错策略：错误不向上抛出（保持 Pipeline 主流程不中断），
      // 通过 lastError 字段暴露最近错误，PersistStep 可查询并写入 ctx.errors
    }
  }

  async writeBatch(points: DataPoint[]): Promise<void> {
    if (!this.enabled) return;
    if (points.length === 0) return;
    if (!this.allowRequest()) return;

    // 收集需要刷新 TTL 的 key
    const keysToRefresh = new Set<string>();
    // 收集 tree 索引条目：projectId → Map<deviceId, {deviceCode, deviceName}>（去重）
    const treeEntries = new Map<string, Map<string, { deviceCode: string; deviceName: string }>>();

    try {
      const pipeline = this.redisClient!.pipeline();
      for (const point of points) {
        // deviceCode 缺失时回退到 deviceId（兼容旧代码路径/测试 mock）
        const deviceCode = point.deviceCode || point.deviceId;
        const dKey = this.latestValueRedisService.deviceKey(point.projectId, deviceCode);
        pipeline.hset(
          dKey,
          point.tagId,
          this.latestValueRedisService.serialize(
            point.projectId,
            deviceCode,
            point.deviceId,
            point.tagId,
            point.value,
            point.quality,
            point.timestamp,
          ),
        );
        keysToRefresh.add(dKey);

        // 收集 tree 索引条目（按 projectId + deviceId 去重）
        if (!treeEntries.has(point.projectId)) {
          treeEntries.set(point.projectId, new Map());
        }
        treeEntries.get(point.projectId)!.set(point.deviceId, {
          deviceCode,
          deviceName: point.deviceName ?? '',
        });
      }
      // 更新各项目的 tree 索引：HSET treeKey deviceId → {deviceCode, deviceName}
      for (const [projectId, deviceMap] of treeEntries) {
        const tKey = this.latestValueRedisService.treeKey(projectId);
        for (const [deviceId, info] of deviceMap) {
          pipeline.hset(tKey, deviceId, JSON.stringify(info));
        }
        keysToRefresh.add(tKey);
      }
      await pipeline.exec();
      this.recordSuccess();
      for (const key of keysToRefresh) {
        this.refreshTTL(key);
      }
    } catch (error) {
      this.recordFailure(error);
      this.logger.error(
        `Redis batch write failed (${points.length} points): ${this.lastError!.message}`,
      );
      // 批量失败时降级逐条写入（仅在熔断器仍允许时）
      // 逐条写入的错误由 write() 内部 recordFailure 记录，不再 re-throw
      if (this.allowRequest()) {
        for (const point of points) {
          try {
            await this.write(point);
          } catch {
            // 逐条失败已由 write() 内部处理
          }
        }
      }
      // 容错策略：错误不向上抛出（保持 Pipeline 主流程不中断），
      // 通过 lastError 字段暴露最近错误，PersistStep 可查询并写入 ctx.errors
    }
  }

  async flush(): Promise<void> {
    // Redis 每次 write() 即时写入，无需批量刷盘
  }

  /**
   * 监听项目删除前事件，主动清理 Redis 中的 latest value 数据
   *
   * 清理策略（v3 — tree 索引）：
   * 1. 从 tree 索引（Hash `ss:latest:tree:{projectId}`）获取项目下所有设备的 deviceCode
   * 2. 批量删除所有设备 Key（`ss:latest:{projectId}:{deviceCode}`）+ tree 索引 Key
   * 3. 清理 TTL 刷新记录
   *
   * 事件 payload：{ projectId, tenantId?, timestamp }（tenantId 为多租户预留，当前 = projectId）
   */
  @OnEvent('project.beforeDelete')
  async handleProjectBeforeDelete(payload: {
    projectId: string;
    tenantId?: string;
    timestamp: number;
  }): Promise<void> {
    if (!this.enabled) return;
    const projectId = payload?.projectId || payload?.tenantId;
    if (!projectId) return;

    const tKey = this.latestValueRedisService.treeKey(projectId);
    try {
      // 1. 读取 tree 索引：deviceId → {deviceCode, deviceName}
      const tree = await this.latestValueRedisService.readTree(projectId);

      // 2. 构造所有需要删除的 key（设备 Key + tree 索引 Key）
      const keysToDelete: string[] = [];
      for (const { deviceCode } of tree.values()) {
        keysToDelete.push(this.latestValueRedisService.deviceKey(projectId, deviceCode));
      }
      keysToDelete.push(tKey); // tree 索引 Key 本身

      // 3. 批量删除
      if (keysToDelete.length > 0) {
        await this.redisClient!.del(...keysToDelete);
      }

      // 4. 清理 TTL 刷新记录
      for (const key of keysToDelete) {
        this.ttlRefreshedAt.delete(key);
      }

      this.logger.log(
        `Redis latest values cleared for project ${projectId} (${tree.size} device keys + tree index)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown';
      this.logger.error(`Failed to clear Redis latest values for project ${projectId}: ${message}`);
    }
  }
}
