// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Mock @nestjs/swagger（ScriptApiService 间接导入 ss-datatag 需要此 mock）
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

import { ScriptService } from '../script.service';
import {
  Script,
  ScriptExecution,
  ScriptStatus,
  ScriptTriggerType,
} from '../entities/script.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExecutionPriority } from '../execution-queue.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockScriptRepo(): MockRepository<Script> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
}

function createMockExecutionRepo(): MockRepository<ScriptExecution> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
}

function makeScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 'script-001',
    name: 'test-script',
    description: 'A test script',
    code: 'return 42;',
    status: ScriptStatus.DRAFT,
    triggerType: ScriptTriggerType.MANUAL,
    triggerConfig: null,
    allowNetwork: false,
    allowFileSystem: false,
    timeoutMs: 5000,
    memoryLimitMb: 128,
    projectId: 'project-001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeExecution(overrides: Partial<ScriptExecution> = {}): ScriptExecution {
  return {
    id: 'exec-001',
    scriptId: 'script-001',
    trigger: ScriptTriggerType.MANUAL,
    status: 'completed',
    result: '42',
    error: null,
    durationMs: 100,
    memoryUsedMb: 5,
    startedAt: new Date('2024-01-01T00:00:00Z'),
    finishedAt: new Date('2024-01-01T00:00:01Z'),
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockEngineService() {
  return {
    execute: jest.fn(),
    runScript: jest.fn(),
  };
}

function createMockApiService() {
  return {
    getApiFunctions: jest.fn(),
    getApiProvider: jest.fn().mockReturnValue({ readTag: jest.fn() }),
  };
}

function createMockSchedulerService() {
  return {
    scheduleScript: jest.fn(),
    unscheduleScript: jest.fn(),
  };
}

function createMockQueueService() {
  // 队列 mock：直接同步执行 executeFn 并返回结果（模拟无背压的即时执行）
  return {
    enqueue: jest.fn(
      (_id: string, _scriptId: string, _projectId: string, _priority: number, executeFn: () => Promise<any>) =>
        executeFn(),
    ),
    getStats: jest.fn(),
    cancelJob: jest.fn().mockReturnValue(false),
  };
}

function createMockI18nService() {
  return {
    tSync: jest.fn().mockImplementation((key: string, params?: any) => {
      if (key === 'common.not_found') return `Resource not found: ${params?.resource}`;
      return `i18n:${key}`;
    }),
  };
}

describe('ScriptService', () => {
  let service: ScriptService;
  let mockScriptRepo: MockRepository<Script>;
  let mockExecutionRepo: MockRepository<ScriptExecution>;
  let mockEngineService: ReturnType<typeof createMockEngineService>;
  let mockApiService: ReturnType<typeof createMockApiService>;
  let mockSchedulerService: ReturnType<typeof createMockSchedulerService>;
  let mockQueueService: ReturnType<typeof createMockQueueService>;
  let mockI18nService: ReturnType<typeof createMockI18nService>;

  beforeEach(() => {
    mockScriptRepo = createMockScriptRepo();
    mockExecutionRepo = createMockExecutionRepo();
    mockEngineService = createMockEngineService();
    mockApiService = createMockApiService();
    mockSchedulerService = createMockSchedulerService();
    mockQueueService = createMockQueueService();
    mockI18nService = createMockI18nService();

    // executionRepo.create 返回带 id 的记录对象
    mockExecutionRepo.create.mockImplementation((data: any) => ({
      id: 'exec-generated',
      status: 'queued',
      ...data,
    }));
    mockExecutionRepo.save.mockResolvedValue(undefined);

    service = new ScriptService(
      mockScriptRepo as any,
      mockExecutionRepo as any,
      mockEngineService as any,
      mockApiService as any,
      mockSchedulerService as any,
      mockQueueService as any,
      mockI18nService as any,
    );
  });

  // ==================== create ====================
  describe('create', () => {
    const baseDto: Partial<Script> = {
      name: 'new-script',
      code: 'return 42;',
      projectId: 'project-001',
    };

    it('should create script with valid data', async () => {
      const created = makeScript({ name: 'new-script', code: 'return 42;' });
      mockScriptRepo.create.mockReturnValue(created);
      mockScriptRepo.save.mockResolvedValue(created);

      const result = await service.create(baseDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('new-script');
      expect(mockScriptRepo.create).toHaveBeenCalledWith(baseDto);
      expect(mockScriptRepo.save).toHaveBeenCalledWith(created);
    });

    it('should schedule cron job if triggerType is SCHEDULED and status is ACTIVE', async () => {
      const scheduled = makeScript({
        name: 'scheduled-script',
        triggerType: ScriptTriggerType.SCHEDULED,
        status: ScriptStatus.ACTIVE,
      });
      mockScriptRepo.create.mockReturnValue(scheduled);
      mockScriptRepo.save.mockResolvedValue(scheduled);

      const result = await service.create({
        ...baseDto,
        triggerType: ScriptTriggerType.SCHEDULED,
        status: ScriptStatus.ACTIVE,
      });

      expect(result).toBeDefined();
      expect(mockSchedulerService.scheduleScript).toHaveBeenCalledWith(scheduled);
    });

    it('should not schedule if triggerType is SCHEDULED but status is not ACTIVE', async () => {
      const draft = makeScript({
        name: 'draft-scheduled',
        triggerType: ScriptTriggerType.SCHEDULED,
        status: ScriptStatus.DRAFT,
      });
      mockScriptRepo.create.mockReturnValue(draft);
      mockScriptRepo.save.mockResolvedValue(draft);

      await service.create({
        ...baseDto,
        triggerType: ScriptTriggerType.SCHEDULED,
        status: ScriptStatus.DRAFT,
      });

      expect(mockSchedulerService.scheduleScript).not.toHaveBeenCalled();
    });

    it('should not schedule if triggerType is MANUAL', async () => {
      const manual = makeScript({
        name: 'manual-script',
        triggerType: ScriptTriggerType.MANUAL,
        status: ScriptStatus.ACTIVE,
      });
      mockScriptRepo.create.mockReturnValue(manual);
      mockScriptRepo.save.mockResolvedValue(manual);

      await service.create({
        ...baseDto,
        triggerType: ScriptTriggerType.MANUAL,
        status: ScriptStatus.ACTIVE,
      });

      expect(mockSchedulerService.scheduleScript).not.toHaveBeenCalled();
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    it('should return scripts for project ordered by createdAt DESC', async () => {
      const scripts = [
        makeScript({ id: 'script-001', name: 'Script A' }),
        makeScript({ id: 'script-002', name: 'Script B' }),
      ];
      mockScriptRepo.find.mockResolvedValue(scripts);

      const result = await service.findAll('project-001');

      expect(result).toEqual(scripts);
      expect(mockScriptRepo.find).toHaveBeenCalledWith({
        where: { projectId: 'project-001' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no scripts exist', async () => {
      mockScriptRepo.find.mockResolvedValue([]);

      const result = await service.findAll('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== findOne ====================
  describe('findOne', () => {
    it('should return script by id and projectId', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);

      const result = await service.findOne('script-001', 'project-001');

      expect(result).toEqual(script);
      expect(mockScriptRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'script-001', projectId: 'project-001' },
      });
    });

    it('should throw NotFoundException when script not found', async () => {
      mockScriptRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== update ====================
  describe('update', () => {
    it('should update script fields', async () => {
      const existing = makeScript({ id: 'script-001', name: 'old-name', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(existing);
      const updated = { ...existing, name: 'new-name', code: 'return 100;' };
      mockScriptRepo.save.mockResolvedValue(updated);

      const result = await service.update(
        'script-001',
        { name: 'new-name', code: 'return 100;' },
        'project-001',
      );

      expect(result.name).toBe('new-name');
      expect(result.code).toBe('return 100;');
      expect(mockScriptRepo.save).toHaveBeenCalled();
    });

    it('should reschedule when updating to SCHEDULED + ACTIVE', async () => {
      const existing = makeScript({
        id: 'script-001',
        triggerType: ScriptTriggerType.SCHEDULED,
        status: ScriptStatus.ACTIVE,
        projectId: 'project-001',
      });
      mockScriptRepo.findOne.mockResolvedValue(existing);
      mockScriptRepo.save.mockResolvedValue(existing);

      await service.update('script-001', { code: 'return 1;' }, 'project-001');

      expect(mockSchedulerService.scheduleScript).toHaveBeenCalledWith(existing);
    });

    it('should unschedule when status changed to PAUSED', async () => {
      const existing = makeScript({
        id: 'script-001',
        triggerType: ScriptTriggerType.SCHEDULED,
        status: ScriptStatus.PAUSED,
        projectId: 'project-001',
      });
      mockScriptRepo.findOne.mockResolvedValue(existing);
      mockScriptRepo.save.mockResolvedValue(existing);

      await service.update('script-001', { status: ScriptStatus.PAUSED }, 'project-001');

      expect(mockSchedulerService.unscheduleScript).toHaveBeenCalledWith('script-001');
    });

    it('should throw NotFoundException when updating non-existent script', async () => {
      mockScriptRepo.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'x' }, 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== remove ====================
  describe('remove', () => {
    it('should delete script and cancel schedule', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockScriptRepo.remove.mockResolvedValue(script);

      await service.remove('script-001', 'project-001');

      expect(mockSchedulerService.unscheduleScript).toHaveBeenCalledWith('script-001');
      expect(mockScriptRepo.remove).toHaveBeenCalledWith(script);
    });

    it('should throw NotFoundException when removing non-existent script', async () => {
      mockScriptRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== executeScript（队列接入） ====================
  describe('executeScript', () => {
    it('should execute script synchronously via queue and return result', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);
      const executionResult = {
        success: true,
        result: 42,
        durationMs: 50,
        memoryUsedMb: 2,
      };
      mockEngineService.runScript.mockResolvedValue(executionResult);

      const result = await service.executeScript('script-001', 'project-001');

      expect(result).toEqual(executionResult);
      // 验证调用了 runScript（非 execute）
      expect(mockEngineService.runScript).toHaveBeenCalledWith(
        script,
        expect.objectContaining({
          apiProvider: expect.any(Object),
          trigger: 'manual',
          userId: 'system',
        }),
      );
      // 验证入队
      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        expect.any(String),
        'script-001',
        'project-001',
        ExecutionPriority.NORMAL,
        expect.any(Function),
        5000,
      );
      // 验证创建并保存执行记录
      expect(mockExecutionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scriptId: 'script-001',
          status: 'queued',
        }),
      );
      expect(mockExecutionRepo.save).toHaveBeenCalled();
    });

    it('should pass projectId to apiProvider', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockEngineService.runScript.mockResolvedValue({
        success: true,
        durationMs: 0,
        memoryUsedMb: 0,
      });

      await service.executeScript('script-001', 'project-001');

      expect(mockApiService.getApiProvider).toHaveBeenCalledWith('project-001');
    });

    it('should execute asynchronously and return executionId when async=true', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockEngineService.runScript.mockResolvedValue({
        success: true,
        durationMs: 0,
        memoryUsedMb: 0,
      });

      const result = await service.executeScript('script-001', 'project-001', {
        async: true,
        userId: 'user-1',
      });

      expect(result).toHaveProperty('executionId');
      expect((result as any).status).toBe('queued');
    });

    it('should map priority from explicit value', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockEngineService.runScript.mockResolvedValue({
        success: true,
        durationMs: 0,
        memoryUsedMb: 0,
      });

      await service.executeScript('script-001', 'project-001', { priority: 'critical' });

      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        expect.any(String),
        'script-001',
        'project-001',
        ExecutionPriority.CRITICAL,
        expect.any(Function),
        5000,
      );
    });

    it('should map scheduled trigger to LOW priority', async () => {
      const script = makeScript({
        id: 'script-001',
        projectId: 'project-001',
        triggerType: ScriptTriggerType.SCHEDULED,
      });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockEngineService.runScript.mockResolvedValue({
        success: true,
        durationMs: 0,
        memoryUsedMb: 0,
      });

      await service.executeScript('script-001', 'project-001');

      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        expect.any(String),
        'script-001',
        'project-001',
        ExecutionPriority.LOW,
        expect.any(Function),
        5000,
      );
    });

    it('should map event trigger to HIGH priority', async () => {
      const script = makeScript({
        id: 'script-001',
        projectId: 'project-001',
        triggerType: ScriptTriggerType.EVENT,
      });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockEngineService.runScript.mockResolvedValue({
        success: true,
        durationMs: 0,
        memoryUsedMb: 0,
      });

      await service.executeScript('script-001', 'project-001');

      expect(mockQueueService.enqueue).toHaveBeenCalledWith(
        expect.any(String),
        'script-001',
        'project-001',
        ExecutionPriority.HIGH,
        expect.any(Function),
        5000,
      );
    });

    it('should update execution record to failed on script failure', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockEngineService.runScript.mockResolvedValue({
        success: false,
        error: 'Runtime error',
        durationMs: 100,
        memoryUsedMb: 0,
      });

      const result = await service.executeScript('script-001', 'project-001');

      expect(result.success).toBe(false);
      // 最后一次 save 应该是 failed 状态
      const lastSaveCall = mockExecutionRepo.save.mock.calls[mockExecutionRepo.save.mock.calls.length - 1][0];
      expect(lastSaveCall.status).toBe('failed');
      expect(lastSaveCall.error).toBe('Runtime error');
    });

    it('should throw NotFoundException when script not found', async () => {
      mockScriptRepo.findOne.mockResolvedValue(null);

      await expect(service.executeScript('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== getExecution ====================
  describe('getExecution', () => {
    it('should return execution record by id', async () => {
      const execution = makeExecution({ id: 'exec-001' });
      mockExecutionRepo.findOne.mockResolvedValue(execution);

      const result = await service.getExecution('exec-001', 'project-001');

      expect(result).toEqual(execution);
      expect(mockExecutionRepo.findOne).toHaveBeenCalledWith({ where: { id: 'exec-001' } });
    });

    it('should throw NotFoundException when execution not found', async () => {
      mockExecutionRepo.findOne.mockResolvedValue(null);

      await expect(service.getExecution('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== cancelExecution ====================
  describe('cancelExecution', () => {
    it('should cancel queued job and update record status', async () => {
      mockQueueService.cancelJob.mockReturnValue(true);
      const execution = makeExecution({ id: 'exec-001', status: 'queued' });
      mockExecutionRepo.findOne.mockResolvedValue(execution);

      const result = await service.cancelExecution('exec-001', 'project-001');

      expect(result.cancelled).toBe(true);
      expect(execution.status).toBe('cancelled');
      expect(mockExecutionRepo.save).toHaveBeenCalledWith(execution);
    });

    it('should return cancelled=false when job not in queue', async () => {
      mockQueueService.cancelJob.mockReturnValue(false);

      const result = await service.cancelExecution('non-existent', 'project-001');

      expect(result.cancelled).toBe(false);
    });

    it('should not update record when already completed', async () => {
      mockQueueService.cancelJob.mockReturnValue(true);
      const execution = makeExecution({ id: 'exec-001', status: 'completed' });
      mockExecutionRepo.findOne.mockResolvedValue(execution);

      await service.cancelExecution('exec-001', 'project-001');

      // status 不应被改为 cancelled
      expect(execution.status).toBe('completed');
    });
  });

  // ==================== getExecutionHistory ====================
  describe('getExecutionHistory', () => {
    it('should return execution history ordered by createdAt DESC', async () => {
      const executions = [
        makeExecution({ id: 'exec-002', scriptId: 'script-001' }),
        makeExecution({ id: 'exec-001', scriptId: 'script-001' }),
      ];
      mockExecutionRepo.find.mockResolvedValue(executions);

      const result = await service.getExecutionHistory('script-001');

      expect(result).toEqual(executions);
      expect(mockExecutionRepo.find).toHaveBeenCalledWith({
        where: { scriptId: 'script-001' },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    });

    it('should respect custom limit', async () => {
      mockExecutionRepo.find.mockResolvedValue([]);

      await service.getExecutionHistory('script-001', 5);

      expect(mockExecutionRepo.find).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });

    it('should return empty array when no history', async () => {
      mockExecutionRepo.find.mockResolvedValue([]);

      const result = await service.getExecutionHistory('script-001');

      expect(result).toEqual([]);
    });
  });

  // ==================== getApiFunctions ====================
  describe('getApiFunctions', () => {
    it('should return available API functions', async () => {
      const apiFunctions = [
        { name: 'readTag', description: 'Read tag', parameters: ['tagId'], fn: jest.fn() },
        {
          name: 'writeTag',
          description: 'Write tag',
          parameters: ['tagId', 'value'],
          fn: jest.fn(),
        },
      ];
      mockApiService.getApiFunctions.mockReturnValue(apiFunctions);

      const result = await service.getApiFunctions();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('readTag');
      expect(result[0].parameters).toEqual(['tagId']);
      expect(result[0]).not.toHaveProperty('fn');
    });

    it('should return empty array when no functions registered', async () => {
      mockApiService.getApiFunctions.mockReturnValue([]);

      const result = await service.getApiFunctions();

      expect(result).toEqual([]);
    });
  });

  // ==================== Edge Cases ====================
  describe('edge cases', () => {
    it('should handle script with empty code', async () => {
      const script = makeScript({ code: '', projectId: 'project-001' });
      mockScriptRepo.create.mockReturnValue(script);
      mockScriptRepo.save.mockResolvedValue(script);

      const result = await service.create({
        name: 'empty-script',
        code: '',
        projectId: 'project-001',
      });

      expect(result.code).toBe('');
    });

    it('should handle execution with failed result', async () => {
      const script = makeScript({ id: 'script-001', projectId: 'project-001' });
      mockScriptRepo.findOne.mockResolvedValue(script);
      mockEngineService.runScript.mockResolvedValue({
        success: false,
        error: 'Runtime error',
        durationMs: 100,
        memoryUsedMb: 0,
      });

      const result = await service.executeScript('script-001', 'project-001');

      expect(result.success).toBe(false);
      expect((result as any).error).toBe('Runtime error');
    });
  });
});
