// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT_DEFAULT } from './redis.constants';

/**
 * 最新值条目（反序列化后的语义化结构）
 *
 * 由 LatestValueRedisService.deserialize 返回，供 DeviceDataService /
 * AlarmReconciliationService 等读取方使用。携带完整层级信息
 * （projectId → deviceCode → deviceId → tagId），消除对 Redis value
 * 原始 JSON 字段命名（旧 {v,d,q,t} / P0 {value,deviceId,quality,timestamp}）的耦合。
 */
export interface LatestValueEntry {
  projectId: string;
  deviceCode: string;
  deviceId: string;
  tagId: string;
  value: number | boolean | string | null;
  quality: string;
  timestamp: Date;
}

/**
 * LatestValueRedisService — 实时最新值的 Redis 读写封装（共享服务）
 *
 * ## Key 层级结构（v3 — 体现 项目→设备→变量 层级）
 *
 * ```
 * ss:latest:{projectId}:{deviceCode}    Hash  field=tagId, value=JSON(全语义)
 * ss:latest:tree:{projectId}            Hash  field=deviceId, value=JSON{deviceCode,deviceName}
 * ```
 *
 * - 设备 Key 用 **deviceCode**（人类可读编码）而非 deviceId（UUID），
 *   一眼可看出 `项目 → 设备` 层级（如 `ss:latest:proj-1:pump-station-01`）。
 * - Hash field 为 **tagId**，代表 `设备 → 变量` 层级。
 * - value JSON 包含 **projectId / deviceCode / deviceId / tagId** 全路径，
 *   单条值即可定位其在层级中的位置（自描述）。
 * - tree 索引替换旧的 flat Set（`ss:latest:index:{projectId}`），
 *   HGETALL tree 一次获取项目下所有设备的 {deviceCode, deviceName}，
 *   同时提供 deviceId→deviceCode 反查（供告警对账等持 deviceId 的读取方使用）。
 *
 * ## 不包含的职责（由各使用方自行实现）
 * - 熔断器、TTL 节流、index 清理等容错逻辑（由 RedisLatestValuePersistWriter 负责）
 * - 采集 Pipeline 的高频批量写入（由 RedisLatestValuePersistWriter.writeBatch 负责）
 *
 * ## 容错
 * - Redis 客户端不可用时（REDIS_HOST 未配置），所有方法为 no-op / 返回空结果
 * - deserialize 对损坏或无法识别的 JSON 返回 null，不抛异常
 *
 * ## 向后兼容
 * - deserialize 兼容三种 value 格式：
 *   1. v3（本版本）：{ projectId, deviceCode, deviceId, tagId, value, quality, timestamp }
 *   2. P0：{ value, deviceId, quality, timestamp }
 *   3. 旧：{ v, d, q, t }
 *   7 天 TTL 自然过期后全部为新格式。
 * - 读取时用 key/field 上下文回填 projectId/deviceCode/tagId，
 *   即使存量旧格式 value 也能返回完整 LatestValueEntry。
 */
@Injectable()
export class LatestValueRedisService {
  private readonly logger = new Logger(LatestValueRedisService.name);

