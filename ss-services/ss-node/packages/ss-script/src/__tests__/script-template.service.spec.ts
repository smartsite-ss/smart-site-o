// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ScriptTemplateService } from '../script-template.service';
import { ScriptTemplate, TemplateCategory } from '../entities/script-template.entity';
import { ScriptTriggerType } from '../entities/script.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock @nestjs/swagger（ScriptApiService 间接导入 ss-datatag 需要 PartialType）
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

// Mock StructuredLogger to avoid file system operations during tests
jest.mock('@ss-node/ss-core', () => ({
  StructuredLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  // Stub for ProjectScopedEntity (required by script entity import chain)
  ProjectScopedEntity: class {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    projectId: string;
  },
  BaseEntity: class {},
}));

describe('ScriptTemplateService', () => {
  let service: ScriptTemplateService;
  let mockRepo: jest.Mocked<any>;
  let mockScriptService: jest.Mocked<any>;

  const builtinTemplate: Partial<ScriptTemplate> = {
    id: 'builtin-1',
    name: '温度单位转换',
    description: '将华氏度转换为摄氏度',
    category: TemplateCategory.DATA_TRANSFORM,
    triggerType: ScriptTriggerType.PIPELINE,
    triggerConfig: null,
    code: 'return 42;',
    tags: ['temperature'],
    author: 'system',
    version: '1.0.0',
    isBuiltin: true,
  };

  const customTemplate: Partial<ScriptTemplate> = {
    id: 'custom-1',
    name: 'My Custom Template',
    description: 'A custom template',
    category: TemplateCategory.CUSTOM,
    triggerType: ScriptTriggerType.MANUAL,
    triggerConfig: null,
    code: 'return 1;',
    tags: ['test'],
    author: 'user',
    version: '1.0.0',
    isBuiltin: false,
  };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto: any) => ({ ...dto })),
      save: jest.fn((entity: any) => Promise.resolve({ ...entity, id: entity.id || 'new-id' })),
      remove: jest.fn(),
    };

    mockScriptService = {
      create: jest.fn((dto: any) => Promise.resolve({ id: 'script-new', ...dto })),
    };

    service = new ScriptTemplateService(mockRepo, mockScriptService);
  });

  describe('initBuiltinTemplates', () => {
    it('should create builtin templates that do not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await service.initBuiltinTemplates();

      expect(mockRepo.findOne).toHaveBeenCalledTimes(4);
      expect(mockRepo.create).toHaveBeenCalledTimes(4);
      expect(mockRepo.save).toHaveBeenCalledTimes(4);
    });

    it('should skip builtin templates that already exist', async () => {
      mockRepo.findOne.mockResolvedValue(builtinTemplate);

      await service.initBuiltinTemplates();

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('listTemplates', () => {
    it('should return all templates when no filter', async () => {
      mockRepo.find.mockResolvedValue([builtinTemplate, customTemplate]);

      const result = await service.listTemplates();

      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { isBuiltin: 'DESC', createdAt: 'DESC' },
      });
    });

    it('should filter by category', async () => {
      mockRepo.find.mockResolvedValue([builtinTemplate]);

      const result = await service.listTemplates({ category: 'data_transform' });

      expect(result).toHaveLength(1);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'data_transform' }),
        }),
      );
    });

    it('should filter by keyword', async () => {
      mockRepo.find.mockResolvedValue([builtinTemplate]);

      const result = await service.listTemplates({ keyword: '温度' });

      expect(result).toHaveLength(1);
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      mockRepo.findOne.mockResolvedValue(builtinTemplate);

      const result = await service.getTemplate('builtin-1');

      expect(result).toEqual(builtinTemplate);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getTemplate('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create a custom template', async () => {
      const dto = {
        name: 'New Template',
        description: 'desc',
        category: TemplateCategory.CUSTOM,
        triggerType: ScriptTriggerType.MANUAL,
        code: 'return 1;',
      };
      mockRepo.save.mockResolvedValue({ ...dto, id: 'new-id', isBuiltin: false });

      const result = await service.createTemplate(dto);

      expect(result.name).toBe('New Template');
      expect(result.isBuiltin).toBe(false);
    });
  });

  describe('updateTemplate', () => {
    it('should update custom template', async () => {
      mockRepo.findOne.mockResolvedValue({ ...customTemplate });
      mockRepo.save.mockResolvedValue({ ...customTemplate, name: 'Updated' });

      const result = await service.updateTemplate('custom-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw when template not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.updateTemplate('non-existent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when updating builtin template', async () => {
      mockRepo.findOne.mockResolvedValue(builtinTemplate);

      await expect(service.updateTemplate('builtin-1', { name: 'Hacked' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete custom template', async () => {
      mockRepo.findOne.mockResolvedValue(customTemplate);

      await service.deleteTemplate('custom-1');

      expect(mockRepo.remove).toHaveBeenCalledWith(customTemplate);
    });

    it('should throw when deleting builtin template', async () => {
      mockRepo.findOne.mockResolvedValue(builtinTemplate);

      await expect(service.deleteTemplate('builtin-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw when template not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteTemplate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('instantiateTemplate', () => {
    it('should create a script from template', async () => {
      mockRepo.findOne.mockResolvedValue(builtinTemplate);

      const result = await service.instantiateTemplate('builtin-1', 'My Script', 'project-1');

      expect(mockScriptService.create).toHaveBeenCalledWith({
        name: 'My Script',
        description: builtinTemplate.description,
        code: builtinTemplate.code,
        triggerType: builtinTemplate.triggerType,
        triggerConfig: builtinTemplate.triggerConfig,
        projectId: 'project-1',
        status: 'draft',
      });
      expect(result.id).toBe('script-new');
    });

    it('should throw when template not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.instantiateTemplate('non-existent', 'Test', 'project-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
