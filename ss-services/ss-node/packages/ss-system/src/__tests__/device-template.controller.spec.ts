// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTemplateController } from '../template/device-template.controller';
import { DeviceTemplateService } from '../template/device-template.service';
import { TemplateLoaderService } from '../template/template-loader.service';
import { TemplateIndexService } from '../template/template-index.service';
import { NotFoundException } from '@nestjs/common';

// ============================================================
// Auto-mock problematic modules
// ============================================================
jest.mock('@nestjs/swagger', () => {
  const noop = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  const noopProp = () => () => {};
  return {
    ApiTags: (..._tags: string[]) => noop(),
    ApiBearerAuth: () => noop(),
    ApiOperation: (_opts: any) => noop(),
    ApiParam: (_opts: any) => noop(),
    ApiQuery: (_opts: any) => noop(),
    ApiProperty: (_opts?: any) => noopProp(),
    ApiPropertyOptional: (_opts?: any) => noopProp(),
    PartialType: (cls: any) => cls,
    OmitType: (cls: any, _keys: string[]) => cls,
    PickType: (cls: any, _keys: string[]) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

jest.mock('@ss-node/ss-core', () => {
  const noopDeco = () => (target: any, key?: string, descriptor?: any) => descriptor ?? target;
  return {
    JwtAuthGuard: { canActivate: jest.fn(() => true) },
    RolesGuard: { canActivate: jest.fn(() => true) },
    Roles: (..._roles: any[]) => noopDeco(),
    ReadRoles: () => noopDeco(),
    WriteRoles: () => noopDeco(),
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
    // Stub for ProjectScopedEntity (required by device entity import chain)
    ProjectScopedEntity: class {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      projectId: string;
    },
    BaseEntity: class {},
  };
});

// Auto-mock template services to avoid real DI resolution
jest.mock('../template/template-loader.service');
jest.mock('../template/template-index.service');

describe('DeviceTemplateController', () => {
  let controller: DeviceTemplateController;
  let mockTemplateService: Record<string, jest.Mock>;
  let _mockTemplateLoader: Record<string, jest.Mock>;
  let _mockIndexService: Record<string, jest.Mock>;

  beforeAll(() => {
    // Ensure mocked TemplateLoaderService has the needed methods
    const mockedLoader = TemplateLoaderService as jest.MockedClass<typeof TemplateLoaderService>;
    mockedLoader.prototype.reload = jest.fn().mockResolvedValue(undefined);
    mockedLoader.prototype.getAllTemplates = jest.fn().mockReturnValue([]);
    mockedLoader.prototype.getTemplate = jest.fn();
    mockedLoader.prototype.getIndex = jest.fn().mockReturnValue(null);
    mockedLoader.prototype.getCacheStats = jest
      .fn()
      .mockReturnValue({ count: 0, deviceTypes: [], industries: [] });
    mockedLoader.prototype.rebuildAndReload = jest.fn();

    const mockedIndex = TemplateIndexService as jest.MockedClass<typeof TemplateIndexService>;
    mockedIndex.prototype.getBasePath = jest.fn().mockReturnValue('');
    mockedIndex.prototype.loadIndex = jest.fn().mockReturnValue(null);
    mockedIndex.prototype.rebuildIndex = jest.fn();
    mockedIndex.prototype.getDirectoryStructure = jest.fn().mockReturnValue([]);
    mockedIndex.prototype.createCategory = jest.fn();
    mockedIndex.prototype.renameCategory = jest.fn();
    mockedIndex.prototype.deleteCategory = jest.fn();
  });

  beforeEach(async () => {
    mockTemplateService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      getLinkedDevices: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      publish: jest.fn(),
      deprecate: jest.fn(),
      clone: jest.fn(),
      apply: jest.fn(),
      sync: jest.fn(),
      getAllTags: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceTemplateController],
      providers: [
        { provide: DeviceTemplateService, useValue: mockTemplateService },
        TemplateLoaderService,
        TemplateIndexService,
      ],
    }).compile();

    controller = module.get<DeviceTemplateController>(DeviceTemplateController);
  });

  const mockReq = (userId?: string) => ({ user: { id: userId || 'user-001' } });

  // ==================== create ====================
  describe('POST /templates', () => {
    it('TC-DTC-001: should create a template with authorId from request', async () => {
      const dto = { name: 'Template-A', deviceType: 'opcua', description: 'Test' };
      const saved = { id: 'tpl-001', ...dto, authorId: 'user-001' };
      mockTemplateService.create.mockResolvedValue(saved);

      const result = await controller.create(dto as any, mockReq('user-001'));

      expect(result).toEqual(saved);
      expect(mockTemplateService.create).toHaveBeenCalledWith(dto, 'user-001');
    });

    it('TC-DTC-002: should fallback authorId to system', async () => {
      const dto = { name: 'Template-B', deviceType: 'modbus_tcp' };
      mockTemplateService.create.mockResolvedValue({ ...dto, id: 'tpl-002', authorId: 'system' });

      const result = await controller.create(dto as any, {});
      expect((result as any).authorId).toBe('system');
      expect(mockTemplateService.create).toHaveBeenCalledWith(dto, 'system');
    });
  });

  // ==================== findAll ====================
  describe('GET /templates', () => {
    it('TC-DTC-010: should return paginated template list', async () => {
      const paginated = {
        data: [{ id: 'tpl-001' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      mockTemplateService.findAll.mockResolvedValue(paginated);
      expect(await controller.findAll({})).toEqual(paginated);
      expect(mockTemplateService.findAll).toHaveBeenCalledWith({});
    });

    it('TC-DTC-011: should pass query params for filtering', async () => {
      const query = {
        page: 2,
        pageSize: 10,
        deviceType: 'opcua',
        status: 'published',
        keyword: 'Temp',
      };
      mockTemplateService.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
      });
      await controller.findAll(query);
      expect(mockTemplateService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ==================== getAllTags ====================
  describe('GET /templates/tags/all', () => {
    it('TC-DTC-110: should return all unique tags', async () => {
      mockTemplateService.getAllTags.mockResolvedValue(['modbus', 'opc']);
      expect(await controller.getAllTags()).toEqual(['modbus', 'opc']);
      expect(mockTemplateService.getAllTags).toHaveBeenCalled();
    });
  });

  // ==================== exportTemplate ====================
  describe('GET /templates/:id/export', () => {
    it('TC-DTC-120: should export template JSON from cache', async () => {
      const template = { id: 'tpl-001', name: 'Template-A', variables: [], filePath: null };
      const mockedLoader = TemplateLoaderService as jest.MockedClass<typeof TemplateLoaderService>;
      (mockedLoader.prototype.getTemplate as jest.Mock).mockReturnValue({
        id: 'tpl-001',
        name: 'Template-A',
        variables: [],
        filePath: null,
      });
      const result = await controller.exportTemplate('tpl-001');
      expect(result.data).toEqual(template);
    });

    it('TC-DTC-121: should return null when template not found', async () => {
      const mockedLoader = TemplateLoaderService as jest.MockedClass<typeof TemplateLoaderService>;
      (mockedLoader.prototype.getTemplate as jest.Mock).mockReturnValue(null);
      const result = await controller.exportTemplate('non-existent');
      expect(result.data).toBeNull();
    });
  });

  // ==================== findById ====================
  describe('GET /templates/:id', () => {
    it('TC-DTC-020: should return template by id', async () => {
      const template = { id: 'tpl-001', name: 'Template-A' };
      mockTemplateService.findById.mockResolvedValue(template);
      expect(await controller.findById('tpl-001')).toEqual(template);
      expect(mockTemplateService.findById).toHaveBeenCalledWith('tpl-001', undefined);
    });

    it('TC-DTC-021: should propagate NotFoundException', async () => {
      mockTemplateService.findById.mockRejectedValue(new NotFoundException('模板不存在'));
      await expect(controller.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== getLinkedDevices ====================
  describe('GET /templates/:id/devices', () => {
    it('TC-DTC-030: should return linked devices', async () => {
      const devices = [{ id: 'dev-1', name: 'Device-A' }];
      mockTemplateService.getLinkedDevices.mockResolvedValue(devices);
      expect(await controller.getLinkedDevices('tpl-001')).toEqual(devices);
      expect(mockTemplateService.getLinkedDevices).toHaveBeenCalledWith('tpl-001');
    });

    it('TC-DTC-031: should return empty array when no devices linked', async () => {
      mockTemplateService.getLinkedDevices.mockResolvedValue([]);
      expect(await controller.getLinkedDevices('tpl-001')).toEqual([]);
    });
  });

  // ==================== update ====================
  describe('PATCH /templates/:id', () => {
    it('TC-DTC-040: should update template fields', async () => {
      const dto = { name: 'Updated', description: 'desc' };
      const updated = { id: 'tpl-001', ...dto };
      mockTemplateService.update.mockResolvedValue(updated);
      expect(await controller.update('tpl-001', dto as any)).toEqual(updated);
      expect(mockTemplateService.update).toHaveBeenCalledWith('tpl-001', dto, undefined);
    });

    it('TC-DTC-041: should update template with locale parameter', async () => {
      const dto = { name: 'Updated', description: 'desc' };
      const updated = { id: 'tpl-001', ...dto };
      mockTemplateService.update.mockResolvedValue(updated);
      expect(await controller.update('tpl-001', dto as any, 'zh-CN')).toEqual(updated);
      expect(mockTemplateService.update).toHaveBeenCalledWith('tpl-001', dto, 'zh-CN');
    });

    it('TC-DTC-042: should update template variables with direction', async () => {
      const variables = [
        { order: 1, name: 'temp', address: '40001', dataType: 'float32', direction: 'read-write' },
      ];
      const dto = { variables };
      const updated = {
        id: 'tpl-001',
        name: 'Test',
        variables,
      };
      mockTemplateService.update.mockResolvedValue(updated);
      const result = await controller.update('tpl-001', dto as any);
      expect(result.variables).toHaveLength(1);
      expect((result.variables[0] as any).direction).toBe('read-write');
      expect(mockTemplateService.update).toHaveBeenCalledWith('tpl-001', dto, undefined);
    });

    it('TC-DTC-043: should update template variables with enabled flag', async () => {
      const variables = [
        { order: 1, name: 'temp', address: '40001', dataType: 'float32', enabled: false },
      ];
      const dto = { variables };
      const updated = {
        id: 'tpl-001',
        name: 'Test',
        variables,
      };
      mockTemplateService.update.mockResolvedValue(updated);
      const result = await controller.update('tpl-001', dto as any);
      expect((result.variables[0] as any).enabled).toBe(false);
    });

    it('TC-DTC-044: should update template with locale and variables', async () => {
      const variables = [
        { order: 1, name: 'valve', address: '00001', dataType: 'boolean', direction: 'write', enabled: true },
      ];
      const dto = { variables };
      const updated = { id: 'tpl-001', name: 'Test', variables };
      mockTemplateService.update.mockResolvedValue(updated);
      const result = await controller.update('tpl-001', dto as any, 'en-US');
      expect(result.variables).toHaveLength(1);
      expect(mockTemplateService.update).toHaveBeenCalledWith('tpl-001', dto, 'en-US');
    });
  });

  // ==================== remove ====================
  describe('DELETE /templates/:id', () => {
    it('TC-DTC-050: should remove template', async () => {
      mockTemplateService.remove.mockResolvedValue(undefined);
      await controller.remove('tpl-001');
      expect(mockTemplateService.remove).toHaveBeenCalledWith('tpl-001');
    });
  });

  // ==================== publish ====================
  describe('PATCH /templates/:id/publish', () => {
    it('TC-DTC-060: should publish a template', async () => {
      mockTemplateService.publish.mockResolvedValue({ id: 'tpl-001', status: 'published' });
      expect(await controller.publish('tpl-001')).toEqual({ id: 'tpl-001', status: 'published' });
      expect(mockTemplateService.publish).toHaveBeenCalledWith('tpl-001');
    });
  });

  // ==================== deprecate ====================
  describe('PATCH /templates/:id/deprecate', () => {
    it('TC-DTC-070: should deprecate a template', async () => {
      mockTemplateService.deprecate.mockResolvedValue({ id: 'tpl-001', status: 'deprecated' });
      expect(await controller.deprecate('tpl-001')).toEqual({
        id: 'tpl-001',
        status: 'deprecated',
      });
      expect(mockTemplateService.deprecate).toHaveBeenCalledWith('tpl-001');
    });
  });

  // ==================== clone ====================
  describe('POST /templates/:id/clone', () => {
    it('TC-DTC-080: should clone a template', async () => {
      const cloned = { id: 'tpl-002', name: 'Template-A (v1.1)', version: '1.1' };
      mockTemplateService.clone.mockResolvedValue(cloned);
      expect(await controller.clone('tpl-001', mockReq('user-002'))).toEqual(cloned);
      expect(mockTemplateService.clone).toHaveBeenCalledWith('tpl-001', 'user-002');
    });
  });

  // ==================== apply ====================
  describe('POST /templates/:id/apply', () => {
    it('TC-DTC-090: should apply template to device', async () => {
      const dto = { deviceId: 'dev-1', replaceExisting: true };
      const result = { deviceId: 'dev-1', created: 5, skipped: 0, errors: [] };
      mockTemplateService.apply.mockResolvedValue(result);
      expect(await controller.apply('tpl-001', dto as any)).toEqual(result);
      expect(mockTemplateService.apply).toHaveBeenCalledWith('tpl-001', dto);
    });
  });

  // ==================== sync ====================
  describe('POST /templates/:id/sync', () => {
    it('TC-DTC-100: should sync template changes', async () => {
      const dto = { forceOverwrite: true };
      const result = { totalDevices: 3, synced: 3, skipped: 0, errors: [] };
      mockTemplateService.sync.mockResolvedValue(result);
      expect(await controller.sync('tpl-001', dto as any)).toEqual(result);
      expect(mockTemplateService.sync).toHaveBeenCalledWith('tpl-001', dto);
    });

    it('TC-DTC-102: should report sync errors', async () => {
      const result = {
        totalDevices: 2,
        synced: 1,
        skipped: 0,
        errors: [{ deviceId: 'dev-2', message: 'Connection failed' }],
      };
      mockTemplateService.sync.mockResolvedValue(result);
      const r = await controller.sync('tpl-001', {} as any);
      expect(r.errors).toHaveLength(1);
    });
  });
});
