// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TdengineJsonParser } from '../parse/tdengine-json.parser';

/** 构造 TDengine REST 响应报文（column_meta: [列名, 类型, 字节数]） */
const buildResponse = (columns: [string, string, number][], rows: unknown[][]): string =>
  JSON.stringify({ status: 'succ', code: 0, column_meta: columns, data: rows, rows: rows.length });

describe('TdengineJsonParser', () => {
  let parser: TdengineJsonParser;

  beforeEach(() => {
    parser = new TdengineJsonParser();
  });

  it('TC-TDE-PA-001: should normalize column_meta + data rows', () => {
    const raw = buildResponse(
      [
        ['ts', 'TIMESTAMP', 8],
        ['tagId', 'VARCHAR', 64],
        ['deviceId', 'VARCHAR', 64],
        ['projectId', 'VARCHAR', 64],
        ['value', 'DOUBLE', 8],
        ['quality', 'INT', 4],
      ],
      [
        ['2026-01-01T00:00:00Z', 'tag-1', 'dev-1', 'proj-1', 42.5, 192],
        ['2026-01-01T00:01:00Z', 'tag-1', 'dev-1', 'proj-1', 43.5, 192],
      ],
    );

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

  it('TC-TDE-PA-002: should fall back to value_text for non-numeric values', () => {
    const raw = buildResponse(
      [
        ['ts', 'TIMESTAMP', 8],
        ['tagId', 'VARCHAR', 64],
        ['value_text', 'VARCHAR', 128],
      ],
      [['2026-01-01T00:00:00Z', 'tag-1', 'RUNNING']],
    );

    const points = parser.parse(raw);

    expect(points[0].value).toBe('RUNNING');
  });

  it('TC-TDE-PA-003: should map window_start (aggregation) and default quality 0', () => {
    const raw = buildResponse(
      [
        ['window_start', 'TIMESTAMP', 8],
        ['tagId', 'VARCHAR', 64],
        ['value', 'DOUBLE', 8],
      ],
      [['2026-01-01T00:00:00Z', 'tag-1', 7.25]],
    );

    const points = parser.parse(raw);

    expect(points[0].timestamp).toEqual(new Date('2026-01-01T00:00:00Z'));
    expect(points[0].quality).toBe(0);
  });

  it('TC-TDE-PA-010: should skip FILL(NULL) empty-window rows', () => {
    const raw = buildResponse(
      [
        ['ts', 'TIMESTAMP', 8],
        ['tagId', 'VARCHAR', 64],
        ['value', 'DOUBLE', 8],
        ['value_text', 'VARCHAR', 128],
      ],
      [
        ['2026-01-01T00:00:00Z', 'tag-1', null, null],
        ['2026-01-01T00:05:00Z', 'tag-1', 1.5, null],
      ],
    );

    const points = parser.parse(raw);

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(1.5);
  });

  it('TC-TDE-PA-011: should return empty array when no data rows', () => {
    const raw = buildResponse([['ts', 'TIMESTAMP', 8]], []);

    expect(parser.parse(raw)).toEqual([]);
  });

  it('TC-TDE-PA-012: should throw with code/message when status is not succ', () => {
    const raw = JSON.stringify({ status: 'error', code: 800, message: 'invalid SQL' });

    expect(() => parser.parse(raw)).toThrow(/TDengine query failed \(code 800\): invalid SQL/);
  });

  it('should throw on invalid JSON', () => {
    expect(() => parser.parse('not-json')).toThrow();
  });
});
