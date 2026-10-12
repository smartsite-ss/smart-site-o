// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Influxdb3SqlQueryBuilder } from '../query/influxdb3-sql-query.builder';

describe('Influxdb3SqlQueryBuilder', () => {
  let builder: Influxdb3SqlQueryBuilder;

  beforeEach(() => {
    builder = new Influxdb3SqlQueryBuilder();
  });

  // ──────────── 原始点查询 ────────────

  describe('buildRawQuery', () => {
    it('TC-IV3-QB-001: should build raw query with SELECT *, quoted identifiers and tagId filter', () => {
      // P0 实测：camelCase 列必须双引号；动态 schema 下用 SELECT * 引用全部列
      const sql = builder.buildQuery(
        {
          tagIds: ['tag-1', 'tag-2'],
          startTime: new Date('2026-01-01T00:00:00Z'),
          endTime: new Date('2026-01-02T00:00:00Z'),
        },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain('SELECT *');
      expect(sql).toContain('FROM tag_values');
      expect(sql).toContain("time >= '2026-01-01T00:00:00.000Z'");
      expect(sql).toContain("time <= '2026-01-02T00:00:00.000Z'");
      expect(sql).toContain("\"tagId\" IN ('tag-1', 'tag-2')");
      expect(sql).toContain('ORDER BY time ASC');
      expect(sql).not.toContain('LIMIT');
    });

    it('TC-IV3-QB-002: should apply DESC order and LIMIT/OFFSET', () => {
      const sql = builder.buildQuery(
        { order: 'desc', limit: 100, offset: 200 },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain('ORDER BY time DESC');
      expect(sql).toContain('LIMIT 100 OFFSET 200');
    });

    it('TC-IV3-QB-003: should filter by deviceIds with quoted identifier', () => {
      const sql = builder.buildQuery({ deviceIds: ['dev-1'] }, { name: 'ss-node-data' });

      expect(sql).toContain("\"deviceId\" IN ('dev-1')");
    });

    it('TC-IV3-QB-004: should filter by projectId for shared-database isolation', () => {
      // P0 实测：v3 Core 5 库上限 → 共享库 + "projectId" tag 过滤
      const sql = builder.buildQuery({ projectId: 'proj-42' }, { name: 'ss-node-data' });

      expect(sql).toContain("\"projectId\" = 'proj-42'");
    });
  });

  // ──────────── 聚合查询 ────────────

  describe('buildAggregationQuery', () => {
    it('TC-IV3-QB-010: should build scalar aggregation (no interval) grouped by quoted tagId', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'avg' } },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain('SELECT "tagId", AVG(value) AS value');
      expect(sql).toContain('GROUP BY "tagId"');
      expect(sql).not.toContain('date_bin');
    });

    it('TC-IV3-QB-011: should use date_bin window for raw interpolation', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'avg', interval: '5m' }, interpolation: 'raw' },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain("date_bin(INTERVAL '5 minutes', time) AS window_start");
      expect(sql).toContain('AVG(value) AS value');
      expect(sql).not.toContain('gapfill');
      expect(sql).toContain('GROUP BY window_start, "tagId"');
    });

    it('TC-IV3-QB-012: should use date_bin_gapfill + interpolate for linear interpolation', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'max', interval: '1h' }, interpolation: 'linear' },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain("date_bin_gapfill(INTERVAL '1 hour', time) AS window_start");
      expect(sql).toContain('interpolate(MAX(value)) AS value');
    });

    it('TC-IV3-QB-013: should use locf for step interpolation', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'min', interval: '1d' }, interpolation: 'step' },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain("date_bin_gapfill(INTERVAL '1 day', time) AS window_start");
      expect(sql).toContain('locf(MIN(value)) AS value');
    });

    it('should translate singular interval for amount = 1', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'count', interval: '1s' } },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain("INTERVAL '1 second'");
    });

    it('should fall back to scalar aggregation on unrecognized interval', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'avg', interval: '5x' } },
        { name: 'ss-node-data' },
      );

      expect(sql).toContain('GROUP BY "tagId"');
      expect(sql).not.toContain('date_bin');
    });
  });

  // ──────────── 注入防护 ────────────

  describe('injection protection', () => {
    it('TC-IV3-QB-020: should escape single quotes in tagId (a\'b";DROP)', () => {
      const sql = builder.buildQuery({ tagIds: [`a'b";DROP`] }, { name: 'ss-node-data' });

      expect(sql).toContain("'a''b\";DROP'");
      expect(sql).not.toMatch(/'a'b/);
    });

    it('TC-IV3-QB-021: should escape single quotes in projectId filter', () => {
      const sql = builder.buildQuery({ projectId: `p'x";DROP` }, { name: 'ss-node-data' });

      expect(sql).toContain("'p''x\";DROP'");
    });

    it('TC-IV3-QB-022: should reject non-integer / negative limit', () => {
      expect(() => builder.buildQuery({ limit: -1 }, { name: 'ss-node-data' })).toThrow(
        /Invalid integer parameter/,
      );

      expect(() => builder.buildQuery({ limit: Infinity }, { name: 'ss-node-data' })).toThrow(
        /Invalid integer parameter/,
      );
    });
  });
});
