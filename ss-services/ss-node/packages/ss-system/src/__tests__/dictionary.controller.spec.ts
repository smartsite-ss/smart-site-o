// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { PathResolverService } from '@ss-node/ss-core';
import { DictionaryController } from '../dict/dictionary.controller';
import { DictionaryLoaderService, DictTable } from '../dict/dictionary-loader.service';

// Mock all swagger decorators to avoid Reflect metadata issues
jest.mock('@nestjs/swagger', () => {
  const noop = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  return {
    ApiTags: (..._tags: string[]) => noop(),
    ApiOperation: (_opts: any) => noop(),
    ApiBody: (_opts: any) => noop(),
    ApiQuery: (_opts: any) => noop(),
    ApiProperty: (_opts?: any) => noop(),
    ApiPropertyOptional: (_opts?: any) => noop(),
    ApiResponse: (_opts: any) => noop(),
    ApiParam: (_opts: any) => noop(),
    ApiBearerAuth: () => noop(),
    ApiConsumes: (..._types: string[]) => noop(),
    ApiExtraModels: (..._models: any[]) => noop(),
    ApiHeader: (_opts: any) => noop(),
    ApiHideProperty: () => noop(),
    ApiOkResponse: (_opts: any) => noop(),
    ApiCreatedResponse: (_opts: any) => noop(),
    ApiBadRequestResponse: (_opts: any) => noop(),
    ApiNotFoundResponse: (_opts: any) => noop(),
    ApiConflictResponse: (_opts: any) => noop(),
    ApiForbiddenResponse: (_opts: any) => noop(),
    ApiUnauthorizedResponse: (_opts: any) => noop(),
    ApiInternalServerErrorResponse: (_opts: any) => noop(),
    PartialType: (..._args: any[]) => class {},
    OmitType: (..._args: any[]) => class {},
    PickType: (..._args: any[]) => class {},
    IntersectionType: (..._args: any[]) => class {},
    getSchemaPath: (_model: any) => '',
    refs: (..._args: any[]) => [],
  };
});

const mockLoader = {
  getAllCategories: jest.fn(),
  getAllDicts: jest.fn(),
  getDict: jest.fn(),
  createCategory: jest.fn(),
  renameCategory: jest.fn(),
  deleteCategory: jest.fn(),
  createTable: jest.fn(),
  importTable: jest.fn(),
  exportTable: jest.fn(),
  updateTable: jest.fn(),
  deleteTable: jest.fn(),
  reloadAll: jest.fn(),
  getSupportedLocales: jest.fn(),
};

const sampleTable: DictTable = {
  dictId: 'protocolType',
  dictName: '协议类型',
  category: 'basic-data',
  description: '通信协议类型',
  version: '1.0',
  sortOrder: 1,
  items: [{ value: 'modbus_tcp', label: 'Modbus TCP', sortOrder: 1, description: '' }],
};

