// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @nestjs/swagger decorators to avoid runtime decorator issues
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const deco = (): any => (target: any, key?: string, descriptor?: any) => {
    return descriptor ?? target;
  };
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
// Mock @ss-node/ss-core guards (as proper classes)
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
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
    // Stub for ProjectScopedEntity (required by data-tag entity import chain)
    ProjectScopedEntity: class {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      projectId: string;
    },
    BaseEntity: class {},
  };
});

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { DataTagController } from '../datatag.controller';
import { DataTagService } from '../datatag.service';
import { TagImportService } from '../import/tag-import.service';
import { TagExportService } from '../export/tag-export.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ============================================================
// Mock services
// ============================================================
const mockTagService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  batchCreate: jest.fn(),
  batchDelete: jest.fn(),
  searchTags: jest.fn(),
};

const mockImportService = {
  importJson: jest.fn(),
};

const mockExportService = {
  exportByDevice: jest.fn(),
};

describe('DataTagController', () => {
  let controller: DataTagController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataTagController],
      providers: [
        { provide: DataTagService, useValue: mockTagService },
        { provide: TagImportService, useValue: mockImportService },
        { provide: TagExportService, useValue: mockExportService },
      ],
    }).compile();

    controller = module.get<DataTagController>(DataTagController);
    jest.clearAllMocks();
  });

  // ==================== create ====================
  describe('POST /projects/:projectId/datatags', () => {
    const createDto = {
      name: 'tag-001',
      address: '40001',
      dataType: 'float32',
      deviceId: 'device-001',
    };

    it('TC-DTC-001: should create a tag and assign projectId from param', async () => {
      const savedTag = { id: 'tag-001', ...createDto, projectId: 'project-001' };
      mockTagService.create.mockResolvedValue(savedTag);

      const result = await controller.create('project-001', createDto as any);

      expect(result).toEqual(savedTag);
      expect(mockTagService.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...createDto, projectId: 'project-001' }),
      );
    });

    it('TC-DTC-002: should propagate BadRequestException from service', async () => {
      mockTagService.create.mockRejectedValue(new BadRequestException('标签名称已存在'));

      await expect(controller.create('project-001', createDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== findAll ====================
  describe('GET /projects/:projectId/datatags', () => {
    it('TC-DTC-010: should return paginated list with default params', async () => {
      const paginatedResult = {
        data: [{ id: 'tag-001', name: 'tag1' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      mockTagService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll('project-001', {});

      expect(result).toEqual(paginatedResult);
      expect(mockTagService.findAll).toHaveBeenCalledWith('project-001', {});
    });

    it('TC-DTC-011: should pass query params to service', async () => {
      const query = { page: 2, pageSize: 10, deviceId: 'device-001', q: 'pressure' };
      mockTagService.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
      });

      const result = await controller.findAll('project-001', query as any);

      expect(mockTagService.findAll).toHaveBeenCalledWith('project-001', query);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
    });

    it('TC-DTC-012: should return empty data when no tags found', async () => {
      mockTagService.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });

      const result = await controller.findAll('project-001', {});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ==================== findOne ====================
  describe('GET /projects/:projectId/datatags/:id', () => {
    it('TC-DTC-020: should return tag by id', async () => {
      const tag = { id: 'tag-001', name: 'test-tag', address: '40001' };
      mockTagService.findById.mockResolvedValue(tag);

      const result = await controller.findOne('tag-001');

      expect(result).toEqual(tag);
      expect(mockTagService.findById).toHaveBeenCalledWith('tag-001');
    });

    it('TC-DTC-021: should propagate NotFoundException from service', async () => {
      mockTagService.findById.mockRejectedValue(new NotFoundException('标签不存在'));

      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== update ====================
  describe('PATCH /projects/:projectId/datatags/:id', () => {
    it('TC-DTC-030: should update tag fields', async () => {
      const updatedTag = { id: 'tag-001', name: 'updated-tag', description: 'new desc' };
      mockTagService.update.mockResolvedValue(updatedTag);

      const dto = { name: 'updated-tag', description: 'new desc' };
      const result = await controller.update('tag-001', dto as any);

      expect(result).toEqual(updatedTag);
      expect(mockTagService.update).toHaveBeenCalledWith('tag-001', dto);
    });

    it('TC-DTC-031: should propagate NotFoundException when updating non-existent tag', async () => {
      mockTagService.update.mockRejectedValue(new NotFoundException('标签不存在'));

      await expect(controller.update('non-existent', { name: 'x' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-DTC-032: should propagate BadRequestException on duplicate name', async () => {
      mockTagService.update.mockRejectedValue(new BadRequestException('标签名称已存在'));

      await expect(controller.update('tag-001', { name: 'duplicate' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== remove ====================
  describe('DELETE /projects/:projectId/datatags/:id', () => {
    it('TC-DTC-040: should remove tag by id', async () => {
      mockTagService.remove.mockResolvedValue(undefined);

      await controller.remove('tag-001');

      expect(mockTagService.remove).toHaveBeenCalledWith('tag-001');
    });

    it('TC-DTC-041: should propagate NotFoundException when removing non-existent tag', async () => {
      mockTagService.remove.mockRejectedValue(new NotFoundException('标签不存在'));

      await expect(controller.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== batchCreate ====================
  describe('POST /projects/:projectId/datatags/batch', () => {
    it('TC-DTC-050: should batch create tags with projectId', async () => {
      const batchResult = {
        success: [
          { id: 'tag-001', name: 'tag1' },
          { id: 'tag-002', name: 'tag2' },
        ],
        errors: [],
      };
      mockTagService.batchCreate.mockResolvedValue(batchResult);

      const dto = {
        tags: [
          { name: 'tag1', address: '40001', dataType: 'float32', deviceId: 'device-001' },
          { name: 'tag2', address: '40002', dataType: 'float32', deviceId: 'device-001' },
        ],
      };

      const result = await controller.batchCreate('project-001', dto as any);

      expect(result).toEqual(batchResult);
      expect(mockTagService.batchCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'tag1', projectId: 'project-001' }),
          expect.objectContaining({ name: 'tag2', projectId: 'project-001' }),
        ]),
      );
    });

    it('TC-DTC-051: should handle partial failures in batch create', async () => {
      const batchResult = {
        success: [{ id: 'tag-001', name: 'tag1' }],
        errors: [{ index: 1, message: '标签名称已存在' }],
      };
      mockTagService.batchCreate.mockResolvedValue(batchResult);

      const dto = {
        tags: [{ name: 'tag1', address: '40001', dataType: 'float32', deviceId: 'd1' }],
      };
      const result = await controller.batchCreate('project-001', dto as any);

      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  // ==================== batchDelete ====================
  describe('DELETE /projects/:projectId/datatags/batch', () => {
    it('TC-DTC-060: should batch delete tags by ids', async () => {
      mockTagService.batchDelete.mockResolvedValue({ deleted: 3 });

      const result = await controller.batchDelete({ ids: ['tag-001', 'tag-002', 'tag-003'] });

      expect(result).toEqual({ deleted: 3 });
      expect(mockTagService.batchDelete).toHaveBeenCalledWith(['tag-001', 'tag-002', 'tag-003']);
    });

    it('TC-DTC-061: should return 0 deleted when no tags match', async () => {
      mockTagService.batchDelete.mockResolvedValue({ deleted: 0 });

      const result = await controller.batchDelete({ ids: ['non-existent'] });

      expect(result.deleted).toBe(0);
    });
  });

  // ==================== importTags ====================
  describe('POST /projects/:projectId/datatags/import', () => {
    it('TC-DTC-070: should import tags with explicit deviceId (no fallback)', async () => {
      const importResult = {
        valid: true,
        successCount: 2,
        failureCount: 0,
        errors: [],
        warnings: [],
      };
      mockImportService.importJson.mockResolvedValue(importResult);

      // deviceId 现为必填，禁止回退 default-device（见 07 §4.1 G5）
      const body = { tags: [{ name: 'tag1' }, { name: 'tag2' }], deviceId: 'device-001' };
      const result = await controller.importTags('project-001', body as any);

      expect(result).toEqual(importResult);
      expect(mockImportService.importJson).toHaveBeenCalledWith(
        body.tags,
        'device-001',
        'project-001',
        undefined,
      );
    });

    it('TC-DTC-071: should use provided deviceId when specified', async () => {
      mockImportService.importJson.mockResolvedValue({
        valid: true,
        successCount: 1,
        failureCount: 0,
        errors: [],
        warnings: [],
      });

      const body = { tags: [{ name: 'tag1' }], deviceId: 'custom-device' };
      await controller.importTags('project-001', body as any);

      expect(mockImportService.importJson).toHaveBeenCalledWith(
        body.tags,
        'custom-device',
        'project-001',
        undefined,
      );
    });

    it('TC-DTC-072: should pass import options to service', async () => {
      mockImportService.importJson.mockResolvedValue({
        valid: true,
        successCount: 0,
        failureCount: 0,
        errors: [],
        warnings: [],
      });

      const body = { tags: [], deviceId: 'device-001', options: { overwrite: true, skipErrors: false } };
      await controller.importTags('project-001', body as any);

      expect(mockImportService.importJson).toHaveBeenCalledWith(
        [],
        'device-001',
        'project-001',
        { overwrite: true, skipErrors: false },
      );
    });
  });

  // ==================== exportTags ====================
  describe('GET /projects/:projectId/datatags/export/:deviceId', () => {
    it('TC-DTC-080: should export tags for a device', async () => {
      const exportData = { deviceId: 'device-001', tags: [{ name: 'tag1', address: '40001' }] };
      mockExportService.exportByDevice.mockResolvedValue(exportData);

      const result = await controller.exportTags('project-001', 'device-001');

      expect(result).toEqual(exportData);
      expect(mockExportService.exportByDevice).toHaveBeenCalledWith('device-001', 'project-001');
    });

    it('TC-DTC-081: should return empty tags when device has no tags', async () => {
      mockExportService.exportByDevice.mockResolvedValue({ deviceId: 'device-empty', tags: [] });

      const result: any = await controller.exportTags('project-001', 'device-empty');

      expect(result.tags).toEqual([]);
    });
  });

  // ==================== searchTags ====================
  describe('GET /projects/:projectId/datatags/search', () => {
    it('TC-DTC-S01: should return search results with valid limit', async () => {
      const paginatedResult = {
        data: [{ id: 'tag-001', name: 'pressure-001' }],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      mockTagService.searchTags.mockResolvedValue(paginatedResult);

      const result = await controller.searchTags('project-001');

      expect(result).toEqual(paginatedResult);
      expect(mockTagService.searchTags).toHaveBeenCalledWith(
        'project-001', undefined, undefined, 1, 20,
      );
    });

    it('TC-DTC-S02: should use default limit 20 when not provided', async () => {
      mockTagService.searchTags.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });

      await controller.searchTags('project-001');

      expect(mockTagService.searchTags).toHaveBeenCalledWith(
        'project-001', undefined, undefined, 1, 20,
      );
    });

    it('TC-DTC-S03: should accept limit within max 100', async () => {
      mockTagService.searchTags.mockResolvedValue({
        data: [{ id: 'tag-001', name: 'tag1' }],
        pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
      });

      const result = await controller.searchTags(
        'project-001', undefined, undefined, '1', '50',
      );

      expect(result.data).toHaveLength(1);
      expect(result.pagination.pageSize).toBe(50);
      expect(mockTagService.searchTags).toHaveBeenCalledWith(
        'project-001', undefined, undefined, 1, 50,
      );
    });

    it('TC-DTC-S04: should reject limit greater than 100', async () => {
      await expect(
        controller.searchTags('project-001', undefined, undefined, '1', '200'),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-DTC-S05: should reject limit less than 1', async () => {
      await expect(
        controller.searchTags('project-001', undefined, undefined, '1', '0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-DTC-S06: should pass search keyword and type filter', async () => {
      mockTagService.searchTags.mockResolvedValue({
        data: [{ id: 'tag-001', name: 'pressure', dataType: 'float32' }],
        pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      });

      const result = await controller.searchTags('project-001', 'pressure', 'float32');

      expect(result.pagination.total).toBe(1);
      expect(mockTagService.searchTags).toHaveBeenCalledWith(
        'project-001', 'pressure', 'float32', 1, 20,
      );
    });
  });
});
