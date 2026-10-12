// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../../event-bus/event-bus.service';
import { EventLogService } from '../event-log.service';
import { EventLog } from '../entities/event-log.entity';

/**
 * 集成测试：EventLog + EventBus 端到端流程
 *
 * 验证 #6 事件持久化的完整链路：
 * 1. EventBusService.emit() 触发 emit 钩子
 * 2. EventLogService.handleEmit() 写入 evt_event_log（status='emitted'）
 * 3. wrapSubscriber 包装的 handler 执行：
 *    a. recordSubscriberStart → subscribers 添加 processing 记录
 *    b. handler 执行业务逻辑并返回业务效果
 *    c. recordSubscriberSuccess → 更新为 processed + result
 *    d. recalculateStatus → 更新整体 status 和 successRatio
 *
 * 测试策略：
 * - 使用真实 SQLite 内存数据库（DataSource 直连，绕过 NestJS TypeOrmModule 的 ModuleRef 依赖问题）
 * - 使用真实 EventBusService（含 EventEmitter2）
 * - 使用真实 EventLogService（含 emit 钩子注册）
 */
describe('EventLog + EventBus 集成测试', () => {
  let dataSource: DataSource;
  let eventBus: EventBusService;
  let eventLogService: EventLogService;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    // 全局 setup.ts 启用了 fake timers，会令 setTimeout 永不触发，
    // 导致 flushAsync 和 SQLite busy_timeout 挂起。此处恢复真实定时器。
    jest.useRealTimers();

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // 1. 创建真实 SQLite 内存数据库
    //    注意：:memory: + 多连接池会导致每个连接各自一个独立 DB，
    //    所以用 extra 限制单连接，保证读写同一内存库。
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [EventLog],
      synchronize: true,
      logging: false,
      extra: { connectionLimit: 1 },
    });
    await dataSource.initialize();

    // 2. 创建真实 EventEmitter2（wildcard 模式，与生产一致）
    eventEmitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 100,
      verboseMemoryLeak: true,
    });

    // 3. 创建真实 EventBusService
    eventBus = new EventBusService(eventEmitter);
    (eventBus as any).onModuleInit();

    // 4. 创建真实 EventLogService（注入真实的 repository 和 eventBus）
    const eventLogRepo = dataSource.getRepository(EventLog);
    eventLogService = new EventLogService(eventLogRepo, eventBus);

    // 5. 触发 onModuleInit（注册 emit 钩子）
    (eventLogService as any).onModuleInit();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  // 辅助：等待所有异步操作完成（emit 钩子 + 订阅者追踪都是异步）
  const flushAsync = (ms = 200): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * 包装 wrapSubscriber 以模拟生产环境的错误捕获行为
   *
   * 生产代码中（DeviceConfigWatcher / DeviceCollectorBootstrap）的 wrap helper 会在
   * wrapSubscriber 外层加 try/catch，避免 EventBus.emit（同步）未 await async handler
   * 导致的 unhandled rejection。测试中也需模拟此行为，否则 Jest 会将 unhandled
   * rejection 视为测试失败。
   */
  const wrapForTest = <T extends any[]>(
    eventType: string,
    subscriberName: string,
    handler: (...args: T) => Promise<Record<string, any> | void>,
  ): ((...args: T) => Promise<void>) => {
    const traced = eventLogService.wrapSubscriber(eventType, subscriberName, handler);
    return async (...args: T) => {
      try {
        await traced(...args);
      } catch {
        // 模拟 EventBus.emit 的错误捕获：wrapSubscriber 已记录失败，这里仅防止 unhandled rejection
      }
    };
  };

  it('完整流程：emit device.created → 记录发射 → handler 处理 → 记录业务效果', async () => {
    // 1. 注册一个包装后的订阅者，返回业务效果
    const handler = jest.fn().mockResolvedValue({
      connectionId: 'conn-integration-1',
      tagsLoaded: 5,
      tasksRegistered: 5,
      deviceOnline: true,
    });

    eventBus.on(
      'device.created',
      wrapForTest('device.created', 'DeviceConfigWatcher', handler),
    );

    // 2. 发射事件（使用 emitAsync 等待所有异步订阅者完成，避免 unhandled rejection）
    await eventBus.emitAsync('device.created', {
      deviceId: 'dev-int-1',
      projectId: 'proj-int-1',
      protocol: 'modbus_tcp',
      connection: { host: '127.0.0.1', port: 502 },
      scanRate: 1000,
      userId: 'tester',
      timestamp: Date.now(),
    });

    // 3. 等待异步写入完成（emit 钩子 + wrapSubscriber 记录）
    await flushAsync(300);

    // 4. 验证 handler 被调用
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'dev-int-1' }),
    );

    // 5. 查询事件日志，验证记录
    const allLogs = await eventLogService.findByFilter({
      eventType: 'device.created',
      projectId: 'proj-int-1',
      page: 1,
      pageSize: 10,
    });

    expect(allLogs.total).toBeGreaterThanOrEqual(1);
    const log = allLogs.items[0];

    // 验证基础字段
    expect(log.eventType).toBe('device.created');
    expect(log.projectId).toBe('proj-int-1');
    expect(log.emittedBy).toBe('tester');
    expect(log.source).toBe('rest_api');
    expect(log.status).toBe('processed');

    // 验证订阅者追踪 + 业务效果
    expect(log.subscribers).toHaveLength(1);
    expect(log.subscribers[0].name).toBe('DeviceConfigWatcher');
    expect(log.subscribers[0].status).toBe('processed');
    expect(log.subscribers[0].result).toEqual({
      connectionId: 'conn-integration-1',
      tagsLoaded: 5,
      tasksRegistered: 5,
      deviceOnline: true,
    });
    expect(log.subscribers[0].duration).toBeGreaterThanOrEqual(0);

    // 验证成功率
    expect(log.successRatio).toBe('1/1');

    // 不应有失败记录
    const failedLogs = await eventLogService.findFailed({ projectId: 'proj-int-1' });
    expect(failedLogs).toHaveLength(0);
  });

  it('失败流程：handler 抛出错误 → 记录 failed 状态 + errorMessage', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(new Error('Connection timeout 192.168.1.99:502'));

    // 使用新的事件类型 device.updated（避免与前面的 device.created 测试订阅者冲突）
    eventBus.on(
      'device.updated',
      wrapForTest('device.updated', 'DeviceConfigWatcher', handler),
    );

    // 修改设备 IP，连接失败场景
    await eventBus.emitAsync('device.updated', {
      deviceId: 'dev-int-2',
      projectId: 'proj-int-3',
      protocol: 'modbus_tcp',
      changedFields: ['connection'],
      changes: {
        'connection.host': { old: '192.168.1.10', new: '192.168.1.99' },
      },
      userId: 'tester',
      timestamp: Date.now(),
    });

    // 等待异步写入完成
    await flushAsync(300);

    const logs = await eventLogService.findByFilter({
      eventType: 'device.updated',
      projectId: 'proj-int-3',
      page: 1,
      pageSize: 10,
    });

    expect(logs.total).toBeGreaterThanOrEqual(1);
    const log = logs.items[0];

    // 验证状态为 failed
    expect(log.status).toBe('failed');
    expect(log.successRatio).toBe('0/1');
    expect(log.errorMessage).toContain('Connection timeout');
    expect(log.errorMessage).toContain('DeviceConfigWatcher');

    // 验证订阅者记录
    expect(log.subscribers).toHaveLength(1);
    expect(log.subscribers[0].status).toBe('failed');
    expect(log.subscribers[0].error).toContain('Connection timeout');

    // 验证可以查到失败记录
    const failedLogs = await eventLogService.findFailed({ projectId: 'proj-int-3' });
    expect(failedLogs.length).toBeGreaterThanOrEqual(1);
    expect(
      failedLogs.some(
        (l) =>
          l.eventType === 'device.updated' &&
          l.subscribers?.some((s) => s.status === 'failed'),
      ),
    ).toBe(true);
  });

  it('部分失败：多个订阅者，部分成功部分失败 → status=partial', async () => {
    // 使用独立的项目 ID 避免与前面测试的订阅者干扰
    const projectId = 'proj-int-partial';

    // 订阅者 1：成功
    const successHandler = jest.fn().mockResolvedValue({
      taskId: 'task-1',
      scanRate: 1000,
    });

    // 订阅者 2：失败
    const failHandler = jest
      .fn()
      .mockRejectedValue(new Error('WebSocket room not found'));

    // 使用 device.deleted（前面测试没注册过这个事件的订阅者）
    eventBus.on(
      'device.deleted',
      wrapForTest('device.deleted', 'EnhancedScheduler', successHandler),
    );
    eventBus.on(
      'device.deleted',
      wrapForTest('device.deleted', 'DataPushBridge', failHandler),
    );

    await eventBus.emitAsync('device.deleted', {
      deviceId: 'dev-int-3',
      projectId,
      protocol: 'opcua',
      userId: 'tester',
      timestamp: Date.now(),
    });

    await flushAsync(400);

    const logs = await eventLogService.findByFilter({
      eventType: 'device.deleted',
      projectId,
      page: 1,
      pageSize: 10,
    });

    expect(logs.total).toBeGreaterThanOrEqual(1);
    const log = logs.items[0];

    // 应该有 2 个订阅者
    expect(log.subscribers).toHaveLength(2);
    const subscriberNames = log.subscribers.map((s) => s.name);
    expect(subscriberNames).toContain('EnhancedScheduler');
    expect(subscriberNames).toContain('DataPushBridge');

    // 验证成功和失败计数
    const successCount = log.subscribers.filter((s) => s.status === 'processed').length;
    const failedCount = log.subscribers.filter((s) => s.status === 'failed').length;
    expect(successCount).toBe(1);
    expect(failedCount).toBe(1);

    // 整体状态应该是 partial
    expect(log.status).toBe('partial');
    expect(log.successRatio).toBe('1/2');

    // errorMessage 应包含 DataPushBridge 的错误
    expect(log.errorMessage).toContain('DataPushBridge');
    expect(log.errorMessage).toContain('WebSocket room not found');

    // 业务效果验证
    const schedulerSub = log.subscribers.find((s) => s.name === 'EnhancedScheduler');
    expect(schedulerSub?.result).toEqual({ taskId: 'task-1', scanRate: 1000 });
  });

  it('白名单外事件不入库：data_point_changed 不应写入 evt_event_log', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    eventBus.on(
      'data_point_changed',
      wrapForTest('data_point_changed', 'NoOpSubscriber', handler),
    );

    await eventBus.emitAsync('data_point_changed', {
      tagId: 'tag-1',
      deviceId: 'dev-1',
      projectId: 'proj-int-1',
      value: 42.5,
      timestamp: Date.now(),
    });

    await flushAsync(200);

    // handler 仍应执行
    expect(handler).toHaveBeenCalledTimes(1);

    // 但事件日志不应有 data_point_changed 记录
    const logs = await eventLogService.findByFilter({
      eventType: 'data_point_changed',
      page: 1,
      pageSize: 10,
    });
    expect(logs.total).toBe(0);
  });

  it('未注册订阅者的事件：保持 emitted 状态', async () => {
    // project.beforeDelete 在白名单中但没有订阅者
    await eventBus.emitAsync('project.beforeDelete', {
      projectId: 'proj-orphan',
      userId: 'tester',
      timestamp: Date.now(),
    });

    await flushAsync(200);

    const logs = await eventLogService.findByFilter({
      eventType: 'project.beforeDelete',
      projectId: 'proj-orphan',
      page: 1,
      pageSize: 10,
    });

    expect(logs.total).toBeGreaterThanOrEqual(1);
    const log = logs.items[0];

    // 应该记录了发射，但没有订阅者
    expect(log.emittedBy).toBe('tester');
    expect(log.subscribers).toHaveLength(0);
    // 状态保持 emitted（没有订阅者处理）
    expect(log.status).toBe('emitted');
  });
});
