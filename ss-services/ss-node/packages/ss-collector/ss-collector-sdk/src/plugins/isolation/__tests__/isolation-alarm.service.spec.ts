// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IsolationAlarmService } from '../isolation-alarm.service';
import { IsolationMode } from '../../plugin.types';

// ============================================================
// Mock EventBusService
// ============================================================
const createMockEventBus = () => {
  const handlers: Record<string, Function[]> = {};
  return {
    handlers,
    emit: jest.fn(),
    on: jest.fn((event: string, handler: Function) => {
      (handlers[event] ??= []).push(handler);
    }),
    off: jest.fn((event: string) => {
      delete handlers[event];
    }),
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
    /** 手动触发事件（用于测试） */
    trigger: (event: string, payload: any) => {
      for (const h of handlers[event] || []) h(payload);
    },
  };
};

// ============================================================
// Mock IsolationFactory
// ============================================================
const createMockIsolationFactory = (
  overrides: {
    getAllHealth?: jest.Mock;
    pluginRegistry?: any;
  } = {},
) => ({
  getAllHealth: overrides.getAllHealth ?? jest.fn().mockResolvedValue(new Map()),
  getExecutor: jest.fn(),
  prepare: jest.fn(),
  isIsolated: jest.fn(),
  pluginRegistry: overrides.pluginRegistry ?? {
    getPlugin: jest.fn().mockReturnValue(null),
  },
  onModuleDestroy: jest.fn(),
});

// ============================================================
// 测试数据
// ============================================================
const createCrashPayload = (
  overrides: Partial<{
    protocol: string;
    mode: IsolationMode;
    restartCount: number;
    error: string;
    timestamp: number;
  }> = {},
) => ({
  protocol: 'virtual',
  mode: IsolationMode.WORKER_THREAD,
  restartCount: 1,
  error: 'Worker crashed',
  timestamp: Date.now(),
  ...overrides,
});

const createHealthData = (
  overrides: Partial<{
    status: string;
    avgLatencyMs: number;
  }> = {},
) => ({
  status: 'healthy',
  avgLatencyMs: 5,
  ...overrides,
});

