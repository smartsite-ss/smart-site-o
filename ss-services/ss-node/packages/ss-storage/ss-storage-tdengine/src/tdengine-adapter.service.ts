// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import {
  DataPoint,
  QueryOptions,
  AdapterCapabilities,
  STORAGE_ENGINE_TYPES,
  InfluxBaseAdapter,
  EngineReadRequest,
  serializeLineProtocol,
} from '@ss-node/ss-storage';
import { TdengineDatabaseService } from './tdengine-database.service';
import { TdengineSqlQueryBuilder } from './query/tdengine-sql-query.builder';
import { TdengineJsonParser } from './parse/tdengine-json.parser';

// CODE-05: 单次 fetch 超时（ms），避免半挂时无限等待阻塞 event loop
const FETCH_TIMEOUT_MS = 5000;

/**
 * TDengine 适配器（引擎类型 tdengine）。
 *
 * - 写入：复用 serializeLineProtocol → taosAdapter InfluxDB Line Protocol 兼容端点
 *   POST /influxdb/v1/write?db={database}&precision=ns（Basic Auth）；
 *   写入前经 TdengineDatabaseService 幂等确保子表存在（CREATE TABLE ... USING ... TAGS）；
 * - 读取：TdengineSqlQueryBuilder → POST /rest/sql/{database}（INTERVAL/FILL 方言），
 *   结果经 TdengineJsonParser 归一化；
 * - 删除：按子表范围 `DELETE FROM t_{tagId} WHERE ts < ...`（capabilities.delete = true，
 *   超级表级删除受限，须规避）；
 * - 多项目隔离：database = {TDENGINE_DATABASE}_{projectId}，超级表 tag_values + 子表 t_{tagId}。
 */
