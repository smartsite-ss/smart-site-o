// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { InfluxQueryService } from '../influx-query.service';
import { InfluxBucketService } from '../influx-bucket.service';

/**
 * 构造 InfluxDB pivoted CSV 响应（模拟 range → pivot → group 的结果）
 *
 * InfluxDB v2 在 range + pivot + group 后的 CSV 格式：
 *   #datatype,string,long,dateTime:RFC3339,dateTime:RFC3339,dateTime:RFC3339,string,string,string,double,string
 *   #group,false,false,true,true,true,false,false,false,false,false
 *   #default,_result,,,,,,,,
 *   ,result,table,_start,_stop,_time,tagId,deviceId,projectId,value,quality
 *   ,,0,{start},{stop},{time},{tagId},{deviceId},{projectId},{value},{quality}
 */
function buildPivotedCsv(
  rows: Array<{
    result?: string;
    table?: string;
    start?: string;
    stop?: string;
    time: string;
    tagId: string;
    deviceId: string;
    projectId: string;
    value: number;
    quality?: string;
  }>,
): string {
  const lines: string[] = [];
  lines.push(
    '#datatype,string,long,dateTime:RFC3339,dateTime:RFC3339,dateTime:RFC3339,string,string,string,double,string',
  );
  lines.push('#group,false,false,true,true,true,false,false,false,false,false');
  lines.push('#default,_result,,,,,,,,');
  lines.push(',result,table,_start,_stop,_time,tagId,deviceId,projectId,value,quality');
  for (const r of rows) {
    lines.push(
      `,${r.result || ''},${r.table || '0'},${r.start || '2026-07-23T14:00:00Z'},${r.stop || '2026-07-23T15:00:00Z'},${r.time},${r.tagId},${r.deviceId},${r.projectId},${r.value},${r.quality || 'good'}`,
    );
  }
  return lines.join('\n');
}

/** 构造聚合查询 CSV（无 pivot，只有 _time 和 _value） */
function buildAggregateCsv(rows: Array<{ time: string; value: number }>): string {
  const lines: string[] = [];
  lines.push('#datatype,string,long,dateTime:RFC3339,double');
  lines.push('#group,false,false,true,false');
  lines.push('#default,_result,,,,');
  lines.push(',result,table,_time,_value');
  for (const r of rows) {
    lines.push(`,,0,${r.time},${r.value}`);
  }
  return lines.join('\n');
}

/** 构造空结果 CSV */
function buildEmptyCsv(): string {
  return [
    '#datatype,string,long,dateTime:RFC3339,dateTime:RFC3339,dateTime:RFC3339,string,string,string,double,string',
    '#group,false,false,true,true,true,false,false,false,false,false',
    '#default,_result,,,,,,,,',
    ',result,table,_start,_stop,_time,tagId,deviceId,projectId,value,quality',
  ].join('\n');
}

