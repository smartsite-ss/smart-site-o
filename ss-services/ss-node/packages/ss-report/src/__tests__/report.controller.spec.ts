// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { ReportController } from '../report.controller';
import { ReportService } from '../report.service';
import { ReportType, ReportStatus, ExportFormat } from '../report.entity';

// ============================================================
// Mock @nestjs/swagger decorators
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

// ============================================================
// Mock JWT guard + UserRole（避免触发 ss-datatag 链式导入）
// ============================================================
// JwtAuthGuard 必须是 class（@UseGuards 装饰器校验），不能是对象实例
jest.mock('@ss-node/ss-core', () => {
  class JwtAuthGuardMock {
    canActivate() {
      return true;
    }
  }
  // ProjectScopedEntity / BaseEntity stubs：实体类继承时需要
  class BaseEntity {}
  class ProjectScopedEntity extends BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    projectId: string;
  }
  return {
    JwtAuthGuard: JwtAuthGuardMock,
    UserRole: { ADMIN: 'admin', USER: 'user', VIEWER: 'viewer' },
    Roles: () => () => {},
    ReadRoles: () => () => {},
    WriteRoles: () => () => {},
    BaseEntity,
    ProjectScopedEntity,
  };
});

// ============================================================
// Mock 数据源依赖（避免 transitive 加载 ss-datatag/ss-device 控制器链）
// ============================================================
jest.mock('@ss-node/ss-storage-influx', () => ({
  DataQueryService: class {},
  AggregationType: { AVG: 'avg', MAX: 'max', MIN: 'min', SUM: 'sum', COUNT: 'count' },
}));
jest.mock('@ss-node/ss-alarm', () => ({
  AlarmService: class {},
}));
jest.mock('@ss-node/ss-device', () => ({
  DeviceService: class {},
  DataTag: class {},
}));
jest.mock('@ss-node/ss-sdk', () => ({
  AlarmLevel: { CRITICAL: 'critical', ERROR: 'error', WARNING: 'warning', INFO: 'info' },
  AlarmStatus: { ACTIVE: 'active', ACKNOWLEDGED: 'acknowledged', CLEARED: 'cleared' },
  DeviceStatus: { ONLINE: 'online', OFFLINE: 'offline', CONNECTING: 'connecting', ERROR: 'error' },
  PaginatedResult: class {},
  PaginationDto: class {},
}));

// ============================================================
// Mock services
// ============================================================
const mockReportService = {
  generateDailyReport: jest.fn(),
  generateMonthlyReport: jest.fn(),
  generateCustomReport: jest.fn(),
  exportReport: jest.fn(),
  getExportFileAbsolute: jest.fn(),
  generateAlarmReport: jest.fn(),
  generateTrendReport: jest.fn(),
  queryReports: jest.fn(),
  saveReportConfig: jest.fn(),
  getReportConfigs: jest.fn(),
  deleteReportConfig: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  getTemplates: jest.fn(),
  getTemplate: jest.fn(),
  scheduleReportExport: jest.fn(),
  unscheduleReportExport: jest.fn(),
  getScheduledExports: jest.fn(),
};

