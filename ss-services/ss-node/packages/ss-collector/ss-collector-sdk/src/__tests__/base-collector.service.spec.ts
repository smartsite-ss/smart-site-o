// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger } from '@nestjs/common';
import { BaseCollectorService } from '../base-collector.service';
import { ITagContext } from '../types';

// ============================================================
// 测试用具体子类 — 把抽象方法暴露为 jest.fn 以便断言
// ============================================================

class TestCollector extends BaseCollectorService {
  // 实现抽象方法（用 jest.fn 以便断言）
  connect = jest.fn();
  doReadTag = jest.fn();
  doWriteTag = jest.fn();
  doDisconnect = jest.fn();

  // 暴露 protected 方法供测试调用
  trackClient(deviceId: string, client: any): void {
    super.trackClient(deviceId, client);
  }
  getConnectionStatus(deviceId: string): boolean {
    return super.getConnectionStatus(deviceId);
  }
  markDisconnected(deviceId: string): void {
    super.markDisconnected(deviceId);
  }
  getClientEntries(): ReadonlyMap<string, { client: any; connectedAt: Date }> {
    return super.getClientEntries();
  }
  startAutoReconnect(deviceId: string, reconnectFn: () => Promise<any>, interval?: number): void {
    super.startAutoReconnect(deviceId, reconnectFn, interval);
  }
  stopAutoReconnect(deviceId: string): void {
    super.stopAutoReconnect(deviceId);
  }
}

function makeTag(overrides: Partial<ITagContext> = {}): ITagContext {
  return {
    id: 'tag-001',
    name: '温度',
    address: '40001',
    dataType: 'float',
    ...overrides,
  };
}

