// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { WorkerThreadExecutor } from '../worker-thread-executor';
import { IsolationMode } from '../../plugin.types';
import { IDeviceContext, ITagContext } from '../../../types';

// ============================================================
// 真正的 EventEmitter 风格 Mock Worker
// ============================================================
const createMockWorker = () => {
  const handlers: Record<string, Function[]> = {};
  return {
    handlers,
    on: jest.fn((event: string, handler: Function) => {
      (handlers[event] ??= []).push(handler);
    }),
    off: jest.fn((event: string, handler: Function) => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== handler);
    }),
    emit: (event: string, ...args: any[]) => {
      for (const h of handlers[event] || []) h(...args);
    },
    postMessage: jest.fn(),
    terminate: jest.fn().mockResolvedValue(undefined),
    threadId: 12345,
  };
};

let mockWorkerInstance: ReturnType<typeof createMockWorker>;

jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => {
    mockWorkerInstance = createMockWorker();
    return mockWorkerInstance;
  }),
}));

// ============================================================
// Mock EventBusService
// ============================================================
const createMockEventBus = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
  eventNames: jest.fn().mockReturnValue([]),
  listeners: jest.fn().mockReturnValue([]),
  listenerCount: jest.fn().mockReturnValue(0),
  rawListeners: jest.fn().mockReturnValue([]),
  hasListeners: jest.fn().mockReturnValue(false),
  waitFor: jest.fn(),
  emitAsync: jest.fn(),
  emitMany: jest.fn(),
  addListener: jest.fn(),
  prependListener: jest.fn(),
  prependOnceListener: jest.fn(),
  removeListener: jest.fn(),
  setMaxListeners: jest.fn(),
  getMaxListeners: jest.fn().mockReturnValue(10),
  listenTo: jest.fn(),
  stopListeningTo: jest.fn(),
  toJSON: jest.fn().mockReturnValue({}),
  eventBus: {} as any,
});

// ============================================================
// 测试数据
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
// 辅助函数
// ============================================================
const getWorker = () => mockWorkerInstance;

const simulateReady = () => {
  getWorker().emit('message', { type: 'ready', protocol: 'virtual' });
};

const simulateResponse = (requestId: string, payload: any) => {
  getWorker().emit('message', { type: 'result', requestId, payload });
};

const simulateError = (requestId: string, message: string) => {
  getWorker().emit('message', { type: 'error', requestId, error: { message } });
};

const simulateCrash = (msg: string) => {
  getWorker().emit('error', new Error(msg));
};

