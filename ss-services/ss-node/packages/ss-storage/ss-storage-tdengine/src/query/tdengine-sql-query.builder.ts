// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { QueryBuilder, QueryOptions } from '@ss-node/ss-storage';

/**
 * TDengine SQL 查询方言构建器（与 v3 DataFusion SQL 语法不同，独立实现）。
 *
 * - 窗口聚合：INTERVAL(...) 而非 DATE_BIN；函数名 AVG/MAX/MIN/SUM/COUNT 一致；
 * - 空窗填充：FILL 子句 —— raw→FILL(NULL)、step→FILL(PREV)、linear→FILL(LINEAR)；
 * - 超级表按 tagId 分区：PARTITION BY tagId（tag 为 TAG 列，可直接选择/过滤）；
 * - 时间列：ts（TIMESTAMP 主键列），时间条件用 ISO8601 字符串字面量；
 * - 强模式：value 固定 DOUBLE，非数值走 value_text（§5.1/§7.4.2 分流约定）；
 * - 注入防护：值一律经 escapeSqlLiteral 转义（单引号翻倍），
 *   REST stmt 参数绑定可用性待 P0 实测，实测通过后切换参数绑定；
 * - 时区对齐：INTERVAL 默认按服务器时区，与本地 UTC+8 的一致性待 P0 实测（§6.3）。
 */
export class TdengineSqlQueryBuilder implements QueryBuilder {
  buildQuery(options: QueryOptions, _isolation: { name: string }): string {
    const aggregation = options.aggregation;
    return aggregation
      ? this.buildAggregationQuery(options, aggregation)
      : this.buildRawQuery(options);
  }

  // ──────────── 原始点查询 ────────────

  private buildRawQuery(options: QueryOptions): string {
    let sql =
      'SELECT ts, tagId, deviceId, projectId, value, value_text, quality\n' +
      `FROM ${this.supertableReference(options)}`;

    const conditions = this.buildConditions(options);
    if (conditions.length > 0) {
      sql += `\nWHERE ${conditions.join(' AND ')}`;
    }

    sql += `\nORDER BY ts ${options.order === 'desc' ? 'DESC' : 'ASC'}`;

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
    const aggregateFunction = this.translateAggregateFunction(aggregation.function);
    const interpolation = options.interpolation || 'raw';

    // 无窗口间隔：全范围标量聚合（按 tagId 分组）
    if (!aggregation.interval) {
      let sql =
        `SELECT tagId, ${aggregateFunction}(value) AS value\n` +
        `FROM ${this.supertableReference(options)}`;
      const conditions = this.buildConditions(options);
      if (conditions.length > 0) {
        sql += `\nWHERE ${conditions.join(' AND ')}`;
      }
      sql += `\nGROUP BY tagId`;
      return sql + ';';
    }

    const intervalExpression = this.translateInterval(aggregation.interval);
    const fillClause =
      interpolation === 'linear'
        ? 'FILL(LINEAR)'
        : interpolation === 'step'
          ? 'FILL(PREV)'
          : 'FILL(NULL)';

    let sql =
      `SELECT _wstart AS window_start, tagId, ${aggregateFunction}(value) AS value\n` +
      `FROM ${this.supertableReference(options)}`;

    const conditions = this.buildConditions(options);
    if (conditions.length > 0) {
      sql += `\nWHERE ${conditions.join(' AND ')}`;
    }

    // 超级表窗口聚合必须按 tagId 分区，再开 INTERVAL 窗口 + FILL 填充
    sql += `\nPARTITION BY tagId INTERVAL(${intervalExpression}) ${fillClause}`;
    sql += `\nORDER BY window_start ${options.order === 'desc' ? 'DESC' : 'ASC'}`;

    if (options.limit) {
      sql += `\nLIMIT ${this.sanitizeInteger(options.limit)}`;
    }

    return sql + ';';
  }

  // ──────────── 条件构建 ────────────

  private buildConditions(options: QueryOptions): string[] {
    const conditions: string[] = [];

    if (options.startTime) {
      conditions.push(`ts >= ${this.escapeSqlLiteral(options.startTime.toISOString())}`);
    }
    if (options.endTime) {
      conditions.push(`ts <= ${this.escapeSqlLiteral(options.endTime.toISOString())}`);
    }
    if (options.tagIds && options.tagIds.length > 0) {
      const tagIdList = options.tagIds.map((tagId) => this.escapeSqlLiteral(tagId)).join(', ');
      conditions.push(`tagId IN (${tagIdList})`);
    }
    if (options.deviceIds && options.deviceIds.length > 0) {
      const deviceIdList = options.deviceIds
        .map((deviceId) => this.escapeSqlLiteral(deviceId))
        .join(', ');
      conditions.push(`deviceId IN (${deviceIdList})`);
    }

    return conditions;
  }

  // ──────────── 方言翻译 ────────────

  /** TDengine INTERVAL 直接接受 '5m'/'1h'/'1d' 等（白名单校验后透传） */
  private translateInterval(interval: string): string {
    const trimmed = interval.trim();
    if (!/^\d+[smhdwy]$/.test(trimmed)) {
      throw new Error(`Invalid TDengine interval expression: ${interval}`);
    }
    return trimmed;
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

  /** 超级表引用：同 database 内固定 tag_values（隔离由 database 承担） */
  private supertableReference(_options: QueryOptions): string {
    return 'tag_values';
  }
}