  private readonly keyPrefix = 'ss:latest:';
  private readonly treePrefix = 'ss:latest:tree:';

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT_DEFAULT)
    private readonly redisClient: Redis | null,
  ) {}

  /** Redis 客户端是否可用（供使用方判断是否降级） */
  get enabled(): boolean {
    return this.redisClient !== null;
  }

  // ──────────── key 构造 ────────────

  /**
   * 设备 Key：ss:latest:{projectId}:{deviceCode}（Hash，field=tagId，value=JSON）
   *
   * 使用 deviceCode（人类可读编码）而非 deviceId（UUID），
   * 体现 `项目 → 设备` 层级，一眼可识别归属设备。
   */
  deviceKey(projectId: string, deviceCode: string): string {
    return `${this.keyPrefix}${projectId}:${deviceCode}`;
  }

  /**
   * tree 索引 Key：ss:latest:tree:{projectId}（Hash，field=deviceId，value=JSON{deviceCode,deviceName}）
   *
   * 替换旧的 flat Set（ss:latest:index:{projectId}）。
   * - HGETALL tree → 一次获取项目下所有设备的 {deviceCode, deviceName}（层级全景）
   * - HGET tree {deviceId} → 反查 deviceCode（供持 deviceId 的读取方使用）
   */
  treeKey(projectId: string): string {
    return `${this.treePrefix}${projectId}`;
  }

  // ──────────── 序列化 ────────────

  /**
   * 序列化为 Redis value（全语义字段，携带完整层级路径）
   *
   * 写入格式：{ projectId, deviceCode, deviceId, tagId, value, quality, timestamp(ISO) }
   * 单条 value 即可自描述其在 `项目→设备→变量` 层级中的位置。
   */
  serialize(
    projectId: string,
    deviceCode: string,
    deviceId: string,
    tagId: string,
    value: number | boolean | string | null,
    quality: string,
    timestamp: Date | string,
  ): string {
    return JSON.stringify({
      projectId,
      deviceCode,
      deviceId,
      tagId,
      value,
      quality,
      timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
    });
  }

  /**
   * 反序列化 Redis value（兼容三种格式）
   *
   * - v3（本版本）：{ projectId, deviceCode, deviceId, tagId, value, quality, timestamp }
   * - P0：{ value, deviceId, quality, timestamp }
   * - 旧：{ v, d, q, t }
   *
   * 注意：旧格式 value 可能缺少 projectId/deviceCode/tagId，
   * 调用方（readTag/readDevice 等）会用 key/field 上下文回填这些字段。
   */
  deserialize(raw: string | null | undefined): Partial<LatestValueEntry> | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      // v3 格式优先（全语义字段 + 层级路径）
      if (parsed.value !== undefined) {
        return {
          projectId: parsed.projectId ?? '',
          deviceCode: parsed.deviceCode ?? '',
          deviceId: parsed.deviceId ?? '',
          tagId: parsed.tagId ?? '',
          value: parsed.value,
          quality: parsed.quality ?? 'unknown',
          timestamp: new Date(parsed.timestamp),
        };
      }

      // 兼容旧格式（缩写字段 {v,d,q,t}）
      if (parsed.v !== undefined) {
        return {
          projectId: '',
          deviceCode: '',
          deviceId: parsed.d ?? '',
          tagId: '',
          value: parsed.v,
          quality: parsed.q ?? 'unknown',
          timestamp: new Date(parsed.t),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  // ──────────── 写入（手动写入路径）────────────

  /**
   * 写入单个标签最新值（供 DeviceDataService.updateLatestValue 使用）
   *
   * 操作：
   * 1. HSET 设备 Key（ss:latest:{projectId}:{deviceCode}）field=tagId
   * 2. HSET tree 索引（ss:latest:tree:{projectId}）field=deviceId → {deviceCode, deviceName}
   *
   * 注意：不做熔断/TTL 节流（由采集写入端 RedisLatestValuePersistWriter 负责），
   * 手动写入路径失败直接抛错，由调用方处理。
   */
  async write(params: {
    projectId: string;
    deviceCode: string;
    deviceId: string;
    tagId: string;
    value: number | boolean | string | null;
    quality: string;
    timestamp: Date | string;
    deviceName?: string;
  }): Promise<void> {
    if (!this.redisClient) return;
    const { projectId, deviceCode, deviceId, tagId, value, quality, timestamp, deviceName } =
      params;
    const dKey = this.deviceKey(projectId, deviceCode);
    const tKey = this.treeKey(projectId);
    const serialized = this.serialize(
      projectId,
      deviceCode,
      deviceId,
      tagId,
      value,
      quality,
      timestamp,
    );
    await this.redisClient.hset(dKey, tagId, serialized);
    // 更新 tree 索引：deviceId → {deviceCode, deviceName}（fire-and-forget，失败不影响主写入）
    this.redisClient
      .hset(tKey, deviceId, JSON.stringify({ deviceCode, deviceName: deviceName ?? '' }))
      .catch((err: Error) => {
        this.logger.debug(`tree HSET failed for ${tKey}/${deviceId}: ${err.message}`);
      });
  }

  // ──────────── 读取（按 deviceCode，直接路径）────────────

  /** 读取单个标签最新值（HGET，按 deviceCode 直接定位） */
  async readTag(
    projectId: string,
    deviceCode: string,
    tagId: string,
  ): Promise<LatestValueEntry | null> {
    if (!this.redisClient) return null;
    const raw = await this.redisClient.hget(this.deviceKey(projectId, deviceCode), tagId);
    const entry = this.deserialize(raw);
    if (!entry) return null;
    // 用 key/field 上下文回填可能缺失的层级字段（兼容旧格式 value）
    return {
      projectId: entry.projectId || projectId,
      deviceCode: entry.deviceCode || deviceCode,
      deviceId: entry.deviceId,
      tagId: entry.tagId || tagId,
      value: entry.value!,
      quality: entry.quality!,
      timestamp: entry.timestamp!,
    };
  }

  /** 读取单台设备所有标签最新值（HGETALL，按 deviceCode 直接定位） */
  async readDevice(
    projectId: string,
    deviceCode: string,
  ): Promise<Record<string, LatestValueEntry>> {
    const result: Record<string, LatestValueEntry> = {};
    if (!this.redisClient) return result;
    const rawHash = await this.redisClient.hgetall(this.deviceKey(projectId, deviceCode));
    if (rawHash && typeof rawHash === 'object') {
      for (const [tagId, raw] of Object.entries(rawHash)) {
        const entry = this.deserialize(raw);
        if (entry) {
          result[tagId] = {
            projectId: entry.projectId || projectId,
            deviceCode: entry.deviceCode || deviceCode,
            deviceId: entry.deviceId,
            tagId: entry.tagId || tagId,
            value: entry.value!,
            quality: entry.quality!,
            timestamp: entry.timestamp!,
          };
        }
      }
    }
    return result;
  }

  /**
   * 批量读取多台设备的所有标签最新值（pipeline HGETALL，按 deviceCode 直接定位）
   */
  async readDevices(
    projectId: string,
    deviceCodes: string[],
  ): Promise<Map<string, Record<string, LatestValueEntry>>> {
    const result = new Map<string, Record<string, LatestValueEntry>>();
    if (!this.redisClient || deviceCodes.length === 0) return result;

    const pipeline = this.redisClient.pipeline();
    for (const deviceCode of deviceCodes) {
      pipeline.hgetall(this.deviceKey(projectId, deviceCode));
    }
    const responses = await pipeline.exec();
    if (!responses) return result;

    for (let i = 0; i < deviceCodes.length; i++) {
      const deviceCode = deviceCodes[i];
      const [error, rawHash] = responses[i];
      const entries: Record<string, LatestValueEntry> = {};
      if (error) {
        this.logger.debug(
          `readDevices HGETALL failed for ${projectId}/${deviceCode}: ${error.message}`,
        );
      } else if (rawHash && typeof rawHash === 'object') {
        for (const [tagId, raw] of Object.entries(rawHash as Record<string, string>)) {
          const entry = this.deserialize(raw);
          if (entry) {
            entries[tagId] = {
              projectId: entry.projectId || projectId,
              deviceCode: entry.deviceCode || deviceCode,
              deviceId: entry.deviceId,
              tagId: entry.tagId || tagId,
              value: entry.value!,
              quality: entry.quality!,
              timestamp: entry.timestamp!,
            };
          }
        }
      }
      result.set(deviceCode, entries);
    }
    return result;
  }

  // ──────────── 读取（按 deviceId，经 tree 索引反查 deviceCode）────────────

  /**
   * 读取 tree 索引：deviceId → {deviceCode, deviceName}
   *
   * 供持 deviceId 的读取方（如告警对账）批量反查 deviceCode，
   * 避免逐条 HGET tree 索引。
   */
  async readTree(
    projectId: string,
  ): Promise<Map<string, { deviceCode: string; deviceName: string }>> {
    const result = new Map<string, { deviceCode: string; deviceName: string }>();
    if (!this.redisClient) return result;
    const rawHash = await this.redisClient.hgetall(this.treeKey(projectId));
    if (rawHash && typeof rawHash === 'object') {
      for (const [deviceId, raw] of Object.entries(rawHash)) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.deviceCode) {
            result.set(deviceId, {
              deviceCode: parsed.deviceCode,
              deviceName: parsed.deviceName ?? '',
            });
          }
        } catch {
          // 损坏的 tree 条目跳过
        }
      }
    }
    return result;
  }

  /**
   * 按 deviceId 读取单个标签最新值（经 tree 索引反查 deviceCode）
   *
   * 供告警对账等持 deviceId 的读取方使用。内部先 HGET tree 取 deviceCode，
   * 再 HGET 设备 Key。低频场景（5 分钟对账）可接受 2 次 round-trip。
   */
  async readTagByDeviceId(
    projectId: string,
    deviceId: string,
    tagId: string,
  ): Promise<LatestValueEntry | null> {
    if (!this.redisClient) return null;
    // 1. tree 索引反查 deviceCode
    const rawTreeEntry = await this.redisClient.hget(this.treeKey(projectId), deviceId);
    if (!rawTreeEntry) return null;
    let deviceCode: string;
    try {
      const parsed = JSON.parse(rawTreeEntry);
      deviceCode = parsed?.deviceCode;
    } catch {
      return null;
    }
    if (!deviceCode) return null;
    // 2. 按 deviceCode 读取最新值
    return this.readTag(projectId, deviceCode, tagId);
  }

  // ──────────── 读取（全项目）────────────

  /**
   * 读取项目下所有设备的所有标签最新值
   *
   * 流程：HGETALL tree → 提取 deviceCode 列表 → pipeline HGETALL 批量
   * 返回 Map<deviceId, Record<tagId, LatestValueEntry>>（keyed by deviceId 供调用方匹配设备实体）
   */
  async readAll(projectId: string): Promise<Map<string, Record<string, LatestValueEntry>>> {
    const result = new Map<string, Record<string, LatestValueEntry>>();
    if (!this.redisClient) return result;

    // 1. 读取 tree 索引：deviceId → {deviceCode, deviceName}
    const tree = await this.readTree(projectId);
    if (tree.size === 0) return result;

    // 2. pipeline HGETALL 所有设备 Key（按 deviceCode）
    const deviceIds = [...tree.keys()];
    const deviceCodes = [...tree.values()].map((v) => v.deviceCode);
    const pipeline = this.redisClient.pipeline();
    for (const deviceCode of deviceCodes) {
      pipeline.hgetall(this.deviceKey(projectId, deviceCode));
    }
    const responses = await pipeline.exec();
    if (!responses) return result;

    // 3. 组装结果（keyed by deviceId，供调用方按 device.id 匹配）
    for (let i = 0; i < deviceIds.length; i++) {
      const deviceId = deviceIds[i];
      const deviceCode = deviceCodes[i];
      const [error, rawHash] = responses[i];
      const entries: Record<string, LatestValueEntry> = {};
      if (error) {
        this.logger.debug(
          `readAll HGETALL failed for ${projectId}/${deviceCode}: ${error.message}`,
        );
      } else if (rawHash && typeof rawHash === 'object') {
        for (const [tagId, raw] of Object.entries(rawHash as Record<string, string>)) {
          const entry = this.deserialize(raw);
          if (entry) {
            entries[tagId] = {
              projectId: entry.projectId || projectId,
              deviceCode: entry.deviceCode || deviceCode,
              deviceId: entry.deviceId || deviceId,
              tagId: entry.tagId || tagId,
              value: entry.value!,
              quality: entry.quality!,
              timestamp: entry.timestamp!,
            };
          }
        }
      }
      result.set(deviceId, entries);
    }
    return result;
  }
}