// ============================================================
// 测试套件
// ============================================================
describe('WorkerThreadExecutor', () => {
  let executor: WorkerThreadExecutor;
  const { Worker } = require('worker_threads');

  beforeEach(() => {
    mockWorkerInstance = null as any;
    executor = new WorkerThreadExecutor(createMockEventBus() as any);
  });

  afterEach(async () => {
    try {
      await executor.destroy();
    } catch {}
  });

  describe('init', () => {
    it('应该创建 Worker 并等待 ready', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;
      expect(Worker).toHaveBeenCalled();
      expect(executor.name).toBe('WorkerThread');
    });

    it('Worker 启动超时应抛出错误', async () => {
      const initPromise = executor.init('virtual', null, { startupTimeoutMs: 100 });
      jest.advanceTimersByTime(200);
      await expect(initPromise).rejects.toThrow('startup timeout');
    });
  });

  describe('connect', () => {
    it('应该发送 connect 消息并返回 ShardRef', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      const connectPromise = executor.connect(mockDevice);
      const connectCall = getWorker().postMessage.mock.calls.find(
        (call: any[]) => call[0].type === 'connect',
      )?.[0];
      simulateResponse(connectCall.requestId, { connectionId: 'conn-001', protocol: 'virtual' });

      const shard = await connectPromise;
      expect(shard.connectionId).toBe('conn-001');
      expect(shard.protocol).toBe('virtual');
    });
  });

  describe('readTag', () => {
    it('应该发送 read_tag 消息并返回结果', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      const shard = { connectionId: 'conn-001', protocol: 'virtual' };
      const readPromise = executor.readTag(shard, mockTag);
      const readCall = getWorker().postMessage.mock.calls.find(
        (call: any[]) => call[0].type === 'read_tag',
      )?.[0];
      simulateResponse(readCall.requestId, 42);

      expect(await readPromise).toBe(42);
    });

    it('Worker 错误应传播到调用方', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      const shard = { connectionId: 'conn-001', protocol: 'virtual' };
      const readPromise = executor.readTag(shard, mockTag);
      const readCall = getWorker().postMessage.mock.calls.find(
        (call: any[]) => call[0].type === 'read_tag',
      )?.[0];
      simulateError(readCall.requestId, 'Read failed');

      await expect(readPromise).rejects.toThrow('Read failed');
    });

    it('请求超时应抛出错误', async () => {
      const initPromise = executor.init('virtual', null, { requestTimeoutMs: 100 });
      simulateReady();
      await initPromise;

      const readPromise = executor.readTag({ connectionId: 'c1', protocol: 'virtual' }, mockTag);
      jest.advanceTimersByTime(200);
      await expect(readPromise).rejects.toThrow('Worker request timeout');
    });
  });

  describe('writeTag', () => {
    it('应该发送 write_tag 消息', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      const shard = { connectionId: 'conn-001', protocol: 'virtual' };
      const writePromise = executor.writeTag(shard, mockTag, 100);
      const writeCall = getWorker().postMessage.mock.calls.find(
        (call: any[]) => call[0].type === 'write_tag',
      )?.[0];
      simulateResponse(writeCall.requestId, undefined);

      await expect(writePromise).resolves.toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('应该发送 disconnect 消息', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      const shard = { connectionId: 'conn-001', protocol: 'virtual' };
      const disconnectPromise = executor.disconnect(shard);
      const dc = getWorker().postMessage.mock.calls.find(
        (call: any[]) => call[0].type === 'disconnect',
      )?.[0];
      simulateResponse(dc.requestId, undefined);

      await expect(disconnectPromise).resolves.toBeUndefined();
    });
  });

  describe('getHealth', () => {
    it('应该返回健康状态', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      const healthPromise = executor.getHealth();
      const healthCall = getWorker().postMessage.mock.calls.find(
        (call: any[]) => call[0].type === 'health',
      )?.[0];
      simulateResponse(healthCall.requestId, {
        mode: IsolationMode.WORKER_THREAD,
        status: 'healthy',
        uptime: 1000,
        requestCount: 10,
        errorCount: 0,
        avgLatencyMs: 5.2,
      });

      const health = await healthPromise;
      expect(health.status).toBe('healthy');
      expect(health.threadId).toBe(12345);
      expect(health.restartCount).toBe(0);
    });

    it('Worker 无响应时返回 degraded', async () => {
      const initPromise = executor.init('virtual', null, { requestTimeoutMs: 100 });
      simulateReady();
      await initPromise;

      const healthPromise = executor.getHealth();
      jest.advanceTimersByTime(200);
      const health = await healthPromise;
      expect(health.status).toBe('degraded');
    });
  });

  describe('crash recovery', () => {
    it('Worker 崩溃时应触发 plugin.isolation.crash 事件', async () => {
      const eventBus = createMockEventBus();
      executor = new WorkerThreadExecutor(eventBus as any);

      const initPromise = executor.init('virtual', null, { autoRestart: true, maxRestarts: 5 });
      simulateReady();
      await initPromise;

      simulateCrash('Worker crashed unexpectedly');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'plugin.isolation.crash',
        expect.objectContaining({
          protocol: 'virtual',
          mode: IsolationMode.WORKER_THREAD,
        }),
      );
    });

    it('崩溃后应将所有 pending 请求 reject', async () => {
      const initPromise = executor.init('virtual', null, { autoRestart: true, maxRestarts: 5 });
      simulateReady();
      await initPromise;

      const shard = { connectionId: 'conn-001', protocol: 'virtual' };
      const readPromise = executor.readTag(shard, mockTag);

      simulateCrash('Worker crashed');

      await expect(readPromise).rejects.toThrow('Worker crashed');
    });

    it('超过最大重启次数不应再重启', async () => {
      const initPromise = executor.init('virtual', null, { autoRestart: true, maxRestarts: 0 });
      simulateReady();
      await initPromise;

      Worker.mockClear();

      simulateCrash('Worker crashed');

      // 不应再创建新的 Worker（maxRestarts=0, restartCount=1 > 0）
      expect(Worker).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('应该发送 shutdown 消息并 terminate Worker', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      await executor.destroy();

      expect(getWorker().postMessage).toHaveBeenCalledWith({ type: 'shutdown' });
      expect(getWorker().terminate).toHaveBeenCalled();
    });

    it('destroy 后 getHealth 应返回 dead', async () => {
      const initPromise = executor.init('virtual', null, {});
      simulateReady();
      await initPromise;

      await executor.destroy();

      const health = await executor.getHealth();
      expect(health.status).toBe('dead');
    });
  });
});