describe('ReportController', () => {
  let controller: ReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: mockReportService }],
    }).compile();

    controller = module.get<ReportController>(ReportController);
    jest.clearAllMocks();
  });

  // ==================== generateDaily ====================
  describe('POST /projects/:projectId/reports/daily', () => {
    it('TC-RTC-001: should generate daily report for a project', async () => {
      const report = {
        type: ReportType.DAILY,
        projectId: 'project-001',
        date: '2026-06-04',
        generatedAt: '2026-06-04T12:00:00.000Z',
        data: { summary: {}, items: [], charts: [] },
      };
      mockReportService.generateDailyReport.mockResolvedValue(report);

      const result = await controller.generateDaily('project-001', { date: '2026-06-04' });

      expect(result).toEqual(report);
      expect(result.type).toBe(ReportType.DAILY);
      expect(mockReportService.generateDailyReport).toHaveBeenCalledWith(
        'project-001',
        '2026-06-04',
      );
    });

    it('TC-RTC-002: should pass projectId from param and date from body', async () => {
      mockReportService.generateDailyReport.mockResolvedValue({
        type: ReportType.DAILY,
        projectId: 'project-002',
        date: '2026-01-01',
        generatedAt: new Date().toISOString(),
        data: { summary: {}, items: [], charts: [] },
      });

      const result = await controller.generateDaily('project-002', { date: '2026-01-01' });

      expect(result.projectId).toBe('project-002');
      expect(result.date).toBe('2026-01-01');
    });
  });

  // ==================== generateMonthly ====================
  describe('POST /projects/:projectId/reports/monthly', () => {
    it('TC-RTC-010: should generate monthly report for a project', async () => {
      const report = {
        type: ReportType.MONTHLY,
        projectId: 'project-001',
        month: '2026-06',
        generatedAt: '2026-06-04T12:00:00.000Z',
        data: { summary: {}, items: [], charts: [] },
      };
      mockReportService.generateMonthlyReport.mockResolvedValue(report);

      const result = await controller.generateMonthly('project-001', { month: '2026-06' });

      expect(result).toEqual(report);
      expect(result.type).toBe(ReportType.MONTHLY);
      expect(mockReportService.generateMonthlyReport).toHaveBeenCalledWith(
        'project-001',
        '2026-06',
      );
    });
  });

  // ==================== generateCustom ====================
  describe('POST /projects/:projectId/reports/custom', () => {
    it('TC-RTC-020: should generate custom report', async () => {
      const config = {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        metrics: ['avg'],
        tagIds: ['tag-001'],
        granularity: 'day' as const,
      };
      const report = {
        type: ReportType.CUSTOM,
        projectId: 'project-001',
        dateRange: '2026-06-01 ~ 2026-06-30',
        config,
        generatedAt: new Date().toISOString(),
        data: { summary: {}, items: [], charts: [] },
      };
      mockReportService.generateCustomReport.mockResolvedValue(report);

      const result = await controller.generateCustom('project-001', config);

      expect(result.type).toBe(ReportType.CUSTOM);
      expect(mockReportService.generateCustomReport).toHaveBeenCalledWith('project-001', config);
    });
  });

  // ==================== exportReport ====================
  describe('POST /projects/:projectId/reports/:reportId/export', () => {
    it('TC-RTC-030: should export report as PDF', async () => {
      const exportResult = {
        reportId: 'rpt-001',
        format: 'pdf',
        fileName: 'report_rpt-001.pdf',
        fileUrl: '/reports/exports/report_rpt-001.pdf',
        exportedAt: new Date().toISOString(),
        status: ReportStatus.COMPLETED,
      };
      mockReportService.exportReport.mockResolvedValue(exportResult);

      const result = await controller.exportReport('rpt-001', { format: 'pdf' });

      expect(result.format).toBe('pdf');
      expect(mockReportService.exportReport).toHaveBeenCalledWith('rpt-001', 'pdf');
    });

    it('TC-RTC-031: should export report as HTML with explicit html format', async () => {
      const exportResult = {
        reportId: 'rpt-001',
        format: 'html',
        fileName: 'report_rpt-001_1.html',
        fileUrl: '/reports/exports/report_rpt-001_1.html',
        exportedAt: new Date().toISOString(),
        status: ReportStatus.COMPLETED,
      };
      mockReportService.exportReport.mockResolvedValue(exportResult);

      const result = await controller.exportReport('rpt-001', { format: 'html' });

      expect(result.format).toBe('html');
      expect(mockReportService.exportReport).toHaveBeenCalledWith('rpt-001', 'html');
    });
  });

  // ==================== downloadExportFile ====================
  describe('GET /projects/:projectId/reports/:reportId/download', () => {
    it('TC-RTC-032: should send file when export exists', () => {
      const filePath = '/tmp/exports/report_rpt-001.xlsx';
      mockReportService.getExportFileAbsolute.mockReturnValue(filePath);
      const response = { sendFile: jest.fn() } as unknown as Response;

      controller.downloadExportFile('project-001', 'rpt-001', 'report_rpt-001.xlsx', response);

      expect(mockReportService.getExportFileAbsolute).toHaveBeenCalledWith(
        'project-001',
        'rpt-001',
        'report_rpt-001.xlsx',
      );
      expect(response.sendFile).toHaveBeenCalledWith(filePath);
    });

    it('TC-RTC-033: should throw BadRequestException when fileName missing', () => {
      const response = { sendFile: jest.fn() } as unknown as Response;

      expect(() =>
        controller.downloadExportFile('project-001', 'rpt-001', '', response),
      ).toThrow(BadRequestException);
      expect(mockReportService.getExportFileAbsolute).not.toHaveBeenCalled();
    });
  });

  // ==================== generateAlarmReport ====================
  describe('POST /projects/:projectId/reports/alarm', () => {
    it('TC-RTC-040: should generate alarm report', async () => {
      const config = {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        levels: ['critical'],
        deviceIds: ['dev-001'],
      };
      const report = {
        type: ReportType.ALARM,
        projectId: 'project-001',
        dateRange: '2026-06-01 ~ 2026-06-30',
        data: { summary: { totalAlarms: 10 }, items: [], charts: [] },
      };
      mockReportService.generateAlarmReport.mockResolvedValue(report);

      const result = await controller.generateAlarmReport('project-001', config);

      expect(result.type).toBe(ReportType.ALARM);
      expect(mockReportService.generateAlarmReport).toHaveBeenCalledWith('project-001', config);
    });
  });

  // ==================== generateTrendReport ====================
  describe('POST /projects/:projectId/reports/trend', () => {
    it('TC-RTC-050: should generate trend report', async () => {
      const config = {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        tagIds: ['tag-001', 'tag-002'],
        granularity: 'day' as const,
      };
      const report = {
        type: ReportType.TREND,
        projectId: 'project-001',
        dateRange: '2026-06-01 ~ 2026-06-30',
        data: { summary: {}, items: [], charts: [] },
      };
      mockReportService.generateTrendReport.mockResolvedValue(report);

      const result = await controller.generateTrendReport('project-001', config);

      expect(result.type).toBe(ReportType.TREND);
      expect(mockReportService.generateTrendReport).toHaveBeenCalledWith('project-001', config);
    });
  });

  // ==================== queryReports ====================
  describe('GET /projects/:projectId/reports', () => {
    it('TC-RTC-060: should query reports', async () => {
      const queryResult = {
        data: [{ type: ReportType.DAILY, projectId: 'project-001' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      mockReportService.queryReports.mockResolvedValue(queryResult);

      const result = await controller.queryReports('project-001', { page: 1, pageSize: 20 });

      expect(result.data.length).toBe(1);
      expect(mockReportService.queryReports).toHaveBeenCalledWith('project-001', {
        page: 1,
        pageSize: 20,
      });
    });
  });

  // ==================== saveReportConfig ====================
  describe('POST /projects/:projectId/reports/configs', () => {
    it('TC-RTC-070: should save report config', async () => {
      const config = {
        name: 'My Config',
        description: 'Test config',
        config: { metrics: ['avg'] },
      };
      const saved = { id: 'cfg-001', ...config, createdAt: new Date().toISOString() };
      mockReportService.saveReportConfig.mockResolvedValue(saved);

      const result = await controller.saveReportConfig('project-001', config);

      expect(result.name).toBe('My Config');
      expect(mockReportService.saveReportConfig).toHaveBeenCalledWith('project-001', config);
    });
  });

  // ==================== getReportConfigs ====================
  describe('GET /projects/:projectId/reports/configs', () => {
    it('TC-RTC-080: should get report configs', async () => {
      const configs = [
        { id: 'cfg-001', name: 'Config 1', config: {} },
        { id: 'cfg-002', name: 'Config 2', config: {} },
      ];
      mockReportService.getReportConfigs.mockResolvedValue(configs);

      const result = await controller.getReportConfigs('project-001');

      expect(result).toHaveLength(2);
      expect(mockReportService.getReportConfigs).toHaveBeenCalledWith('project-001');
    });
  });

  // ==================== deleteReportConfig ====================
  describe('DELETE /projects/:projectId/reports/configs/:configId', () => {
    it('TC-RTC-090: should delete report config', async () => {
      mockReportService.deleteReportConfig.mockResolvedValue(undefined);

      await controller.deleteReportConfig('project-001', 'cfg-001');

      expect(mockReportService.deleteReportConfig).toHaveBeenCalledWith('project-001', 'cfg-001');
    });
  });

  // ==================== createTemplate ====================
  describe('POST /projects/:projectId/reports/templates', () => {
    it('TC-RTC-100: should create report template', async () => {
      const dto = { name: 'Daily Template', type: ReportType.DAILY, config: { metrics: ['avg'] } };
      const template = { id: 'tpl-001', ...dto, createdAt: new Date().toISOString() };
      mockReportService.createTemplate.mockResolvedValue(template);

      const result = await controller.createTemplate('project-001', dto);

      expect(result.id).toBe('tpl-001');
      expect(mockReportService.createTemplate).toHaveBeenCalledWith('project-001', dto);
    });
  });

  // ==================== getTemplates ====================
  describe('GET /projects/:projectId/reports/templates', () => {
    it('TC-RTC-110: should list report templates', async () => {
      const templates = [
        { id: 'tpl-001', name: 'T1', type: ReportType.DAILY },
        { id: 'tpl-002', name: 'T2', type: ReportType.MONTHLY },
      ];
      mockReportService.getTemplates.mockResolvedValue(templates);

      const result = await controller.getTemplates('project-001', {});

      expect(result).toHaveLength(2);
      expect(mockReportService.getTemplates).toHaveBeenCalledWith('project-001', {});
    });
  });

  // ==================== getTemplate ====================
  describe('GET /projects/:projectId/reports/templates/:templateId', () => {
    it('TC-RTC-120: should get template by id', async () => {
      const template = { id: 'tpl-001', name: 'T1', type: ReportType.DAILY };
      mockReportService.getTemplate.mockResolvedValue(template);

      const result = await controller.getTemplate('project-001', 'tpl-001');

      expect(result.id).toBe('tpl-001');
      expect(mockReportService.getTemplate).toHaveBeenCalledWith('project-001', 'tpl-001');
    });
  });

  // ==================== updateTemplate ====================
  describe('PUT /projects/:projectId/reports/templates/:templateId', () => {
    it('TC-RTC-130: should update report template', async () => {
      const dto = { name: 'Updated' };
      const updated = { id: 'tpl-001', name: 'Updated', type: ReportType.DAILY };
      mockReportService.updateTemplate.mockResolvedValue(updated);

      const result = await controller.updateTemplate('project-001', 'tpl-001', dto);

      expect(result.name).toBe('Updated');
      expect(mockReportService.updateTemplate).toHaveBeenCalledWith('project-001', 'tpl-001', dto);
    });
  });

  // ==================== deleteTemplate ====================
  describe('DELETE /projects/:projectId/reports/templates/:templateId', () => {
    it('TC-RTC-140: should delete report template', async () => {
      mockReportService.deleteTemplate.mockResolvedValue(undefined);

      await controller.deleteTemplate('project-001', 'tpl-001');

      expect(mockReportService.deleteTemplate).toHaveBeenCalledWith('project-001', 'tpl-001');
    });
  });

  // ==================== scheduleReportExport ====================
  describe('POST /projects/:projectId/reports/schedules', () => {
    it('TC-RTC-150: should register scheduled export', async () => {
      const dto = {
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      };
      const schedule = { id: 'sch-001', ...dto, enabled: true };
      mockReportService.scheduleReportExport.mockResolvedValue(schedule);

      const result = await controller.scheduleReportExport('project-001', dto);

      expect(result.id).toBe('sch-001');
      expect(mockReportService.scheduleReportExport).toHaveBeenCalledWith('project-001', dto);
    });
  });

  // ==================== getScheduledExports ====================
  describe('GET /projects/:projectId/reports/schedules', () => {
    it('TC-RTC-160: should list scheduled exports', async () => {
      const schedules = [{ id: 'sch-001' }, { id: 'sch-002' }];
      mockReportService.getScheduledExports.mockResolvedValue(schedules);

      const result = await controller.getScheduledExports('project-001');

      expect(result).toHaveLength(2);
      expect(mockReportService.getScheduledExports).toHaveBeenCalledWith('project-001');
    });
  });

  // ==================== unscheduleReportExport ====================
  describe('DELETE /projects/:projectId/reports/schedules/:scheduleId', () => {
    it('TC-RTC-170: should cancel scheduled export', async () => {
      mockReportService.unscheduleReportExport.mockResolvedValue(undefined);

      await controller.unscheduleReportExport('sch-001');

      expect(mockReportService.unscheduleReportExport).toHaveBeenCalledWith('sch-001');
    });
  });
});
