// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TdengineSqlQueryBuilder } from '../query/tdengine-sql-query.builder';

describe('TdengineSqlQueryBuilder', () => {
  let builder: TdengineSqlQueryBuilder;

  beforeEach(() => {
    builder = new TdengineSqlQueryBuilder();
  });

  // ──────────── 原始点查询 ────────────

  describe('buildRawQuery', () => {
    it('TC-TDE-QB-001: should build raw query with ts column and tag_values supertable', () => {
      const sql = builder.buildQuery(
        {
          tagIds: ['tag-1'],
          startTime: new Date('2026-01-01T00:00:00Z'),
          endTime: new Date('2026-01-02T00:00:00Z'),
        },
        { name: 'ss_node_data_proj_1' },
      );

      expect(sql).toContain('SELECT ts, tagId, deviceId, projectId, value, value_text, quality');
      expect(sql).toContain('FROM tag_values');
      expect(sql).toContain("ts >= '2026-01-01T00:00:00.000Z'");
      expect(sql).toContain("ts <= '2026-01-02T00:00:00.000Z'");
      expect(sql).toContain("tagId IN ('tag-1')");
      expect(sql).toContain('ORDER BY ts ASC');
    });

    it('TC-TDE-QB-002: should apply DESC order and LIMIT/OFFSET', () => {
      const sql = builder.buildQuery(
        { order: 'desc', limit: 50, offset: 10 },
        { name: 'ss_node_data' },
      );

      expect(sql).toContain('ORDER BY ts DESC');
      expect(sql).toContain('LIMIT 50 OFFSET 10');
    });
  });

  // ──────────── 聚合查询 ────────────

  describe('buildAggregationQuery', () => {
    it('TC-TDE-QB-010: should build scalar aggregation (no interval) grouped by tagId', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'avg' } },
        { name: 'ss_node_data' },
      );

      expect(sql).toContain('SELECT tagId, AVG(value) AS value');
      expect(sql).toContain('GROUP BY tagId');
      expect(sql).not.toContain('INTERVAL');
    });

    it('TC-TDE-QB-011: should use INTERVAL + FILL(NULL) for raw interpolation', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'avg', interval: '5m' }, interpolation: 'raw' },
        { name: 'ss_node_data' },
      );

      expect(sql).toContain('_wstart AS window_start');
      expect(sql).toContain('PARTITION BY tagId INTERVAL(5m) FILL(NULL)');
    });

    it('TC-TDE-QB-012: should use FILL(PREV) for step interpolation', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'max', interval: '1h' }, interpolation: 'step' },
        { name: 'ss_node_data' },
      );

      expect(sql).toContain('PARTITION BY tagId INTERVAL(1h) FILL(PREV)');
    });

    it('TC-TDE-QB-013: should use FILL(LINEAR) for linear interpolation', () => {
      const sql = builder.buildQuery(
        { aggregation: { function: 'min', interval: '1d' }, interpolation: 'linear' },
        { name: 'ss_node_data' },
      );

      expect(sql).toContain('PARTITION BY tagId INTERVAL(1d) FILL(LINEAR)');
    });

    it('TC-TDE-QB-014: should reject invalid interval expression', () => {
      expect(() =>
        builder.buildQuery(
          { aggregation: { function: 'avg', interval: '5x;DROP' } },
          { name: 'ss_node_data' },
        ),
      ).toThrow(/Invalid TDengine interval expression/);
    });
  });

  // ──────────── 注入防护 ────────────

  describe('injection protection', () => {
    it('TC-TDE-QB-020: should escape single quotes in tagId (a\'b";DROP)', () => {
      const sql = builder.buildQuery({ tagIds: [`a'b";DROP`] }, { name: 'ss_node_data' });

      expect(sql).toContain("'a''b\";DROP'");
      expect(sql).not.toMatch(/'a'b/);
    });

    it('TC-TDE-QB-021: should reject non-integer / negative limit', () => {
      expect(() => builder.buildQuery({ limit: -5 }, { name: 'ss_node_data' })).toThrow(
        /Invalid integer parameter/,
      );

      expect(() => builder.buildQuery({ limit: Infinity }, { name: 'ss_node_data' })).toThrow(
        /Invalid integer parameter/,
      );
    });
  });
});
