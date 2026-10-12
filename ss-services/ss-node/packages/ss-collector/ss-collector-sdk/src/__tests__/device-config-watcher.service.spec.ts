// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger } from '@nestjs/common';
import { EventBusService, EventLogService } from '@ss-node/ss-core';
import { IsolationFactory } from '../plugins';
import { EnhancedScheduler } from '../pipeline/scheduler/enhanced-scheduler';
import { DeviceConfigWatcher } from '../pipeline/device-config-watcher.service';

// ============================================================
// Mock 工厂
// ============================================================

function makeMockEventBus() {
  const handlers = new Map<string, Set<(payload: any) => void>>();
  return {
    on: jest.fn((event: string, handler: (payload: any) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    }),
    emit: jest.fn((event: string, payload: any) => {
      handlers.get(event)?.forEach((h) => h(payload));
    }),
    off: jest.fn(),
    /** 测试辅助：手动触发已注册的处理器，并等待所有异步处理器完成
     * 模拟真实 EventBus.emit 的错误捕获行为：单个 handler 失败不影响其他 handler */
    async fire(event: string, payload: any) {
      const set = handlers.get(event);
      if (!set) return;
      await Promise.all(
        Array.from(set).map(async (h) => {
          try {
            await h(payload);
          } catch {
            // 模拟 EventBus.emit 的错误捕获：记录但不抛出
          }
        }),
      );
    },
    /** 测试辅助：手动触发并收集 handler 抛出的错误（用于验证失败追踪） */
    async fireAndCollectErrors(event: string, payload: any): Promise<Error[]> {
      const set = handlers.get(event);
      if (!set) return [];
      const errors: Error[] = [];
      await Promise.all(
        Array.from(set).map(async (h) => {
          try {
            await h(payload);
          } catch (err) {
            errors.push(err as Error);
          }
        }),
      );
      return errors;
    },
    /** 测试辅助：获取已注册的事件列表 */
    registeredEvents: () => Array.from(handlers.keys()),
  };
}

function makeMockEventLogService() {
  const self: any = {
    recordEmission: jest.fn().mockResolvedValue('log-id-mock'),
    recordSubscriberStart: jest.fn().mockResolvedValue(undefined),
    recordSubscriberSuccess: jest.fn().mockResolvedValue(undefined),
    recordSubscriberFailure: jest.fn().mockResolvedValue(undefined),
    findRecentLogId: jest.fn().mockResolvedValue('log-id-mock'),
    shouldPersist: jest.fn().mockReturnValue(true),
  };

  /** 模拟真实 wrapSubscriber：记录开始 → 调用 handler → 记录成功/失败 → 失败时重新抛出 */
  self.wrapSubscriber = jest.fn(
    <T extends any[]>(
      eventType: string,
      subscriberName: string,
      handler: (...args: T) => Promise<Record<string, any> | void>,
    ) => {
      const logId = 'log-id-mock';
      return async (...args: T): Promise<void> => {
        await self.recordSubscriberStart(logId, subscriberName);
        const startedAt = Date.now();
        try {
          const result = await handler(...args);
          await self.recordSubscriberSuccess(
            logId,
            subscriberName,
            Date.now() - startedAt,
            result,
          );
        } catch (err) {
          await self.recordSubscriberFailure(
            logId,
            subscriberName,
            (err as Error).message,
          );
          throw err;
        }
      };
    },
  );

  return self as unknown as jest.Mocked<EventLogService>;
}