describe('DictionaryController', () => {
  let controller: DictionaryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DictionaryController],
      providers: [
        { provide: DictionaryLoaderService, useValue: mockLoader },
        { provide: PathResolverService, useValue: { resolve: jest.fn((p: string) => p), getProjectRoot: jest.fn().mockReturnValue('/fake/project-root') } },
      ],
    }).compile();

    controller = module.get<DictionaryController>(DictionaryController);
    jest.clearAllMocks();
  });

  // ==================== 分类管理 ====================

  describe('createCategory (POST /dicts/categories)', () => {
    it('should create a new category', () => {
      const result = controller.createCategory({ locale: 'zh-CN', name: 'new-cat' });

      expect(mockLoader.createCategory).toHaveBeenCalledWith('zh-CN', 'new-cat');
      expect(result.message).toBe('分类已创建');
    });

    it('should use default locale when not provided', () => {
      controller.createCategory({ locale: '', name: 'new-cat' });

      expect(mockLoader.createCategory).toHaveBeenCalledWith('zh-CN', 'new-cat');
    });
  });

  describe('renameCategory (PATCH /dicts/categories)', () => {
    it('should rename an existing category', () => {
      const result = controller.renameCategory({
        locale: 'en-US',
        oldName: 'old-cat',
        newName: 'new-cat',
      });

      expect(mockLoader.renameCategory).toHaveBeenCalledWith('en-US', 'old-cat', 'new-cat');
      expect(result.message).toBe('分类已重命名');
    });

    it('should use default locale when not provided', () => {
      controller.renameCategory({ locale: '', oldName: 'old', newName: 'new' });

      expect(mockLoader.renameCategory).toHaveBeenCalledWith('zh-CN', 'old', 'new');
    });
  });

  describe('deleteCategory (DELETE /dicts/categories)', () => {
    it('should delete a category', () => {
      const result = controller.deleteCategory({ locale: 'zh-CN', name: 'to-delete' });

      expect(mockLoader.deleteCategory).toHaveBeenCalledWith('zh-CN', 'to-delete');
      expect(result.message).toBe('分类已删除');
    });

    it('should use default locale when not provided', () => {
      controller.deleteCategory({ locale: '', name: 'to-delete' });

      expect(mockLoader.deleteCategory).toHaveBeenCalledWith('zh-CN', 'to-delete');
    });
  });

  // ==================== 字典表管理 ====================

  describe('createTable (POST /dicts/tables)', () => {
    it('should create a new dictionary table', () => {
      const result = controller.createTable({
        locale: 'zh-CN',
        category: 'basic-data',
        table: sampleTable,
      });

      expect(mockLoader.createTable).toHaveBeenCalledWith('zh-CN', 'basic-data', sampleTable);
      expect(result.message).toBe('字典表已创建');
    });
  });

  describe('updateTable (PUT /dicts/tables/:dictId)', () => {
    it('should update table metadata', () => {
      const result = controller.updateTable('protocolType', 'zh-CN', 'basic-data', {
        table: { dictName: 'Updated Name' },
      });

      expect(mockLoader.updateTable).toHaveBeenCalledWith('zh-CN', 'basic-data', 'protocolType', {
        dictName: 'Updated Name',
      });
      expect(result.message).toBe('字典表已更新');
    });

    it('should update table items', () => {
      const newItems = [{ value: 'new_val', label: 'New', sortOrder: 1, description: '' }];
      const result = controller.updateTable('protocolType', 'zh-CN', 'basic-data', {
        table: { items: newItems } as any,
      });

      expect(mockLoader.updateTable).toHaveBeenCalledWith('zh-CN', 'basic-data', 'protocolType', {
        items: newItems,
      });
      expect(result.message).toBe('字典表已更新');
    });

    it('should use default locale when not provided', () => {
      controller.updateTable('protocolType', '', 'basic-data', { table: { dictName: 'x' } });

      expect(mockLoader.updateTable).toHaveBeenCalledWith('zh-CN', 'basic-data', 'protocolType', {
        dictName: 'x',
      });
    });
  });

  describe('deleteTable (DELETE /dicts/tables/:dictId)', () => {
    it('should delete a dictionary table', () => {
      const result = controller.deleteTable('protocolType', {
        locale: 'zh-CN',
        category: 'basic-data',
      });

      expect(mockLoader.deleteTable).toHaveBeenCalledWith('zh-CN', 'basic-data', 'protocolType');
      expect(result.message).toBe('字典表已删除');
    });

    it('should use default locale when not provided', () => {
      controller.deleteTable('someId', { locale: '', category: 'cat' });

      expect(mockLoader.deleteTable).toHaveBeenCalledWith('zh-CN', 'cat', 'someId');
    });
  });

  describe('exportTable (GET /dicts/tables/:dictId/export)', () => {
    it('should export a table as JSON', () => {
      mockLoader.exportTable.mockReturnValue(sampleTable);

      const result = controller.exportTable('protocolType', 'zh-CN', 'basic-data');

      expect(mockLoader.exportTable).toHaveBeenCalledWith('zh-CN', 'basic-data', 'protocolType');
      expect(result.data).toEqual(sampleTable);
    });
  });

  describe('importTable (POST /dicts/tables/import)', () => {
    it('should import a table from JSON data', () => {
      const result = controller.importTable({
        locale: 'zh-CN',
        category: 'basic-data',
        dictId: 'protocolType',
        table: sampleTable,
      });

      expect(mockLoader.importTable).toHaveBeenCalledWith(
        'zh-CN',
        'basic-data',
        'protocolType',
        sampleTable,
      );
      expect(result.message).toBe('字典表已导入');
    });
  });
});
