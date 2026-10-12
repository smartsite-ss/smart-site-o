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
    ApiConsumes: (_opts?: any) => deco(),
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
    Public: () => noopDeco(),
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
  };
});

// ============================================================
// Mock @nestjs/platform-express FileInterceptor
// ============================================================
jest.mock('@nestjs/platform-express', () => ({
  FileInterceptor: (_fieldName: string, _opts?: any) => {
    return function (this: any) {
      this.intercept = (_context: any, next: any) => next.handle();
    } as any;
  },
}));

// ============================================================
// Mock Node.js fs module for stream operations
// ============================================================
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  const { Readable } = require('stream');
  return {
    ...actualFs,
    createReadStream: jest.fn((_p: string) => {
      const s = new Readable();
      s.push(null);
      return s;
    }),
    unlinkSync: jest.fn(),
  };
});

// ============================================================
// Mock ss-device and ss-alarm (new deps from project.service.ts getOverview)
// ============================================================
jest.mock('@ss-node/ss-device', () => ({
  DeviceService: class {},
  DeviceStats: undefined as any,
  Device: class {},
  DataTag: class {},
  DeviceGroup: class {},
  DeviceStatusLog: class {},
  TagLatestValue: class {},
  ChannelConfigService: class {},
  DeviceModule: class {},
}));

jest.mock('@ss-node/ss-alarm', () => ({
  AlarmStatisticsService: class {},
  AlarmService: class {},
  AlarmModule: class {},
  AlarmRule: class {},
  AlarmRecord: class {},
  AlarmGroup: class {},
  ConditionEvaluator: class {},
  AlarmDebouncer: class {},
  AlarmEscalationService: class {},
  AlarmNotificationService: class {},
  AlarmGroupService: class {},
  AlarmEscalatorService: class {},
  AlarmSuppressionService: class {},
  DeviceOfflineSuppressionService: class {},
  SmsNotificationChannel: class {},
  TtsNotificationChannel: class {},
}));

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from '../project.controller';
import { ProjectService } from '../project.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

// ============================================================
// Mock ProjectService
// ============================================================
const mockProjectService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  diagnoseProject: jest.fn(),
  initProjectResources: jest.fn(),
  exportProject: jest.fn(),
  exportProjectZip: jest.fn(),
  importProjectZip: jest.fn(),
};

