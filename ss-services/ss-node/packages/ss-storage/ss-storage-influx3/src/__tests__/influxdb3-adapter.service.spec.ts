// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { NotSupportedError, STORAGE_ENGINE_TYPES } from '@ss-node/ss-storage';
import { Influxdb3AdapterService } from '../influxdb3-adapter.service';
import { DataPoint } from '@ss-node/ss-storage';

const createPoint = (overrides: Partial<DataPoint> = {}): DataPoint => ({
  tagId: 'tag-1',
  deviceId: 'dev-1',
  projectId: 'proj-1',
  value: 42.5,
  timestamp: new Date('2026-01-01T00:00:00Z'),
  quality: 192,
  ...overrides,
});

const createResponse = (overrides: Partial<Response> = {}): Response =>
  ({
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
    ...overrides,
  }) as unknown as Response;

describe('Influxdb3AdapterService', () => {
  let adapter: Influxdb3AdapterService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.INFLUXDB3_URL = 'http://influx3-test:8181';
    process.env.INFLUXDB3_TOKEN = 'test-token';
    process.env.INFLUXDB3_DATABASE = 'ss-node-data';
    adapter = new Influxdb3AdapterService();
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue(createResponse());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.clearAllMocks();
    delete process.env.INFLUXDB3_DATABASE;
  });

  // ──────────── 引擎标识与能力 ────────────

  it('TC-IV3-AD-001: should declare influxdb3 engine type and capabilities', () => {
    expect(adapter.engineType).toBe(STORAGE_ENGINE_TYPES.INFLUXDB3);
    expect(adapter.capabilities).toEqual({
      delete: false,
      interpolation: true,
      aggregation: true,
    });
  });

  // ──────────── write ────────────

  it('TC-IV3-AD-010: should flush buffer to /api/v3/write_lp with Bearer token and per-project database', async () => {
    const points = Array.from({ length: 1000 }, (_, index) => createPoint({ value: index }));

    const result = await adapter.write(points);

    expect(result.success).toBe(true);
    expect(result.written).toBe(1000);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('http://influx3-test:8181/api/v3/write_lp');
    // 按项目分库：projectId=proj-1 → ss-node-data-proj-1
    expect(url).toContain('db=ss-node-data-proj-1');
    expect(url).toContain('precision=ns');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(String(init.body)).toContain('tag_values,tagId=tag-1,deviceId=dev-1,projectId=proj-1');
    expect(String(init.body)).toContain('value=0');
  });

  it('TC-IV3-AD-013: should split write batches per project (per-project database routing)', async () => {
    // 跨项目批次：按 projectId 分组，逐库写入
    const points = Array.from({ length: 1000 }, (_, index) =>
      createPoint({ value: index, projectId: index < 500 ? 'proj-1' : 'proj-2' }),
    );

    await adapter.write(points);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [firstUrl] = fetchSpy.mock.calls[0];
    const [secondUrl] = fetchSpy.mock.calls[1];
    const databaseNames = [firstUrl, secondUrl]
      .map((url: string) => /db=([^&]+)/.exec(url)?.[1])
      .sort();
    expect(databaseNames).toEqual(['ss-node-data-proj-1', 'ss-node-data-proj-2']);
  });

  it('TC-IV3-AD-011: should skip non-numeric values (v3 does not support string fields)', async () => {
    // P0 实测：v3 Core 不支持字符串 field（整行写入失败），
    // 非数值 value 的点整点跳过，其余正常写入项目 database
    const points = Array.from({ length: 1000 }, (_, index) =>
      createPoint({ value: index === 0 ? 'OPEN' : index }),
    );

    const result = await adapter.write(points);

    expect(result.success).toBe(true);
    expect(result.written).toBe(1000);

    const [, init] = fetchSpy.mock.calls[0];
    const body = String(init.body);
    // 全部写入行均不含 value_text / metadata 字符串 field
    expect(body).not.toContain('value_text');
    expect(body).not.toContain('metadata');
    // 跳过 1 个非数值点后剩余 999 行
    expect(body.split('\n')).toHaveLength(999);
    // 元数据 JSON field 同样跳过（P0 实测字符串 field 整行失败）
    const metadataPoints = Array.from({ length: 1000 }, (_, index) =>
      createPoint({ value: index, metadata: { unit: 'C' } }),
    );
    await adapter.write(metadataPoints);
    const [, secondInit] = fetchSpy.mock.calls[1];
    expect(String(secondInit.body)).not.toContain('metadata');
  });

  it('TC-IV3-AD-012: should return failure when writing after close', async () => {
    await adapter.close();

    const result = await adapter.write([createPoint()]);

    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
  });

  // ──────────── read ────────────

  it('TC-IV3-AD-020: should query via /api/v3/query_sql with {db, q} body and normalize JSON response', async () => {
    // P0 实测：query_sql body 必须为 {"db","q"}；响应为稀疏对象数组
    fetchSpy.mockResolvedValue(
      createResponse({
        text: () =>
          Promise.resolve(
            JSON.stringify([
              {
                time: '2026-01-01T00:00:00',
                tagId: 'tag-1',
                deviceId: 'dev-1',
                projectId: 'proj-1',
                value: 42.5,
                quality: 192.0,
              },
            ]),
          ),
      }),
    );

    const points = await adapter.read({ tagIds: ['tag-1'] });

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(42.5);
    expect(points[0].quality).toBe(192);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/v3/query_sql');
    expect(url).toContain('db=ss-node-data');
    expect(url).toContain('format=json');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    const requestBody = JSON.parse(String(init.body));
    expect(requestBody.db).toBe('ss-node-data');
    expect(requestBody.q).toContain('SELECT *');
    expect(requestBody.q).toContain("\"tagId\" IN ('tag-1')");
  });

  it('TC-IV3-AD-022: should route read to per-project database by projectId', async () => {
    // 按项目分库：options.projectId → ss-node-data-proj-9（兜底路径，无 databaseService）
    fetchSpy.mockResolvedValue(
      createResponse({ text: () => Promise.resolve(JSON.stringify([])) }),
    );

    await adapter.read({ tagIds: ['tag-1'], projectId: 'proj-9' });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('db=ss-node-data-proj-9');
    const requestBody = JSON.parse(String(init.body));
    expect(requestBody.db).toBe('ss-node-data-proj-9');
    // 查询条件仍保留 "projectId" 过滤（纵深防御）
    expect(requestBody.q).toContain("\"projectId\" = 'proj-9'");
  });

  it('TC-IV3-AD-021: should throw with engine label on HTTP error', async () => {
    fetchSpy.mockResolvedValue(
      createResponse({ ok: false, status: 500, text: () => Promise.resolve('boom') }),
    );

    await expect(adapter.read({ tagIds: ['tag-1'] })).rejects.toThrow(
      /InfluxDB 3 query failed \(500\)/,
    );
  });

  // ──────────── delete ────────────

  it('TC-IV3-AD-030: should throw NotSupportedError on delete (no compactor)', async () => {
    await expect(adapter.delete({ tagIds: ['tag-1'] })).rejects.toThrow(NotSupportedError);
  });

  // ──────────── health ────────────

  it('TC-IV3-AD-040: should return healthy when /health responds ok with Bearer auth', async () => {
    // P0 实测：/health 需要 Bearer 鉴权（无 token 401），响应体为纯文本 "OK"
    fetchSpy.mockResolvedValue(createResponse({ text: () => Promise.resolve('OK') }));

    const health = await adapter.health();

    expect(health.status).toBe('healthy');
    expect(health.details.serverResponse).toBe('OK');
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('TC-IV3-AD-041: should return degraded on non-ok /health response', async () => {
    fetchSpy.mockResolvedValue(createResponse({ ok: false, status: 503 }));

    const health = await adapter.health();

    expect(health.status).toBe('degraded');
    expect(health.details.httpStatus).toBe(503);
  });

  it('TC-IV3-AD-042: should return unhealthy on fetch failure', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const health = await adapter.health();

    expect(health.status).toBe('unhealthy');
    expect(health.details.error).toBe('ECONNREFUSED');
  });
});
