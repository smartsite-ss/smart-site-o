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
  NotSupportedError,
  serializeLineProtocol,
} from '@ss-node/ss-storage';
import { Influxdb3DatabaseService } from './influxdb3-database.service';
import { Influxdb3SqlQueryBuilder } from './query/influxdb3-sql-query.builder';
import { Influxdb3JsonParser } from './parse/influxdb3-json.parser';

// CODE-05: 单次 fetch 超时（ms），避免半挂时无限等待阻塞 event loop
const FETCH_TIMEOUT_MS = 5000;

/**
 * InfluxDB 3 Core 适配器（引擎类型 influxdb3）。
 *
 * P0 实测（InfluxDB 3 Core 3.11.2）对齐：
 * - 写入：POST /api/v3/write_lp?db={database}&precision=ns（Bearer 鉴权，
 *   实测 Token 前缀同样兼容）；
 *   v3 不支持字符串 field（value_text/metadata 会整行失败），序列化时开启
 *   skipStringFields，非数值 value 的点整点跳过并计数告警；
 *   按项目分库（用户决策）：写入前按 projectId 分组，逐库确保存在后写入；
 * - 读取：POST /api/v3/query_sql，body 为 {"db","q"}（实测 sql 字段不被识别）；
 *   响应为稀疏对象数组，未写过的列不在行中出现；
 *   查询按 options.projectId 路由到项目 database；
 * - 健康检查：/health 实测需要 Bearer 鉴权（无 token 返回 401），
 *   响应体为纯文本 "OK"（非 JSON）；
 * - 删除：InfluxDB 3 Core 无 compactor，DELETE 实测报 "DML not supported"，
 *   capabilities.delete = false，delete() 直接抛 NotSupportedError，
 *   上层应在调用前查能力并走保留期/重建 database 兜底。
 */
