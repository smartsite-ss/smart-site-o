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
    ApiTags: (..._tags: any[]) => deco(),
    ApiBearerAuth: () => deco(),
    ApiOperation: (_opts: any) => deco(),
    ApiParam: (_opts: any) => deco(),
    ApiQuery: (_opts: any) => deco(),
    ApiProperty: (_opts?: any) => propDeco(),
    ApiPropertyOptional: (_opts?: any) => propDeco(),
    ApiBody: (_opts: any) => deco(),
    ApiResponse: (_opts: any) => deco(),
    ApiConsumes: (_opts?: any) => deco(),
    PartialType: (cls: any) => cls,
    OmitType: (cls: any, _keys: any[]) => cls,
    PickType: (cls: any, _keys: any[]) => cls,
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
  return {
    JwtAuthGuard: MockJwtAuthGuard,
    RolesGuard: class {
      canActivate = () => true;
    },
    Roles: (..._roles: any[]) => noopDeco(),
    Public: () => noopDeco(),
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
  };
});

// ============================================================
// Mock @nestjs/platform-express interceptors
// ============================================================
jest.mock('@nestjs/platform-express', () => ({
  FileInterceptor: (_fieldName: string, _opts?: any) => {
    return function (this: any) {
      this.intercept = (_context: any, next: any) => next.handle();
    } as any;
  },
  FileFieldsInterceptor: (_fields: any[], _opts?: any) => {
    return function (this: any) {
      this.intercept = (_context: any, next: any) => next.handle();
    } as any;
  },
}));

// ============================================================
// Mock fs for stream operations (export endpoint)
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

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { PageSaveController } from '../page-save.controller';
import { PageSaveService } from '../page-save.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

// ============================================================
// Mock PageSaveService
// ============================================================
const mockPageSaveService = {
  listGroups: jest.fn(),
  createGroup: jest.fn(),
  deleteGroup: jest.fn(),
  migrateProject: jest.fn(),
  listPages: jest.fn(),
  listAllPages: jest.fn(),
  readAllPages: jest.fn(),
  getProjectOutline: jest.fn(),
  batchReadPages: jest.fn(),
  getProjectsDirInfo: jest.fn(),
  readPage: jest.fn(),
  saveAllPages: jest.fn(),
  savePage: jest.fn(),
  deletePage: jest.fn(),
  renamePage: jest.fn(),
  movePage: jest.fn(),
  uploadPageBackground: jest.fn(),
  uploadPagePreview: jest.fn(),
  getPreviewImagePath: jest.fn(),
  getResourceFilePath: jest.fn(),
  exportPagesZip: jest.fn(),
  importPagesZip: jest.fn(),
};

