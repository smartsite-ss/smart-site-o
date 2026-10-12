// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { RedisLatestValuePersistWriter } from '../persist/redis-latest-value-persist-writer';
import { DataPoint, PersistWriterRegistry } from '@ss-node/ss-collector-sdk';
import { LatestValueRedisService } from '@ss-node/ss-core';
import type Redis from 'ioredis';

/**
 * RedisLatestValuePersistWriter 单元测试（v3 — 项目→设备→变量 层级结构）
 *
 * v3 变更:
 * - 设备 Key 用 deviceCode(人类可读编码):ss:latest:{projectId}:{deviceCode}
 * - tree 索引(Hash)替换 flat Set:ss:latest:tree:{projectId},HSET deviceId → {deviceCode, deviceName}
 * - 序列化载荷为全语义 7 字段:{projectId, deviceCode, deviceId, tagId, value, quality, timestamp}
 * - handleProjectBeforeDelete 用 readTree(HGETALL tree)替代 SMEMBERS index
 *
 * 测试策略:注入真实的 LatestValueRedisService 实例(其 deviceKey/treeKey/serialize
 * 为纯函数,不依赖 Redis 连接),以验证 Writer 与共享服务的集成。
 */
describe('RedisLatestValuePersistWriter', () => {
  let writer: RedisLatestValuePersistWriter;
  let mockRedisClient: jest.Mocked<Pick<Redis, 'hset' | 'hgetall' | 'del' | 'expire' | 'pipeline'>>;
  let mockPipeline: jest.Mocked<{ hset: jest.Mock; exec: jest.Mock }>;
  let latestValueService: LatestValueRedisService;

  const createDataPoint = (overrides: Partial<DataPoint> = {}): DataPoint => ({
    tagId: 'tag-001',
    deviceId: 'device-uuid-001',
    deviceCode: 'pump-01',
    deviceName: '泵站A',
    projectId: 'project-001',
    value: 42.5,
    quality: 'good',
    timestamp: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  });

  // 期望的序列化载荷(v3 全语义字段)
  const expectedPayload = (point: DataPoint): string => {
    const deviceCode = point.deviceCode || point.deviceId;
    return JSON.stringify({
      projectId: point.projectId,
      deviceCode,
      deviceId: point.deviceId,
      tagId: point.tagId,
      value: point.value,
      quality: point.quality,
      timestamp: point.timestamp instanceof Date ? point.timestamp.toISOString() : point.timestamp,
    });
  };

  beforeEach(() => {
    mockPipeline = {
      hset: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockRedisClient = {
      hset: jest.fn().mockResolvedValue(1),
      hgetall: jest.fn().mockResolvedValue({}),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue(mockPipeline),
    };

    const mockRegistry = new PersistWriterRegistry();
    jest.spyOn(mockRegistry, 'register').mockImplementation(() => undefined);

    // 真实 LatestValueRedisService 实例:deviceKey/treeKey/serialize 为纯函数
    latestValueService = new LatestValueRedisService(mockRedisClient as any);

    writer = new RedisLatestValuePersistWriter(
      mockRedisClient as any,
      mockRegistry,
      latestValueService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────── Name ────────────

  describe('name', () => {
    it('TC-RLV-001: should have name "RedisLatestValue"', () => {
      expect(writer.name).toBe('RedisLatestValue');
    });
  });

  // ──────────── Key generation (v3) ────────────

  describe('key generation (v3)', () => {
    it('TC-RLV-001-A: should generate device key with project and deviceCode', async () => {
      const dataPoint = createDataPoint({ projectId: 'proj-A', deviceCode: 'pump-B' });

      await writer.write(dataPoint);

      // 第一次 hset 是设备 Key
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'ss:latest:proj-A:pump-B',
        'tag-001',
        expect.any(String),
      );
    });

    it('TC-RLV-001-B: should update tree index via HSET (not SADD)', async () => {
      const dataPoint = createDataPoint({
        projectId: 'proj-A',
        deviceId: 'dev-uuid-B',
        deviceCode: 'pump-B',
      });

      await writer.write(dataPoint);

      // 第二次 hset 是 tree 索引:field=deviceId, value={deviceCode, deviceName}
      const treeCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:tree:proj-A',
      );
      expect(treeCall).toBeDefined();
      expect(treeCall![1]).toBe('dev-uuid-B');
      expect(JSON.parse(treeCall![2] as string)).toEqual({
        deviceCode: 'pump-B',
        deviceName: '泵站A',
      });
    });

    it('TC-RLV-001-C: should fall back to deviceId as deviceCode when deviceCode missing', async () => {
      // 兼容旧代码路径:DataPoint 无 deviceCode 时,用 deviceId 作为 key 的一部分
      const dataPoint = createDataPoint({ deviceCode: undefined, deviceId: 'dev-fallback' });

      await writer.write(dataPoint);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:dev-fallback',
        'tag-001',
        expect.any(String),
      );
    });
  });

  // ──────────── Disabled state (no Redis client) ────────────

  describe('when Redis client is null', () => {
    beforeEach(() => {
      const mockRegistry = new PersistWriterRegistry();
      jest.spyOn(mockRegistry, 'register').mockImplementation(() => undefined);
      latestValueService = new LatestValueRedisService(null);
      writer = new RedisLatestValuePersistWriter(null, mockRegistry, latestValueService);
    });

    it('TC-RLV-002: write should be a no-op when Redis client is null', async () => {
      await writer.write(createDataPoint());
    });

    it('TC-RLV-003: writeBatch should be a no-op when Redis client is null', async () => {
      await writer.writeBatch([createDataPoint(), createDataPoint()]);
    });

    it('TC-RLV-004: flush should be a no-op when Redis client is null', async () => {
      await writer.flush();
    });

    it('TC-RLV-005: should still register in PersistWriterRegistry', () => {
      const registry = new PersistWriterRegistry();
      const registerSpy = jest.spyOn(registry, 'register');
      const w = new RedisLatestValuePersistWriter(null, registry, latestValueService);
      w.onModuleInit();
      expect(registerSpy).toHaveBeenCalledTimes(1);
    });

    it('TC-RLV-005-A: handleProjectBeforeDelete should be no-op when Redis client is null', async () => {
      await writer.handleProjectBeforeDelete({ projectId: 'proj-001', timestamp: Date.now() });
    });
  });

  // ──────────── write ────────────

  describe('write', () => {
    it('TC-RLV-006: should hset device key with correct field and v3 payload', async () => {
      const dataPoint = createDataPoint();

      await writer.write(dataPoint);

      // 设备 Key hset(第一次调用)
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-01',
        'tag-001',
        expectedPayload(dataPoint),
      );
    });

    it('TC-RLV-007: should use correct device key based on projectId and deviceCode', async () => {
      const dataPoint = createDataPoint({ projectId: 'custom-project', deviceCode: 'custom-pump' });

      await writer.write(dataPoint);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'ss:latest:custom-project:custom-pump',
        'tag-001',
        expect.any(String),
      );
    });

    it('TC-RLV-008: should convert Date timestamp to ISO string', async () => {
      const specificDate = new Date('2025-12-31T23:59:59.999Z');
      const dataPoint = createDataPoint({ timestamp: specificDate });

      await writer.write(dataPoint);

      const deviceCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:project-001:pump-01',
      );
      const parsed = JSON.parse(deviceCall![2] as string);
      expect(parsed.timestamp).toBe('2025-12-31T23:59:59.999Z');
    });

    it('TC-RLV-009: should handle string timestamp (not Date)', async () => {
      const dataPoint = createDataPoint({ timestamp: '2025-06-01T12:00:00Z' as any });

      await writer.write(dataPoint);

      const deviceCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:project-001:pump-01',
      );
      const parsed = JSON.parse(deviceCall![2] as string);
      expect(parsed.timestamp).toBe('2025-06-01T12:00:00Z');
    });

    it('TC-RLV-010: should handle null value', async () => {
      const dataPoint = createDataPoint({ value: null });

      await writer.write(dataPoint);

      const deviceCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:project-001:pump-01',
      );
      const parsed = JSON.parse(deviceCall![2] as string);
      expect(parsed.value).toBeNull();
    });

    it('TC-RLV-011: should not throw on Redis write error (graceful degradation)', async () => {
      mockRedisClient.hset.mockRejectedValue(new Error('Redis connection refused'));

      await expect(writer.write(createDataPoint())).resolves.toBeUndefined();
    });

    it('TC-RLV-012: should handle non-Error write failures', async () => {
      mockRedisClient.hset.mockRejectedValue('String error');

      await expect(writer.write(createDataPoint())).resolves.toBeUndefined();
    });

    it('TC-RLV-013: should include full semantic fields in payload', async () => {
      const dataPoint = createDataPoint({ deviceId: 'dev-abc-123', deviceCode: 'pump-xyz' });

      await writer.write(dataPoint);

      const deviceCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:project-001:pump-xyz',
      );
      const parsed = JSON.parse(deviceCall![2] as string);
      expect(parsed.deviceId).toBe('dev-abc-123');
      expect(parsed.deviceCode).toBe('pump-xyz');
      expect(parsed.projectId).toBe('project-001');
      expect(parsed.tagId).toBe('tag-001');
    });

    it('TC-RLV-014: should include quality in payload', async () => {
      const dataPoint = createDataPoint({ quality: 'bad' });

      await writer.write(dataPoint);

      const deviceCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:project-001:pump-01',
      );
      const parsed = JSON.parse(deviceCall![2] as string);
      expect(parsed.quality).toBe('bad');
    });

    it('TC-RLV-014-A: tree HSET failure should not affect main write', async () => {
      // 设备 Key hset 成功,tree 索引 hset 失败(fire-and-forget,已被 .catch 捕获)
      mockRedisClient.hset
        .mockResolvedValueOnce(1) // 设备 Key 成功
        .mockRejectedValueOnce(new Error('tree HSET failed')); // tree 失败

      const dataPoint = createDataPoint();

      await expect(writer.write(dataPoint)).resolves.toBeUndefined();
      // 设备 Key 的 hset 仍被调用
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-01',
        'tag-001',
        expect.any(String),
      );
    });
  });

  // ──────────── writeBatch ────────────

  describe('writeBatch', () => {
    it('TC-RLV-015: should use pipeline for batch writes', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 'tag-a', value: 10 }),
        createDataPoint({ tagId: 'tag-b', value: 20 }),
        createDataPoint({ tagId: 'tag-c', value: 30 }),
      ];

      await writer.writeBatch(dataPoints);

      expect(mockRedisClient.pipeline).toHaveBeenCalledTimes(1);
      // 每个点 1 次 device hset + tree 索引 hset(去重后按 deviceId)
      // 3 个点 3 个不同 deviceId(默认都是 device-uuid-001,所以 tree 去重后只有 1 条)
      // device hset: 3 次 + tree hset: 1 次 = 4 次
      expect(mockPipeline.hset).toHaveBeenCalledTimes(4);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
    });

    it('TC-RLV-016: should call hset for each point on correct device key', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 'tag-a', deviceCode: 'pump-1' }),
        createDataPoint({ tagId: 'tag-b', deviceCode: 'pump-1' }),
      ];

      await writer.writeBatch(dataPoints);

      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-1',
        'tag-a',
        expectedPayload(dataPoints[0]),
      );
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-1',
        'tag-b',
        expectedPayload(dataPoints[1]),
      );
    });

    it('TC-RLV-016-A: should add tree index HSET per project (deduped by deviceId)', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 'tag-a', deviceId: 'dev-1', deviceCode: 'pump-1' }),
        createDataPoint({ tagId: 'tag-b', deviceId: 'dev-2', deviceCode: 'pump-2' }),
      ];

      await writer.writeBatch(dataPoints);

      // tree 索引:每 projectId 按 deviceId 去重
      const treeCalls = mockPipeline.hset.mock.calls.filter(
        (c) => c[0] === 'ss:latest:tree:project-001',
      );
      expect(treeCalls).toHaveLength(2);
      expect(treeCalls[0][1]).toBe('dev-1');
      expect(JSON.parse(treeCalls[0][2] as string)).toEqual({
        deviceCode: 'pump-1',
        deviceName: '泵站A',
      });
      expect(treeCalls[1][1]).toBe('dev-2');
    });

    it('TC-RLV-017: should handle empty batch', async () => {
      await writer.writeBatch([]);

      expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
    });

    it('TC-RLV-018: should fallback to individual writes on pipeline error', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Pipeline failed'));
      mockRedisClient.hset.mockResolvedValue(1);

      const dataPoints = [createDataPoint({ tagId: 'a' }), createDataPoint({ tagId: 'b' })];

      await writer.writeBatch(dataPoints);

      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
      // 降级后逐条 write(),每条 write 调用 hset 2 次(设备 Key + tree)
      expect(mockRedisClient.hset).toHaveBeenCalledTimes(4);
    });

    it('TC-RLV-019: should handle individual write failure during fallback', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Pipeline failed'));
      mockRedisClient.hset.mockRejectedValue(new Error('Individual write failed'));

      const dataPoints = [createDataPoint()];

      await expect(writer.writeBatch(dataPoints)).resolves.toBeUndefined();
    });

    it('TC-RLV-020: should handle pipeline with points from different projects', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 'tag-1', projectId: 'project-A', deviceCode: 'pump-a' }),
        createDataPoint({ tagId: 'tag-2', projectId: 'project-B', deviceCode: 'pump-b' }),
      ];

      await writer.writeBatch(dataPoints);

      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'ss:latest:project-A:pump-a',
        'tag-1',
        expect.any(String),
      );
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'ss:latest:project-B:pump-b',
        'tag-2',
        expect.any(String),
      );
    });

    it('TC-RLV-020-A: should create separate tree index HSET per project', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 't1', projectId: 'p-A', deviceId: 'd1', deviceCode: 'c1' }),
        createDataPoint({ tagId: 't2', projectId: 'p-A', deviceId: 'd2', deviceCode: 'c2' }),
        createDataPoint({ tagId: 't3', projectId: 'p-B', deviceId: 'd3', deviceCode: 'c3' }),
      ];

      await writer.writeBatch(dataPoints);

      const pATreeCalls = mockPipeline.hset.mock.calls.filter((c) => c[0] === 'ss:latest:tree:p-A');
      const pBTreeCalls = mockPipeline.hset.mock.calls.filter((c) => c[0] === 'ss:latest:tree:p-B');

      expect(pATreeCalls).toHaveLength(2); // d1, d2
      expect(pBTreeCalls).toHaveLength(1); // d3
    });
  });

  // ──────────── flush ────────────

  describe('flush', () => {
    it('TC-RLV-021: should be a no-op (Redis writes are immediate)', async () => {
      await writer.flush();

      expect(mockRedisClient.hset).not.toHaveBeenCalled();
    });

    it('TC-RLV-022: should be idempotent', async () => {
      await writer.flush();
      await writer.flush();
      await writer.flush();
    });
  });

  // ──────────── Integration patterns ────────────

  describe('write-writeBatch-flush sequence', () => {
    it('TC-RLV-023: should support write then writeBatch pattern', async () => {
      await writer.write(createDataPoint({ tagId: 't1' }));
      await writer.writeBatch([createDataPoint({ tagId: 't2' })]);

      expect(mockRedisClient.hset).toHaveBeenCalledTimes(2); // write: device + tree
      expect(mockPipeline.hset).toHaveBeenCalledTimes(2); // writeBatch: device + tree
    });

    it('TC-RLV-024: should handle large batch with 100+ points', async () => {
      const dataPoints = Array.from({ length: 150 }, (_, i) =>
        createDataPoint({
          tagId: `tag-${i}`,
          value: i,
          deviceCode: `pump-${i % 10}`,
          deviceId: `dev-${i % 10}`,
        }),
      );

      await writer.writeBatch(dataPoints);

      // 150 device hset + 10 tree hset (10 unique deviceId) = 160
      expect(mockPipeline.hset).toHaveBeenCalledTimes(160);
      expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────── Edge cases ────────────

  describe('edge cases', () => {
    it('TC-RLV-025: should overwrite existing value for same tag (HSET semantics)', async () => {
      await writer.write(createDataPoint({ tagId: 'overwrite-tag', value: 100 }));
      await writer.write(createDataPoint({ tagId: 'overwrite-tag', value: 200 }));

      // 两次 write,每次 2 次 hset(device + tree)
      const deviceCalls = mockRedisClient.hset.mock.calls.filter(
        (c) => c[0] === 'ss:latest:project-001:pump-01',
      );
      expect(deviceCalls).toHaveLength(2);
      expect(deviceCalls[0][1]).toBe('overwrite-tag');
      expect(deviceCalls[1][1]).toBe('overwrite-tag');
    });

    it('TC-RLV-026: should handle special characters in tagId', async () => {
      const dataPoint = createDataPoint({ tagId: '标签:温度/测试' });

      await writer.write(dataPoint);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-01',
        '标签:温度/测试',
        expect.any(String),
      );
    });

    it('TC-RLV-027: should handle very large numeric value', async () => {
      const dataPoint = createDataPoint({ value: Number.MAX_SAFE_INTEGER });

      await writer.write(dataPoint);

      const deviceCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:project-001:pump-01',
      );
      const parsed = JSON.parse(deviceCall![2] as string);
      expect(parsed.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('TC-RLV-028: should handle negative value', async () => {
      const dataPoint = createDataPoint({ value: -999.99 });

      await writer.write(dataPoint);

      const deviceCall = mockRedisClient.hset.mock.calls.find(
        (c) => c[0] === 'ss:latest:project-001:pump-01',
      );
      const parsed = JSON.parse(deviceCall![2] as string);
      expect(parsed.value).toBe(-999.99);
    });

    it('TC-RLV-029: should handle points from same project but different devices', async () => {
      const dataPoints = [
        createDataPoint({ tagId: 't1', deviceId: 'dev-A', deviceCode: 'pump-A' }),
        createDataPoint({ tagId: 't2', deviceId: 'dev-B', deviceCode: 'pump-B' }),
        createDataPoint({ tagId: 't3', deviceId: 'dev-C', deviceCode: 'pump-C' }),
      ];

      await writer.writeBatch(dataPoints);

      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-A',
        't1',
        expect.any(String),
      );
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-B',
        't2',
        expect.any(String),
      );
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'ss:latest:project-001:pump-C',
        't3',
        expect.any(String),
      );
      // tree 索引:3 个不同 deviceId
      const treeCalls = mockPipeline.hset.mock.calls.filter(
        (c) => c[0] === 'ss:latest:tree:project-001',
      );
      expect(treeCalls).toHaveLength(3);
    });
  });

  // ──────────── Project deletion (v3 — tree index cleanup) ────────────

  describe('handleProjectBeforeDelete (v3)', () => {
    it('TC-RLV-030: should delete all device keys via tree index lookup', async () => {
      // readTree 内部调用 hgetall(treeKey)
      mockRedisClient.hgetall.mockResolvedValue({
        'dev-uuid-1': JSON.stringify({ deviceCode: 'pump-01', deviceName: '泵站A' }),
        'dev-uuid-2': JSON.stringify({ deviceCode: 'pump-02', deviceName: '泵站B' }),
        'dev-uuid-3': JSON.stringify({ deviceCode: 'pump-03', deviceName: '泵站C' }),
      } as never);

      await writer.handleProjectBeforeDelete({ projectId: 'proj-001', timestamp: Date.now() });

      expect(mockRedisClient.hgetall).toHaveBeenCalledWith('ss:latest:tree:proj-001');
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'ss:latest:proj-001:pump-01',
        'ss:latest:proj-001:pump-02',
        'ss:latest:proj-001:pump-03',
        'ss:latest:tree:proj-001',
      );
    });

    it('TC-RLV-031: should handle project with no devices (empty tree index)', async () => {
      mockRedisClient.hgetall.mockResolvedValue({} as never);

      await writer.handleProjectBeforeDelete({ projectId: 'proj-empty', timestamp: Date.now() });

      expect(mockRedisClient.hgetall).toHaveBeenCalledWith('ss:latest:tree:proj-empty');
      // 仅删除 tree 索引 Key 本身
      expect(mockRedisClient.del).toHaveBeenCalledWith('ss:latest:tree:proj-empty');
    });

    it('TC-RLV-032: should handle hgetall error gracefully', async () => {
      mockRedisClient.hgetall.mockRejectedValue(new Error('HGETALL failed') as never);

      await expect(
        writer.handleProjectBeforeDelete({ projectId: 'proj-001', timestamp: Date.now() }),
      ).resolves.toBeUndefined();
    });

    it('TC-RLV-033: should handle del error gracefully', async () => {
      mockRedisClient.hgetall.mockResolvedValue({
        'dev-1': JSON.stringify({ deviceCode: 'pump-01', deviceName: '泵站A' }),
      } as never);
      mockRedisClient.del.mockRejectedValue(new Error('DEL failed') as never);

      await expect(
        writer.handleProjectBeforeDelete({ projectId: 'proj-001', timestamp: Date.now() }),
      ).resolves.toBeUndefined();
    });

    it('TC-RLV-034: should be no-op for empty payload', async () => {
      await writer.handleProjectBeforeDelete({ projectId: '', timestamp: Date.now() });

      expect(mockRedisClient.hgetall).not.toHaveBeenCalled();
    });

    it('TC-RLV-035: should be no-op for null payload', async () => {
      await writer.handleProjectBeforeDelete(null as any);

      expect(mockRedisClient.hgetall).not.toHaveBeenCalled();
    });

    it('TC-RLV-036: should skip corrupted tree entries during cleanup', async () => {
      mockRedisClient.hgetall.mockResolvedValue({
        'dev-1': '{broken json',
        'dev-2': JSON.stringify({ deviceCode: 'pump-02', deviceName: '泵站B' }),
      } as never);

      await writer.handleProjectBeforeDelete({ projectId: 'proj-001', timestamp: Date.now() });

      // 损坏条目被跳过,仅删除 pump-02 的 key + tree key
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'ss:latest:proj-001:pump-02',
        'ss:latest:tree:proj-001',
      );
    });
  });
});
