// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Mock @nestjs/swagger
jest.mock('@nestjs/swagger', () => {
  const propDeco = (): any => () => {};
  return {
    ApiTags: () => () => {},
    ApiBearerAuth: () => () => {},
    ApiOperation: () => () => {},
    ApiParam: () => () => {},
    ApiQuery: () => () => {},
    ApiProperty: () => propDeco(),
    ApiPropertyOptional: () => propDeco(),
    ApiBody: () => () => {},
    ApiResponse: () => () => {},
    PartialType: (cls: any) => cls,
    OmitType: (cls: any) => cls,
    PickType: (cls: any) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

// Mock 外部服务包，避免加载真实源码的依赖链
jest.mock('@ss-node/ss-datatag', () => ({
  DataTagService: jest.fn().mockImplementation(() => ({ findById: jest.fn() })),
  DatatagModule: class {},
  DataTag: class {},
}));
jest.mock('@ss-node/ss-alarm', () => ({
  AlarmService: jest.fn().mockImplementation(() => ({ acknowledgeAlarm: jest.fn() })),
  AlarmModule: class {},
}));
jest.mock('@ss-node/ss-storage-influx', () => ({
  DataQueryService: jest.fn().mockImplementation(() => ({ queryTrendData: jest.fn() })),
  DataModule: class {},
  InterpolationType: { RAW: 'raw', LINEAR: 'linear', STEP: 'step' },
}));

// Mock node-cron
jest.mock('node-cron', () => ({
  validate: jest.fn((expr: string) => expr === '*/5 * * * *' || expr === '0 0 * * *'),
  schedule: jest.fn((_expr: string, callback: () => void, _options: any) => ({
    stop: jest.fn(),
    start: jest.fn(),
  })),
}));

import * as cron from 'node-cron';
import { ScriptSchedulerService } from '../script-scheduler.service';
import { Script, ScriptStatus, ScriptTriggerType } from '../entities/script.entity';

const mockCron = cron as jest.Mocked<typeof cron>;

function createMockScriptRepo() {
  return {
    find: jest.fn(),
  };
}

function createMockEngineService() {
  return {
    execute: jest.fn().mockResolvedValue({ success: true, durationMs: 0, memoryUsedMb: 0 }),
  };
}

function createMockApiService() {
  return {
    getApiProvider: jest.fn().mockReturnValue({ readTag: jest.fn() }),
  };
}

function makeScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 'script-001',
    name: 'scheduled-script',
    description: '',
    code: 'return 1;',
    status: ScriptStatus.ACTIVE,
    triggerType: ScriptTriggerType.SCHEDULED,
    triggerConfig: '{"cron":"*/5 * * * *"}',
    allowNetwork: false,
    allowFileSystem: false,
    timeoutMs: 5000,
    memoryLimitMb: 128,
    projectId: 'project-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ScriptSchedulerService', () => {
  let service: ScriptSchedulerService;
  let mockScriptRepo: ReturnType<typeof createMockScriptRepo>;
  let mockEngineService: ReturnType<typeof createMockEngineService>;
  let mockApiService: ReturnType<typeof createMockApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScriptRepo = createMockScriptRepo();
    mockEngineService = createMockEngineService();
    mockApiService = createMockApiService();

    service = new ScriptSchedulerService(
      mockScriptRepo as any,
      mockEngineService as any,
      mockApiService as any,
    );
  });

  // ==================== scheduleScript ====================
  describe('scheduleScript', () => {
    it('should call cron.schedule with correct expression and timezone', async () => {
      const script = makeScript();
      await service.scheduleScript(script);

      expect(cron.schedule).toHaveBeenCalledWith(
        '*/5 * * * *',
        expect.any(Function),
        { timezone: 'Asia/Shanghai' },
      );
    });

    it('should validate cron expression before scheduling', async () => {
      const script = makeScript({ triggerConfig: '{"cron":"*/5 * * * *"}' });
      await service.scheduleScript(script);

      expect(cron.validate).toHaveBeenCalledWith('*/5 * * * *');
    });

    it('should not schedule when cron expression is invalid', async () => {
      const script = makeScript({ triggerConfig: '{"cron":"invalid"}' });
      await service.scheduleScript(script);

      expect(cron.validate).toHaveBeenCalledWith('invalid');
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should use default expression when triggerConfig has no cron', async () => {
      const script = makeScript({ triggerConfig: null });
      await service.scheduleScript(script);

      expect(cron.schedule).toHaveBeenCalledWith(
        '*/5 * * * *',
        expect.any(Function),
        { timezone: 'Asia/Shanghai' },
      );
    });

    it('should not schedule non-SCHEDULED scripts', async () => {
      const script = makeScript({ triggerType: ScriptTriggerType.MANUAL });
      await service.scheduleScript(script);

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should unschedule when script status is not ACTIVE', async () => {
      const script = makeScript({ status: ScriptStatus.PAUSED });
      await service.scheduleScript(script);

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should pass projectId to getApiProvider when executing', async () => {
      const script = makeScript({ projectId: 'proj-sched-1' });
      await service.scheduleScript(script);

      // Get the callback passed to cron.schedule and invoke it
      const scheduleCall = mockCron.schedule.mock.calls[0];
      const callback = scheduleCall[1] as () => Promise<void>;
      await callback();

      expect(mockApiService.getApiProvider).toHaveBeenCalledWith('proj-sched-1');
      expect(mockEngineService.execute).toHaveBeenCalledWith(
        script,
        expect.objectContaining({
          apiProvider: expect.any(Object),
          trigger: 'scheduled',
        }),
      );
    });

    it('should reschedule (stop old task) when called again for same script', async () => {
      const script = makeScript({ id: 'script-resched' });
      await service.scheduleScript(script);
      // First schedule creates a task with a stop method
      const firstTask = mockCron.schedule.mock.results[0].value;

      await service.scheduleScript(script);

      // The first task should have been stopped
      expect(firstTask.stop).toHaveBeenCalled();
    });
  });

  // ==================== unscheduleScript ====================
  describe('unscheduleScript', () => {
    it('should stop task when unscheduling', async () => {
      const script = makeScript({ id: 'script-unsched' });
      await service.scheduleScript(script);
      const task = mockCron.schedule.mock.results[0].value;

      service.unscheduleScript('script-unsched');

      expect(task.stop).toHaveBeenCalled();
    });

    it('should do nothing when script is not scheduled', () => {
      expect(() => service.unscheduleScript('non-existent')).not.toThrow();
    });
  });

  // ==================== unscheduleAll ====================
  describe('unscheduleAll', () => {
    it('should stop all scheduled tasks', async () => {
      const script1 = makeScript({ id: 's1', triggerConfig: '{"cron":"*/5 * * * *"}' });
      const script2 = makeScript({ id: 's2', triggerConfig: '{"cron":"0 0 * * *"}' });
      await service.scheduleScript(script1);
      await service.scheduleScript(script2);

      const tasks = mockCron.schedule.mock.results.map((r) => r.value);

      service.unscheduleAll();

      expect(tasks[0].stop).toHaveBeenCalled();
      expect(tasks[1].stop).toHaveBeenCalled();
    });
  });

  // ==================== onModuleDestroy ====================
  describe('onModuleDestroy', () => {
    it('should stop all tasks on module destroy', async () => {
      const script = makeScript({ id: 's1' });
      await service.scheduleScript(script);
      const task = mockCron.schedule.mock.results[0].value;

      service.onModuleDestroy();

      expect(task.stop).toHaveBeenCalled();
    });
  });

  // ==================== loadScheduledScripts ====================
  describe('loadScheduledScripts', () => {
    it('should load and schedule all active scheduled scripts', async () => {
      const scripts = [
        makeScript({ id: 's1', triggerConfig: '{"cron":"*/5 * * * *"}' }),
        makeScript({ id: 's2', triggerConfig: '{"cron":"0 0 * * *"}' }),
      ];
      mockScriptRepo.find.mockResolvedValue(scripts);

      await service.loadScheduledScripts('project-001');

      expect(mockScriptRepo.find).toHaveBeenCalledWith({
        where: {
          triggerType: ScriptTriggerType.SCHEDULED,
          status: ScriptStatus.ACTIVE,
          projectId: 'project-001',
        },
      });
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });

    it('should handle empty script list', async () => {
      mockScriptRepo.find.mockResolvedValue([]);

      await service.loadScheduledScripts();

      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  // ==================== getScheduledTasks ====================
  describe('getScheduledTasks', () => {
    it('should return list of scheduled task info', async () => {
      const script = makeScript({ id: 's1', triggerConfig: '{"cron":"0 0 * * *"}' });
      await service.scheduleScript(script);

      const tasks = service.getScheduledTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].scriptId).toBe('s1');
      expect(tasks[0].cronExpression).toBe('0 0 * * *');
    });
  });
});