describe('PageSaveController', () => {
  let controller: PageSaveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageSaveController],
      providers: [{ provide: PageSaveService, useValue: mockPageSaveService }],
    }).compile();

    controller = module.get<PageSaveController>(PageSaveController);
    jest.clearAllMocks();
  });

  // ==================== Groups ====================
  describe('GET /projects/:id/pages/groups', () => {
    it('TC-PAGE-CTL-001: should return group list', () => {
      const result = { success: true, projectName: 'p1', groups: [] };
      mockPageSaveService.listGroups.mockReturnValue(result);

      const res = controller.listGroups('p1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.listGroups).toHaveBeenCalledWith('p1');
    });
  });

  describe('POST /projects/:id/pages/groups', () => {
    it('TC-PAGE-CTL-002: should create group', () => {
      const result = { success: true, name: 'g1', path: '/tmp' };
      mockPageSaveService.createGroup.mockReturnValue(result);

      const res = controller.createGroup('p1', { groupName: 'g1' });

      expect(res).toEqual(result);
      expect(mockPageSaveService.createGroup).toHaveBeenCalledWith('p1', 'g1');
    });
  });

  describe('DELETE /projects/:id/pages/groups/:groupName', () => {
    it('TC-PAGE-CTL-003: should delete group with URL-decoded name', () => {
      const result = { success: true, name: '分组 1' };
      mockPageSaveService.deleteGroup.mockReturnValue(result);

      const res = controller.deleteGroup('p1', encodeURIComponent('分组 1'));

      expect(res).toEqual(result);
      expect(mockPageSaveService.deleteGroup).toHaveBeenCalledWith('p1', '分组 1');
    });
  });

  // ==================== Pages listing ====================
  describe('GET /projects/:id/pages', () => {
    it('TC-PAGE-CTL-004: should list pages without group', () => {
      const result = { success: true, projectName: 'p1', pages: [] };
      mockPageSaveService.listPages.mockReturnValue(result);

      const res = controller.listPages('p1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.listPages).toHaveBeenCalledWith('p1', undefined);
    });

    it('TC-PAGE-CTL-005: should list pages with group query', () => {
      const result = { success: true, projectName: 'p1', pages: [] };
      mockPageSaveService.listPages.mockReturnValue(result);

      const res = controller.listPages('p1', 'g1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.listPages).toHaveBeenCalledWith('p1', 'g1');
    });
  });

  describe('GET /projects/:id/pages/all', () => {
    it('TC-PAGE-CTL-006: should list all pages deduplicated', () => {
      const result = { success: true, projectName: 'p1', pages: [] };
      mockPageSaveService.listAllPages.mockReturnValue(result);

      const res = controller.listAllPages('p1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.listAllPages).toHaveBeenCalledWith('p1');
    });
  });

  describe('GET /projects/:id/pages/outline', () => {
    it('TC-PAGE-CTL-007: should return project outline', () => {
      const result = {
        success: true,
        projectName: 'p1',
        rootPages: [],
        groups: [],
        totalPageCount: 0,
      };
      mockPageSaveService.getProjectOutline.mockReturnValue(result);

      const res = controller.getProjectOutline('p1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.getProjectOutline).toHaveBeenCalledWith('p1');
    });
  });

  describe('GET /projects/:id/pages/all/data', () => {
    it('TC-PAGE-CTL-008: should read all pages data', () => {
      const result = { success: true, projectName: 'p1', pages: [] };
      mockPageSaveService.readAllPages.mockReturnValue(result);

      const res = controller.readAllPagesData('p1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.readAllPages).toHaveBeenCalledWith('p1');
    });
  });

  describe('POST /projects/:id/pages/batch-read', () => {
    it('TC-PAGE-CTL-009: should batch read pages', () => {
      const result = { success: true, projectName: 'p1', pages: [] };
      mockPageSaveService.batchReadPages.mockReturnValue(result);

      const res = controller.batchReadPages('p1', { names: ['a', 'b'], groupName: 'g1' });

      expect(res).toEqual(result);
      expect(mockPageSaveService.batchReadPages).toHaveBeenCalledWith('p1', ['a', 'b'], 'g1');
    });
  });

  describe('POST /projects/:id/pages/migrate', () => {
    it('TC-PAGE-CTL-010: should migrate pages to prefix naming', () => {
      mockPageSaveService.migrateProject.mockReturnValue({
        migratedPages: 3,
        migratedGroups: 1,
        removedDuplicates: 0,
      });

      const res = controller.migratePages('p1');

      expect(res.success).toBe(true);
      expect(res.projectName).toBe('p1');
      expect(res.migratedPages).toBe(3);
      expect(mockPageSaveService.migrateProject).toHaveBeenCalledWith('p1');
    });
  });

  // ==================== Single page operations ====================
  describe('GET /projects/:id/pages/:pageName', () => {
    it('TC-PAGE-CTL-011: should read page with URL-decoded name', () => {
      const result = { success: true, data: { id: 'p-1', name: 'Main' } };
      mockPageSaveService.readPage.mockReturnValue(result);

      const res = controller.readPage('p1', encodeURIComponent('Main Page'));

      expect(res).toEqual(result);
      expect(mockPageSaveService.readPage).toHaveBeenCalledWith('p1', 'Main Page', undefined);
    });

    it('TC-PAGE-CTL-012: should read page with group query', () => {
      const result = { success: true, data: { id: 'p-1' } };
      mockPageSaveService.readPage.mockReturnValue(result);

      const res = controller.readPage('p1', 'Main', 'g1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.readPage).toHaveBeenCalledWith('p1', 'Main', 'g1');
    });
  });

  describe('POST /projects/:id/pages/save', () => {
    it('TC-PAGE-CTL-013: should save all pages from body.pages', async () => {
      const req = { body: { pages: [{ name: 'a' }] } } as any;
      const result = { success: true, projectName: 'p1', savedCount: 1, pages: [] };
      mockPageSaveService.saveAllPages.mockResolvedValue(result);

      const res = await controller.saveAllPages('p1', req, undefined);

      expect(res).toEqual(result);
      expect(mockPageSaveService.saveAllPages).toHaveBeenCalledWith(
        'p1',
        [{ name: 'a' }],
        undefined,
        {},
      );
    });

    it('TC-PAGE-CTL-014: should parse pagesJson string field', async () => {
      const req = { body: { pagesJson: JSON.stringify([{ name: 'b' }]) } } as any;
      const result = { success: true, projectName: 'p1', savedCount: 1, pages: [] };
      mockPageSaveService.saveAllPages.mockResolvedValue(result);

      const res = await controller.saveAllPages('p1', req, undefined);

      expect(res).toEqual(result);
      expect(mockPageSaveService.saveAllPages).toHaveBeenCalledWith(
        'p1',
        [{ name: 'b' }],
        undefined,
        {},
      );
    });

    it('TC-PAGE-CTL-015: should throw BadRequest when pages missing', async () => {
      const req = { body: {} } as any;

      await expect(controller.saveAllPages('p1', req, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-PAGE-CTL-016: should throw BadRequest when pagesJson invalid', async () => {
      const req = { body: { pagesJson: '{invalid' } } as any;

      await expect(controller.saveAllPages('p1', req, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('POST /projects/:id/pages/save/:pageName', () => {
    it('TC-PAGE-CTL-017: should save single page with parsed JSON', () => {
      const pageData = { id: 'p-1', name: 'Main' };
      const result = { success: true, pageName: 'Main', folderPath: '/tmp' };
      mockPageSaveService.savePage.mockReturnValue(result);

      const res = controller.savePage('p1', 'Main', JSON.stringify(pageData));

      expect(res).toEqual(result);
      expect(mockPageSaveService.savePage).toHaveBeenCalledWith(
        'p1',
        'Main',
        pageData,
        undefined,
        undefined,
        undefined,
      );
    });

    it('TC-PAGE-CTL-018: should throw BadRequest when page data missing', () => {
      expect(() => controller.savePage('p1', 'Main', '')).toThrow(BadRequestException);
    });
  });

  describe('DELETE /projects/:id/pages/:pageName', () => {
    it('TC-PAGE-CTL-019: should delete page', () => {
      const result = { success: true, pageName: 'Main' };
      mockPageSaveService.deletePage.mockReturnValue(result);

      const res = controller.deletePage('p1', 'Main');

      expect(res).toEqual(result);
      expect(mockPageSaveService.deletePage).toHaveBeenCalledWith('p1', 'Main', undefined);
    });
  });

  describe('PATCH /projects/:id/pages/:pageName/rename', () => {
    it('TC-PAGE-CTL-020: should rename page', () => {
      const result = { success: true, pageName: 'NewName', folderPath: '/tmp' };
      mockPageSaveService.renamePage.mockReturnValue(result);

      const res = controller.renamePage('p1', 'Old', { newName: 'NewName' });

      expect(res).toEqual(result);
      expect(mockPageSaveService.renamePage).toHaveBeenCalledWith(
        'p1',
        'Old',
        'NewName',
        undefined,
      );
    });
  });

  describe('PATCH /projects/:id/pages/:pageName/move', () => {
    it('TC-PAGE-CTL-021: should move page to another group', () => {
      const result = { success: true, pageName: 'Main', folderPath: '/tmp' };
      mockPageSaveService.movePage.mockReturnValue(result);

      const res = controller.movePage('p1', 'Main', { toGroup: 'g2' }, 'g1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.movePage).toHaveBeenCalledWith('p1', 'Main', 'g1', 'g2');
    });
  });

  // ==================== Resource uploads ====================
  describe('POST /projects/:id/pages/:pageName/background', () => {
    it('TC-PAGE-CTL-022: should upload background image', () => {
      const result = { success: true, pageName: 'Main', resourceType: 'bg', filePath: '/tmp' };
      mockPageSaveService.uploadPageBackground.mockReturnValue(result);
      const file = { buffer: Buffer.from('img'), originalname: 'bg.png' } as Express.Multer.File;

      const res = controller.uploadBackground('p1', 'Main', file);

      expect(res).toEqual(result);
      expect(mockPageSaveService.uploadPageBackground).toHaveBeenCalledWith(
        'p1',
        'Main',
        file.buffer,
        'bg.png',
        undefined,
      );
    });

    it('TC-PAGE-CTL-023: should throw BadRequest when file missing', () => {
      expect(() => controller.uploadBackground('p1', 'Main', undefined as any)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('POST /projects/:id/pages/:pageName/preview', () => {
    it('TC-PAGE-CTL-024: should upload preview image', () => {
      const result = { success: true, pageName: 'Main', resourceType: 'preview', filePath: '/tmp' };
      mockPageSaveService.uploadPagePreview.mockReturnValue(result);
      const files = {
        file: [{ buffer: Buffer.from('img') }] as Express.Multer.File[],
      };

      const res = controller.uploadPreview('p1', 'Main', files);

      expect(res).toEqual(result);
      expect(mockPageSaveService.uploadPagePreview).toHaveBeenCalledWith(
        'p1',
        'Main',
        files.file[0].buffer,
        undefined,
        undefined,
      );
    });

    it('TC-PAGE-CTL-025: should throw BadRequest when main file missing', () => {
      expect(() => controller.uploadPreview('p1', 'Main', undefined)).toThrow(BadRequestException);
    });
  });

  // ==================== Resource file serving ====================
  describe('GET /projects/:id/pages/:pageName/:fileName', () => {
    it('TC-PAGE-CTL-026: should send file when resource exists', () => {
      const filePath = '/tmp/bg.png';
      mockPageSaveService.getResourceFilePath.mockReturnValue(filePath);
      const res = { sendFile: jest.fn() } as unknown as Response;

      controller.getResource('p1', 'Main', 'bg.png', undefined, res);

      expect(mockPageSaveService.getResourceFilePath).toHaveBeenCalledWith(
        'p1',
        'Main',
        'bg.png',
        undefined,
      );
      expect(res.sendFile).toHaveBeenCalledWith(filePath);
    });

    it('TC-PAGE-CTL-027: should throw NotFound when resource missing', () => {
      mockPageSaveService.getResourceFilePath.mockReturnValue(null);
      const res = { sendFile: jest.fn() } as unknown as Response;

      expect(() => controller.getResource('p1', 'Main', 'bg.png', undefined, res)).toThrow(
        NotFoundException,
      );
      expect(res.sendFile).not.toHaveBeenCalled();
    });
  });

  // ==================== Export / Import ====================
  describe('POST /projects/:id/pages/export', () => {
    it('TC-PAGE-CTL-028: should export pages as zip stream', async () => {
      mockPageSaveService.exportPagesZip.mockResolvedValue({
        filePath: '/tmp/pages.zip',
        fileName: 'pages.zip',
      });
      // Mock a writable Response supporting pipe (write/end) + error path (status/json)
      const res = {
        setHeader: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        end: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await controller.exportPagesZip('p1', res);

      expect(mockPageSaveService.exportPagesZip).toHaveBeenCalledWith('p1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
    });
  });

  describe('POST /projects/:id/pages/import', () => {
    it('TC-PAGE-CTL-029: should import pages zip', async () => {
      mockPageSaveService.importPagesZip.mockResolvedValue({ importedCount: 3, warnings: [] });
      const file = { buffer: Buffer.from('zip'), originalname: 'pages.zip' } as Express.Multer.File;

      const res = await controller.importPagesZip('p1', file, 'true');

      expect(res.success).toBe(true);
      expect(res.importedCount).toBe(3);
      expect(mockPageSaveService.importPagesZip).toHaveBeenCalledWith('p1', file.buffer, {
        overwrite: true,
      });
    });

    it('TC-PAGE-CTL-030: should throw BadRequest when no file', async () => {
      await expect(controller.importPagesZip('p1', undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('TC-PAGE-CTL-031: should throw BadRequest when file is not zip', async () => {
      const file = { buffer: Buffer.from(''), originalname: 'pages.tar' } as Express.Multer.File;

      await expect(controller.importPagesZip('p1', file)).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Projects dir info ====================
  describe('GET /projects/:id/pages/projects-dir', () => {
    it('TC-PAGE-CTL-032: should return projects dir info', () => {
      const result = { projectsDir: '/data/projects', exists: true };
      mockPageSaveService.getProjectsDirInfo.mockReturnValue(result);

      const res = controller.getProjectsDir('p1');

      expect(res).toEqual(result);
      expect(mockPageSaveService.getProjectsDirInfo).toHaveBeenCalled();
    });
  });

  // ==================== Preview images ====================
  describe('GET /projects/:id/pages/:pageName/preview_small.png', () => {
    const mockRes = () =>
      ({
        setHeader: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Response);

    it('TC-PAGE-CTL-033: should stream preview_small.png when file exists', () => {
      mockPageSaveService.getPreviewImagePath.mockReturnValue('/tmp/p_page1/preview_small.png');
      const res = mockRes();

      controller.getPreviewSmallImage('p1', 'page1', undefined, res);

      expect(mockPageSaveService.getPreviewImagePath).toHaveBeenCalledWith(
        'p1',
        'page1',
        undefined,
        'preview_small',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    });

    it('TC-PAGE-CTL-034: should URL-decode pageName and pass group', () => {
      mockPageSaveService.getPreviewImagePath.mockReturnValue('/tmp/g_g1/p_page1/preview_small.png');
      const res = mockRes();

      controller.getPreviewSmallImage('p1', encodeURIComponent('联动'), 'g1', res);

      expect(mockPageSaveService.getPreviewImagePath).toHaveBeenCalledWith(
        'p1',
        '联动',
        'g1',
        'preview_small',
      );
    });

    it('TC-PAGE-CTL-035: should throw NotFound when preview_small.png missing', () => {
      mockPageSaveService.getPreviewImagePath.mockReturnValue(null);

      expect(() =>
        controller.getPreviewSmallImage('p1', 'page1', undefined, mockRes()),
      ).toThrow(NotFoundException);
    });
  });

  describe('GET /projects/:id/pages/:pageName/preview.png', () => {
    it('TC-PAGE-CTL-036: should stream preview.png when file exists', () => {
      mockPageSaveService.getPreviewImagePath.mockReturnValue('/tmp/p_page1/preview.png');
      const res = {
        setHeader: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Response;

      controller.getPreviewImage('p1', 'page1', undefined, res);

      expect(mockPageSaveService.getPreviewImagePath).toHaveBeenCalledWith(
        'p1',
        'page1',
        undefined,
        'preview',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    });

    it('TC-PAGE-CTL-037: should throw NotFound when preview.png missing', () => {
      mockPageSaveService.getPreviewImagePath.mockReturnValue(null);
      const res = {
        setHeader: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Response;

      expect(() => controller.getPreviewImage('p1', 'page1', undefined, res)).toThrow(
        NotFoundException,
      );
    });
  });
});
