// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { STORAGE_ENGINE_TYPES, DataPoint } from '@ss-node/ss-storage';
import { TdengineAdapterService } from '../tdengine-adapter.service';
import { TdengineDatabaseService } from '../tdengine-database.service';

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

/** root:taosdata 的 Basic 凭证 */
const expectedBasicToken = () => `Basic ${Buffer.from('root:taosdata').toString('base64')}`;

describe('TdengineAdapterService', () => {
  let adapter: TdengineAdapterService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.TDENGINE_URL = 'http://tdengine-test:6041';
    process.env.TDENGINE_USER = 'root';
    process.env.TDENGINE_PASSWORD = 'taosdata';
    adapter = new TdengineAdapterService();
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue(createResponse());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.clearAllMocks();
  });

  // ──────────── 引擎标识与能力 ────────────

  it('TC-TDE-AD-001: should declare tdengine engine type and capabilities', () => {
    expect(adapter.engineType).toBe(STORAGE_ENGINE_TYPES.TDENGINE);
    expect(adapter.capabilities).toEqual({
      delete: true,
      interpolation: true,
      aggregation: true,
    });
  });

  // ──────────── write ────────────

  it('TC-TDE-AD-010: should ensure subtables then flush to taosAdapter line protocol endpoint', async () => {
    const databaseService = {
      ensureSubtables: jest.fn().mockResolvedValue(undefined),
      getDatabaseName: jest.fn().mockReturnValue('ss_node_data_proj_1'),
    } as unknown as TdengineDatabaseService;
    adapter = new TdengineAdapterService(databaseService);

    const points = Array.from({ length: 1000 }, (_, index) => createPoint({ value: index }));

    const result = await adapter.write(points);

    expect(result.success).toBe(true);
    expect(databaseService.ensureSubtables).toHaveBeenCalledWith(points);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('http://tdengine-test:6041/influxdb/v1/write');
    expect(url).toContain('db=ss_node_data_proj_1');
    expect(url).toContain('precision=ns');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(expectedBasicToken());
    expect(String(init.body)).toContain('tag_values,tagId=tag-1,deviceId=dev-1,projectId=proj-1');
  });

  it('TC-TDE-AD-011: should shunt non-numeric values to value_text field', async () => {
    const points = Array.from({ length: 1000 }, (_, index) =>
      createPoint({ value: index === 0 ? 'OPEN' : index }),
    );

    await adapter.write(points);

    const [, init] = fetchSpy.mock.calls[0];
    const firstLine = String(init.body).split('\n')[0];
    expect(firstLine).toContain('value_text="OPEN"');
    expect(firstLine).not.toMatch(/,value=/);
  });

  it('TC-TDE-AD-012: should return failure when writing after close', async () => {
    await adapter.close();

    const result = await adapter.write([createPoint()]);

    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
  });

  // ──────────── read ────────────

  it('TC-TDE-AD-020: should query via /rest/sql and normalize response', async () => {
    const restResponse = JSON.stringify({
      status: 'succ',
      code: 0,
      column_meta: [
        ['ts', 'TIMESTAMP', 8],
        ['tagId', 'VARCHAR', 64],
        ['deviceId', 'VARCHAR', 64],
        ['projectId', 'VARCHAR', 64],
        ['value', 'DOUBLE', 8],
        ['quality', 'INT', 4],
      ],
      data: [['2026-01-01T00:00:00Z', 'tag-1', 'dev-1', 'proj-1', 42.5, 192]],
    });
    fetchSpy.mockResolvedValue(createResponse({ text: () => Promise.resolve(restResponse) }));

    const points = await adapter.read({ tagIds: ['tag-1'] });

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(42.5);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://tdengine-test:6041/rest/sql/ss_node_data');
    expect(init.headers.Authorization).toBe(expectedBasicToken());
    expect(String(init.body)).toContain('SELECT ts, tagId');
    expect(String(init.body)).toContain("tagId IN ('tag-1')");
  });

  it('TC-TDE-AD-021: should throw with engine label on HTTP error', async () => {
    fetchSpy.mockResolvedValue(
      createResponse({ ok: false, status: 500, text: () => Promise.resolve('boom') }),
    );

    await expect(adapter.read({ tagIds: ['tag-1'] })).rejects.toThrow(
      /TDengine query failed \(500\)/,
    );
  });

  // ──────────── delete ────────────

  it('TC-TDE-AD-030: should reject delete without tagIds (super-table level restricted)', async () => {
    await expect(adapter.delete({ before: new Date() })).rejects.toThrow(/requires tagIds/);
  });

  it('TC-TDE-AD-031: should delete per sub-table via REST and report unknown count as -1', async () => {
    const result = await adapter.delete({
      tagIds: ['tag-1', 'tag-2'],
      before: new Date('2026-01-01T00:00:00Z'),
    });

    // 无 database 服务时走 REST 删除，taosAdapter 不返回行数 → -1（计数不可用）
    expect(result).toBe(-1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    for (const call of fetchSpy.mock.calls) {
      const [url, init] = call;
      expect(url).toContain('/rest/sql/ss_node_data');
      expect(String(init.body)).toMatch(/^DELETE FROM `ss_node_data`\.t_tag\d/);
      expect(String(init.body)).toContain("ts < '2026-01-01T00:00:00.000Z'");
    }
  });

  // ──────────── health ────────────

  it('TC-TDE-AD-040: should return healthy when SERVER_STATUS is succ', async () => {
    fetchSpy.mockResolvedValue(
      createResponse({ json: () => Promise.resolve({ status: 'succ', code: 0 }) }),
    );

    const health = await adapter.health();

    expect(health.status).toBe('healthy');
    expect(String(fetchSpy.mock.calls[0][1].body)).toBe('SELECT SERVER_STATUS');
  });

  it('TC-TDE-AD-041: should return degraded on non-succ status', async () => {
    fetchSpy.mockResolvedValue(
      createResponse({ json: () => Promise.resolve({ status: 'error', code: 500 }) }),
    );

    const health = await adapter.health();

    expect(health.status).toBe('degraded');
  });

  it('TC-TDE-AD-042: should return unhealthy on fetch failure', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const health = await adapter.health();

    expect(health.status).toBe('unhealthy');
    expect(health.details.error).toBe('ECONNREFUSED');
  });
});