function makeMockExecutor() {
  return {
    name: 'MockExecutor',
    connect: jest.fn().mockResolvedValue({ connectionId: 'conn-1', protocol: 'modbus_tcp' }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    readTag: jest.fn().mockResolvedValue({ value: 1 }),
    writeTag: jest.fn().mockResolvedValue(undefined),
    getHealth: jest.fn().mockResolvedValue({ status: 'healthy' }),
    destroy: jest.fn().mockResolvedValue(undefined),
    init: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMockIsolationFactory(executor: ReturnType<typeof makeMockExecutor>) {
  return {
    getExecutor: jest.fn().mockReturnValue(executor),
    prepare: jest.fn().mockResolvedValue(undefined),
    getAllHealth: jest.fn().mockResolvedValue(new Map()),
    isIsolated: jest.fn().mockReturnValue(false),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  } as unknown as IsolationFactory;
}

function makeMockScheduler() {
  return {
    updateTaskInterval: jest.fn().mockReturnValue(1),
    registerTask: jest.fn(),
    unregisterTask: jest.fn(),
    setPipelineSteps: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({}),
    onModuleDestroy: jest.fn(),
    onModuleInit: jest.fn(),
  } as unknown as EnhancedScheduler;
}

// ============================================================
// DeviceConfigWatcher
// ============================================================
describe('DeviceConfigWatcher', () => {
  let eventBus: ReturnType<typeof makeMockEventBus>;
  let executor: ReturnType<typeof makeMockExecutor>;
  let isolationFactory: IsolationFactory;
  let scheduler: EnhancedScheduler;
  let watcher: DeviceConfigWatcher;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    eventBus = makeMockEventBus();
    executor = makeMockExecutor();
    isolationFactory = makeMockIsolationFactory(executor);
    scheduler = makeMockScheduler();
    watcher = new DeviceConfigWatcher(
      eventBus as unknown as EventBusService,
      undefined,
      isolationFactory,
      scheduler,
    );
  });

  describe('onModuleInit', () => {
    it('应当注册 5 个设备事件监听器', () => {
      watcher.onModuleInit();
      expect(eventBus.on).toHaveBeenCalledTimes(5);
      expect(eventBus.on).toHaveBeenCalledWith('device.created', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('device.updated', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('device.deleted', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('device.enabled', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('device.disabled', expect.any(Function));
    });
  });

  describe('device.created 事件', () => {
    beforeEach(() => {
      watcher.onModuleInit();
    });

    it('应当调用 ensureConnection 建立连接', async () => {
      await eventBus.fire('device.created', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1', port: 502 },
        scanRate: 1000,
      });

      expect(executor.connect).toHaveBeenCalledWith({
        id: 'dev-1',
        name: 'dev-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1', port: 502 },
      });
      expect(watcher.getActiveDevices().has('dev-1')).toBe(true);
    });

    it('当 isolationFactory 不可用时应跳过连接', async () => {
      const watcherNoFactory = new DeviceConfigWatcher(
        eventBus as unknown as EventBusService,
        undefined,
        undefined,
        undefined,
      );
      watcherNoFactory.onModuleInit();
      await eventBus.fire('device.created', {
        deviceId: 'dev-2',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: {},
        scanRate: 1000,
      });
      expect(watcherNoFactory.getActiveDevices().has('dev-2')).toBe(false);
    });

    it('当连接抛错时应记录错误但不抛出', async () => {
      executor.connect.mockRejectedValueOnce(new Error('connect fail'));
      await eventBus.fire('device.created', {
        deviceId: 'dev-err',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: {},
        scanRate: 1000,
      });
      // 不应抛出，且设备不在活跃列表
      expect(watcher.getActiveDevices().has('dev-err')).toBe(false);
    });
  });

  describe('device.updated 事件', () => {
    beforeEach(async () => {
      watcher.onModuleInit();
      // 先创建设备
      await eventBus.fire('device.created', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1', port: 502 },
        scanRate: 1000,
      });
    });

    it('connection 变更应当先断开旧连接再建立新连接', async () => {
      await eventBus.fire('device.updated', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: ['connection'],
        connection: { host: '192.168.1.1', port: 502 },
      });

      expect(executor.disconnect).toHaveBeenCalled();
      expect(executor.connect).toHaveBeenCalledWith({
        id: 'dev-1',
        name: 'dev-1',
        protocol: 'modbus_tcp',
        connection: { host: '192.168.1.1', port: 502 },
      });
    });

    it('scanRate 变更应当调用 scheduler.updateTaskInterval', async () => {
      await eventBus.fire('device.updated', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: ['scanRate'],
        scanRate: 500,
      });

      expect(scheduler.updateTaskInterval).toHaveBeenCalledWith('dev-1', 500);
    });

    it('scheduler 不可用时 scanRate 变更应记录警告', async () => {
      // 使用全新的 eventBus，避免原 watcher 的处理器干扰
      const freshBus = makeMockEventBus();
      const watcherNoScheduler = new DeviceConfigWatcher(
        freshBus as unknown as EventBusService,
        undefined,
        isolationFactory,
        undefined,
      );
      watcherNoScheduler.onModuleInit();
      // 先创建设备
      await freshBus.fire('device.created', {
        deviceId: 'dev-2',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1' },
        scanRate: 1000,
      });

      await freshBus.fire('device.updated', {
        deviceId: 'dev-2',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: ['scanRate'],
        scanRate: 250,
      });
      // scheduler 为 undefined，不应调用 updateTaskInterval
      expect(scheduler.updateTaskInterval).not.toHaveBeenCalled();
    });

    it('同时变更 connection 和 scanRate 应当都处理', async () => {
      await eventBus.fire('device.updated', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: ['connection', 'scanRate'],
        connection: { host: '10.0.0.1' },
        scanRate: 200,
      });

      expect(executor.disconnect).toHaveBeenCalled();
      expect(executor.connect).toHaveBeenCalledWith({
        id: 'dev-1',
        name: 'dev-1',
        protocol: 'modbus_tcp',
        connection: { host: '10.0.0.1' },
      });
      expect(scheduler.updateTaskInterval).toHaveBeenCalledWith('dev-1', 200);
    });

    it('无变更字段时不应当执行任何操作', async () => {
      executor.disconnect.mockClear();
      executor.connect.mockClear();

      await eventBus.fire('device.updated', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: [],
      });

      expect(executor.disconnect).not.toHaveBeenCalled();
      expect(scheduler.updateTaskInterval).not.toHaveBeenCalled();
    });

    it('tags 变更应当发射 device.tagsChanged 事件', async () => {
      const tagsChangedSpy = jest.fn();
      eventBus.on('device.tagsChanged', tagsChangedSpy);

      await eventBus.fire('device.updated', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: ['tags'],
      });

      expect(tagsChangedSpy).toHaveBeenCalledTimes(1);
      expect(tagsChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'dev-1',
          projectId: 'proj-1',
          protocol: 'modbus_tcp',
          changeType: 'template_sync',
        }),
      );
    });

    it('tags 变更不应触发 disconnect 或 updateTaskInterval', async () => {
      executor.disconnect.mockClear();
      (scheduler.updateTaskInterval as jest.Mock).mockClear();

      await eventBus.fire('device.updated', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: ['tags'],
      });

      expect(executor.disconnect).not.toHaveBeenCalled();
      expect(scheduler.updateTaskInterval).not.toHaveBeenCalled();
    });

    it('同时变更 tags 和 connection 应当都处理', async () => {
      const tagsChangedSpy = jest.fn();
      eventBus.on('device.tagsChanged', tagsChangedSpy);

      await eventBus.fire('device.updated', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        changedFields: ['connection', 'tags'],
        connection: { host: '10.0.0.1' },
      });

      expect(executor.disconnect).toHaveBeenCalled();
      expect(executor.connect).toHaveBeenCalled();
      expect(tagsChangedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('device.deleted 事件', () => {
    beforeEach(async () => {
      watcher.onModuleInit();
      await eventBus.fire('device.created', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1' },
        scanRate: 1000,
      });
    });

    it('应当断开连接并从活跃列表移除', async () => {
      expect(watcher.getActiveDevices().has('dev-1')).toBe(true);

      await eventBus.fire('device.deleted', { deviceId: 'dev-1' });

      expect(executor.disconnect).toHaveBeenCalled();
      expect(watcher.getActiveDevices().has('dev-1')).toBe(false);
    });

    it('删除未知设备应当是安全的', async () => {
      await eventBus.fire('device.deleted', { deviceId: 'unknown-dev' });
      // 不应抛出错误
      expect(watcher.getActiveDevices().has('unknown-dev')).toBe(false);
    });
  });

  describe('device.enabled / device.disabled 事件', () => {
    beforeEach(() => {
      watcher.onModuleInit();
    });

    it('device.enabled 应当等同于 device.created', async () => {
      await eventBus.fire('device.enabled', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1' },
        scanRate: 1000,
      });
      expect(watcher.getActiveDevices().has('dev-1')).toBe(true);
    });

    it('device.disabled 应当等同于 device.deleted', async () => {
      // 先 enable
      await eventBus.fire('device.enabled', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1' },
        scanRate: 1000,
      });
      expect(watcher.getActiveDevices().has('dev-1')).toBe(true);

      // 再 disable
      await eventBus.fire('device.disabled', { deviceId: 'dev-1' });
      expect(watcher.getActiveDevices().has('dev-1')).toBe(false);
    });
  });

  describe('ensureConnection', () => {
    it('应当调用 isolationFactory.getExecutor 并建立连接', async () => {
      watcher.onModuleInit();
      await watcher.ensureConnection('dev-x', 'modbus_tcp', { host: '1.2.3.4' });
      expect(executor.connect).toHaveBeenCalledWith({
        id: 'dev-x',
        name: 'dev-x',
        protocol: 'modbus_tcp',
        connection: { host: '1.2.3.4' },
      });
      expect(watcher.getActiveDevices().has('dev-x')).toBe(true);
    });

    it('当 isolationFactory 为空时应跳过并记录警告', async () => {
      const w = new DeviceConfigWatcher(
        eventBus as unknown as EventBusService,
        undefined,
        undefined,
        undefined,
      );
      await w.ensureConnection('dev-x', 'modbus_tcp', {});
      expect(w.getActiveDevices().has('dev-x')).toBe(false);
    });
  });

  describe('disconnectDevice', () => {
    it('应当调用 executor.disconnect 并清理活跃列表', async () => {
      watcher.onModuleInit();
      await watcher.ensureConnection('dev-x', 'modbus_tcp', { host: '1.2.3.4' });
      expect(watcher.getActiveDevices().has('dev-x')).toBe(true);

      const result = await watcher.disconnectDevice('dev-x');
      expect(result).toBe(true);
      expect(executor.disconnect).toHaveBeenCalled();
      expect(watcher.getActiveDevices().has('dev-x')).toBe(false);
    });

    it('断开未知设备应当返回 false', async () => {
      await expect(watcher.disconnectDevice('unknown')).resolves.toBe(false);
    });

    it('disconnect 抛错应当被吞掉但返回 true', async () => {
      watcher.onModuleInit();
      await watcher.ensureConnection('dev-x', 'modbus_tcp', {});
      executor.disconnect.mockRejectedValueOnce(new Error('fail'));
      await expect(watcher.disconnectDevice('dev-x')).resolves.toBe(true);
      expect(watcher.getActiveDevices().has('dev-x')).toBe(false);
    });
  });

  describe('getActiveDevices', () => {
    it('应当返回活跃设备的副本', async () => {
      watcher.onModuleInit();
      await watcher.ensureConnection('dev-1', 'modbus_tcp', {});
      await watcher.ensureConnection('dev-2', 'modbus_tcp', {});

      const active = watcher.getActiveDevices();
      expect(active.size).toBe(2);
      expect(active.has('dev-1')).toBe(true);
      expect(active.has('dev-2')).toBe(true);

      // 修改返回的 Map 不应影响内部状态
      active.delete('dev-1');
      expect(watcher.getActiveDevices().has('dev-1')).toBe(true);
    });
  });

  // ==========================================================================
  // #6 事件持久化：业务效果追踪
  // ==========================================================================
  describe('业务效果追踪（EventLogService 集成）', () => {
    let eventLogService: jest.Mocked<EventLogService>;

    beforeEach(() => {
      eventLogService = makeMockEventLogService();
      watcher = new DeviceConfigWatcher(
        eventBus as unknown as EventBusService,
        undefined,
        isolationFactory,
        scheduler,
        eventLogService,
      );
    });

    it('onModuleInit 应当为每个事件调用 wrapSubscriber', () => {
      watcher.onModuleInit();
      // 5 个事件类型都应通过 wrapSubscriber 包装
      expect(eventLogService.wrapSubscriber).toHaveBeenCalledTimes(5);
      expect(eventLogService.wrapSubscriber).toHaveBeenCalledWith(
        'device.created',
        'DeviceConfigWatcher',
        expect.any(Function),
      );
      expect(eventLogService.wrapSubscriber).toHaveBeenCalledWith(
        'device.updated',
        'DeviceConfigWatcher',
        expect.any(Function),
      );
      expect(eventLogService.wrapSubscriber).toHaveBeenCalledWith(
        'device.deleted',
        'DeviceConfigWatcher',
        expect.any(Function),
      );
    });

    it('device.created 处理成功时 wrapSubscriber 包装的 handler 应被调用', async () => {
      watcher.onModuleInit();
      await eventBus.fire('device.created', {
        deviceId: 'dev-1',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: { host: '127.0.0.1', port: 502 },
        scanRate: 1000,
      });

      // wrapSubscriber 返回的 wrapped handler 调用了真实 handler
      expect(executor.connect).toHaveBeenCalled();
      expect(watcher.getActiveDevices().has('dev-1')).toBe(true);
    });

    it('device.created 处理失败时应记录失败并捕获（避免 unhandled rejection）', async () => {
      watcher.onModuleInit();
      executor.connect.mockRejectedValueOnce(new Error('connect fail'));

      // fire 模拟 EventBus 的错误捕获行为
      const errors = await eventBus.fireAndCollectErrors('device.created', {
        deviceId: 'dev-err',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        connection: {},
        scanRate: 1000,
      });

      // 外层 catch 应捕获错误，避免 unhandled rejection
      expect(errors).toHaveLength(0);
      // wrapSubscriber 应已记录失败业务效果
      expect(eventLogService.recordSubscriberFailure).toHaveBeenCalledWith(
        'log-id-mock',
        'DeviceConfigWatcher',
        'connect fail',
      );
      // 设备不在活跃列表（因为 ensureConnection 失败）
      expect(watcher.getActiveDevices().has('dev-err')).toBe(false);
    });
  });
});
