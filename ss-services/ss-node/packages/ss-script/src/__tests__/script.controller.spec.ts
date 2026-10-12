// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @nestjs/swagger decorators
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const deco = (): any => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  const propDeco = (): any => () => {};
  return {
    ApiTags: (..._tags: string[]) => deco(),
    ApiBearerAuth: () => deco(),
    ApiOperation: (_opts: any) => deco(),
    ApiParam: (_opts: any) => deco(),
    ApiQuery: (_opts: any) => deco(),
    ApiProperty: (_opts?: any) => propDeco(),
    ApiPropertyOptional: (_opts?: any) => propDeco(),
    ApiBody: (_opts?: any) => deco(),
    ApiResponse: (_opts?: any) => deco(),
    PartialType: (cls: any) => cls,
    OmitType: (cls: any, _keys: string[]) => cls,
    PickType: (cls: any, _keys: string[]) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

// ============================================================
// Mock @ss-node/ss-core guards
// ============================================================
jest.mock('@ss-node/ss-core', () => {
  const noopDeco = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  class MockJwtAuthGuard {
    canActivate = () => true;
  }
  class MockRolesGuard {
    canActivate = () => true;
  }
  return {
    JwtAuthGuard: MockJwtAuthGuard,
    RolesGuard: MockRolesGuard,
    Roles: (..._roles: any[]) => noopDeco(),
    ReadRoles: () => noopDeco(),
    WriteRoles: () => noopDeco(),
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
    // Stub for ProjectScopedEntity (required by script entity import chain)
    ProjectScopedEntity: class {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      projectId: string;
    },
    BaseEntity: class {},
  };
});

// ============================================================
// Mock 外部服务包，避免加载真实源码的依赖链（ss-datatag → ss-device → ss-system 循环依赖）
// ============================================================
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

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ScriptController } from '../script.controller';
import { ScriptService } from '../script.service';
import { ScriptValidatorService } from '../script-validator.service';
import { ScriptMetricsService } from '../script-metrics.service';
import { ScriptAuditService } from '../script-audit.service';
import { ScriptTemplateService } from '../script-template.service';
import { ExecutionQueueService } from '../execution-queue.service';
import { NotFoundException } from '@nestjs/common';

// ============================================================
// Mock Services
// ============================================================
const mockScriptService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  executeScript: jest.fn(),
  getExecution: jest.fn(),
  cancelExecution: jest.fn(),
  getExecutionHistory: jest.fn(),
  getApiFunctions: jest.fn(),
};

const mockValidatorService = {
  validate: jest.fn(),
  dryRun: jest.fn(),
};

const mockMetricsService = {
  getMetrics: jest.fn(),
  recordExecution: jest.fn(),
};

const mockAuditService = {
  getAuditLogs: jest.fn(),
  getAllPermissions: jest.fn(),
  getApiWhitelist: jest.fn(),
};

const mockTemplateService = {
  listTemplates: jest.fn(),
  getTemplate: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  instantiateTemplate: jest.fn(),
};

const mockQueueService = {
  getStats: jest.fn(),
};