describe('BaseCollectorService', () => {
  let service: TestCollector;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new TestCollector();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // -------------------------------------------------------------
  // validateChannelConfig（默认实现）
  // -------------------------------------------------------------
  describe('validateChannelConfig', () => {
    it('默认应返回 valid=true 与空错误列表', async () => {
      const result = await service.validateChannelConfig({ host: '1.2.3.4' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('对任意配置都应返回 valid=true（默认空实现）', async () => {
      const result = await service.validateChannelConfig({
        any: { nested: 'value' },
      });
      expect(result.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // readTag（带重试）
  // -------------------------------------------------------------
  describe('readTag', () => {
    it('首次成功应直接返回结果不重试', async () => {
      const client = { id: 'c1' };
      const tag = makeTag();
      const expected = { tagId: 'tag-001', value: 42, timestamp: new Date() };
      service.doReadTag.mockResolvedValueOnce(expected);

      const result = await service.readTag(client, tag);

      expect(result).toEqual(expected);
      expect(service.doReadTag).toHaveBeenCalledTimes(1);
    });

    it('失败时按默认 maxRetries=3 重试 3 次', async () => {
      jest.useRealTimers();
      const client = { id: 'c1' };
      const tag = makeTag(); // 未设置 maxRetries，默认 3
      service.doReadTag.mockImplementation(() => Promise.reject(new Error('read fail')));

      await expect(service.readTag(client, tag)).rejects.toThrow('read fail');
      expect(service.doReadTag).toHaveBeenCalledTimes(3);
    }, 15000);

    it('中途成功应停止重试并返回结果', async () => {
      const client = { id: 'c1' };
      const tag = makeTag({ maxRetries: 3 });
      const expected = { tagId: 'tag-001', value: 99, timestamp: new Date() };
      service.doReadTag
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce(expected);

      jest.useFakeTimers();
      const promise = service.readTag(client, tag);
      promise.catch(() => {}); // 立即附加 handler 避免 unhandledRejection
      await jest.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(result).toEqual(expected);
      expect(service.doReadTag).toHaveBeenCalledTimes(3);
    });

    it('应使用 tag.maxRetries 覆盖默认值', async () => {
      const client = { id: 'c1' };
      const tag = makeTag({ maxRetries: 1 });
      service.doReadTag.mockImplementation(() => Promise.reject(new Error('fail')));

      await expect(service.readTag(client, tag)).rejects.toThrow('fail');
      expect(service.doReadTag).toHaveBeenCalledTimes(1);
    });

    it('抛出的错误应是最后一次错误', async () => {
      jest.useRealTimers();
      const client = { id: 'c1' };
      const tag = makeTag({ maxRetries: 2 });
      service.doReadTag
        .mockImplementationOnce(() => Promise.reject(new Error('first')))
        .mockImplementationOnce(() => Promise.reject(new Error('second')));

      await expect(service.readTag(client, tag)).rejects.toThrow('second');
      expect(service.doReadTag).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  // -------------------------------------------------------------
  // writeTag（带重试）
  // -------------------------------------------------------------
  describe('writeTag', () => {
    it('首次成功应直接返回不重试', async () => {
      const client = { id: 'c1' };
      const tag = makeTag();
      service.doWriteTag.mockResolvedValue(undefined);

      await service.writeTag(client, tag, 100);

      expect(service.doWriteTag).toHaveBeenCalledTimes(1);
      expect(service.doWriteTag).toHaveBeenCalledWith(client, tag, 100);
    });

    it('失败时按默认 maxRetries=2 重试 2 次', async () => {
      jest.useRealTimers();
      const client = { id: 'c1' };
      const tag = makeTag(); // 默认 2 次
      service.doWriteTag.mockImplementation(() => Promise.reject(new Error('write fail')));

      await expect(service.writeTag(client, tag, 100)).rejects.toThrow('write fail');
      expect(service.doWriteTag).toHaveBeenCalledTimes(2);
    }, 15000);

    it('应使用 tag.maxRetries 覆盖默认值', async () => {
      jest.useRealTimers();
      const client = { id: 'c1' };
      const tag = makeTag({ maxRetries: 4 });
      service.doWriteTag.mockImplementation(() => Promise.reject(new Error('fail')));

      await expect(service.writeTag(client, tag, 1)).rejects.toThrow('fail');
      expect(service.doWriteTag).toHaveBeenCalledTimes(4);
    }, 15000);

    it('中途成功应停止重试', async () => {
      const client = { id: 'c1' };
      const tag = makeTag({ maxRetries: 3 });
      service.doWriteTag.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(undefined);

      jest.useFakeTimers();
      const promise = service.writeTag(client, tag, 1);
      promise.catch(() => {}); // 立即附加 handler 避免 unhandledRejection
      await jest.advanceTimersByTimeAsync(5000);
      await promise;

      expect(service.doWriteTag).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------
  // disconnect
  // -------------------------------------------------------------
  describe('disconnect', () => {
    it('应调用 doDisconnect 并清理连接状态', async () => {
      const client = { id: 'c1' };
      service.trackClient('dev-001', client);
      expect(service.getConnectionStatus('dev-001')).toBe(true);

      service.doDisconnect.mockResolvedValue(undefined);
      await service.disconnect(client);

      expect(service.doDisconnect).toHaveBeenCalledWith(client);
      expect(service.getConnectionStatus('dev-001')).toBe(false);
      expect(service.getClientEntries().has('dev-001')).toBe(false);
    });

    it('doDisconnect 抛错时应吞掉异常并仍清理状态', async () => {
      const client = { id: 'c1' };
      service.trackClient('dev-001', client);
      service.doDisconnect.mockImplementation(() => Promise.reject(new Error('disconnect fail')));

      await expect(service.disconnect(client)).resolves.toBeUndefined();
      expect(service.getConnectionStatus('dev-001')).toBe(false);
    });

    it('未跟踪的客户端调用 disconnect 应仍调用 doDisconnect', async () => {
      const client = { id: 'unknown' };
      service.doDisconnect.mockResolvedValue(undefined);
      await service.disconnect(client);
      expect(service.doDisconnect).toHaveBeenCalledWith(client);
    });
  });

  // -------------------------------------------------------------
  // onModuleDestroy
  // -------------------------------------------------------------
  describe('onModuleDestroy', () => {
    it('应断开所有跟踪的客户端连接', async () => {
      const c1 = { id: 'c1' };
      const c2 = { id: 'c2' };
      service.trackClient('dev-1', c1);
      service.trackClient('dev-2', c2);
      service.doDisconnect.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(service.doDisconnect).toHaveBeenCalledWith(c1);
      expect(service.doDisconnect).toHaveBeenCalledWith(c2);
      expect(service.getClientEntries().size).toBe(0);
    });

    it('doDisconnect 抛错时应静默忽略不影响其他连接', async () => {
      const c1 = { id: 'c1' };
      const c2 = { id: 'c2' };
      service.trackClient('dev-1', c1);
      service.trackClient('dev-2', c2);
      service.doDisconnect
        .mockImplementationOnce(() => Promise.reject(new Error('fail')))
        .mockResolvedValueOnce(undefined);

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect(service.getClientEntries().size).toBe(0);
    });

    it('应清理所有重连定时器', async () => {
      const reconnectFn = jest.fn().mockResolvedValue(undefined);
      jest.useFakeTimers();
      service.startAutoReconnect('dev-1', reconnectFn, 1000);

      await service.onModuleDestroy();

      // 推进时间，验证重连不再触发
      jest.advanceTimersByTime(5000);
      expect(reconnectFn).not.toHaveBeenCalled();
    });

    it('无连接时应安全执行', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // trackClient / getConnectionStatus / markDisconnected
  // -------------------------------------------------------------
  describe('trackClient & getConnectionStatus', () => {
    it('trackClient 后应记录连接状态为 true', () => {
      const client = { id: 'c1' };
      service.trackClient('dev-1', client);

      expect(service.getConnectionStatus('dev-1')).toBe(true);
      expect(service.getClientEntries().has('dev-1')).toBe(true);
      const entry = service.getClientEntries().get('dev-1')!;
      expect(entry.client).toBe(client);
      expect(entry.connectedAt).toBeInstanceOf(Date);
    });

    it('getConnectionStatus 未跟踪设备应返回 false', () => {
      expect(service.getConnectionStatus('unknown')).toBe(false);
    });

    it('markDisconnected 应将设备状态置为 false 并从 clients 移除', () => {
      const client = { id: 'c1' };
      service.trackClient('dev-1', client);
      expect(service.getConnectionStatus('dev-1')).toBe(true);

      service.markDisconnected('dev-1');

      expect(service.getConnectionStatus('dev-1')).toBe(false);
      expect(service.getClientEntries().has('dev-1')).toBe(false);
    });

    it('getClientEntries 应返回只读 Map', () => {
      const entries = service.getClientEntries();
      expect(entries).toBeInstanceOf(Map);
      // Map 方法仍可调用，但语义上是只读
      expect(entries.size).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // startAutoReconnect / stopAutoReconnect
  // -------------------------------------------------------------
  describe('startAutoReconnect & stopAutoReconnect', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('应在间隔到达时调用 reconnectFn，成功后停止', async () => {
      const reconnectFn = jest.fn().mockResolvedValue(undefined);
      service.startAutoReconnect('dev-1', reconnectFn, 1000);

      // 500ms: 不应调用
      jest.advanceTimersByTime(500);
      expect(reconnectFn).not.toHaveBeenCalled();

      // 1000ms: 应调用一次
      jest.advanceTimersByTime(500);
      await Promise.resolve(); // 让 setInterval 回调中的 await resolve
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // 成功后应停止定时器，再推进时间不应再次调用
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(reconnectFn).toHaveBeenCalledTimes(1);
    });

    it('reconnectFn 成功后应停止重连', async () => {
      const reconnectFn = jest.fn().mockResolvedValue(undefined);
      service.startAutoReconnect('dev-1', reconnectFn, 1000);

      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // 再推进时间，不应再次调用
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(reconnectFn).toHaveBeenCalledTimes(1);
    });

    it('reconnectFn 失败时应继续重试不抛错', async () => {
      const reconnectFn = jest
        .fn()
        .mockImplementation(() => Promise.reject(new Error('connect fail')));
      service.startAutoReconnect('dev-1', reconnectFn, 1000);

      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(reconnectFn).toHaveBeenCalledTimes(1);

      // 推进时间，应再次调用
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(reconnectFn).toHaveBeenCalledTimes(2);
    });

    it('stopAutoReconnect 应停止定时器', () => {
      const reconnectFn = jest.fn().mockResolvedValue(undefined);
      service.startAutoReconnect('dev-1', reconnectFn, 1000);

      service.stopAutoReconnect('dev-1');

      jest.advanceTimersByTime(5000);
      expect(reconnectFn).not.toHaveBeenCalled();
    });

    it('对未启动重连的设备 stopAutoReconnect 应安全无操作', () => {
      expect(() => service.stopAutoReconnect('unknown')).not.toThrow();
    });

    it('重复 startAutoReconnect 应先停止旧定时器再启动新定时器', () => {
      const fn1 = jest.fn().mockResolvedValue(undefined);
      const fn2 = jest.fn().mockResolvedValue(undefined);

      service.startAutoReconnect('dev-1', fn1, 1000);
      service.startAutoReconnect('dev-1', fn2, 1000);

      jest.advanceTimersByTime(1000);
      // 只有 fn2 应被调用
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('默认间隔应为 30000ms', () => {
      const reconnectFn = jest.fn().mockResolvedValue(undefined);
      service.startAutoReconnect('dev-1', reconnectFn);

      // 29s 不应触发
      jest.advanceTimersByTime(29000);
      expect(reconnectFn).not.toHaveBeenCalled();

      // 30s 应触发
      jest.advanceTimersByTime(1000);
      expect(reconnectFn).toHaveBeenCalledTimes(1);
    });
  });
});
