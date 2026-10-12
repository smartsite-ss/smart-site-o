// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { EventBusService, EventLogService } from '@ss-node/ss-core';
import { STORAGE_ENGINE_TYPES, StorageEngineConfigService } from '@ss-node/ss-storage';

/** v3 数据库名长度上限（v3 默认 64 字符） */
const DATABASE_NAME_MAX_LENGTH = 64;
/** 单次 API fetch 超时（ms） */
const FETCH_TIMEOUT_MS = 5000;

/**
 * InfluxDB 3 Core 项目 database 管理服务（对齐 InfluxBucketService）。
 *
 * P0 实测（InfluxDB 3 Core 3.11.2）对齐：
 * - 建库：POST /api/v3/configure/database，body {"db", "retention_period"?}；
 *   重复创建返回 409（视为已存在=成功）；SQL CREATE DATABASE 不被支持
 *   （"DDL not supported: CreateCatalog"）；
 * - 隔离策略（用户决策）：按项目分库，库名 ss-node-data-{projectId}
 *   （UUID 含连字符合法，48 字符 ≤ 64 上限）；
 *   v3 Core 存在 5 个 database 上限（实测 422
 *   "Adding a new database would exceed limit of 5 databases"），
 *   属已知约束：项目数量由运维侧控制，超限时建库失败并明确报错；
 * - 保留期建库时设定（v3 特性：建库后不可修改），经 INFLUXDB3_RETENTION_PERIOD 配置；
 * - 健康探活：/health 需要 Bearer 鉴权（无 token 401），
 *   失败后置 false，恢复后置 true；
 * - project.created 事件：项目引擎为 influxdb3 时立即建库（幂等）。
 */