// ============================================================
// 测试套件
// ============================================================
describe('IsolationAlarmService', () => {
  let service: IsolationAlarmService;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let isolationFactory: ReturnType<typeof createMockIsolationFactory>;

  beforeEach(() => {
    jest.useFakeTimers();
    eventBus = createMockEventBus();
    isolationFactory = createMockIsolationFactory();
    service = new IsolationAlarmService(isolationFactory as any, eventBus as any);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('应该订阅 plugin.isolation.crash 事件', () => {
      expect(eventBus.on).toHaveBeenCalledWith('plugin.isolation.crash', expect.any(Function));
    });

    it('应该启动健康检查定时器', () => {
      // 验证 timer 已启动（setInterval 被调用）
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('onCrash', () => {
    it('崩溃事件应记录到 restartRecords', () => {
      const payload = createCrashPayload();
      eventBus.trigger('plugin.isolation.crash', payload);

      const record = service.getRestartRecord('virtual');
      expect(record).toBeDefined();
      expect(record!.restartCount).toBe(1);
      expect(record!.mode).toBe(IsolationMode.WORKER_THREAD);
    });

    it('多次崩溃应累加重启次数', () => {
      eventBus.trigger('plugin.isolation.crash', createCrashPayload({ restartCount: 1 }));
      eventBus.trigger('plugin.isolation.crash', createCrashPayload({ restartCount: 2 }));
      eventBus.trigger('plugin.isolation.crash', createCrashPayload({ restartCount: 3 }));

      const record = service.getRestartRecord('virtual');
      expect(record!.restartCount).toBe(3);
    });

    it('不同协议应有独立的重启记录', () => {
      eventBus.trigger(
        'plugin.isolation.crash',
        createCrashPayload({ protocol: 'modbus_tcp', restartCount: 2 }),
      );
      eventBus.trigger(
        'plugin.isolation.crash',
        createCrashPayload({ protocol: 'opcua', restartCount: 5 }),
      );

      expect(service.getRestartRecord('modbus_tcp')!.restartCount).toBe(2);
      expect(service.getRestartRecord('opcua')!.restartCount).toBe(5);
    });
  });

  describe('checkHighRestart', () => {
    it('10 分钟内重启超过 3 次应触发告警', () => {
      const now = Date.now();
      // 模拟 4 次崩溃，时间跨度 < 10 分钟
      eventBus.trigger(
        'plugin.isolation.crash',
        createCrashPayload({
          restartCount: 4,
          timestamp: now,
        }),
      );

      // 手动标记 firstRestartAt 在 5 分钟前
      const record = service.getRestartRecord('virtual')!;
      record.firstRestartAt = now - 5 * 60 * 1000;

      // 第 5 次崩溃
      eventBus.trigger(
        'plugin.isolation.crash',
        createCrashPayload({
          restartCount: 5,
          timestamp: now,
        }),
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'plugin.isolation.alarm',
        expect.objectContaining({
          alarmType: 'worker-high-restart',
          protocol: 'virtual',
          level: 'warning',
        }),
      );
    });

    it('重启次数未超过阈值不应触发告警', () => {
      eventBus.trigger('plugin.isolation.crash', createCrashPayload({ restartCount: 2 }));
      eventBus.trigger('plugin.isolation.crash', createCrashPayload({ restartCount: 3 }));

      const alarmCalls = eventBus.emit.mock.calls.filter(
        (call: any[]) => call[1]?.alarmType === 'worker-high-restart',
      );
      expect(alarmCalls.length).toBe(0);
    });
  });

  describe('performHealthCheck', () => {
    it('dead 状态应触发 worker-dead 告警', async () => {
      const mockGetAllHealth = jest
        .fn()
        .mockResolvedValue(new Map([['virtual', createHealthData({ status: 'dead' })]]));
      const mockPluginRegistry = {
        getPlugin: jest.fn().mockReturnValue({
          meta: { isolationMode: IsolationMode.WORKER_THREAD },
        }),
      };

      service.onModuleDestroy(); // 清理旧实例
      const factory = createMockIsolationFactory({
        getAllHealth: mockGetAllHealth,
        pluginRegistry: mockPluginRegistry,
      });
      service = new IsolationAlarmService(factory as any, eventBus as any);

      // 推进定时器触发健康检查
      jest.advanceTimersByTime(30000);

      // 等待异步完成
      await Promise.resolve();

      expect(eventBus.emit).toHaveBeenCalledWith(
        'plugin.isolation.alarm',
        expect.objectContaining({
          alarmType: 'worker-dead',
          protocol: 'virtual',
          level: 'critical',
        }),
      );
    });

    it('延迟超过阈值应触发 worker-high-latency 告警', async () => {
      const mockGetAllHealth = jest
        .fn()
        .mockResolvedValue(new Map([['virtual', createHealthData({ avgLatencyMs: 15000 })]]));
      const mockPluginRegistry = {
        getPlugin: jest.fn().mockReturnValue({
          meta: { isolationMode: IsolationMode.WORKER_THREAD },
        }),
      };

      service.onModuleDestroy();
      const factory = createMockIsolationFactory({
        getAllHealth: mockGetAllHealth,
        pluginRegistry: mockPluginRegistry,
      });
      service = new IsolationAlarmService(factory as any, eventBus as any);

      jest.advanceTimersByTime(30000);
      await Promise.resolve();

      expect(eventBus.emit).toHaveBeenCalledWith(
        'plugin.isolation.alarm',
        expect.objectContaining({
          alarmType: 'worker-high-latency',
          protocol: 'virtual',
          level: 'warning',
        }),
      );
    });

    it('健康状态不应触发告警', async () => {
      const mockGetAllHealth = jest
        .fn()
        .mockResolvedValue(
          new Map([['virtual', createHealthData({ status: 'healthy', avgLatencyMs: 5 })]]),
        );

      service.onModuleDestroy();
      const factory = createMockIsolationFactory({ getAllHealth: mockGetAllHealth });
      service = new IsolationAlarmService(factory as any, eventBus as any);

      jest.advanceTimersByTime(30000);
      await Promise.resolve();

      const alarmCalls = eventBus.emit.mock.calls.filter(
        (call: any[]) => call[0] === 'plugin.isolation.alarm',
      );
      expect(alarmCalls.length).toBe(0);
    });
  });

  describe('getRestartRecords', () => {
    it('应该返回所有重启记录的副本', () => {
      eventBus.trigger('plugin.isolation.crash', createCrashPayload({ protocol: 'modbus_tcp' }));
      eventBus.trigger('plugin.isolation.crash', createCrashPayload({ protocol: 'opcua' }));

      const records = service.getRestartRecords();
      expect(records.size).toBe(2);
      expect(records.has('modbus_tcp')).toBe(true);
      expect(records.has('opcua')).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('应该清理定时器和事件监听', () => {
      service.onModuleDestroy();

      expect(eventBus.off).toHaveBeenCalledWith('plugin.isolation.crash');
      const records = service.getRestartRecords();
      expect(records.size).toBe(0);
    });
  });
});