@Injectable()
export class TdengineAdapterService
  extends InfluxBaseAdapter
  implements OnModuleInit, OnModuleDestroy
{
  readonly name = 'TDengine';
  readonly engineType = STORAGE_ENGINE_TYPES.TDENGINE;
  readonly capabilities: AdapterCapabilities = {
    delete: true, // 支持按子表范围删除（超级表级删除受限）
    interpolation: true, // FILL(PREV/LINEAR/NULL) 原生支持
    aggregation: true, // INTERVAL + AVG/MAX/MIN/SUM/COUNT 原生
  };
  protected readonly logger = new Logger(TdengineAdapterService.name);
  protected readonly readErrorLabel = 'TDengine query';

  private readonly queryBuilder = new TdengineSqlQueryBuilder();
  private readonly responseParser = new TdengineJsonParser();

  private tdengineUrl: string;
  private tdengineUser: string;
  private tdenginePassword: string;

  constructor(@Optional() private readonly databaseService?: TdengineDatabaseService) {
    super();
    this.tdengineUrl = process.env.TDENGINE_URL || 'http://localhost:6041';
    this.tdengineUser = process.env.TDENGINE_USER || 'root';
    this.tdenginePassword = process.env.TDENGINE_PASSWORD || 'taosdata';
  }

  onModuleInit(): void {
    this.logger.log(
      `TdengineAdapterService initialized (engine: ${this.engineType}, url: ${this.tdengineUrl}, ` +
        `per-project databases: ${!!this.databaseService})`,
    );
  }

  onModuleDestroy(): void {
    void this.close();
  }

  // ──────────── 写入钩子：taosAdapter /influxdb/v1/write ────────────

  protected async sendBatch(points: DataPoint[]): Promise<void> {
    // 强模式约束：写入前幂等确保子表存在（value DOUBLE，非数值已在序列化层分流 value_text）
    if (this.databaseService) {
      await this.databaseService.ensureSubtables(points);
    }

    // 按项目隔离单元（database）分组发送
    const pointsByDatabase = new Map<string, DataPoint[]>();
    for (const point of points) {
      const databaseName = this.resolveDatabaseName(point.projectId);
      const grouped = pointsByDatabase.get(databaseName);
      if (grouped) {
        grouped.push(point);
      } else {
        pointsByDatabase.set(databaseName, [point]);
      }
    }

    for (const [databaseName, groupedPoints] of pointsByDatabase) {
      await this.writeLines(databaseName, serializeLineProtocol(groupedPoints));
    }
  }

  private async writeLines(databaseName: string, lines: string): Promise<void> {
    const authorizationToken = Buffer.from(
      `${this.tdengineUser}:${this.tdenginePassword}`,
    ).toString('base64');

    const response = await fetch(
      `${this.tdengineUrl}/influxdb/v1/write?db=${encodeURIComponent(databaseName)}&precision=ns`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorizationToken}`,
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: lines,
        // CODE-05: fetch 加 5s 超时
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (!response.ok && response.status !== 204) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`TDengine HTTP ${response.status}: ${errorBody}`);
    }
  }

  // ──────────── 读取钩子：POST /rest/sql/{database} ────────────

  protected async buildReadRequest(options: QueryOptions): Promise<EngineReadRequest> {
    // 多项目隔离：优先按 options.projectId 路由，未指定走默认 database
    const databaseName =
      options.projectId && this.databaseService
        ? (await this.databaseService.ensureDatabase(options.projectId))
          ? this.databaseService.getDatabaseName(options.projectId)
          : this.getDefaultDatabaseName()
        : this.getDefaultDatabaseName();

    const sqlQuery = this.queryBuilder.buildQuery(options, { name: databaseName });
    const authorizationToken = Buffer.from(
      `${this.tdengineUser}:${this.tdenginePassword}`,
    ).toString('base64');

    return {
      url: `${this.tdengineUrl}/rest/sql/${encodeURIComponent(databaseName)}`,
      headers: {
        Authorization: `Basic ${authorizationToken}`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: sqlQuery,
    };
  }

  protected parseReadResponse(rawText: string): DataPoint[] {
    return this.responseParser.parse(rawText);
  }

  // ──────────── delete（按子表范围） ────────────

  async delete(options: { tagIds?: string[]; before?: Date }): Promise<number> {
    const { tagIds, before } = options;

    // 超级表级删除受限：必须指定 tagIds 逐子表删除
    if (!tagIds || tagIds.length === 0) {
      throw new Error(
        'TDengine delete requires tagIds (super-table level delete is restricted; delete per sub-table instead)',
      );
    }

    const timeBoundary = before ? before.toISOString() : new Date().toISOString();
    let deletedRows = 0;
    let countAvailable = true;

    // 按子表逐个执行 DELETE FROM t_{tagId} WHERE ts < boundary（走默认 database）
    for (const tagId of tagIds) {
      const subtableName = this.databaseService
        ? this.databaseService.getSubtableName(tagId)
        : `t_${tagId.replace(/[^a-zA-Z0-9_]/g, '')}`;
      const databaseName = this.getDefaultDatabaseName();

      try {
        const affectedRows = await this.executeDelete(databaseName, subtableName, timeBoundary);
        if (affectedRows < 0) {
          countAvailable = false;
        } else {
          deletedRows += affectedRows;
        }
      } catch (error) {
        this.logger.error(
          `TDengine delete error for sub-table ${subtableName}: ${(error as Error).message}`,
        );
        throw error;
      }
    }

    return countAvailable ? deletedRows : -1;
  }

  private async executeDelete(
    databaseName: string,
    subtableName: string,
    timeBoundary: string,
  ): Promise<number> {
    const deleteStatement = `DELETE FROM \`${databaseName}\`.${subtableName} WHERE ts < '${timeBoundary}'`;
    if (this.databaseService) {
      return this.databaseService.executeSql(databaseName, deleteStatement);
    }

    // database 服务缺失时直接走 REST
    const authorizationToken = Buffer.from(
      `${this.tdengineUser}:${this.tdenginePassword}`,
    ).toString('base64');
    const response = await fetch(
      `${this.tdengineUrl}/rest/sql/${encodeURIComponent(databaseName)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorizationToken}`,
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: deleteStatement,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`TDengine HTTP ${response.status}: ${errorBody}`);
    }
    return -1;
  }

  // ──────────── health ────────────

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }> {
    const authorizationToken = Buffer.from(
      `${this.tdengineUser}:${this.tdenginePassword}`,
    ).toString('base64');

    try {
      const response = await fetch(`${this.tdengineUrl}/rest/sql`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorizationToken}`,
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: 'SELECT SERVER_STATUS',
        // CODE-05: fetch 加 5s 超时
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (response.ok) {
        const body = await response.json().catch(() => ({}));
        const serverHealthy = (body as { status?: string }).status === 'succ';
        return {
          status: serverHealthy ? 'healthy' : 'degraded',
          details: { ...body, pendingBuffer: this.pendingBufferCount },
        };
      }

      return {
        status: 'degraded',
        details: { httpStatus: response.status, pendingBuffer: this.pendingBufferCount },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message, pendingBuffer: this.pendingBufferCount },
      };
    }
  }

  // ──────────── 内部方法 ────────────

  /** 项目 → database 名映射（database 服务缺失时退回默认库名） */
  private resolveDatabaseName(projectId: string): string {
    return this.databaseService ? this.databaseService.getDatabaseName(projectId) : 'ss_node_data';
  }

  private getDefaultDatabaseName(): string {
    return process.env.TDENGINE_DATABASE || 'ss_node_data';
  }
}
