// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { EventBusService, EventLogService } from '@ss-node/ss-core';
import { DataPoint, STORAGE_ENGINE_TYPES, StorageEngineConfigService } from '@ss-node/ss-storage';

/** 单次 fetch 超时（ms） */
const FETCH_TIMEOUT_MS = 5000;
/** 超级表名（与 Line Protocol measurement 一致） */
const SUPER_TABLE_NAME = 'tag_values';

/** TDengine REST SQL 响应 */
interface TdengineRestResponse {
  status: string;
  code: number;
  message?: string;
  rows?: number;
}

/**
 * TDengine 项目 database + 超级表/子表管理服务。
 *
 * 职责（方案 §7.4.2 强模式建模）：
 * - 项目 → database 映射：`{TDENGINE_DATABASE}_{projectId}`（保持下划线命名）；
 * - 监听 project.created 自动建库建超级表（幂等），仅当项目引擎为 tdengine 时执行；
 * - 超级表建模（强模式）：value DOUBLE（数值主列）、value_text BINARY(4096)（非数值回退列）、
 *   quality INT；TAGS：projectId / tagId / deviceId；
 * - 子表懒创建：按 tagId 维度（t_{tagId}），写入前幂等 CREATE TABLE ... USING ... TAGS；
 * - 保留期 KEEP 建库时设定（与 v3 类似建库后语义固定），经 TDENGINE_KEEP_DAYS 配置。
 */