@Injectable()
export class Influxdb3AdapterService
  extends InfluxBaseAdapter
  implements OnModuleInit, OnModuleDestroy
{
  readonly name = 'InfluxDB 3 Core';
  readonly engineType = STORAGE_ENGINE_TYPES.INFLUXDB3;
  readonly capabilities: AdapterCapabilities = {
    delete: false, // v3 Core 无 compactor，不支持删除（P0 实测 DML not supported）
    interpolation: true, // date_bin_gapfill + interpolate/locf 原生支持（P0 实测通过）
    aggregation: true,
  };
  protected readonly logger = new Logger(Influxdb3AdapterService.name);
  protected readonly readErrorLabel = 'InfluxDB 3 query';

  private readonly queryBuilder = new Influxdb3SqlQueryBuilder();
  private readonly responseParser = new Influxdb3JsonParser();

  private influxdb3Url: string;
  private influxdb3Token: string;

  /** 跳过的非数值数据点数（v3 不支持字符串 field，累计用于健康详情与告警） */
  private skippedTextPointCount = 0;

  constructor(@Optional() private readonly databaseService?: Influxdb3DatabaseService) {
    super();
    this.influxdb3Url = process.env.INFLUXDB3_URL || 'http://localhost:8181';
    this.influxdb3Token = process.env.INFLUXDB3_TOKEN || '';
  }

  onModuleInit(): void {
    this.logger.log(
      `Influxdb3AdapterService initialized (engine: ${this.engineType}, url: ${this.influxdb3Url}, ` +
        `database service: ${!!this.databaseService}, isolation: per-project database ` +
        `ss-node-data-{projectId})`,
    );
  }

  onModuleDestroy(): void {
    void this.close();
  }

  // ──────────── 写入钩子：POST /api/v3/write_lp ────────────

  protected async sendBatch(points: DataPoint[]): Promise<void> {
    // v3 不支持字符串 field：非数值 value 的点整点跳过（写入必然整行失败）
    const numericPoints = points.filter((point) => {
      if (typeof point.value === 'number') return true;
      this.skippedTextPointCount++;
      return false;
    });

    if (this.skippedTextPointCount > 0) {
      this.logger.warn(
        `InfluxDB 3 Core does not support string field values: skipped ` +
          `${this.skippedTextPointCount} non-numeric point(s) in total (tagId list omitted)`,
      );
    }

    if (numericPoints.length === 0) {
      return;
    }

    // 按项目分库（用户决策）：按 projectId 分组，逐库确保存在后写入；
    // 任一分组失败即抛出（由基类重试机制统一处理）
    const pointsByProject = new Map<string, DataPoint[]>();
    for (const point of numericPoints) {
      const projectId = point.projectId || '';
      const group = pointsByProject.get(projectId);
      if (group) {
        group.push(point);
      } else {
        pointsByProject.set(projectId, [point]);
      }
    }

    for (const [projectId, projectPoints] of pointsByProject) {
      const databaseName = await this.resolveWriteDatabase(projectId);
      await this.writeLines(
        databaseName,
        serializeLineProtocol(projectPoints, { skipStringFields: true }),
      );
    }
  }

  private async writeLines(databaseName: string, lines: string): Promise<void> {
    const response = await fetch(
      `${this.influxdb3Url}/api/v3/write_lp?db=${encodeURIComponent(databaseName)}&precision=ns`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.influxdb3Token}`,
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: lines,
        // CODE-05: fetch 加 5s 超时
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (!response.ok && response.status !== 204) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`InfluxDB 3 HTTP ${response.status}: ${errorBody}`);
    }
  }

  /** 写入路由：projectId → 项目 database（无 databaseService 时用兜底库名） */
  private async resolveWriteDatabase(projectId: string): Promise<string> {
    if (!projectId) {
      return this.databaseService
        ? this.databaseService.getDefaultDatabase()
        : (process.env.INFLUXDB3_DATABASE || 'ss-node-data').replace(/_/g, '-');
    }
    return this.databaseService
      ? this.databaseService.ensureDatabase(projectId)
      : this.normalizeFallbackDatabaseName(`ss-node-data-${projectId}`);
  }

  /** 无 databaseService 时的本地归一化（与 DatabaseService.normalizeDatabaseName 规则一致） */
  private normalizeFallbackDatabaseName(name: string): string {
    return name
      .replace(/_/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  // ──────────── 读取钩子：POST /api/v3/query_sql（SQL） ────────────

  protected async buildReadRequest(options: QueryOptions): Promise<EngineReadRequest> {
    // 按项目分库：projectId 路由到项目 database，无 projectId 时用兜底库
    const databaseName = options.projectId
      ? await this.resolveReadDatabase(options.projectId)
      : this.getFallbackDatabaseName();

    const sqlQuery = this.queryBuilder.buildQuery(options, { name: databaseName });

    return {
      url: `${this.influxdb3Url}/api/v3/query_sql?db=${encodeURIComponent(databaseName)}&format=json`,
      headers: {
        Authorization: `Bearer ${this.influxdb3Token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // P0 实测：body 必须为 {"db","q"}，sql 字段不被识别（missing field `q`）
      body: JSON.stringify({ db: databaseName, q: sqlQuery }),
    };
  }

  /** 读取路由：projectId → 项目 database */
  private async resolveReadDatabase(projectId: string): Promise<string> {
    return this.databaseService
      ? this.databaseService.ensureDatabase(projectId)
      : this.normalizeFallbackDatabaseName(`ss-node-data-${projectId}`);
  }

  /** 兜底 database 名（无 databaseService 时） */
  private getFallbackDatabaseName(): string {
    return this.databaseService
      ? this.databaseService.getDefaultDatabase()
      : (process.env.INFLUXDB3_DATABASE || 'ss-node-data').replace(/_/g, '-');
  }

  protected parseReadResponse(rawText: string): DataPoint[] {
    return this.responseParser.parse(rawText);
  }

  // ──────────── delete（受限能力，抛 NotSupportedError） ────────────

  async delete(_options: { tagIds?: string[]; before?: Date }): Promise<number> {
    // InfluxDB 3 Core 无 compactor，不支持删除；上层应在调用前检查 capabilities.delete
    // 并改用「保留期到期 / 重建 database」兜底（方案 §7.2）
    throw new NotSupportedError(
      'InfluxDB 3 Core does not support delete (no compactor); use retention period or recreate database instead',
    );
  }

  // ──────────── health ────────────

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }> {
    try {
      // P0 实测：/health 需要 Bearer 鉴权（无 token 返回 401），响应体为纯文本 "OK"
      const response = await fetch(`${this.influxdb3Url}/health`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.influxdb3Token}` },
        // CODE-05: fetch 加 5s 超时
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (response.ok) {
        const rawBody = await response.text().catch(() => '');
        return {
          status: 'healthy',
          details: {
            serverResponse: rawBody,
            pendingBuffer: this.pendingBufferCount,
            skippedTextPoints: this.skippedTextPointCount,
          },
        };
      }

      return {
        status: 'degraded',
        details: {
          httpStatus: response.status,
          pendingBuffer: this.pendingBufferCount,
          skippedTextPoints: this.skippedTextPointCount,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          pendingBuffer: this.pendingBufferCount,
          skippedTextPoints: this.skippedTextPointCount,
        },
      };
    }
  }
}
