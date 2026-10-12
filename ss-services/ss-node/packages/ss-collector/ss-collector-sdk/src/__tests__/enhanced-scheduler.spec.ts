// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  EnhancedScheduler,
  TaskPriority,
  AcquisitionTask,
} from '../pipeline/scheduler/enhanced-scheduler';
import { EventBusService } from '@ss-node/ss-core';
import { Logger } from '@nestjs/common';

// ── Mock EventBusService ──────────────────────────────────────────
function makeMockEventBus(): jest.Mocked<EventBusService> {
  return {
    emitDeviceStatusChanged: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    emitConfigChanged: jest.fn(),
  } as unknown as jest.Mocked<EventBusService>;
}

function makeTask(overrides: Partial<AcquisitionTask> = {}): AcquisitionTask {
  return {
    id: 'task-001',
    deviceId: 'device-001',
    tagId: 'tag-001',
    tagConfig: { projectId: 'project-001' },
    deviceClient: { protocol: 'virtual', connection: {} },
    priority: TaskPriority.NORMAL,
    interval: 1000,
    retryCount: 0,
    maxRetries: 3,
    enabled: true,
    lastExecution: new Date(),
    ...overrides,
  };
}

describe('EnhancedScheduler', () => {
  let scheduler: EnhancedScheduler;
  let mockEventBus: jest.Mocked<EventBusService>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockEventBus = makeMockEventBus();
    scheduler = new EnhancedScheduler({}, mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('adaptive throttling (handleCommSuccess)', () => {
    /**
     * 验证自适应节流：min(scanRate, 30s)
     * 高频任务按 scanRate 节流，低频任务按 30s 上限节流。
     */
    it('高频任务（100ms）应按 scanRate 节流，不受 30s 上限影响', async () => {
      const task = makeTask({ interval: 100 });
      scheduler.registerTask(task);

      // 模拟 handleCommSuccess（通过访问内部方法）
      const handleCommSuccess = (scheduler as any).handleCommSuccess.bind(scheduler);

      // 第一次发射
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(1);

      // 50ms 后不应发射（未超过 100ms 节流）
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 50);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(1);

      // 150ms 后应发射（已超过 100ms 节流）
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 150);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(2);
    });

    it('低频任务（60s）应按 30s 上限节流，而非 60s', async () => {
      const task = makeTask({ interval: 60000 });
      scheduler.registerTask(task);

      const handleCommSuccess = (scheduler as any).handleCommSuccess.bind(scheduler);

      // 第一次发射
      const baseTime = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(baseTime);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(1);

      // 20s 后不应发射（未超过 30s 上限）
      jest.spyOn(Date, 'now').mockReturnValue(baseTime + 20000);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(1);

      // 35s 后应发射（已超过 30s 上限，即使未超过 60s scanRate）
      jest.spyOn(Date, 'now').mockReturnValue(baseTime + 35000);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(2);
    });

    it('中频任务（30s）应恰好按 30s 节流', () => {
      const task = makeTask({ interval: 30000 });
      scheduler.registerTask(task);

      const handleCommSuccess = (scheduler as any).handleCommSuccess.bind(scheduler);

      const baseTime = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(baseTime);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(1);

      // 29s 后不应发射
      jest.spyOn(Date, 'now').mockReturnValue(baseTime + 29000);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(1);

      // 31s 后应发射
      jest.spyOn(Date, 'now').mockReturnValue(baseTime + 31000);
      handleCommSuccess('device-001', task);
      expect(mockEventBus.emitDeviceStatusChanged).toHaveBeenCalledTimes(2);
    });
  });

  describe('lastOnlineEmitAt cleanup (unregisterTask)', () => {
    it('注销最后一个任务时应清理 lastOnlineEmitAt 记录', () => {
      const task = makeTask({ id: 'task-A', deviceId: 'device-A' });
      scheduler.registerTask(task);

      // 触发一次 online 事件，写入 lastOnlineEmitAt
      const handleCommSuccess = (scheduler as any).handleCommSuccess.bind(scheduler);
      handleCommSuccess('device-A', task);

      const lastOnlineEmitAt = (scheduler as any).lastOnlineEmitAt as Map<string, number>;
      expect(lastOnlineEmitAt.has('device-A')).toBe(true);

      // 注销任务后应清理
      scheduler.unregisterTask('task-A');
      expect(lastOnlineEmitAt.has('device-A')).toBe(false);
    });

    it('设备还有其他任务时不应清理 lastOnlineEmitAt 记录', () => {
      const taskA = makeTask({ id: 'task-A', deviceId: 'device-A', tagId: 'tag-A' });
      const taskB = makeTask({ id: 'task-B', deviceId: 'device-A', tagId: 'tag-B' });
      scheduler.registerTask(taskA);
      scheduler.registerTask(taskB);

      const handleCommSuccess = (scheduler as any).handleCommSuccess.bind(scheduler);
      handleCommSuccess('device-A', taskA);

      const lastOnlineEmitAt = (scheduler as any).lastOnlineEmitAt as Map<string, number>;

      // 注销 task-A，但 device-A 还有 task-B，不应清理
      scheduler.unregisterTask('task-A');
      expect(lastOnlineEmitAt.has('device-A')).toBe(true);
    });
  });

  describe('updateTaskInterval', () => {
    it('应更新指定设备所有任务的执行间隔', () => {
      const task1 = makeTask({ id: 'task-1', deviceId: 'device-X', interval: 1000 });
      const task2 = makeTask({ id: 'task-2', deviceId: 'device-X', interval: 1000 });
      const task3 = makeTask({ id: 'task-3', deviceId: 'device-Y', interval: 1000 });
      scheduler.registerTask(task1);
      scheduler.registerTask(task2);
      scheduler.registerTask(task3);

      const updated = scheduler.updateTaskInterval('device-X', 5000);
      expect(updated).toBe(2);

      const tasks = scheduler.getTaskStatus();
      expect(tasks.get('task-1')?.interval).toBe(5000);
      expect(tasks.get('task-2')?.interval).toBe(5000);
      expect(tasks.get('task-3')?.interval).toBe(1000);
    });

    it('无效间隔应被忽略', () => {
      const task = makeTask({ id: 'task-1', deviceId: 'device-X', interval: 1000 });
      scheduler.registerTask(task);

      const updated = scheduler.updateTaskInterval('device-X', 0);
      expect(updated).toBe(0);
      expect(scheduler.getTaskStatus().get('task-1')?.interval).toBe(1000);
    });
  });
});