describe('ProjectController', () => {
  let controller: ProjectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [{ provide: ProjectService, useValue: mockProjectService }],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
    jest.clearAllMocks();
  });

  // ==================== POST /projects ====================
  describe('POST /projects', () => {
    const createDto = { name: 'Test Project', description: 'desc', config: {} };
    const mockReq = { user: { id: 'user-001' } };

    it('should create project and return result', async () => {
      const project = { pid: 'pid-001', tid: 'test-project', name: 'Test Project' };
      mockProjectService.create.mockResolvedValue(project);

      const result = await controller.create(createDto, mockReq);

      expect(result).toEqual(project);
      expect(mockProjectService.create).toHaveBeenCalledWith(createDto, 'user-001');
    });

    it('should propagate BadRequestException from service', async () => {
      mockProjectService.create.mockRejectedValue(new BadRequestException('项目名称不能为空'));

      await expect(controller.create(createDto, mockReq)).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== GET /projects ====================
  describe('GET /projects', () => {
    const mockReq = { user: { id: 'user-001' } };

    it('should return paginated list', async () => {
      const paginatedResult = {
        data: [{ pid: 'pid-001', name: 'Test' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      mockProjectService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(mockReq, { page: 1, pageSize: 20 });

      expect(result).toEqual(paginatedResult);
      expect(mockProjectService.findAll).toHaveBeenCalledWith('user-001', {
        page: 1,
        pageSize: 20,
      });
    });

    it('should pass query params to service', async () => {
      mockProjectService.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      await controller.findAll(mockReq, { keyword: 'search', page: 2, pageSize: 10 });

      expect(mockProjectService.findAll).toHaveBeenCalledWith('user-001', {
        keyword: 'search',
        page: 2,
        pageSize: 10,
      });
    });

    it('should handle undefined query', async () => {
      mockProjectService.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });

      await controller.findAll(mockReq);

      expect(mockProjectService.findAll).toHaveBeenCalledWith('user-001', undefined);
    });
  });

  // ==================== GET /projects/:id ====================
  describe('GET /projects/:id', () => {
    const mockReq = { user: { id: 'user-001' } };

    it('should return project by id', async () => {
      const project = { pid: 'pid-001', tid: 'test-project', name: 'Test' };
      mockProjectService.findOne.mockResolvedValue(project);

      const result = await controller.findOne('test-project', mockReq);

      expect(result).toEqual(project);
      expect(mockProjectService.findOne).toHaveBeenCalledWith('test-project', 'user-001');
    });

    it('should propagate NotFoundException from service', async () => {
      mockProjectService.findOne.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.findOne('non-existent', mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== PATCH /projects/:id ====================
  describe('PATCH /projects/:id', () => {
    const mockReq = { user: { id: 'user-001' } };

    it('should update project fields', async () => {
      const updated = { pid: 'pid-001', tid: 'test-project', name: 'Test', description: 'updated' };
      mockProjectService.update.mockResolvedValue(updated);

      const result = await controller.update('test-project', { description: 'updated' }, mockReq);

      expect(result).toEqual(updated);
      expect(mockProjectService.update).toHaveBeenCalledWith(
        'test-project',
        { description: 'updated' },
        'user-001',
      );
    });

    it('should propagate NotFoundException', async () => {
      mockProjectService.update.mockRejectedValue(new NotFoundException('Not found'));

      await expect(
        controller.update('non-existent', { description: 'x' }, mockReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== DELETE /projects/:id ====================
  describe('DELETE /projects/:id', () => {
    const mockReq = { user: { id: 'user-001' } };

    it('should delete project', async () => {
      mockProjectService.remove.mockResolvedValue(undefined);

      await controller.remove('test-project', mockReq);

      expect(mockProjectService.remove).toHaveBeenCalledWith('test-project', 'user-001');
    });

    it('should propagate NotFoundException', async () => {
      mockProjectService.remove.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.remove('non-existent', mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== POST /projects/:id/diagnose ====================
  describe('POST /projects/:id/diagnose', () => {
    it('should diagnose project integrity', async () => {
      const diagnoseResult = {
        projectName: 'Test',
        pid: 'pid-001',
        tid: 'test-project',
        resources: {},
        health: 'healthy' as const,
        issues: [],
        dbMode: 'isolated',
      };
      mockProjectService.diagnoseProject.mockResolvedValue(diagnoseResult);

      const result = await controller.diagnose('test-project');

      expect(result).toEqual(diagnoseResult);
      expect(mockProjectService.diagnoseProject).toHaveBeenCalledWith('test-project');
    });
  });

  // ==================== POST /projects/:id/init-resources ====================
  describe('POST /projects/:id/init-resources', () => {
    it('should initialize resources and return health status', async () => {
      mockProjectService.initProjectResources.mockResolvedValue({
        initialized: ['rtdbDir'],
        skipped: ['dbDir'],
        warnings: [],
      });
      mockProjectService.diagnoseProject.mockResolvedValue({
        health: 'healthy',
      });

      const result = await controller.initResources('test-project', ['subdirs']);

      expect(result.initialized).toContain('rtdbDir');
      expect(result.healthAfter).toBe('healthy');
      expect(mockProjectService.initProjectResources).toHaveBeenCalledWith('test-project', [
        'subdirs',
      ]);
    });
  });

  // ==================== POST /projects/:id/export ====================
  describe('POST /projects/:id/export', () => {
    const mockReq = { user: { id: 'user-001' } };

    // TC-PROJ-CTL-018: 默认全量导出（无 query 参数，向后兼容）
    it('TC-PROJ-CTL-018: should export project as zip download (default: all)', async () => {
      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockProjectService.exportProjectZip.mockResolvedValue({
        filePath: '/tmp/test-project_123.zip',
        projectName: 'test-project',
        fileName: 'test-project_123.zip',
      });

      // 无 query 参数 → options 应为 undefined（向后兼容）
      await controller.exportZip('test-project', mockReq, mockRes);

      expect(mockProjectService.exportProjectZip).toHaveBeenCalledWith(
        'test-project',
        'user-001',
        undefined,
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment'),
      );
    });

    // TC-PROJ-CTL-018a: 选择性导出 - 仅页面
    it('TC-PROJ-CTL-018a: should export with includePages=true only', async () => {
      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockProjectService.exportProjectZip.mockResolvedValue({
        filePath: '/tmp/test-project_pages.zip',
        projectName: 'test-project',
        fileName: 'test-project_pages.zip',
      });

      await controller.exportZip('test-project', mockReq, mockRes, 'true', 'false', 'false');

      expect(mockProjectService.exportProjectZip).toHaveBeenCalledWith('test-project', 'user-001', {
        includePages: true,
        includeProjectDb: false,
        includeRtdb: false,
      });
    });

    // TC-PROJ-CTL-018b: 选择性导出 - 排除实时数据库
    it('TC-PROJ-CTL-018b: should export with includeRtdb=false', async () => {
      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockProjectService.exportProjectZip.mockResolvedValue({
        filePath: '/tmp/test-project_no_rtdb.zip',
        projectName: 'test-project',
        fileName: 'test-project_no_rtdb.zip',
      });

      await controller.exportZip('test-project', mockReq, mockRes, 'true', 'true', 'false');

      expect(mockProjectService.exportProjectZip).toHaveBeenCalledWith('test-project', 'user-001', {
        includePages: true,
        includeProjectDb: true,
        includeRtdb: false,
      });
    });

    // TC-PROJ-CTL-018c: 选择性导出 - 未传某个参数应回退为默认 true
    it('TC-PROJ-CTL-018c: should default missing params to true', async () => {
      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockProjectService.exportProjectZip.mockResolvedValue({
        filePath: '/tmp/test-project_partial.zip',
        projectName: 'test-project',
        fileName: 'test-project_partial.zip',
      });

      // 只传 includePages=false，其它两个参数为 undefined，应回退为 true
      await controller.exportZip('test-project', mockReq, mockRes, 'false', undefined, undefined);

      expect(mockProjectService.exportProjectZip).toHaveBeenCalledWith('test-project', 'user-001', {
        includePages: false,
        includeProjectDb: true,
        includeRtdb: true,
      });
    });

    // TC-PROJ-CTL-019: 导出失败应返回 500
    it('TC-PROJ-CTL-019: should handle export errors', async () => {
      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockProjectService.exportProjectZip.mockRejectedValue(new Error('Export failed'));

      await controller.exportZip('test-project', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // ==================== POST /projects/import ====================
  describe('POST /projects/import', () => {
    const mockReq = { user: { id: 'user-001' } };

    it('should import project from zip', async () => {
      const project = { pid: 'pid-001', tid: 'imported', name: 'Imported' };
      mockProjectService.importProjectZip.mockResolvedValue({ project, warnings: [] });

      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('zip-data'),
        originalname: 'project.zip',
        fieldname: 'file',
        encoding: '7bit',
        mimetype: 'application/zip',
        size: 1024,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const result = await controller.importZip(mockFile, mockReq);

      expect(result.data).toEqual(project);
      expect(mockProjectService.importProjectZip).toHaveBeenCalledWith(
        mockFile.buffer,
        'user-001',
        { overwrite: false },
      );
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.importZip(undefined as any, mockReq)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.importZip(undefined as any, mockReq)).rejects.toThrow(
        '请上传 ZIP 文件',
      );
    });

    it('should throw BadRequestException when file is not zip', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('data'),
        originalname: 'file.txt',
        fieldname: 'file',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 100,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      await expect(controller.importZip(mockFile, mockReq)).rejects.toThrow(BadRequestException);
      await expect(controller.importZip(mockFile, mockReq)).rejects.toThrow('仅支持 .zip');
    });

    it('should pass overwrite option to service', async () => {
      const project = { pid: 'pid-001', tid: 'imported', name: 'Imported' };
      mockProjectService.importProjectZip.mockResolvedValue({ project, warnings: ['覆盖'] });

      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('zip-data'),
        originalname: 'project.zip',
        fieldname: 'file',
        encoding: '7bit',
        mimetype: 'application/zip',
        size: 1024,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      await controller.importZip(mockFile, mockReq, 'true');

      expect(mockProjectService.importProjectZip).toHaveBeenCalledWith(
        mockFile.buffer,
        'user-001',
        { overwrite: true },
      );
    });
  });
});
