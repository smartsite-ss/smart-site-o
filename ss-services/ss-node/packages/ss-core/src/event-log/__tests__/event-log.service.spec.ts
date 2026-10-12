// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLogService } from '../event-log.service';
import { EventLog, EventLogStatus } from '../entities/event-log.entity';
import { EventBusService } from '../../event-bus/event-bus.service';

/**
 * EventLogService 单元测试
 *
 * 覆盖核心能力：
 * 1. 事件发射记录（recordEmission）
 * 2. 订阅者追踪（recordSubscriberStart/Success/Failure）
 * 3. 状态重新计算（recalculateStatus）
 * 4. 查询接口（findByFilter / findFailed）
 * 5. 白名单过滤（shouldPersist）
 * 6. emit 钩子机制（handleEmit）
 */
describe('EventLogService', () => {
  let service: EventLogService;
  let eventBus: jest.Mocked<EventBusService>;
  let repo: jest.Mocked<Repository<EventLog>>;

  beforeEach(async () => {
    // 创建 mock repository
    const mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    // 创建 mock EventBusService
    const mockEventBus = {
      registerEmitHook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventLogService,
        { provide: getRepositoryToken(EventLog), useValue: mockRepo },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<EventLogService>(EventLogService);
    eventBus = module.get(EventBusService) as jest.Mocked<EventBusService>;
    repo = module.get(getRepositoryToken(EventLog)) as jest.Mocked<Repository<EventLog>>;
  });

  describe('shouldPersist', () => {
    it('应返回 true 对配置变更类事件', () => {
      expect(service.shouldPersist('device.created')).toBe(true);
      expect(service.shouldPersist('device.updated')).toBe(true);
      expect(service.shouldPersist('project:enabled')).toBe(true);
      expect(service.shouldPersist('alarm.triggered')).toBe(true);
      expect(service.shouldPersist('plugin.activated')).toBe(true);
    });

    it('应返回 false 对高频数据事件', () => {
      expect(service.shouldPersist('data_point_changed')).toBe(false);
      expect(service.shouldPersist('device_status_changed')).toBe(false);
      expect(service.shouldPersist('user.joined')).toBe(false);
      expect(service.shouldPersist('plugin.discovered')).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('应注册 emit 钩子到 EventBusService', () => {
      service.onModuleInit();
      expect(eventBus.registerEmitHook).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordEmission', () => {
    it('应正确写入事件日志并返回 logId', async () => {
      const fakeLog = { id: 'log-uuid-123' } as EventLog;
      repo.create.mockReturnValue(fakeLog);
      repo.save.mockResolvedValue(fakeLog as any);

      const payload = {
        deviceId: 'dev-123',
        projectId: 'proj-1',
        protocol: 'modbus_tcp',
        userId: 'user-001',
        timestamp: Date.now(),
      };

      const logId = await service.recordEmission('device.created', payload);

      expect(logId).toBe('log-uuid-123');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'device.created',
          projectId: 'proj-1',
          emittedBy: 'user-001',
          source: 'rest_api',
          status: 'emitted',
        }),
      );
    });

    it('payload 无 userId 时 source 应为 system', async () => {
      const fakeLog = { id: 'log-1' } as EventLog;
      repo.create.mockReturnValue(fakeLog);
      repo.save.mockResolvedValue(fakeLog as any);

      await service.recordEmission('plugin.activated', {
        protocol: 'modbus_tcp',
        sourceInstance: 'PluginRegistry',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'system',
          emittedBy: 'PluginRegistry',
        }),
      );
    });

    it('Repository 写入失败时返回 null 且不抛出', async () => {
      repo.save.mockRejectedValue(new Error('DB error') as any);

      const logId = await service.recordEmission('device.created', { projectId: 'p1' });

      expect(logId).toBeNull();
    });

    it('timestamp 支持 number / string / Date 三种格式', async () => {
      const fakeLog = { id: 'log-1' } as EventLog;
      repo.create.mockReturnValue(fakeLog);
      repo.save.mockResolvedValue(fakeLog as any);

      // number
      await service.recordEmission('device.created', { timestamp: 1700000000000 });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTimestamp: new Date(1700000000000),
        }),
      );

      // string
      await service.recordEmission('device.created', {
        timestamp: '2026-08-04T10:00:00.000Z',
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTimestamp: new Date('2026-08-04T10:00:00.000Z'),
        }),
      );

      // Date
      const dateObj = new Date();
      await service.recordEmission('device.created', { timestamp: dateObj });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTimestamp: dateObj,
        }),
      );
    });

    it('payload 超过 64KB 时应截断 tags 数组', async () => {
      const fakeLog = { id: 'log-1' } as EventLog;
      repo.create.mockReturnValue(fakeLog);
      repo.save.mockResolvedValue(fakeLog as any);

      // 构造超过 64KB 的 payload
      const largeTags = Array.from({ length: 10000 }, (_, i) => ({
        tagId: `tag-${i}`,
        name: `tag-name-${i}-padding-padding-padding-padding`,
      }));

      await service.recordEmission('device.created', {
        deviceId: 'dev-1',
        tags: largeTags,
      });

      const createCall = repo.create.mock.calls[0][0];
      expect(createCall.payload._tagsTruncated).toBe(true);
      expect(createCall.payload.tags.length).toBeLessThanOrEqual(100);
    });
  });

  describe('recordSubscriberStart / Success / Failure', () => {
    const logId = 'log-123';
    const subscriberName = 'DeviceConfigWatcher';

    beforeEach(() => {
      // 模拟已存在的事件日志
      const existingLog: Partial<EventLog> = {
        id: logId,
        eventType: 'device.created',
        subscribers: [],
        status: 'emitted',
      };
      repo.findOne.mockResolvedValue(existingLog as EventLog);
      repo.save.mockResolvedValue(existingLog as EventLog);
    });

    it('recordSubscriberStart 应添加 processing 状态的订阅者记录', async () => {
      await service.recordSubscriberStart(logId, subscriberName);

      const savedLog = repo.save.mock.calls[0][0] as EventLog;
      expect(savedLog.subscribers).toHaveLength(1);
      expect(savedLog.subscribers[0]).toEqual(
        expect.objectContaining({
          name: subscriberName,
          status: 'processing',
        }),
      );
      expect(savedLog.status).toBe('processing');
    });

    it('recordSubscriberSuccess 应更新为 processed 状态并触发状态重算', async () => {
      // 模拟已有 processing 记录
      const logWithSubscriber: Partial<EventLog> = {
        id: logId,
        eventType: 'device.created',
        subscribers: [{ name: subscriberName, status: 'processing' }],
        status: 'processing',
      };
      repo.findOne.mockResolvedValue(logWithSubscriber as EventLog);

      await service.recordSubscriberSuccess(logId, subscriberName, 23, {
        connectionId: 'conn-1',
        tagsLoaded: 12,
      });

      // 第二次 save 是 updateSubscriberRecord，第三次 save 是 recalculateStatus
      const savedLog = repo.save.mock.calls[0][0] as EventLog;
      expect(savedLog.subscribers[0]).toEqual(
        expect.objectContaining({
          status: 'processed',
          duration: 23,
          result: { connectionId: 'conn-1', tagsLoaded: 12 },
        }),
      );
    });

    it('recordSubscriberFailure 应更新为 failed 状态并记录错误', async () => {
      const logWithSubscriber: Partial<EventLog> = {
        id: logId,
        eventType: 'device.created',
        subscribers: [{ name: subscriberName, status: 'processing' }],
        status: 'processing',
      };
      repo.findOne.mockResolvedValue(logWithSubscriber as EventLog);

      await service.recordSubscriberFailure(
        logId,
        subscriberName,
        'Connection timeout',
        { oldConnectionClosed: true },
      );

      const savedLog = repo.save.mock.calls[0][0] as EventLog;
      expect(savedLog.subscribers[0]).toEqual(
        expect.objectContaining({
          status: 'failed',
          error: 'Connection timeout',
          result: { oldConnectionClosed: true },
        }),
      );
    });
  });

  describe('recalculateStatus', () => {
    const logId = 'log-123';

    /**
     * Helper：创建带状态的 mock，让 findOne 返回最近一次 save 的对象
     *
     * 这样 updateSubscriberRecord → save → recalculateStatus → findOne 的链条
     * 能拿到包含新订阅者 'C' 的最新状态，使状态重算逻辑得到验证。
     */
    const setupStatefulMock = (initial: Partial<EventLog>): void => {
      let current: EventLog = initial as EventLog;
      repo.findOne.mockImplementation(async () => current);
      repo.save.mockImplementation(async (log: EventLog) => {
        current = log;
        return log;
      });
    };

    it('所有订阅者成功时 status=processed', async () => {
      setupStatefulMock({
        id: logId,
        subscribers: [
          { name: 'A', status: 'processed' },
          { name: 'B', status: 'processed' },
        ],
      });

      // 通过 recordSubscriberSuccess('C', ...) 触发 recalculateStatus
      // 'C' 不在 subscribers 中，会被添加为 processed
      await service.recordSubscriberSuccess(logId, 'C', 10);

      const lastSavedLog = repo.save.mock.calls[repo.save.mock.calls.length - 1][0] as EventLog;
      expect(lastSavedLog.status).toBe('processed');
      expect(lastSavedLog.successRatio).toBe('3/3');
    });

    it('部分订阅者失败时 status=partial', async () => {
      setupStatefulMock({
        id: logId,
        subscribers: [
          { name: 'A', status: 'processed' },
          { name: 'B', status: 'failed', error: 'timeout' },
        ],
      });

      // 添加新的成功订阅者 C，触发 recalculateStatus
      // 此时 A=processed, B=failed, C=processed → partial (2/3)
      await service.recordSubscriberSuccess(logId, 'C', 10);

      const lastSavedLog = repo.save.mock.calls[repo.save.mock.calls.length - 1][0] as EventLog;
      expect(lastSavedLog.status).toBe('partial');
      expect(lastSavedLog.successRatio).toBe('2/3');
      expect(lastSavedLog.errorMessage).toContain('B: timeout');
    });

    it('所有订阅者失败时 status=failed', async () => {
      setupStatefulMock({
        id: logId,
        subscribers: [
          { name: 'A', status: 'failed', error: 'err1' },
          { name: 'B', status: 'failed', error: 'err2' },
        ],
      });

      // 添加新的失败订阅者 C
      await service.recordSubscriberFailure(logId, 'C', 'err3');

      const lastSavedLog = repo.save.mock.calls[repo.save.mock.calls.length - 1][0] as EventLog;
      expect(lastSavedLog.status).toBe('failed');
      expect(lastSavedLog.errorMessage).toContain('A: err1');
      expect(lastSavedLog.errorMessage).toContain('B: err2');
      expect(lastSavedLog.errorMessage).toContain('C: err3');
    });
  });

  describe('withLogLock (并发安全)', () => {
    const logId = 'log-concurrent-1';

    /**
     * Helper：创建有状态的 mock，模拟 DB 的 read-modify-write 行为
     * - findOne 返回当前内存中的 log 对象（引用）
     * - save 更新当前内存中的 log 对象
     *
     * 这能真实地暴露并发竞态条件：
     * 如果两个 updateSubscriberRecord 并发执行且没有锁，
     * 两者都会读到 subscribers=[]，各自添加一个订阅者后保存，
     * 后保存的会覆盖前者。
     */
    const setupStatefulMock = (initial: Partial<EventLog>): void => {
      let current: EventLog = initial as EventLog;
      repo.findOne.mockImplementation(async () => current);
      repo.save.mockImplementation(async (log: EventLog) => {
        current = log;
        return log;
      });
    };

    it('两个订阅者并发 recordSubscriberStart 不应丢失任一记录', async () => {
      setupStatefulMock({
        id: logId,
        eventType: 'device.deleted',
        subscribers: [],
        status: 'emitted',
      });

      // 并发调用两个 recordSubscriberStart
      await Promise.all([
        service.recordSubscriberStart(logId, 'SubscriberA'),
        service.recordSubscriberStart(logId, 'SubscriberB'),
      ]);

      // 重新读取最终状态
      const finalLog = await repo.findOne({ where: { id: logId } });
      expect(finalLog!.subscribers).toHaveLength(2);
      const names = finalLog!.subscribers.map((s) => s.name);
      expect(names).toContain('SubscriberA');
      expect(names).toContain('SubscriberB');
    });

    it('三个订阅者并发 recordSubscriberSuccess 应全部记录且 status 正确', async () => {
      setupStatefulMock({
        id: logId,
        eventType: 'device.created',
        subscribers: [],
        status: 'emitted',
      });

      // 三个订阅者并发成功完成
      await Promise.all([
        service.recordSubscriberSuccess(logId, 'SubA', 10, { tasksRegistered: 1 }),
        service.recordSubscriberSuccess(logId, 'SubB', 20, { tasksRegistered: 2 }),
        service.recordSubscriberSuccess(logId, 'SubC', 30, { tasksRegistered: 3 }),
      ]);

      const finalLog = await repo.findOne({ where: { id: logId } });
      expect(finalLog!.subscribers).toHaveLength(3);
      expect(finalLog!.status).toBe('processed');
      expect(finalLog!.successRatio).toBe('3/3');
    });

    it('并发混合成功/失败应正确计算 partial 状态', async () => {
      setupStatefulMock({
        id: logId,
        eventType: 'device.updated',
        subscribers: [],
        status: 'emitted',
      });

      await Promise.all([
        service.recordSubscriberSuccess(logId, 'SuccessSub', 10, { ok: true }),
        service.recordSubscriberFailure(logId, 'FailSub', 'Connection refused'),
      ]);

      const finalLog = await repo.findOne({ where: { id: logId } });
      expect(finalLog!.subscribers).toHaveLength(2);
      expect(finalLog!.status).toBe('partial');
      expect(finalLog!.successRatio).toBe('1/2');
      expect(finalLog!.errorMessage).toContain('FailSub: Connection refused');
    });
  });

  describe('wrapSubscriber', () => {
    it('成功时应自动追踪并返回业务效果', async () => {
      const logId = 'log-wrap-1';
      const existingLog: Partial<EventLog> = {
        id: logId,
        subscribers: [],
        status: 'emitted',
      };
      repo.findOne.mockResolvedValue(existingLog as EventLog);
      repo.save.mockResolvedValue(existingLog as EventLog);

      // 模拟 findRecentLogId 通过内存索引返回
      // 先调用 recordEmission 让内存索引缓存
      repo.create.mockReturnValue({ id: logId } as EventLog);
      await service.recordEmission('device.created', { projectId: 'p1', deviceId: 'd1' });

      const handler = jest.fn().mockResolvedValue({ connectionId: 'conn-1' });
      const wrapped = service.wrapSubscriber(
        'device.created',
        'DeviceConfigWatcher',
        handler,
      );

      await wrapped({ projectId: 'p1', deviceId: 'd1' });

      expect(handler).toHaveBeenCalled();
      // 应该调用过 recordSubscriberStart 和 recordSubscriberSuccess
      expect(repo.save.mock.calls.length).toBeGreaterThanOrEqual(2);

      // 最后一次 save 应包含业务效果
      const lastSavedLog = repo.save.mock.calls[repo.save.mock.calls.length - 1][0] as EventLog;
      const subscriber = lastSavedLog.subscribers?.find((s) => s.name === 'DeviceConfigWatcher');
      expect(subscriber?.result).toEqual({ connectionId: 'conn-1' });
    });

    it('失败时应记录错误并重新抛出', async () => {
      const logId = 'log-wrap-2';
      const existingLog: Partial<EventLog> = {
        id: logId,
        subscribers: [],
        status: 'emitted',
      };
      repo.findOne.mockResolvedValue(existingLog as EventLog);
      repo.save.mockResolvedValue(existingLog as EventLog);

      repo.create.mockReturnValue({ id: logId } as EventLog);
      await service.recordEmission('device.updated', { projectId: 'p1', deviceId: 'd1' });

      const error = new Error('Connection refused');
      const handler = jest.fn().mockRejectedValue(error);
      const wrapped = service.wrapSubscriber(
        'device.updated',
        'DeviceConfigWatcher',
        handler,
      );

      await expect(wrapped({ projectId: 'p1', deviceId: 'd1' })).rejects.toThrow(
        'Connection refused',
      );

      // 应该有 recordSubscriberFailure 的调用
      const savedLogs = repo.save.mock.calls.map((call) => call[0] as EventLog);
      const failedRecord = savedLogs.find((log) =>
        log.subscribers?.some((s) => s.status === 'failed'),
      );
      expect(failedRecord).toBeDefined();
    });

    it('未找到 logId 时仍应执行 handler 但不记录追踪', async () => {
      // 不调用 recordEmission，让 findRecentLogId 返回 null
      repo.findOne.mockResolvedValue(null);

      const handler = jest.fn().mockResolvedValue({ ok: true });
      const wrapped = service.wrapSubscriber(
        'device.created',
        'DeviceConfigWatcher',
        handler,
      );

      await wrapped({ projectId: 'unknown', deviceId: 'unknown' });

      // handler 应被执行
      expect(handler).toHaveBeenCalled();
      // 不应写入任何订阅者记录
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByFilter', () => {
    it('应支持分页查询', async () => {
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'log-1' }], 1]),
      };
      repo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findByFilter({
        projectId: 'p1',
        page: 1,
        pageSize: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('应支持按状态筛选', async () => {
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findByFilter({ status: 'failed' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.status = :status',
        expect.objectContaining({ status: 'failed' }),
      );
    });
  });

  describe('findFailed', () => {
    it('应查询 failed 和 partial 状态的事件', async () => {
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'log-1', status: 'failed' }]),
      };
      repo.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findFailed({ projectId: 'p1' });

      expect(result).toHaveLength(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.status IN (:...statuses)',
        expect.objectContaining({ statuses: ['failed', 'partial'] }),
      );
    });
  });
});
