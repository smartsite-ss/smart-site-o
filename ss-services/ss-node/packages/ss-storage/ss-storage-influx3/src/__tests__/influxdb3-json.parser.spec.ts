// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Influxdb3JsonParser } from '../parse/influxdb3-json.parser';

describe('Influxdb3JsonParser', () => {
  let parser: Influxdb3JsonParser;

  beforeEach(() => {
    parser = new Influxdb3JsonParser();
  });

  // ──────────── 形态 1：columns + rows ────────────

  it('TC-IV3-PA-001: should parse columnar rows form', () => {
    const raw = JSON.stringify({
      columns: ['time', 'tagId', 'deviceId', 'projectId', 'value', 'quality'],
      rows: [
        ['2026-01-01T00:00:00Z', 'tag-1', 'dev-1', 'proj-1', 42.5, 192],
        ['2026-01-01T00:01:00Z', 'tag-1', 'dev-1', 'proj-1', 43.5, 192],
      ],
    });

    const points = parser.parse(raw);

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      tagId: 'tag-1',
      deviceId: 'dev-1',
      projectId: 'proj-1',
      value: 42.5,
      quality: 192,
    });
    expect(points[0].timestamp).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  // ──────────── 形态 2：series（InfluxQL 风格） ────────────

  it('TC-IV3-PA-002: should parse series form', () => {
    const raw = JSON.stringify({
      series: [
        {
          columns: ['time', 'tagId', 'value'],
          values: [['2026-01-01T00:00:00Z', 'tag-1', 1.5]],
        },
        {
          columns: ['time', 'tagId', 'value'],
          values: [['2026-01-01T00:02:00Z', 'tag-2', 2.5]],
        },
      ],
    });

    const points = parser.parse(raw);

    expect(points).toHaveLength(2);
    expect(points[0].tagId).toBe('tag-1');
    expect(points[1].tagId).toBe('tag-2');
  });

  // ──────────── 形态 3：对象数组 ────────────

  it('TC-IV3-PA-003: should parse object array form', () => {
    const raw = JSON.stringify([
      { time: '2026-01-01T00:00:00Z', tagId: 'tag-1', value: 10 },
      { time: '2026-01-01T00:01:00Z', tagId: 'tag-1', value_text: 'OPEN' },
    ]);

    const points = parser.parse(raw);

    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(10);
    expect(points[1].value).toBe('OPEN');
  });

  // ──────────── 边界用例 ────────────

  it('TC-IV3-PA-010: should prefer numeric value string over value_text', () => {
    const raw = JSON.stringify([
      { time: '2026-01-01T00:00:00Z', tagId: 'tag-1', value: '12.5', value_text: '12.5 C' },
    ]);

    const points = parser.parse(raw);

    expect(points[0].value).toBe(12.5);
  });

  it('TC-IV3-PA-011: should fall back to value_text when value is non-numeric string', () => {
    const raw = JSON.stringify([
      { time: '2026-01-01T00:00:00Z', tagId: 'tag-1', value: 'NaN-like', value_text: 'RUNNING' },
    ]);

    const points = parser.parse(raw);

    expect(points[0].value).toBe('RUNNING');
  });

  it('TC-IV3-PA-012: should map window_start (aggregation) to timestamp and default quality 0', () => {
    const raw = JSON.stringify([
      { window_start: '2026-01-01T00:00:00Z', tagId: 'tag-1', value: 7 },
    ]);

    const points = parser.parse(raw);

    expect(points[0].timestamp).toEqual(new Date('2026-01-01T00:00:00Z'));
    expect(points[0].quality).toBe(0);
  });

  it('TC-IV3-PA-013: should skip records without time/window_start', () => {
    const raw = JSON.stringify([
      { tagId: 'tag-1', value: 1 },
      { time: '2026-01-01T00:00:00Z', tagId: 'tag-2', value: 2 },
    ]);

    const points = parser.parse(raw);

    expect(points).toHaveLength(1);
    expect(points[0].tagId).toBe('tag-2');
  });

  it('TC-IV3-PA-014: should return empty array for single object without rows/series', () => {
    expect(parser.parse(JSON.stringify({ foo: 'bar' }))).toEqual([]);
  });

  it('should return empty array for scalar JSON', () => {
    expect(parser.parse('42')).toEqual([]);
  });

  it('should throw on invalid JSON', () => {
    expect(() => parser.parse('not-json')).toThrow();
  });
});