@Injectable()
export class Influxdb3DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Influxdb3DatabaseService.name);

  /** 已就绪的 database 名集合（避免重复调用建库端点） */
  private readonly readyDatabases = new Set<string>();

  /** InfluxDB 3 是否可用（失败后置 false，健康检查恢复后置 true） */
  private influxdb3Available = true;

  /** 健康检查定时器 */
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private readonly healthCheckIntervalMs = 60_000;
  private readonly healthCheckTimeoutMs = 5000;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly storageEngineConfig: StorageEngineConfigService,
    @Optional() private readonly eventLogService?: EventLogService,
  ) {}

  onModuleInit(): void {
    const wrap = <T extends any[]>(
      eventType: string,
      handler: (...args: T) => Promise<Record<string, any> | void>,
    ): ((...args: T) => Promise<void>) => {
      const traced = this.eventLogService
        ? this.eventLogService.wrapSubscriber(eventType, 'Influxdb3DatabaseService', handler)
        : async (...args: T) => {
            await handler(...args);
          };
      return async (...args: T) => {
        try {
          await traced(...args);
        } catch (err) {
          this.logger.error(`Handler for ${eventType} failed: ${(err as Error).message}`);
        }
      };
    };

    // 项目创建 → 立即建库（幂等；超 5 库上限时记录错误日志，不阻断事件链）
    this.eventBus.on(
      'project.created',
      wrap('project.created', async (payload: { projectId: string; tenantId?: string }) => {
        const projectId = payload.projectId;
        if (!projectId) return;
        const projectEngine = this.storageEngineConfig.getProjectEngine(projectId);
        if (projectEngine !== STORAGE_ENGINE_TYPES.INFLUXDB3) {
          return;
        }
        const databaseName = this.getDatabaseNameForProject(projectId);
        const created = await this.createDatabaseIfNotExists(databaseName);
        return { database: databaseName, created };
      }),
    );
    this.logger.log(
      'Influxdb3DatabaseService initialized — per-project database mode ' +
        '(naming: ss-node-data-{projectId}, known limit: 5 databases on v3 Core)',
    );

    this.startHealthCheck();
  }

  onModuleDestroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // ──────────── 公开接口 ────────────

  /**
   * 确保项目 database 存在（懒创建，幂等）。
   * 供适配器写入/读取路径调用；失败时仍返回库名（write_lp 会自动建库兜底）。
   */
  async ensureDatabase(projectId: string): Promise<string> {
    const databaseName = this.getDatabaseNameForProject(projectId);

    if (this.readyDatabases.has(databaseName) || !this.influxdb3Available) {
      return databaseName;
    }

    const created = await this.createDatabaseIfNotExists(databaseName);
    if (created) {
      this.readyDatabases.add(databaseName);
    }
    return databaseName;
  }

  /** 项目 → database 名（纯命名计算，不发请求） */
  getDatabaseNameForProject(projectId: string): string {
    return this.normalizeDatabaseName(`ss-node-data-${projectId}`);
  }

  /** 兜底 database 名（无 projectId 的查询/写入路径） */
  getDefaultDatabase(): string {
    const base = process.env.INFLUXDB3_DATABASE || 'ss-node-data';
    return this.normalizeDatabaseName(base);
  }

  /**
   * v3 库名归一化（§5.4 sanitize 边界，单测固化）：
   * ① 下划线 → 连字符（v3 库名约定）；
   * ② 其余非法字符（非 [a-zA-Z0-9-]）剔除；
   * ③ 连续连字符折叠为单个；
   * ④ 首尾连字符去除；
   * ⑤ 长度截断至 64 字符。
   */
  normalizeDatabaseName(name: string): string {
    return name
      .replace(/_/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, DATABASE_NAME_MAX_LENGTH);
  }

  /** 重置可用性标记（健康检查恢复后重试） */
  markAvailable(): void {
    this.influxdb3Available = true;
  }

  // ──────────── 内部方法 ────────────

  /**
   * 创建 database（幂等：409=已存在 视为成功）
   * @returns true=database 就绪，false=创建失败
   */
  private async createDatabaseIfNotExists(databaseName: string): Promise<boolean> {
    const serverUrl = process.env.INFLUXDB3_URL || 'http://localhost:8181';
    const authToken = process.env.INFLUXDB3_TOKEN || '';
    // 保留期建库时设定（v3 特性：建库后不可修改），如 365d；留空则用服务端默认
    const retentionPeriod = process.env.INFLUXDB3_RETENTION_PERIOD || '';

    if (!authToken) {
      this.influxdb3Available = false;
      this.logger.warn(
        `InfluxDB 3 TOKEN not configured, skipping database creation for "${databaseName}"`,
      );
      return false;
    }

    try {
      // P0 实测：建库端点为 POST /api/v3/configure/database，
      // body {"db", "retention_period"?}；重复创建返回 409
      const body: Record<string, string> = { db: databaseName };
      if (retentionPeriod) {
        body.retention_period = retentionPeriod;
      }

      const response = await fetch(`${serverUrl}/api/v3/configure/database`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (response.ok || response.status === 409) {
        // 409 = 已存在，幂等成功
        this.logger.log(
          `InfluxDB 3 database "${databaseName}" ensured (HTTP ${response.status}, ` +
            `retention: ${retentionPeriod || 'server-default'}, 注意：v3 保留期建库后不可修改)`,
        );
        return true;
      }

      const errorBody = await response.text().catch(() => 'unknown');
      // 422 = 超出 v3 Core 5 库上限（用户决策：保留按项目分库，项目数由运维控制）
      if (response.status === 422 && /limit of \d+ databases/i.test(errorBody)) {
        this.logger.error(
          `Failed to create InfluxDB 3 database "${databaseName}": exceeds v3 Core database limit ` +
            `(5 by default). Clean up unused databases or reduce project count. HTTP 422: ${errorBody}`,
        );
      } else {
        this.logger.error(
          `Failed to create InfluxDB 3 database "${databaseName}": HTTP ${response.status} ${errorBody}`,
        );
      }
      this.influxdb3Available = false;
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `InfluxDB 3 database creation error for "${databaseName}": ${errorMessage}`,
      );
      this.influxdb3Available = false;
      return false;
    }
  }

  /** 定时探活 — /health 带 Bearer 鉴权，200 即恢复 influxdb3Available */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.influxdb3Available) return;
      try {
        const serverUrl = process.env.INFLUXDB3_URL || 'http://localhost:8181';
        const authToken = process.env.INFLUXDB3_TOKEN || '';
        const response = await fetch(`${serverUrl}/health`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: AbortSignal.timeout(this.healthCheckTimeoutMs),
        });
        if (response.ok) {
          this.logger.warn(
            'InfluxDB 3 health check passed — restoring availability, database creation will resume',
          );
          this.influxdb3Available = true;
        }
      } catch {
        // 仍不可达，保持 false，等待下一轮探活
      }
    }, this.healthCheckIntervalMs);
    if (this.healthCheckTimer.unref) {
      this.healthCheckTimer.unref();
    }
  }
}