describe('InfluxQueryService', () => {
  let service: InfluxQueryService;
  let fetchMock: jest.Mock;
  let mockConfigService: { get: jest.Mock };
  let mockBucketService: jest.Mocked<InfluxBucketService>;

  const defaultTimeRange = {
    startTime: new Date('2026-07-23T14:00:00Z'),
    endTime: new Date('2026-07-23T15:00:00Z'),
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'INFLUXDB_URL') return 'http://localhost:8086';
        if (key === 'INFLUXDB_TOKEN') return 'test-token';
        if (key === 'INFLUXDB_ORG') return 'test-org';
        return defaultValue;
      }),
    };

    mockBucketService = {
      getBucket: jest.fn().mockResolvedValue('ss_node_data_test-001'),
    } as any;

    service = new InfluxQueryService(mockConfigService as any, mockBucketService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ──────────── queryRange — 单标签时间范围查询 ────────────

  describe('queryRange', () => {
    it('TC-IQS-001: should parse pivoted CSV with _start/_stop columns and return correct values', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 53.398,
        },
        {
          time: '2026-07-23T14:30:05Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 54.123,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(2);
      expect(rows[0].value).toBe(53.398);
      expect(rows[0].tagId).toBe('tag-001');
      expect(rows[0].deviceId).toBe('dev-001');
      expect(rows[0].projectId).toBe('proj-001');
      expect(rows[0].timestamp.toISOString()).toBe('2026-07-23T14:30:00.000Z');
      expect(rows[1].value).toBe(54.123);
    });

    it('TC-IQS-002: should parse float values with many decimal places', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 53.398167121306884,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBeCloseTo(53.398167121306884, 10);
    });

    it('TC-IQS-003: should return zero for zero-value data points', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 0,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(0);
    });

    it('TC-IQS-004: should parse negative values correctly', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: -15.7,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(-15.7);
    });

    it('TC-IQS-005: should return empty array when no data rows', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(buildEmptyCsv()),
      });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(0);
    });

    it('TC-IQS-006: should return empty array when CSV has only newlines', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('\n\n') });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(0);
    });

    it('TC-IQS-007: should parse quality field correctly', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 42.5,
          quality: 'bad',
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows[0].quality).toBe('bad');
    });
  });

  // ──────────── queryRangeBatch — 批量标签查询 ────────────

  describe('queryRangeBatch', () => {
    it('TC-IQS-010: should parse multiple tags from pivoted CSV', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 10.5,
          table: '0',
        },
        {
          time: '2026-07-23T14:30:05Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 11.2,
          table: '0',
        },
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-002',
          deviceId: 'dev-002',
          projectId: 'proj-001',
          value: 20.3,
          table: '1',
        },
        {
          time: '2026-07-23T14:30:05Z',
          tagId: 'tag-002',
          deviceId: 'dev-002',
          projectId: 'proj-001',
          value: 21.7,
          table: '1',
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRangeBatch(
        'proj-001',
        ['tag-001', 'tag-002'],
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(4);
      const tag1Rows = rows.filter((r) => r.tagId === 'tag-001');
      const tag2Rows = rows.filter((r) => r.tagId === 'tag-002');
      expect(tag1Rows).toHaveLength(2);
      expect(tag2Rows).toHaveLength(2);
      expect(tag1Rows[0].value).toBe(10.5);
      expect(tag2Rows[0].value).toBe(20.3);
    });

    it('TC-IQS-011: should return empty array for empty tagIds', async () => {
      const rows = await service.queryRangeBatch(
        'proj-001',
        [],
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );
      expect(rows).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('TC-IQS-012: should handle single tag in batch query', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 99.9,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRangeBatch(
        'proj-001',
        ['tag-001'],
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(99.9);
    });
  });

  // ──────────── queryAggregate — 聚合查询（无 pivot） ────────────

  describe('queryAggregate', () => {
    it('TC-IQS-020: should parse aggregate CSV with _value column (no pivot)', async () => {
      const csv = buildAggregateCsv([{ time: '2026-07-23T14:30:00Z', value: 53.398 }]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const result = await service.queryAggregate(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
        'mean',
      );

      expect(result).toBe(53.398);
    });

    it('TC-IQS-021: should return 0 for empty aggregate result', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(buildAggregateCsv([])),
      });

      const result = await service.queryAggregate(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
        'mean',
      );

      expect(result).toBe(0);
    });
  });

  // ──────────── queryLatest — 最新值查询 ────────────

  describe('queryLatest', () => {
    it('TC-IQS-030: should parse latest values for multiple tags', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:59:55Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 100.5,
        },
        {
          time: '2026-07-23T14:59:50Z',
          tagId: 'tag-002',
          deviceId: 'dev-002',
          projectId: 'proj-001',
          value: 200.3,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const result = await service.queryLatest('proj-001', ['tag-001', 'tag-002']);

      expect(result.size).toBe(2);
      expect(result.get('tag-001')?.value).toBe(100.5);
      expect(result.get('tag-002')?.value).toBe(200.3);
    });

    it('TC-IQS-031: should return empty Map for empty tagIds', async () => {
      const result = await service.queryLatest('proj-001', []);
      expect(result.size).toBe(0);
    });
  });

  // ──────────── 错误处理 ────────────

  describe('error handling', () => {
    it('TC-IQS-040: should throw on non-ok HTTP response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(
        service.queryRange(
          'proj-001',
          'tag-001',
          defaultTimeRange.startTime,
          defaultTimeRange.endTime,
        ),
      ).rejects.toThrow('InfluxDB query failed (500)');
    });

    it('TC-IQS-041: should throw on fetch network error', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        service.queryRange(
          'proj-001',
          'tag-001',
          defaultTimeRange.startTime,
          defaultTimeRange.endTime,
        ),
      ).rejects.toThrow('ECONNREFUSED');
    });
  });

  // ──────────── CSV 解析边界条件 ────────────

  describe('CSV parsing edge cases', () => {
    it('TC-IQS-050: should handle very large numeric values', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 999999999.999,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows[0].value).toBe(999999999.999);
    });

    it('TC-IQS-051: should handle CSV with trailing newline', async () => {
      const csv =
        buildPivotedCsv([
          {
            time: '2026-07-23T14:30:00Z',
            tagId: 'tag-001',
            deviceId: 'dev-001',
            projectId: 'proj-001',
            value: 42.5,
          },
        ]) + '\n';
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(42.5);
    });

    it('TC-IQS-052: should handle quality column missing in headers (aggregate pivoted)', async () => {
      // 模拟一种边界情况：pivot 后没有 quality 列（只有 value 被选中）
      const lines = [
        '#datatype,string,long,dateTime:RFC3339,string,string,string,double',
        '#group,false,false,false,false,false,false,false',
        '#default,_result,,,,,,',
        ',result,table,_time,tagId,deviceId,projectId,value',
        ',,0,2026-07-23T14:30:00Z,tag-001,dev-001,proj-001,42.5',
      ].join('\n');
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(lines) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(42.5);
      expect(rows[0].quality).toBe('0'); // 默认值
    });

    it('TC-IQS-053: should handle integer values without decimal point', async () => {
      const csv = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 100,
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows[0].value).toBe(100);
    });

    it('TC-IQS-054: should handle multiple data rows (50+ points)', async () => {
      const dataRows = Array.from({ length: 50 }, (_, i) => ({
        time: new Date(Date.UTC(2026, 6, 23, 14, 30, 0) + i * 1000).toISOString(),
        tagId: 'tag-001',
        deviceId: 'dev-001',
        projectId: 'proj-001',
        value: Math.round((50 + i * 0.5) * 1000) / 1000,
      }));
      const csv = buildPivotedCsv(dataRows);
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(csv) });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(50);
      expect(rows[0].value).toBe(50);
      expect(rows[49].value).toBe(74.5);
      expect(rows[25].value).toBe(62.5);
    });

    it('TC-IQS-055: should handle CRLF line endings (InfluxDB \\r\\n format)', async () => {
      // 模拟 InfluxDB 真实 \\r\\n 响应 —— value 列在末尾会带 \\r 后缀
      const csvWithCRLF = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 45.26320375704787,
        },
        {
          time: '2026-07-23T14:30:05Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 44.83165784402075,
        },
      ]).replace(/\n/g, '\r\n');
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(csvWithCRLF),
      });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(2);
      expect(rows[0].value).toBeCloseTo(45.26320375704787, 5);
      expect(rows[1].value).toBeCloseTo(44.83165784402075, 5);
    });

    it('TC-IQS-056: should handle \\r\\n with quality as second-to-last column', async () => {
      // quality 是倒数第二列，value 是倒数第一列（带 \\r 的是 value）
      const csvWithCRLF = buildPivotedCsv([
        {
          time: '2026-07-23T14:30:00Z',
          tagId: 'tag-001',
          deviceId: 'dev-001',
          projectId: 'proj-001',
          value: 99.5,
          quality: 'good',
        },
      ]).replace(/\n/g, '\r\n');
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(csvWithCRLF),
      });

      const rows = await service.queryRange(
        'proj-001',
        'tag-001',
        defaultTimeRange.startTime,
        defaultTimeRange.endTime,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBeCloseTo(99.5, 5);
      expect(rows[0].quality).toBe('good');
    });
  });
});
