// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { EventBusService, EventLogService } from '@ss-node/ss-core';

/**
 * InfluxDB Bucket 管理服务
 *
 * 职责：
 * - 按项目自动创建 InfluxDB bucket（bucket 命名：{INFLUXDB_BUCKET}_{projectId}）
 * - Bucket 存在性检查（幂等，重复创建不报错）
 * - 写入路由：projectId → bucket 名映射
 * - 兜底：bucket 创建失败/InfluxDB 不可用时退回默认 bucket
 * - CODE-04: 定时健康检查，使 influxAvailable 在 InfluxDB 恢复后自动转 true
 */
@Injectable()
export class InfluxBucketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InfluxBucketService.name);

  /** 已知已存在的 bucket 缓存，避免重复 HTTP 检查 */
  private readonly knownBuckets = new Set<string>();

  /** 创建中的 bucket（防并发重复创建） */
  private readonly pendingCreations = new Map<string, Promise<boolean>>();

  /** InfluxDB 是否可用（首次请求失败后标记为 false，避免持续无效请求） */
  private influxAvailable = true;

  /** CODE-04: 健康检查定时器，InfluxDB 恢复后自动 markAvailable */
  private healthCheckTimer: NodeJS.Timeout | null = null;
  /** CODE-04: 健康检查间隔（ms） */
  private readonly healthCheckIntervalMs = 60_000;
  /** CODE-04: 健康检查单次 fetch 超时（ms） */
  private readonly healthCheckTimeoutMs = 5000;

  /** CODE-05: 普通 API fetch 超时（ms） */
  private readonly fetchTimeoutMs = 5000;

  constructor(
    private readonly eventBus: EventBusService,
    @Optional() private readonly eventLogService?: EventLogService,
  ) {}

  onModuleInit(): void {
    // wrap helper：通过 EventLogService.wrapSubscriber 自动追踪处理结果和业务效果
    const wrap = <T extends any[]>(
      eventType: string,
      handler: (...args: T) => Promise<Record<string, any> | void>,
    ): ((...args: T) => Promise<void>) => {
      const traced = this.eventLogService
        ? this.eventLogService.wrapSubscriber(eventType, 'InfluxBucketService', handler)
        : async (...args: T) => { await handler(...args); };
      return async (...args: T) => {
        try { await traced(...args); }
        catch (err) { this.logger.error(`Handler for ${eventType} failed: ${(err as Error).message}`); }
      };
    };

    // 监听项目创建事件，自动创建对应 InfluxDB bucket
    this.eventBus.on('project.created', wrap('project.created', async (payload: { projectId: string; tenantId?: string }) => {
      const projectId = payload.projectId;
      if (projectId) {
        this.logger.log(`project.created event received, ensuring bucket for: ${projectId}`);
        const created = await this.ensureBucket(projectId);
        return { bucketCreated: created, bucketName: this.getBucketName(projectId) };
      }
    }));
    this.logger.log('InfluxBucketService initialized — listening for project.created');

    // CODE-04: 启动定时健康检查，使 influxAvailable 可在 InfluxDB 恢复后自动转 true
    // （原实现 markAvailable() 从未被自动调用，导致一次失败后永久退回默认 bucket）
    this.startHealthCheck();
  }

  onModuleDestroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * CODE-04: 定时探活 — InfluxDB /health 200 即恢复 influxAvailable，
   * 使后续 bucket 创建请求不再被跳过。仅在不可用时发起 fetch，避免增加正常状态下的额外负载。
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.influxAvailable) return; // 已可用，无需探活
      try {
        const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
        const response = await fetch(`${url}/health`, {
          signal: AbortSignal.timeout(this.healthCheckTimeoutMs),
        });
        if (response.ok) {
          this.logger.warn(
            'InfluxDB health check passed — restoring influxAvailable, bucket creation will resume',
          );
          this.influxAvailable = true;
        }
      } catch {
        // 仍不可达，保持 influxAvailable=false，等待下一轮探活
      }
    }, this.healthCheckIntervalMs);
    // 健康检查不应阻止进程正常退出
    if (this.healthCheckTimer.unref) {
      this.healthCheckTimer.unref();
    }
  }

  // ──────────── 公开接口 ────────────

  /**
   * 获取项目对应的 InfluxDB bucket 名
   * 首次调用时自动确保 bucket 存在（懒创建）
   */
  async getBucket(projectId: string): Promise<string> {
    const bucket = this.getBucketName(projectId);

    // 兜底：如果 InfluxDB 已知不可用，直接返回默认 bucket
    if (!this.influxAvailable) {
      return this.getDefaultBucket();
    }

    // 懒创建：不在 knownBuckets 中的，尝试创建
    if (!this.knownBuckets.has(bucket)) {
      const created = await this.ensureBucket(projectId);
      if (!created) {
        return this.getDefaultBucket();
      }
    }

    return bucket;
  }

  /** 获取默认 bucket 名（兜底） */
  getDefaultBucket(): string {
    return process.env.INFLUXDB_BUCKET || 'ss_node_data';
  }

  /** 重置可用性标记（用于健康检查恢复后重试） */
  markAvailable(): void {
    this.influxAvailable = true;
  }

  // ──────────── 内部方法 ────────────

  private getBucketName(projectId: string): string {
    const base = process.env.INFLUXDB_BUCKET || 'ss_node_data';
    // 替换 projectId 中的特殊字符（bucket 名仅允许 [a-zA-Z0-9_-]）
    const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${base}_${safeId}`;
  }

  /**
   * 确保指定项目的 bucket 存在（幂等）
   * @returns true=bucket 就绪，false=创建失败（调用方应退回默认 bucket）
   */
  async ensureBucket(projectId: string): Promise<boolean> {
    const bucket = this.getBucketName(projectId);

    // 已有缓存 → 直接返回
    if (this.knownBuckets.has(bucket)) {
      return true;
    }

    // 正在创建中 → 等待结果
    const pending = this.pendingCreations.get(bucket);
    if (pending) {
      return pending;
    }

    const promise = this.createBucketIfNotExists(bucket);
    this.pendingCreations.set(bucket, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingCreations.delete(bucket);
    }
  }

  private async createBucketIfNotExists(bucket: string): Promise<boolean> {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN || '';
    const org = process.env.INFLUXDB_ORG || 'ss-org';

    if (!token) {
      this.influxAvailable = false;
      this.logger.warn(`InfluxDB TOKEN not configured, skipping bucket creation for "${bucket}"`);
      return false;
    }

    try {
      // 步骤 1：检查 bucket 是否已存在
      const exists = await this.bucketExists(url, token, org, bucket);
      if (exists) {
        this.knownBuckets.add(bucket);
        this.logger.debug(`Bucket "${bucket}" already exists`);
        return true;
      }

      // 步骤 2：创建 bucket
      const orgId = await this.getOrgId(url, token, org);
      if (!orgId) {
        this.influxAvailable = false;
        return false;
      }

      // CODE-05: fetch 加 5s 超时，避免半挂时无限等待
      const response = await fetch(`${url}/api/v2/buckets`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgID: orgId,
          name: bucket,
          retentionRules: [], // 无限保留，由应用层管理数据生命周期
        }),
        signal: AbortSignal.timeout(this.fetchTimeoutMs),
      });

      if (response.ok || response.status === 201) {
        this.knownBuckets.add(bucket);
        this.logger.log(`Bucket "${bucket}" created successfully`);
        return true;
      }

      // 409 Conflict：并发创建导致的重复，视为成功
      if (response.status === 409) {
        this.knownBuckets.add(bucket);
        this.logger.log(`Bucket "${bucket}" already exists (409)`);
        return true;
      }

      const errorBody = await response.text().catch(() => 'unknown');
      this.logger.error(
        `Failed to create bucket "${bucket}": HTTP ${response.status} ${errorBody}`,
      );
      this.influxAvailable = false;
      return false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`InfluxDB bucket creation error for "${bucket}": ${errorMsg}`);
      this.influxAvailable = false;
      return false;
    }
  }

  private async bucketExists(
    url: string,
    token: string,
    org: string,
    bucketName: string,
  ): Promise<boolean> {
    try {
      // CODE-05: fetch 加 5s 超时
      const response = await fetch(
        `${url}/api/v2/buckets?org=${encodeURIComponent(org)}&name=${encodeURIComponent(bucketName)}`,
        {
          headers: { Authorization: `Token ${token}` },
          signal: AbortSignal.timeout(this.fetchTimeoutMs),
        },
      );
      if (!response.ok) return false;
      const data = await response.json();
      return (data.buckets?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  private async getOrgId(url: string, token: string, org: string): Promise<string | null> {
    try {
      // CODE-05: fetch 加 5s 超时
      const response = await fetch(`${url}/api/v2/orgs?org=${encodeURIComponent(org)}`, {
        headers: { Authorization: `Token ${token}` },
        signal: AbortSignal.timeout(this.fetchTimeoutMs),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.orgs?.[0]?.id ?? null;
    } catch {
      return null;
    }
  }
}