describe('ScriptController', () => {
  let controller: ScriptController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScriptController],
      providers: [
        { provide: ScriptService, useValue: mockScriptService },
        { provide: ScriptValidatorService, useValue: mockValidatorService },
        { provide: ScriptMetricsService, useValue: mockMetricsService },
        { provide: ScriptAuditService, useValue: mockAuditService },
        { provide: ScriptTemplateService, useValue: mockTemplateService },
        { provide: ExecutionQueueService, useValue: mockQueueService },
      ],
    }).compile();

    controller = module.get<ScriptController>(ScriptController);
    jest.clearAllMocks();
  });

  // ==================== POST /projects/:projectId/scripts (create) ====================
  describe('POST /projects/:projectId/scripts', () => {
    const dto = { name: 'test-script', code: 'return 42;' };

    it('should create script and assign projectId from param', async () => {
      const saved = { id: 'script-001', ...dto, projectId: 'project-001' };
      mockScriptService.create.mockResolvedValue(saved);

      const result = await controller.create('project-001', dto);

      expect(result).toEqual(saved);
      expect(mockScriptService.create).toHaveBeenCalledWith({
        ...dto,
        projectId: 'project-001',
      });
    });
  });

  // ==================== GET /projects/:projectId/scripts ====================
  describe('GET /projects/:projectId/scripts', () => {
    it('should return all scripts for project', async () => {
      const scripts = [
        { id: 'script-001', name: 'Script A', projectId: 'project-001' },
        { id: 'script-002', name: 'Script B', projectId: 'project-001' },
      ];
      mockScriptService.findAll.mockResolvedValue(scripts);

      const result = await controller.findAll('project-001');

      expect(result).toEqual(scripts);
      expect(mockScriptService.findAll).toHaveBeenCalledWith('project-001');
    });

    it('should return empty array when no scripts', async () => {
      mockScriptService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('empty-project');

      expect(result).toEqual([]);
    });
  });

  // ==================== GET /projects/:projectId/scripts/:id ====================
  describe('GET /projects/:projectId/scripts/:id', () => {
    it('should return script by id', async () => {
      const script = { id: 'script-001', name: 'Test Script', projectId: 'project-001' };
      mockScriptService.findOne.mockResolvedValue(script);

      const result = await controller.findOne('project-001', 'script-001');

      expect(result).toEqual(script);
      expect(mockScriptService.findOne).toHaveBeenCalledWith('script-001', 'project-001');
    });

    it('should propagate NotFoundException', async () => {
      mockScriptService.findOne.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findOne('project-001', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== PATCH /projects/:projectId/scripts/:id ====================
  describe('PATCH /projects/:projectId/scripts/:id', () => {
    it('should update script fields', async () => {
      const updated = { id: 'script-001', name: 'updated-script', projectId: 'project-001' };
      mockScriptService.update.mockResolvedValue(updated);

      const result = await controller.update('project-001', 'script-001', {
        name: 'updated-script',
      });

      expect(result).toEqual(updated);
      expect(mockScriptService.update).toHaveBeenCalledWith(
        'script-001',
        { name: 'updated-script' },
        'project-001',
      );
    });
  });

  // ==================== DELETE /projects/:projectId/scripts/:id ====================
  describe('DELETE /projects/:projectId/scripts/:id', () => {
    it('should delete script', async () => {
      mockScriptService.remove.mockResolvedValue(undefined);

      await controller.remove('project-001', 'script-001');

      expect(mockScriptService.remove).toHaveBeenCalledWith('script-001', 'project-001');
    });
  });

  // ==================== POST /projects/:projectId/scripts/:id/execute ====================
  describe('POST /projects/:projectId/scripts/:id/execute', () => {
    it('should execute script synchronously', async () => {
      const result = { success: true, result: 42, durationMs: 50, memoryUsedMb: 2 };
      mockScriptService.executeScript.mockResolvedValue(result);

      const dto = { params: { param: 'value' } };
      const output = await controller.execute('project-001', 'script-001', dto);

      expect(output).toEqual(result);
      expect(mockScriptService.executeScript).toHaveBeenCalledWith(
        'script-001',
        'project-001',
        dto,
      );
    });

    it('should execute script asynchronously when async=true', async () => {
      const asyncResult = { executionId: 'exec-001', status: 'queued' };
      mockScriptService.executeScript.mockResolvedValue(asyncResult);

      const dto = { async: true, userId: 'user-1' };
      const output = await controller.execute('project-001', 'script-001', dto);

      expect(output).toEqual(asyncResult);
      expect(mockScriptService.executeScript).toHaveBeenCalledWith(
        'script-001',
        'project-001',
        dto,
      );
    });

    it('should execute with priority option', async () => {
      const result = { success: true, durationMs: 10, memoryUsedMb: 0 };
      mockScriptService.executeScript.mockResolvedValue(result);

      const dto = { priority: 'high' as const };
      await controller.execute('project-001', 'script-001', dto);

      expect(mockScriptService.executeScript).toHaveBeenCalledWith(
        'script-001',
        'project-001',
        dto,
      );
    });
  });

  // ==================== GET /projects/:projectId/scripts/:id/executions/:executionId ====================
  describe('GET /projects/:projectId/scripts/:id/executions/:executionId', () => {
    it('should return execution record by id', async () => {
      const execution = {
        id: 'exec-001',
        scriptId: 'script-001',
        status: 'completed',
        result: '42',
      };
      mockScriptService.getExecution.mockResolvedValue(execution);

      const result = await controller.getExecution('project-001', 'script-001', 'exec-001');

      expect(result).toEqual(execution);
      expect(mockScriptService.getExecution).toHaveBeenCalledWith('exec-001', 'project-001');
    });

    it('should propagate NotFoundException when execution not found', async () => {
      mockScriptService.getExecution.mockRejectedValue(new NotFoundException('Not found'));

      await expect(
        controller.getExecution('project-001', 'script-001', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== DELETE /projects/:projectId/scripts/:id/executions/:executionId ====================
  describe('DELETE /projects/:projectId/scripts/:id/executions/:executionId', () => {
    it('should cancel execution', async () => {
      const cancelResult = { executionId: 'exec-001', cancelled: true };
      mockScriptService.cancelExecution.mockResolvedValue(cancelResult);

      const result = await controller.cancelExecution('project-001', 'script-001', 'exec-001');

      expect(result).toEqual(cancelResult);
      expect(mockScriptService.cancelExecution).toHaveBeenCalledWith('exec-001', 'project-001');
    });

    it('should return cancelled=false when job not in queue', async () => {
      const cancelResult = { executionId: 'exec-002', cancelled: false };
      mockScriptService.cancelExecution.mockResolvedValue(cancelResult);

      const result = await controller.cancelExecution('project-001', 'script-001', 'exec-002');

      expect(result.cancelled).toBe(false);
    });
  });

  // ==================== GET /projects/:projectId/scripts/:id/history ====================
  describe('GET /projects/:projectId/scripts/:id/history', () => {
    it('should return execution history', async () => {
      const history = [
        { id: 'exec-001', scriptId: 'script-001', status: 'completed' },
        { id: 'exec-002', scriptId: 'script-001', status: 'failed' },
      ];
      mockScriptService.getExecutionHistory.mockResolvedValue(history);

      const result = await controller.getHistory('project-001', 'script-001');

      expect(result).toEqual(history);
      expect(mockScriptService.getExecutionHistory).toHaveBeenCalledWith('script-001');
    });
  });

  // ==================== GET /projects/:projectId/scripts/api/functions ====================
  describe('GET /projects/:projectId/scripts/api/functions', () => {
    it('should return available API functions', async () => {
      const functions = [
        { name: 'readTag', description: 'Read tag', parameters: ['tagId'] },
        { name: 'writeTag', description: 'Write tag', parameters: ['tagId', 'value'] },
      ];
      mockScriptService.getApiFunctions.mockResolvedValue(functions);

      const result = await controller.getApiFunctions();

      expect(result).toEqual(functions);
      expect(mockScriptService.getApiFunctions).toHaveBeenCalled();
    });
  });

  // ==================== POST /projects/:projectId/scripts/validate ====================
  describe('POST /projects/:projectId/scripts/validate', () => {
    it('should validate script syntax', async () => {
      const validationResult = { valid: true, errors: [] };
      mockValidatorService.validate.mockReturnValue(validationResult);

      const result = await controller.validate({ code: 'const x = 1;' });

      expect(result).toEqual(validationResult);
      expect(mockValidatorService.validate).toHaveBeenCalledWith('const x = 1;');
    });
  });

  // ==================== POST /projects/:projectId/scripts/dry-run ====================
  describe('POST /projects/:projectId/scripts/dry-run', () => {
    it('should dry run script', async () => {
      const dryRunResult = { success: true, result: 42, durationMs: 10, memoryUsedMb: 2, logs: [] };
      mockValidatorService.dryRun.mockResolvedValue(dryRunResult);

      const result = await controller.dryRun({ code: 'return 42;' });

      expect(result).toEqual(dryRunResult);
      expect(mockValidatorService.dryRun).toHaveBeenCalledWith(
        'return 42;',
        undefined,
        undefined,
        undefined,
      );
    });
  });

  // ==================== GET /projects/:projectId/scripts/metrics/overview ====================
  describe('GET /projects/:projectId/scripts/metrics/overview', () => {
    it('should return metrics', async () => {
      const queueStats = { queueLength: 0, activeJobs: 0 };
      mockQueueService.getStats.mockReturnValue(queueStats);
      const metrics = { totalExecutions: 100, successRate: 0.95 };
      mockMetricsService.getMetrics.mockReturnValue(metrics);

      const result = await controller.getMetrics();

      expect(result).toEqual(metrics);
      expect(mockQueueService.getStats).toHaveBeenCalled();
      expect(mockMetricsService.getMetrics).toHaveBeenCalledWith(0, 0);
    });
  });

  // ==================== GET /projects/:projectId/scripts/queue/status ====================
  describe('GET /projects/:projectId/scripts/queue/status', () => {
    it('should return queue status', async () => {
      const stats = { queueLength: 5, activeJobs: 3, globalLimit: 50, projectLimit: 10 };
      mockQueueService.getStats.mockReturnValue(stats);

      const result = await controller.getQueueStatus();

      expect(result).toEqual(stats);
      expect(mockQueueService.getStats).toHaveBeenCalled();
    });
  });

  // ==================== GET /projects/:projectId/scripts/audit/logs ====================
  describe('GET /projects/:projectId/scripts/audit/logs', () => {
    it('should return audit logs', async () => {
      const logs = [{ id: 'audit-1', action: 'create', userId: 'user-1' }];
      mockAuditService.getAuditLogs.mockReturnValue(logs);

      const result = await controller.getAuditLogs();

      expect(result).toEqual(logs);
      expect(mockAuditService.getAuditLogs).toHaveBeenCalled();
    });
  });

  // ==================== GET /projects/:projectId/scripts/templates ====================
  describe('GET /projects/:projectId/scripts/templates', () => {
    it('should return template list', async () => {
      const templates = [{ id: 't1', name: 'Template 1', category: 'report' }];
      mockTemplateService.listTemplates.mockResolvedValue(templates);

      const result = await controller.listTemplates();

      expect(result).toEqual(templates);
      expect(mockTemplateService.listTemplates).toHaveBeenCalledWith({
        category: undefined,
        keyword: undefined,
      });
    });

    it('should pass filter params', async () => {
      const templates = [{ id: 't1', name: 'T', category: 'report' }];
      mockTemplateService.listTemplates.mockResolvedValue(templates);

      await controller.listTemplates('report', 'test');

      expect(mockTemplateService.listTemplates).toHaveBeenCalledWith({
        category: 'report',
        keyword: 'test',
      });
    });
  });

  // ==================== GET /projects/:projectId/scripts/templates/:id ====================
  describe('GET /projects/:projectId/scripts/templates/:id', () => {
    it('should return template by id', async () => {
      const template = { id: 't1', name: 'Template 1' };
      mockTemplateService.getTemplate.mockResolvedValue(template);

      const result = await controller.getTemplate('t1');

      expect(result).toEqual(template);
      expect(mockTemplateService.getTemplate).toHaveBeenCalledWith('t1');
    });
  });

  // ==================== POST /projects/:projectId/scripts/templates ====================
  describe('POST /projects/:projectId/scripts/templates', () => {
    it('should create template', async () => {
      const dto = { name: 'New', category: 'custom', triggerType: 'manual', code: 'return 1;' };
      const created = { id: 't1', ...dto };
      mockTemplateService.createTemplate.mockResolvedValue(created);

      const result = await controller.createTemplate(dto);

      expect(result).toEqual(created);
      expect(mockTemplateService.createTemplate).toHaveBeenCalledWith(dto);
    });
  });

  // ==================== PATCH /projects/:projectId/scripts/templates/:id ====================
  describe('PATCH /projects/:projectId/scripts/templates/:id', () => {
    it('should update template', async () => {
      const updated = { id: 't1', name: 'Updated' };
      mockTemplateService.updateTemplate.mockResolvedValue(updated);

      const result = await controller.updateTemplate('t1', { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith('t1', { name: 'Updated' });
    });
  });

  // ==================== DELETE /projects/:projectId/scripts/templates/:id ====================
  describe('DELETE /projects/:projectId/scripts/templates/:id', () => {
    it('should delete template', async () => {
      mockTemplateService.deleteTemplate.mockResolvedValue(undefined);

      await controller.deleteTemplate('t1');

      expect(mockTemplateService.deleteTemplate).toHaveBeenCalledWith('t1');
    });
  });

  // ==================== POST /projects/:projectId/scripts/templates/:id/instantiate ====================
  describe('POST /projects/:projectId/scripts/templates/:id/instantiate', () => {
    it('should instantiate template into a script', async () => {
      const script = { id: 'script-1', name: 'My Script', projectId: 'project-001' };
      mockTemplateService.instantiateTemplate.mockResolvedValue(script);

      const result = await controller.instantiateTemplate('project-001', 't1', {
        name: 'My Script',
      });

      expect(result).toEqual(script);
      expect(mockTemplateService.instantiateTemplate).toHaveBeenCalledWith(
        't1',
        'My Script',
        'project-001',
      );
    });
  });
});