@Injectable()
export class TdengineDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TdengineDatabaseService.name);

  /** 已知就绪的 database（库+超级表已建）缓存 */
  private readonly knownDatabases = new Set<string>();

  /** 已知已建的子表缓存（key: `{databaseName}:{tagId}`） */
  private readonly knownSubtables = new Set<string>();

  /** 创建中的 database（防并发重复创建） */
  private readonly pendingCreations = new Map<string, Promise<boolean>>();

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
        ? this.eventLogService.wrapSubscriber(eventType, 'TdengineDatabaseService', handler)
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

    // 监听项目创建事件，仅当项目引擎为 tdengine 时自动建库建超级表
    this.eventBus.on(
      'project.created',
      wrap('project.created', async (payload: { projectId: string; tenantId?: string }) => {
        const projectId = payload.projectId;
        if (!projectId) return;
        const projectEngine = this.storageEngineConfig.getProjectEngine(projectId);
        if (projectEngine !== STORAGE_ENGINE_TYPES.TDENGINE) {
          return;
        }
        this.logger.log(
          `project.created event received, ensuring TDengine database for: ${projectId}`,
        );
        const created = await this.ensureDatabase(projectId);
        return {
          databaseCreated: created,
          databaseName: this.getDatabaseName(projectId),
        };
      }),
    );
    this.logger.log(
      'TdengineDatabaseService initialized — listening for project.created (engine=tdengine)',
    );
  }

  onModuleDestroy(): void {
    // 无定时器需要清理（探活由适配器 health() 承担）
  }

  // ──────────── 公开接口 ────────────

  /** 项目 → database 名（纯命名映射，不发请求）：`{base}_{safeProjectId}` */
  getDatabaseName(projectId: string): string {
    const base = process.env.TDENGINE_DATABASE || 'ss_node_data';
    return `${this.normalizeIdentifier(base)}_${this.normalizeIdentifier(projectId)}`;
  }

  /**
   * 确保指定项目的 database + 超级表存在（幂等）
   * @returns true=就绪，false=创建失败（调用方应退回默认 database）
   */
  async ensureDatabase(projectId: string): Promise<boolean> {
    const databaseName = this.getDatabaseName(projectId);

    if (this.knownDatabases.has(databaseName)) {
      return true;
    }

    const pending = this.pendingCreations.get(databaseName);
    if (pending) {
      return pending;
    }

    const promise = this.createDatabaseIfNotExists(databaseName);
    this.pendingCreations.set(databaseName, promise);

    try {
      return await promise;
    } finally {
      this.pendingCreations.delete(databaseName);
    }
  }

  /**
   * 确保一批写入点对应的子表存在（懒创建 + 幂等，写入前调用）。
   * 子表按 tagId 维度：`t_{safeTagId}` USING 超级表 TAGS(projectId, tagId, deviceId)。
   */
  async ensureSubtables(points: DataPoint[]): Promise<void> {
    for (const point of points) {
      const databaseName = this.getDatabaseName(point.projectId);
      const cacheKey = `${databaseName}:${point.tagId}`;
      if (this.knownSubtables.has(cacheKey)) {
        continue;
      }

      const createStatement =
        `CREATE TABLE IF NOT EXISTS \`${databaseName}\`.${this.getSubtableName(point.tagId)} ` +
        `USING \`${databaseName}\`.${SUPER_TABLE_NAME} ` +
        `TAGS (${this.escapeSqlLiteral(point.projectId)}, ${this.escapeSqlLiteral(point.tagId)}, ` +
        `${this.escapeSqlLiteral(point.deviceId)})`;

      await this.executeSql(databaseName, createStatement);
      this.knownSubtables.add(cacheKey);
    }
  }

  /** 子表名：t_{tagId}（tagId 中非 [a-zA-Z0-9_] 字符剔除，如 UUID 连字符） */
  getSubtableName(tagId: string): string {
    return `t_${this.normalizeIdentifier(tagId)}`;
  }

  /**
   * 执行 SQL（POST /rest/sql/{database}，Basic Auth）
   * @returns 响应 rows（受影响行数，DELETE 场景用于计数，查询场景为结果行数）
   */
  async executeSql(databaseName: string, sqlStatement: string): Promise<number> {
    const serverUrl = process.env.TDENGINE_URL || 'http://localhost:6041';
    const userName = process.env.TDENGINE_USER || 'root';
    const password = process.env.TDENGINE_PASSWORD || 'taosdata';
    const authorizationToken = Buffer.from(`${userName}:${password}`).toString('base64');

    const response = await fetch(`${serverUrl}/rest/sql/${encodeURIComponent(databaseName)}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorizationToken}`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: sqlStatement,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`TDengine HTTP ${response.status}: ${errorBody}`);
    }

    const parsed = (await response.json()) as TdengineRestResponse;
    if (parsed.status !== 'succ') {
      throw new Error(
        `TDengine SQL failed (code ${parsed.code}): ${parsed.message || 'unknown error'}`,
      );
    }
    return parsed.rows ?? 0;
  }

  // ──────────── 内部方法 ────────────

  private async createDatabaseIfNotExists(databaseName: string): Promise<boolean> {
    try {
      // 保留期 KEEP 建库时设定（单位：天），留空则用服务端默认
      const keepDays = process.env.TDENGINE_KEEP_DAYS || '';
      const createDatabaseStatement = keepDays
        ? `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` KEEP ${keepDays}`
        : `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``;

      // 强模式超级表：value DOUBLE / value_text BINARY / quality INT；TAGS 为维度列
      const createSuperTableStatement =
        `CREATE STABLE IF NOT EXISTS \`${databaseName}\`.${SUPER_TABLE_NAME} (` +
        `ts TIMESTAMP, value DOUBLE, value_text BINARY(4096), quality INT) ` +
        `TAGS (projectId BINARY(64), tagId BINARY(64), deviceId BINARY(64))`;

      // CREATE DATABASE 属管理语句，REST 上下文库名不限制（用目标库名作为默认上下文）
      await this.executeSql(databaseName, createDatabaseStatement);
      await this.executeSql(databaseName, createSuperTableStatement);

      this.knownDatabases.add(databaseName);
      this.logger.log(
        `TDengine database "${databaseName}" + stable "${SUPER_TABLE_NAME}" ensured ` +
          `(keep: ${keepDays || 'server-default'}，注意：KEEP 建库时设定后语义固定)`,
      );
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`TDengine database creation error for "${databaseName}": ${errorMessage}`);
      return false;
    }
  }

  /** 标识符白名单归一化：仅保留 [a-zA-Z0-9_]（database/子表名安全） */
  private normalizeIdentifier(identifier: string): string {
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /** SQL 字符串字面量转义：单引号翻倍，阻断注入 */
  private escapeSqlLiteral(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }
}
