// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { QueryBuilder, QueryOptions } from '@ss-node/ss-storage';

/**
 * InfluxDB 3 Core SQL 查询方言构建器（DataFusion 方言）。
 *
 * P0 实测（InfluxDB 3 Core 3.11.2）对齐：
 * - camelCase 列（tagId/deviceId/projectId）必须双引号括起，否则被 lower-case 后
 *   报 "No field named tagid" Schema error；
 * - v3 列为动态 schema（写入时建列），value_text / metadata 未写过即不存在，
 *   原始点查询用 SELECT * 避免引用不存在的列，由解析器按稀疏对象归一；
 * - 多项目隔离：v3 Core 存在 5 个 database 上限（实测 422），不可按项目分库，
 *   改为共享 database + WHERE "projectId" = ... tag 过滤（方案 §11 实测结论）；
 * - 原始点查询：SELECT * FROM tag_values WHERE ... ORDER BY ... LIMIT ...；
 * - 窗口聚合：date_bin(INTERVAL '...', time) + GROUP BY；
 * - 插值：date_bin_gapfill + interpolate(...)（线性）/ locf(...)（阶梯）；
 * - quality 聚合语义：聚合窗口内 quality 为质量码枚举，取均值无业务含义，
 *   聚合结果不返回 quality（原始点查询 raw 仍返回 quality 单值）；
 * - 注入防护：值一律经 escapeSqlLiteral 转义（单引号翻倍）；
 *   v3 HTTP API 已实测支持 params 参数绑定（$1 + {"params":{...}}），
 *   当前保留字面量转义方案，参数绑定作为后续优化项。
 */
export class Influxdb3SqlQueryBuilder implements QueryBuilder {
  buildQuery(options: QueryOptions, _isolation: { name: string }): string {
    const aggregation = options.aggregation;
    return aggregation
      ? this.buildAggregationQuery(options, aggregation)
      : this.buildRawQuery(options);
  }

  // ──────────── 原始点查询 ────────────

  private buildRawQuery(options: QueryOptions): string {
    // SELECT *：v3 动态 schema，未写过的列（value_text/metadata）不存在，
    // 显式引用会报 Schema error；SELECT * 由解析器按稀疏对象归一
    let sql = 'SELECT *\nFROM tag_values';

    const conditions = this.buildConditions(options);
    if (conditions.length > 0) {
      sql += `\nWHERE ${conditions.join(' AND ')}`;
    }

    sql += `\nORDER BY time ${options.order === 'desc' ? 'DESC' : 'ASC'}`;

    if (options.limit) {
      sql += `\nLIMIT ${this.sanitizeInteger(options.limit)} OFFSET ${this.sanitizeInteger(options.offset || 0)}`;
    }

    return sql + ';';
  }

  // ──────────── 窗口聚合查询 ────────────

  private buildAggregationQuery(
    options: QueryOptions,
    aggregation: NonNullable<QueryOptions['aggregation']>,
  ): string {
    const intervalExpression = aggregation.interval
      ? this.translateInterval(aggregation.interval)
      : null;
    const aggregateFunction = this.translateAggregateFunction(aggregation.function);

    // 无窗口间隔：全范围标量聚合（按 tagId 分组）
    if (!intervalExpression) {
      let sql = `SELECT "tagId", ${aggregateFunction}(value) AS value\nFROM tag_values`;
      const conditions = this.buildConditions(options);
      if (conditions.length > 0) {
        sql += `\nWHERE ${conditions.join(' AND ')}`;
      }
      sql += `\nGROUP BY "tagId"`;
      return sql + ';';
    }

    // 窗口聚合：插值时用 date_bin_gapfill + interpolate/locf，raw 用 date_bin
    const interpolation = options.interpolation || 'raw';
    const windowFunction = interpolation === 'raw' ? 'date_bin' : 'date_bin_gapfill';
    const valueExpression =
      interpolation === 'linear'
        ? `interpolate(${aggregateFunction}(value))`
        : interpolation === 'step'
          ? `locf(${aggregateFunction}(value))`
          : `${aggregateFunction}(value)`;

    let sql =
      `SELECT ${windowFunction}(${intervalExpression}, time) AS window_start,\n` +
      `       "tagId",\n` +
      `       ${valueExpression} AS value\n` +
      `FROM tag_values`;

    const conditions = this.buildConditions(options);
    if (conditions.length > 0) {
      sql += `\nWHERE ${conditions.join(' AND ')}`;
    }

    sql += `\nGROUP BY window_start, "tagId"`;
    sql += `\nORDER BY window_start ${options.order === 'desc' ? 'DESC' : 'ASC'}`;

    if (options.limit) {
      sql += `\nLIMIT ${this.sanitizeInteger(options.limit)} OFFSET ${this.sanitizeInteger(options.offset || 0)}`;
    }

    return sql + ';';
  }

  // ──────────── 条件构建 ────────────

  private buildConditions(options: QueryOptions): string[] {
    const conditions: string[] = [];

    if (options.projectId) {
      // 共享库隔离：projectId 作为 WHERE 过滤条件（v3 5 库上限，不可按项目分库）
      conditions.push(`"projectId" = ${this.escapeSqlLiteral(options.projectId)}`);
    }
    if (options.startTime) {
      conditions.push(`time >= ${this.escapeSqlLiteral(options.startTime.toISOString())}`);
    }
    if (options.endTime) {
      conditions.push(`time <= ${this.escapeSqlLiteral(options.endTime.toISOString())}`);
    }
    if (options.tagIds && options.tagIds.length > 0) {
      const tagIdList = options.tagIds.map((tagId) => this.escapeSqlLiteral(tagId)).join(', ');
      conditions.push(`"tagId" IN (${tagIdList})`);
    }
    if (options.deviceIds && options.deviceIds.length > 0) {
      const deviceIdList = options.deviceIds
        .map((deviceId) => this.escapeSqlLiteral(deviceId))
        .join(', ');
      conditions.push(`"deviceId" IN (${deviceIdList})`);
    }

    return conditions;
  }

  // ──────────── 方言翻译 ────────────

  /** '5m' → INTERVAL '5 minutes'（s/m/h/d → seconds/minutes/hours/days） */
  private translateInterval(interval: string): string | null {
    const match = /^(\d+)([smhd])$/.exec(interval.trim());
    if (!match) return null;
    const amount = parseInt(match[1], 10);
    const unitMap: Record<string, [string, string]> = {
      s: ['second', 'seconds'],
      m: ['minute', 'minutes'],
      h: ['hour', 'hours'],
      d: ['day', 'days'],
    };
    const [singular, plural] = unitMap[match[2]];
    return `INTERVAL '${amount} ${amount === 1 ? singular : plural}'`;
  }

  private translateAggregateFunction(functionName: string): string {
    const functionMap: Record<string, string> = {
      avg: 'AVG',
      max: 'MAX',
      min: 'MIN',
      sum: 'SUM',
      count: 'COUNT',
    };
    return functionMap[functionName] || functionName.toUpperCase();
  }

  // ──────────── 注入防护 ────────────

  /** SQL 字符串字面量转义：单引号翻倍，阻断 `a'b";DROP` 类注入 */
  private escapeSqlLiteral(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }

  /** 数值白名单校验：仅允许非负整数（limit/offset） */
  private sanitizeInteger(value: number): number {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Invalid integer parameter for SQL: ${value}`);
    }
    return parsed;
  }
}
