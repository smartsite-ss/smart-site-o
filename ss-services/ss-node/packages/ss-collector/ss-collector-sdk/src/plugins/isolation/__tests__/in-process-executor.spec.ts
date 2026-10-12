// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { InProcessExecutor } from '../in-process-executor';
import { IProtocolAdapter, IDeviceContext, ITagContext } from '../../../types';
import { IsolationMode } from '../../plugin.types';

// ============================================================
// 测试用数据
// ============================================================
const mockDevice: IDeviceContext = {
  id: 'dev-001',
  name: 'Test Device',
  type: 'virtual',
  config: { host: '127.0.0.1', port: 502 },
  scanRate: 1000,
  groupId: 'group-001',
  projectId: 'proj-001',
  enabled: true,
  status: 'online',
  lastOnlineAt: new Date(),
  lastDataAt: new Date(),
  createdBy: 'user-001',
  updatedBy: 'user-001',
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const mockTag: ITagContext = {
  id: 'tag-001',
  name: 'Test Tag',
  address: '40001',
  dataType: 'int16',
  deviceId: 'dev-001',
  deviceType: 'virtual',
  projectId: 'proj-001',
  scanRate: 1000,
} as any;

// ============================================================
// Mock Adapter
// ============================================================
const createMockAdapter = () =>
  ({
    connect: jest.fn().mockResolvedValue({ id: 'client-001' }),
    readTag: jest.fn().mockResolvedValue(42),
    writeTag: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    validateChannelConfig: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
  }) as jest.Mocked<IProtocolAdapter>;

// ============================================================
// 测试套件
// ============================================================
describe('InProcessExecutor', () => {
  let executor: InProcessExecutor;
  let adapter: jest.Mocked<IProtocolAdapter>;

  beforeEach(() => {
    executor = new InProcessExecutor();
    adapter = createMockAdapter();
  });

  afterEach(async () => {
    await executor.destroy();
  });

  // ==================== init ====================
  describe('init', () => {
    it('应该初始化协议和适配器', async () => {
      await executor.init('virtual', adapter, {});
      expect(executor.name).toBe('InProcess');
    });
  });

  // ==================== connect ====================
  describe('connect', () => {
    it('应该调用 adapter.connect 并返回 ShardRef', async () => {
      await executor.init('virtual', adapter, {});
      const shard = await executor.connect(mockDevice);

      expect(adapter.connect).toHaveBeenCalledWith(mockDevice);
      expect(shard).toHaveProperty('connectionId');
      expect(shard.protocol).toBe('virtual');
    });

    it('不同设备应有不同的 connectionId', async () => {
      await executor.init('virtual', adapter, {});
      const shard1 = await executor.connect(mockDevice);
      const shard2 = await executor.connect({ ...mockDevice, id: 'dev-002' });

      expect(shard1.connectionId).not.toBe(shard2.connectionId);
    });
  });

  // ==================== readTag ====================
  describe('readTag', () => {
    it('应该调用 adapter.readTag 并返回结果', async () => {
      await executor.init('virtual', adapter, {});
      const shard = await executor.connect(mockDevice);
      const result = await executor.readTag(shard, mockTag);

      expect(adapter.readTag).toHaveBeenCalledWith({ id: 'client-001' }, mockTag);
      expect(result).toBe(42);
    });

    it('连接不存在时应该抛出错误', async () => {
      await executor.init('virtual', adapter, {});
      await expect(
        executor.readTag({ connectionId: 'nonexistent', protocol: 'virtual' }, mockTag),
      ).rejects.toThrow('Connection not found');
    });
  });

  // ==================== writeTag ====================
  describe('writeTag', () => {
    it('应该调用 adapter.writeTag', async () => {
      await executor.init('virtual', adapter, {});
      const shard = await executor.connect(mockDevice);
      await executor.writeTag(shard, mockTag, 100);

      expect(adapter.writeTag).toHaveBeenCalledWith({ id: 'client-001' }, mockTag, 100);
    });

    it('连接不存在时应该抛出错误', async () => {
      await executor.init('virtual', adapter, {});
      await expect(
        executor.writeTag({ connectionId: 'nonexistent', protocol: 'virtual' }, mockTag, 100),
      ).rejects.toThrow('Connection not found');
    });
  });

  // ==================== disconnect ====================
  describe('disconnect', () => {
    it('应该调用 adapter.disconnect 并移除连接', async () => {
      await executor.init('virtual', adapter, {});
      const shard = await executor.connect(mockDevice);
      await executor.disconnect(shard);

      expect(adapter.disconnect).toHaveBeenCalledWith({ id: 'client-001' });
      // 断开后读取应失败
      await expect(executor.readTag(shard, mockTag)).rejects.toThrow('Connection not found');
    });

    it('断开不存在的连接不应报错', async () => {
      await executor.init('virtual', adapter, {});
      await expect(
        executor.disconnect({ connectionId: 'nonexistent', protocol: 'virtual' }),
      ).resolves.toBeUndefined();
    });
  });

  // ==================== getHealth ====================
  describe('getHealth', () => {
    it('新初始化后状态应为 healthy', async () => {
      await executor.init('virtual', adapter, {});
      const health = await executor.getHealth();

      expect(health.mode).toBe(IsolationMode.IN_PROCESS);
      expect(health.status).toBe('healthy');
      expect(health.restartCount).toBe(0);
    });

    it('请求后应统计 requestCount 和 latency', async () => {
      await executor.init('virtual', adapter, {});
      const shard = await executor.connect(mockDevice);
      await executor.readTag(shard, mockTag);
      await executor.readTag(shard, mockTag);

      const health = await executor.getHealth();
      expect(health.requestCount).toBe(2);
      expect(health.errorCount).toBe(0);
      expect(health.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('错误应统计 errorCount', async () => {
      await executor.init('virtual', adapter, {});
      // 使用不存在的连接
      try {
        await executor.readTag({ connectionId: 'nonexistent', protocol: 'virtual' }, mockTag);
      } catch {}

      const health = await executor.getHealth();
      expect(health.errorCount).toBe(1);
    });
  });

  // ==================== destroy ====================
  describe('destroy', () => {
    it('应该断开所有连接', async () => {
      await executor.init('virtual', adapter, {});
      await executor.connect(mockDevice);
      await executor.connect({ ...mockDevice, id: 'dev-002' });

      await executor.destroy();
      expect(adapter.disconnect).toHaveBeenCalledTimes(2);
    });

    it('destroy 后 getHealth 状态应为 starting', async () => {
      await executor.init('virtual', adapter, {});
      await executor.destroy();

      const health = await executor.getHealth();
      expect(health.status).toBe('starting');
    });
  });
});
