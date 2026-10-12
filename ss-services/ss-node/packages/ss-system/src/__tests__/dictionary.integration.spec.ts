// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { PathResolverService } from '@ss-node/ss-core';
import { DictionaryController } from '../dict/dictionary.controller';
import { DictionaryLoaderService, DictTable } from '../dict/dictionary-loader.service';

// Mock swagger decorators
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

const sampleTable: DictTable = {
  dictId: 'tagDataType',
  dictName: '标签数据类型',
  category: 'basic-data',
  description: '标签数据类型枚举',
  version: '1.0',
  sortOrder: 4,
  items: [
    { value: 'bool', label: '布尔', sortOrder: 1, description: '布尔类型' },
    { value: 'int16', label: '整型', sortOrder: 2, description: '16位整型' },
  ],
};

const mockLoader = {
  getAllCategories: jest.fn(),
  getAllDicts: jest.fn(),
  getDict: jest.fn(),
  loadSingleDict: jest.fn(),
  createCategory: jest.fn(),
  renameCategory: jest.fn(),
  deleteCategory: jest.fn(),
  createTable: jest.fn(),
  importTable: jest.fn(),
  exportTable: jest.fn().mockReturnValue(sampleTable),
  updateTable: jest.fn(),
  deleteTable: jest.fn(),
  reloadAll: jest.fn(),
  getSupportedLocales: jest.fn().mockReturnValue(['zh-CN', 'en-US']),
};

describe('DictionaryController - HTTP Integration (supertest)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DictionaryController],
      providers: [
        { provide: DictionaryLoaderService, useValue: mockLoader },
        { provide: PathResolverService, useValue: { resolve: jest.fn((p: string) => p), getProjectRoot: jest.fn().mockReturnValue('/fake/project-root') } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 分类管理 ====================

  describe('POST /api/v1/dicts/categories', () => {
    it('should create a category', () => {
      return request(app.getHttpServer())
        .post('/api/v1/dicts/categories')
        .send({ locale: 'zh-CN', name: 'new-cat' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('分类已创建');
          expect(mockLoader.createCategory).toHaveBeenCalledWith('zh-CN', 'new-cat');
        });
    });
  });

  describe('PATCH /api/v1/dicts/categories', () => {
    it('should rename a category', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/dicts/categories')
        .send({ locale: 'zh-CN', oldName: 'old', newName: 'new' })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('分类已重命名');
        });
    });
  });

  describe('DELETE /api/v1/dicts/categories', () => {
    it('should delete a category', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/dicts/categories')
        .send({ locale: 'zh-CN', name: 'to-delete' })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('分类已删除');
        });
    });
  });

  // ==================== 字典表管理 ====================

  describe('POST /api/v1/dicts/tables', () => {
    it('should create a table', () => {
      return request(app.getHttpServer())
        .post('/api/v1/dicts/tables')
        .send({ locale: 'zh-CN', category: 'basic-data', table: sampleTable })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('字典表已创建');
          expect(mockLoader.createTable).toHaveBeenCalledWith('zh-CN', 'basic-data', sampleTable);
        });
    });
  });

  describe('PUT /api/v1/dicts/tables/:dictId', () => {
    it('should update table metadata via query params', () => {
      return request(app.getHttpServer())
        .put('/api/v1/dicts/tables/tagDataType')
        .query({ locale: 'zh-CN', category: 'basic-data' })
        .send({ table: { dictName: 'Updated', description: 'Updated desc' } })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('字典表已更新');
          expect(mockLoader.updateTable).toHaveBeenCalledWith(
            'zh-CN',
            'basic-data',
            'tagDataType',
            { dictName: 'Updated', description: 'Updated desc' },
          );
        });
    });

    it('should update table items', () => {
      const newItems = [{ value: 'new_item', label: 'New', sortOrder: 1, description: '' }];
      return request(app.getHttpServer())
        .put('/api/v1/dicts/tables/tagDataType')
        .query({ locale: 'zh-CN', category: 'basic-data' })
        .send({ table: { items: newItems } })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('字典表已更新');
          expect(mockLoader.updateTable).toHaveBeenCalledWith(
            'zh-CN',
            'basic-data',
            'tagDataType',
            { items: newItems },
          );
        });
    });

    it('should return 200 even with missing locale (uses default)', () => {
      return request(app.getHttpServer())
        .put('/api/v1/dicts/tables/someDict')
        .query({ category: 'basic-data' })
        .send({ table: { dictName: 'x' } })
        .expect(200)
        .expect((_res) => {
          expect(mockLoader.updateTable).toHaveBeenCalledWith('zh-CN', 'basic-data', 'someDict', {
            dictName: 'x',
          });
        });
    });

    it('should return 200 with en-US locale', () => {
      return request(app.getHttpServer())
        .put('/api/v1/dicts/tables/someDict')
        .query({ locale: 'en-US', category: 'basic-data' })
        .send({ table: { dictName: 'Test' } })
        .expect(200);
    });

    // Verify the exact URL from the user's error: /api/v1/dicts/tables/tagDataType?locale=zh-CN&category=basic-data
    it('should work with the exact URL pattern from the error report', () => {
      return request(app.getHttpServer())
        .put('/api/v1/dicts/tables/tagDataType?locale=zh-CN&category=basic-data')
        .send({
          table: { items: [{ value: 'test', label: '测试', sortOrder: 1, description: '' }] },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('字典表已更新');
        });
    });
  });

  describe('DELETE /api/v1/dicts/tables/:dictId', () => {
    it('should delete a table', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/dicts/tables/tagDataType')
        .send({ locale: 'zh-CN', category: 'basic-data' })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('字典表已删除');
        });
    });
  });

  describe('GET /api/v1/dicts/tables/:dictId/export', () => {
    it('should export a table', () => {
      return request(app.getHttpServer())
        .get('/api/v1/dicts/tables/tagDataType/export')
        .query({ locale: 'zh-CN', category: 'basic-data' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.dictId).toBe('tagDataType');
          expect(res.body.data.items).toHaveLength(2);
        });
    });
  });

  describe('POST /api/v1/dicts/tables/import', () => {
    it('should import a table', () => {
      return request(app.getHttpServer())
        .post('/api/v1/dicts/tables/import')
        .send({
          locale: 'zh-CN',
          category: 'basic-data',
          dictId: 'tagDataType',
          table: sampleTable,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('字典表已导入');
        });
    });
  });

  describe('GET /api/v1/dicts', () => {
    it('should return categories', () => {
      mockLoader.getAllCategories.mockReturnValue([
        { category: 'basic-data', tables: [sampleTable] },
      ]);
      return request(app.getHttpServer())
        .get('/api/v1/dicts')
        .query({ locale: 'zh-CN' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].category).toBe('basic-data');
        });
    });
  });

  describe('GET /api/v1/dicts/:dictId', () => {
    it('should return a specific dict', () => {
      mockLoader.getDict.mockReturnValue(sampleTable);
      return request(app.getHttpServer())
        .get('/api/v1/dicts/tagDataType')
        .query({ locale: 'zh-CN' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.dictId).toBe('tagDataType');
        });
    });

    it('should return null for non-existent dict', () => {
      mockLoader.getDict.mockReturnValue(null);
      mockLoader.loadSingleDict.mockReturnValue(null);
      return request(app.getHttpServer())
        .get('/api/v1/dicts/nonexistent')
        .query({ locale: 'zh-CN' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeNull();
          expect(res.body.message).toContain('不存在');
        });
    });
  });
});
