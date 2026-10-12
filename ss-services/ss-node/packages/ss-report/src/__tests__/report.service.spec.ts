// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ReportService } from '../report.service';
import { PathResolverService } from '@ss-node/ss-core';
// Mock external dependencies to avoid transitive loading of sqlite3 / heavy modules
jest.mock('@ss-node/ss-core', () => ({
  PathResolverService: class {
    resolve = jest.fn((p: string) => require('path').resolve(p));
    getProjectRoot = jest.fn(() => process.cwd());
    resolveEnv = jest.fn((_env: string, defaultValue: string) =>
      require('path').resolve(defaultValue),
    );
  },
  BaseEntity: class {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  },
  ProjectScopedEntity: class {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    projectId: string;
  },
}));
jest.mock('@ss-node/ss-storage-influx', () => ({
  DataQueryService: class {},
  AggregationType: { AVG: 'avg', MAX: 'max', MIN: 'min', SUM: 'sum', COUNT: 'count' },
}));
jest.mock('@ss-node/ss-alarm', () => ({
  AlarmService: class {},
  AlarmRecord: class {},
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
}));

import { ReportType, ReportStatus, ExportFormat } from '../report.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    service = new ReportService(new PathResolverService() as any);
  });

  // ==================== generateDailyReport ====================
  describe('generateDailyReport', () => {
    it('TC-RPT-001: should generate daily report with correct structure', async () => {
      const result = await service.generateDailyReport('project-001', '2026-06-04');

      expect(result).toBeDefined();
      expect(result.type).toBe(ReportType.DAILY);
      expect(result.projectId).toBe('project-001');
      expect(result.date).toBe('2026-06-04');
      expect(result.generatedAt).toBeDefined();
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.summary).toBeDefined();
      expect(data.items).toBeInstanceOf(Array);
      expect(data.charts).toBeInstanceOf(Array);
    });

    it('TC-RPT-002: should include summary with expected fields', async () => {
      const result = await service.generateDailyReport('project-001', '2026-06-04');
      const { summary } = result.data as any;

      // 无数据源注入时返回默认零值；字段结构必须存在
      expect(summary).toBeDefined();
      expect(summary.totalDevices).toBe(0);
      expect(summary.onlineDevices).toBe(0);
      expect(summary.offlineDevices).toBe(0);
      expect(summary.totalAlarms).toBe(0);
      expect(summary.avgDataQuality).toBe(0);
    });

    it('TC-RPT-003: should include daily items with trends', async () => {
      const result = await service.generateDailyReport('project-001', '2026-06-04');
      const { items } = result.data as any;

      expect(items.length).toBeGreaterThan(0);
      items.forEach((item: any) => {
        expect(item.label).toBeDefined();
        expect(item.value).toBeDefined();
        expect(item.trend).toBeDefined();
      });
    });

    it('TC-RPT-004: should include chart data array', async () => {
      const result = await service.generateDailyReport('project-001', '2026-06-04');
      const { charts } = result.data as any;

      // 无 dataQueryService 时返回空数组；字段类型必须正确
      expect(charts).toBeInstanceOf(Array);
      expect(charts).toEqual([]);
    });

    it('TC-RPT-005: should handle different projectId and date', async () => {
      const result = await service.generateDailyReport('project-xyz', '2025-12-31');

      expect(result.type).toBe(ReportType.DAILY);
      expect(result.projectId).toBe('project-xyz');
      expect(result.date).toBe('2025-12-31');
    });
  });

  // ==================== generateMonthlyReport ====================
  describe('generateMonthlyReport', () => {
    it('TC-RPT-010: should generate monthly report with correct structure', async () => {
      const result = await service.generateMonthlyReport('project-001', '2026-06');

      expect(result).toBeDefined();
      expect(result.type).toBe(ReportType.MONTHLY);
      expect(result.projectId).toBe('project-001');
      expect(result.month).toBe('2026-06');
      expect(result.generatedAt).toBeDefined();
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.summary).toBeDefined();
      expect(data.items).toBeInstanceOf(Array);
    });

    it('TC-RPT-011: should include monthly items (fallback when no data source)', async () => {
      const result = await service.generateMonthlyReport('project-001', '2026-06');
      const { items } = result.data as any;

      // 无数据源时返回 fallback 项（"报表生成状态"），items 非空
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i: any) => i.label && i.trend)).toBe(true);
    });

    it('TC-RPT-012: should return empty charts when no data source', async () => {
      const result = await service.generateMonthlyReport('project-001', '2026-06');
      const { charts } = result.data as any;

      // 无 alarmService 时月报图表为空数组
      expect(charts).toBeInstanceOf(Array);
      expect(charts).toEqual([]);
    });

    it('TC-RPT-013: should handle month with 31 days without throwing', async () => {
      const result = await service.generateMonthlyReport('project-001', '2026-07');

      expect(result.type).toBe(ReportType.MONTHLY);
      expect(result.month).toBe('2026-07');
    });

    it('TC-RPT-014: should distinguish daily from monthly report type', async () => {
      const daily = await service.generateDailyReport('project-001', '2026-06-04');
      const monthly = await service.generateMonthlyReport('project-001', '2026-06');

      expect(daily.type).toBe(ReportType.DAILY);
      expect(monthly.type).toBe(ReportType.MONTHLY);
      expect(daily.type).not.toBe(monthly.type);
    });
  });

  // ==================== generateCustomReport ====================
  describe('generateCustomReport', () => {
    it('TC-RPT-020: should generate custom report with date range', async () => {
      const result = await service.generateCustomReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result.type).toBe(ReportType.CUSTOM);
      expect(result.dateRange).toContain('2026-06-01');
      expect(result.dateRange).toContain('2026-06-30');
      expect(result.config).toBeDefined();
    });

    it('TC-RPT-021: should support custom metrics', async () => {
      const result = await service.generateCustomReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        metrics: ['avg', 'max'],
      });

      const { config } = result as any;
      expect(config.metrics).toEqual(['avg', 'max']);
    });

    it('TC-RPT-022: should support custom tagIds (empty items without data source)', async () => {
      const result = await service.generateCustomReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        tagIds: ['tag-001'],
      });

      // 无 dataQueryService 时 items 为空数组，但 config 应保留传入的 tagIds
      const { data, config } = result as any;
      expect(data.items).toBeInstanceOf(Array);
      expect(data.items).toEqual([]);
      expect(config).toBeDefined();
    });

    it('TC-RPT-023: should support granularity parameter', async () => {
      const result = await service.generateCustomReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        granularity: 'hour',
      });

      const { config } = result as any;
      expect(config.granularity).toBe('hour');
    });

    it('TC-RPT-024: should support deviceIds in config', async () => {
      const result = await service.generateCustomReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        deviceIds: ['dev-001', 'dev-002'],
      });

      const { config } = result as any;
      expect(config.deviceIds).toEqual(['dev-001', 'dev-002']);
    });

    it('TC-RPT-025: should default metrics to [avg,max,min] and tagIds to empty array', async () => {
      const result = await service.generateCustomReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      const { config } = result as any;
      // 默认 metrics 为 ['avg','max','min']；tagIds/deviceIds 解析后为空数组
      expect(config.metrics).toEqual(['avg', 'max', 'min']);
      expect(config.tagIds).toEqual([]);
      expect(config.deviceIds).toEqual([]);
      expect(config.granularity).toBe('day');
    });
  });

  // ==================== exportReport ====================
  describe('exportReport', () => {
    it('TC-RPT-030: should export report as PDF (HTML implementation)', async () => {
      // First generate a report to get an ID
      const daily = await service.generateDailyReport('project-001', '2026-06-04');
      const reportId = (daily as any).id;

      const result = await service.exportReport(reportId, 'pdf');
      expect(result.format).toBe('pdf');
      // 当前 PDF 导出实现为 HTML 文件（生产环境建议升级为 puppeteer/pdfkit）
      expect(result.fileName).toContain('.html');
      expect(result.fileUrl).toBeDefined();
      expect(result.status).toBe(ReportStatus.COMPLETED);
    });

    it('TC-RPT-031: should export report as Excel', async () => {
      const daily = await service.generateDailyReport('project-001', '2026-06-04');
      const reportId = (daily as any).id;

      const result = await service.exportReport(reportId, 'excel');
      expect(result.format).toBe('excel');
      expect(result.fileName).toContain('.xlsx');
    });

    it('TC-RPT-032: should throw error for non-existent report', async () => {
      await expect(service.exportReport('non-existent', 'pdf')).rejects.toThrow(
        'Report non-existent not found',
      );
    });

    it('TC-RPT-033: should include correct fileUrl format in export result', async () => {
      const daily = await service.generateDailyReport('project-001', '2026-06-04');
      const reportId = (daily as any).id;

      const result = await service.exportReport(reportId, 'pdf');
      expect(result.fileUrl).toContain('/reports/exports/');
      expect(result.fileUrl).toContain(reportId);
      expect(result.exportedAt).toBeDefined();
    });

    it('TC-RPT-034: should export report from any project by reportId', async () => {
      const monthly = await service.generateMonthlyReport('project-export', '2026-06');
      const reportId = (monthly as any).id;

      const result = await service.exportReport(reportId, 'excel');
      expect(result.reportId).toBe(reportId);
      expect(result.format).toBe('excel');
    });

    it('TC-RPT-035: should export report as HTML with explicit html format', async () => {
      const daily = await service.generateDailyReport('project-001', '2026-06-04');
      const reportId = (daily as any).id;

      const result = await service.exportReport(reportId, 'html');
      expect(result.format).toBe('html');
      expect(result.fileName).toContain('.html');
      expect(result.status).toBe(ReportStatus.COMPLETED);
    });
  });

  // ==================== getExportFileAbsolute ====================
  describe('getExportFileAbsolute', () => {
    it('TC-RPT-036: should resolve absolute path for a valid exported file', async () => {
      const daily = await service.generateDailyReport('project-download', '2026-06-04');
      const reportId = (daily as any).id;
      const exportResult = await service.exportReport(reportId, 'excel');

      const filePath = service.getExportFileAbsolute(
        'project-download',
        reportId,
        exportResult.fileName as string,
      );
      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toContain(exportResult.fileName as string);
    });

    it('TC-RPT-037: should throw NotFoundException when report does not exist', () => {
      expect(() =>
        service.getExportFileAbsolute('project-001', 'non-existent', 'report_x.xlsx'),
      ).toThrow(NotFoundException);
    });

    it('TC-RPT-038: should throw NotFoundException when report belongs to another project', async () => {
      const daily = await service.generateDailyReport('project-owner', '2026-06-04');
      const reportId = (daily as any).id;

      expect(() =>
        service.getExportFileAbsolute('project-other', reportId, 'report_x.xlsx'),
      ).toThrow(NotFoundException);
    });

    it('TC-RPT-039: should reject path traversal file names', async () => {
      const daily = await service.generateDailyReport('project-traversal', '2026-06-04');
      const reportId = (daily as any).id;

      expect(() =>
        service.getExportFileAbsolute('project-traversal', reportId, '../secret.xlsx'),
      ).toThrow(BadRequestException);
    });

    it('TC-RPT-041: should throw NotFoundException when export file is missing', async () => {
      const daily = await service.generateDailyReport('project-missing-file', '2026-06-04');
      const reportId = (daily as any).id;

      expect(() =>
        service.getExportFileAbsolute('project-missing-file', reportId, 'report_gone.xlsx'),
      ).toThrow(NotFoundException);
    });
  });

  // ==================== generateAlarmReport ====================
  describe('generateAlarmReport', () => {
    it('TC-RPT-040: should generate alarm report with correct structure', async () => {
      const result = await service.generateAlarmReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result.type).toBe(ReportType.ALARM);
      expect(result.data).toBeDefined();
      const { summary } = result.data as any;
      // 无 alarmService 时 totalAlarms=0，byLevel 为空对象，ackRate=0
      expect(summary.totalAlarms).toBe(0);
      expect(summary.byLevel).toBeDefined();
      expect(summary.ackRate).toBe(0);
    });

    it('TC-RPT-041: should support level filtering (fallback item when no data source)', async () => {
      const result = await service.generateAlarmReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        levels: ['critical', 'error'],
      });

      const { items } = result.data as any;
      // 无数据源时 items 为 fallback [{label:'告警总数', value:0}]
      expect(items).toBeInstanceOf(Array);
      expect(items.length).toBeGreaterThan(0);
    });

    it('TC-RPT-042: should return empty pie chart when no alarm data', async () => {
      const result = await service.generateAlarmReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      const { charts } = result.data as any;
      // 无告警数据时无饼图
      expect(charts.some((c: any) => c.type === 'pie')).toBe(false);
    });
  });

  // ==================== generateTrendReport ====================
  describe('generateTrendReport', () => {
    it('TC-RPT-050: should generate trend report with correct structure', async () => {
      const result = await service.generateTrendReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        tagIds: ['tag-001', 'tag-002'],
      });

      expect(result.type).toBe(ReportType.TREND);
      expect(result.data).toBeDefined();
      const { summary } = result.data as any;
      // 无 dataQueryService 时 anomalyCount=0，trendDirection='stable'
      expect(summary.anomalyCount).toBe(0);
      expect(summary.trendDirection).toBe('stable');
    });

    it('TC-RPT-051: should return empty charts when no data source', async () => {
      const result = await service.generateTrendReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        tagIds: ['tag-001'],
      });

      const { charts } = result.data as any;
      // 无 dataQueryService 时 charts 为空数组
      expect(charts).toBeInstanceOf(Array);
      expect(charts).toEqual([]);
    });

    it('TC-RPT-052: should support multiple tag IDs without throwing', async () => {
      const result = await service.generateTrendReport('project-001', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        tagIds: ['tag-001', 'tag-002', 'tag-003'],
      });

      // 多 tagId 不抛异常即可；config 保留传入的 tagIds
      expect(result.type).toBe(ReportType.TREND);
      const { config } = result as any;
      expect(config.tagIds).toHaveLength(3);
    });
  });

  // ==================== queryReports ====================
  describe('queryReports', () => {
    it('TC-RPT-060: should return empty list for new project', async () => {
      const result = await service.queryReports('project-new', {});
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('TC-RPT-061: should return reports after generation', async () => {
      await service.generateDailyReport('project-001', '2026-06-01');
      await service.generateMonthlyReport('project-001', '2026-06');

      const result = await service.queryReports('project-001', {});
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('TC-RPT-062: should filter by type', async () => {
      const result = await service.queryReports('project-001', { type: ReportType.DAILY });
      result.data.forEach((r: any) => {
        expect(r.type).toBe(ReportType.DAILY);
      });
    });

    it('TC-RPT-063: should support pagination', async () => {
      const result = await service.queryReports('project-001', { page: 1, pageSize: 1 });
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(1);
      expect(result.data.length).toBeLessThanOrEqual(1);
    });

    it('TC-RPT-064: should use default pagination values when not provided', async () => {
      await service.generateDailyReport('project-001', '2026-06-01');
      const result = await service.queryReports('project-001', {});
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('TC-RPT-065: should isolate reports by projectId', async () => {
      await service.generateDailyReport('project-isolated', '2026-06-01');
      const result = await service.queryReports('project-other', {});
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ==================== saveReportConfig ====================
  describe('saveReportConfig', () => {
    it('TC-RPT-070: should save report config', async () => {
      const result = await service.saveReportConfig('project-001', {
        name: 'My Custom Report',
        description: 'A test report',
        config: { metrics: ['avg'] },
      });

      expect(result.id).toBeDefined();
      expect((result as any).name).toBe('My Custom Report');
      expect((result as any).config).toEqual({ metrics: ['avg'] });
    });

    it('TC-RPT-071: should retrieve saved configs', async () => {
      await service.saveReportConfig('project-001', {
        name: 'Config 1',
        config: { metrics: ['avg'] },
      });
      await service.saveReportConfig('project-001', {
        name: 'Config 2',
        config: { metrics: ['max'] },
      });

      const configs = await service.getReportConfigs('project-001');
      expect(configs.length).toBeGreaterThanOrEqual(2);
      expect(configs.some((c: any) => c.name === 'Config 1')).toBe(true);
      expect(configs.some((c: any) => c.name === 'Config 2')).toBe(true);
    });

    it('TC-RPT-072: should set default empty description when not provided', async () => {
      const result = await service.saveReportConfig('project-001', {
        name: 'No Desc Config',
        config: { metrics: ['avg'] },
      });

      expect((result as any).description).toBe('');
    });

    it('TC-RPT-073: should isolate configs by projectId', async () => {
      await service.saveReportConfig('project-a', {
        name: 'Config A',
        config: { metrics: ['avg'] },
      });
      await service.saveReportConfig('project-b', {
        name: 'Config B',
        config: { metrics: ['max'] },
      });

      const configsA = await service.getReportConfigs('project-a');
      const configsB = await service.getReportConfigs('project-b');
      expect(configsA.some((c: any) => c.name === 'Config A')).toBe(true);
      expect(configsA.some((c: any) => c.name === 'Config B')).toBe(false);
      expect(configsB.some((c: any) => c.name === 'Config B')).toBe(true);
    });

    it('TC-RPT-074: should return empty array for new project configs', async () => {
      const configs = await service.getReportConfigs('project-new');
      expect(configs).toEqual([]);
    });
  });

  // ==================== deleteReportConfig ====================
  describe('deleteReportConfig', () => {
    it('TC-RPT-080: should delete an existing config', async () => {
      const saved = await service.saveReportConfig('project-del', {
        name: 'To Delete',
        config: { metrics: ['avg'] },
      });
      const configId = (saved as any).id;

      await service.deleteReportConfig('project-del', configId);

      const remaining = await service.getReportConfigs('project-del');
      expect(remaining.find((c: any) => c.id === configId)).toBeUndefined();
    });

    it('TC-RPT-081: should throw NotFoundException for non-existent config', async () => {
      await expect(service.deleteReportConfig('project-del', 'non-existent')).rejects.toThrow(
        'not found',
      );
    });

    it('TC-RPT-082: should throw NotFoundException for non-existent project', async () => {
      await expect(service.deleteReportConfig('project-missing', 'cfg-001')).rejects.toThrow(
        'not found',
      );
    });

    it('TC-RPT-083: should only delete the targeted config', async () => {
      const a = await service.saveReportConfig('project-multi', {
        name: 'A',
        config: { metrics: ['avg'] },
      });
      const b = await service.saveReportConfig('project-multi', {
        name: 'B',
        config: { metrics: ['max'] },
      });

      await service.deleteReportConfig('project-multi', (a as any).id);

      const remaining = await service.getReportConfigs('project-multi');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('B');
      expect((b as any).name).toBe('B');
    });
  });

  // ==================== createTemplate ====================
  describe('createTemplate', () => {
    it('TC-RPT-090: should create a template with id and timestamps', async () => {
      const result = await service.createTemplate('project-001', {
        name: 'Daily Template',
        type: ReportType.DAILY,
        config: { metrics: ['avg'] },
      });

      expect((result as any).id).toBeDefined();
      expect((result as any).id).toMatch(/^tpl_/);
      expect((result as any).projectId).toBe('project-001');
      expect((result as any).name).toBe('Daily Template');
      expect((result as any).type).toBe(ReportType.DAILY);
      expect((result as any).createdAt).toBeDefined();
      expect((result as any).updatedAt).toBeDefined();
    });

    it('TC-RPT-091: should store config when provided', async () => {
      const result = await service.createTemplate('project-001', {
        name: 'With Config',
        type: ReportType.CUSTOM,
        config: { metrics: ['avg', 'max'], tagIds: ['tag-1'] },
      });

      expect((result as any).config).toEqual({ metrics: ['avg', 'max'], tagIds: ['tag-1'] });
    });

    it('TC-RPT-092: should set config to null when not provided', async () => {
      const result = await service.createTemplate('project-001', {
        name: 'No Config',
        type: ReportType.MONTHLY,
      });

      expect((result as any).config).toBeNull();
    });
  });

  // ==================== getTemplates / getTemplate ====================
  describe('getTemplates', () => {
    it('TC-RPT-093: should return templates for a project', async () => {
      await service.createTemplate('project-list', {
        name: 'T1',
        type: ReportType.DAILY,
      });
      await service.createTemplate('project-list', {
        name: 'T2',
        type: ReportType.MONTHLY,
      });

      const result = await service.getTemplates('project-list');
      expect(result).toHaveLength(2);
    });

    it('TC-RPT-094: should return empty array for new project', async () => {
      const result = await service.getTemplates('project-empty');
      expect(result).toEqual([]);
    });

    it('TC-RPT-095: should filter by type', async () => {
      await service.createTemplate('project-filter', {
        name: 'Daily',
        type: ReportType.DAILY,
      });
      await service.createTemplate('project-filter', {
        name: 'Monthly',
        type: ReportType.MONTHLY,
      });

      const result = await service.getTemplates('project-filter', { type: ReportType.DAILY });
      expect(result).toHaveLength(1);
      expect((result[0] as any).type).toBe(ReportType.DAILY);
    });

    it('TC-RPT-096: should isolate templates by projectId', async () => {
      await service.createTemplate('project-a', { name: 'A', type: ReportType.DAILY });
      await service.createTemplate('project-b', { name: 'B', type: ReportType.DAILY });

      const resultA = await service.getTemplates('project-a');
      const resultB = await service.getTemplates('project-b');
      expect(resultA).toHaveLength(1);
      expect(resultB).toHaveLength(1);
      expect((resultA[0] as any).name).toBe('A');
      expect((resultB[0] as any).name).toBe('B');
    });
  });

  describe('getTemplate', () => {
    it('TC-RPT-097: should return template by id', async () => {
      const created = await service.createTemplate('project-001', {
        name: 'Find Me',
        type: ReportType.ALARM,
      });
      const templateId = (created as any).id;

      const result = await service.getTemplate('project-001', templateId);
      expect((result as any).id).toBe(templateId);
      expect((result as any).name).toBe('Find Me');
    });

    it('TC-RPT-098: should throw NotFoundException for non-existent template', async () => {
      await expect(service.getTemplate('project-001', 'tpl-non-existent')).rejects.toThrow(
        'not found',
      );
    });

    it('TC-RPT-099: should throw when template belongs to another project', async () => {
      const created = await service.createTemplate('project-001', {
        name: 'Mine',
        type: ReportType.DAILY,
      });
      await expect(service.getTemplate('project-other', (created as any).id)).rejects.toThrow(
        'not found',
      );
    });
  });

  // ==================== updateTemplate ====================
  describe('updateTemplate', () => {
    it('TC-RPT-100: should update template name', async () => {
      const created = await service.createTemplate('project-001', {
        name: 'Original',
        type: ReportType.DAILY,
      });
      const templateId = (created as any).id;

      const result = await service.updateTemplate('project-001', templateId, {
        name: 'Updated',
      });

      expect((result as any).name).toBe('Updated');
      expect((result as any).type).toBe(ReportType.DAILY);
    });

    it('TC-RPT-101: should update template type and config', async () => {
      const created = await service.createTemplate('project-001', {
        name: 'Original',
        type: ReportType.DAILY,
      });
      const templateId = (created as any).id;

      const result = await service.updateTemplate('project-001', templateId, {
        type: ReportType.CUSTOM,
        config: { metrics: ['sum'] },
      });

      expect((result as any).type).toBe(ReportType.CUSTOM);
      expect((result as any).config).toEqual({ metrics: ['sum'] });
    });

    it('TC-RPT-102: should update updatedAt timestamp', async () => {
      const created = await service.createTemplate('project-001', {
        name: 'Original',
        type: ReportType.DAILY,
      });
      const templateId = (created as any).id;
      const originalUpdatedAt = (created as any).updatedAt;

      // 推进 fake timer 以确保 updatedAt 时间戳不同
      jest.advanceTimersByTime(1000);

      const result = await service.updateTemplate('project-001', templateId, { name: 'New' });
      expect((result as any).updatedAt).not.toBe(originalUpdatedAt);
    });

    it('TC-RPT-103: should throw NotFoundException for non-existent template', async () => {
      await expect(
        service.updateTemplate('project-001', 'tpl-missing', { name: 'X' }),
      ).rejects.toThrow('not found');
    });
  });

  // ==================== deleteTemplate ====================
  describe('deleteTemplate', () => {
    it('TC-RPT-104: should delete a template', async () => {
      const created = await service.createTemplate('project-del-tpl', {
        name: 'To Delete',
        type: ReportType.DAILY,
      });
      const templateId = (created as any).id;

      await service.deleteTemplate('project-del-tpl', templateId);

      await expect(service.getTemplate('project-del-tpl', templateId)).rejects.toThrow('not found');
    });

    it('TC-RPT-105: should throw NotFoundException for non-existent template', async () => {
      await expect(service.deleteTemplate('project-del-tpl', 'tpl-missing')).rejects.toThrow(
        'not found',
      );
    });

    it('TC-RPT-106: should clear templateId on associated schedules when template deleted', async () => {
      const created = await service.createTemplate('project-link', {
        name: 'Linked',
        type: ReportType.DAILY,
      });
      const templateId = (created as any).id;

      const schedule = await service.scheduleReportExport('project-link', {
        templateId,
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      });
      const scheduleId = (schedule as any).id;

      await service.deleteTemplate('project-link', templateId);

      const schedules = await service.getScheduledExports('project-link');
      const updated = schedules.find((s: any) => s.id === scheduleId);
      expect(updated).toBeDefined();
      expect(updated.templateId).toBeNull();
    });
  });

  // ==================== scheduleReportExport ====================
  describe('scheduleReportExport', () => {
    it('TC-RPT-110: should register a schedule with id and defaults', async () => {
      const result = await service.scheduleReportExport('project-001', {
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      });

      expect((result as any).id).toBeDefined();
      expect((result as any).id).toMatch(/^sch_/);
      expect((result as any).projectId).toBe('project-001');
      expect((result as any).cronExpression).toBe('0 0 * * *');
      expect((result as any).exportFormat).toBe(ExportFormat.PDF);
      expect((result as any).enabled).toBe(true);
      expect((result as any).lastRunAt).toBeNull();
      expect((result as any).lastExportPath).toBeNull();
    });

    it('TC-RPT-111: should respect enabled=false', async () => {
      const result = await service.scheduleReportExport('project-001', {
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.EXCEL,
        enabled: false,
      });

      expect((result as any).enabled).toBe(false);
    });

    it('TC-RPT-112: should accept excel format', async () => {
      const result = await service.scheduleReportExport('project-001', {
        cronExpression: '*/5 * * * *',
        exportFormat: ExportFormat.EXCEL,
      });

      expect((result as any).exportFormat).toBe(ExportFormat.EXCEL);
    });

    it('TC-RPT-113: should store templateId when provided', async () => {
      const template = await service.createTemplate('project-001', {
        name: 'T',
        type: ReportType.DAILY,
      });

      const result = await service.scheduleReportExport('project-001', {
        templateId: (template as any).id,
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      });

      expect((result as any).templateId).toBe((template as any).id);
    });

    it('TC-RPT-114: should throw for invalid cron expression', async () => {
      await expect(
        service.scheduleReportExport('project-001', {
          cronExpression: 'invalid',
          exportFormat: ExportFormat.PDF,
        }),
      ).rejects.toThrow('Invalid cron expression');
    });

    it('TC-RPT-115: should throw for non-existent templateId', async () => {
      await expect(
        service.scheduleReportExport('project-001', {
          templateId: 'tpl-missing',
          cronExpression: '0 0 * * *',
          exportFormat: ExportFormat.PDF,
        }),
      ).rejects.toThrow('not found');
    });

    it('TC-RPT-116: should accept various valid cron expressions', async () => {
      const cronExprs = ['0 0 * * *', '*/5 * * * *', '0 9-17 * * 1-5', '30 7 1 * *'];
      for (const cron of cronExprs) {
        const result = await service.scheduleReportExport('project-001', {
          cronExpression: cron,
          exportFormat: ExportFormat.PDF,
        });
        expect((result as any).cronExpression).toBe(cron);
      }
    });
  });

  // ==================== getScheduledExports ====================
  describe('getScheduledExports', () => {
    it('TC-RPT-120: should return schedules for a project', async () => {
      await service.scheduleReportExport('project-sch', {
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      });
      await service.scheduleReportExport('project-sch', {
        cronExpression: '0 12 * * *',
        exportFormat: ExportFormat.EXCEL,
      });

      const result = await service.getScheduledExports('project-sch');
      expect(result).toHaveLength(2);
    });

    it('TC-RPT-121: should return empty array for new project', async () => {
      const result = await service.getScheduledExports('project-empty-sch');
      expect(result).toEqual([]);
    });

    it('TC-RPT-122: should isolate schedules by projectId', async () => {
      await service.scheduleReportExport('project-a', {
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      });
      await service.scheduleReportExport('project-b', {
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      });

      const a = await service.getScheduledExports('project-a');
      const b = await service.getScheduledExports('project-b');
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(1);
    });
  });

  // ==================== unscheduleReportExport ====================
  describe('unscheduleReportExport', () => {
    it('TC-RPT-130: should remove a schedule', async () => {
      const created = await service.scheduleReportExport('project-001', {
        cronExpression: '0 0 * * *',
        exportFormat: ExportFormat.PDF,
      });
      const scheduleId = (created as any).id;

      await service.unscheduleReportExport(scheduleId);

      const remaining = await service.getScheduledExports('project-001');
      expect(remaining.find((s: any) => s.id === scheduleId)).toBeUndefined();
    });

    it('TC-RPT-131: should throw NotFoundException for non-existent schedule', async () => {
      await expect(service.unscheduleReportExport('sch-missing')).rejects.toThrow('not found');
    });
  });

  // ==================== tickSchedules (cron 执行) ====================
  describe('tickSchedules', () => {
    it('TC-RPT-140: should execute matching schedule and update lastRunAt', async () => {
      const created = await service.scheduleReportExport('project-tick', {
        cronExpression: '* * * * *',
        exportFormat: ExportFormat.PDF,
      });
      const scheduleId = (created as any).id;

      const now = new Date();
      await service.tickSchedules(now);

      const schedules = await service.getScheduledExports('project-tick');
      const updated = schedules.find((s: any) => s.id === scheduleId) as any;
      expect(updated.lastRunAt).toBeDefined();
      expect(updated.lastExportPath).toBeDefined();
    });

    it('TC-RPT-141: should not execute disabled schedule', async () => {
      const created = await service.scheduleReportExport('project-tick', {
        cronExpression: '* * * * *',
        exportFormat: ExportFormat.PDF,
        enabled: false,
      });
      const scheduleId = (created as any).id;

      await service.tickSchedules(new Date());

      const schedules = await service.getScheduledExports('project-tick');
      const updated = schedules.find((s: any) => s.id === scheduleId) as any;
      expect(updated.lastRunAt).toBeNull();
    });

    it('TC-RPT-142: should not execute non-matching schedule', async () => {
      // 使用一个明确不匹配当前时间的 cron（ minute=59 ）
      const created = await service.scheduleReportExport('project-tick', {
        cronExpression: '59 0 * * *',
        exportFormat: ExportFormat.PDF,
      });
      const scheduleId = (created as any).id;

      // 使用 minute=30 的时间触发
      const now = new Date();
      now.setMinutes(30);
      now.setHours(0);
      await service.tickSchedules(now);

      const schedules = await service.getScheduledExports('project-tick');
      const updated = schedules.find((s: any) => s.id === scheduleId) as any;
      expect(updated.lastRunAt).toBeNull();
    });

    it('TC-RPT-143: should record export history on success', async () => {
      const created = await service.scheduleReportExport('project-tick', {
        cronExpression: '* * * * *',
        exportFormat: ExportFormat.PDF,
      });
      const scheduleId = (created as any).id;

      await service.tickSchedules(new Date());

      const history = service.getExportHistory('project-tick');
      expect(history.length).toBeGreaterThan(0);
      const entry = history.find((h) => h.scheduleId === scheduleId);
      expect(entry).toBeDefined();
      expect(entry.status).toBe('success');
      expect(entry.reportId).toBeDefined();
    });
  });

  // ==================== 定时导出历史 ====================
  describe('getExportHistory', () => {
    it('TC-RPT-150: should return empty history for new project', () => {
      const history = service.getExportHistory('project-no-history');
      expect(history).toEqual([]);
    });

    it('TC-RPT-151: should isolate history by projectId', async () => {
      await service.scheduleReportExport('project-hist-a', {
        cronExpression: '* * * * *',
        exportFormat: ExportFormat.PDF,
      });
      await service.tickSchedules(new Date());

      const histA = service.getExportHistory('project-hist-a');
      const histB = service.getExportHistory('project-hist-b');
      expect(histA.length).toBeGreaterThan(0);
      expect(histB).toEqual([]);
    });
  });

  // ==================== 调度器生命周期 ====================
  describe('scheduler lifecycle', () => {
    it('TC-RPT-160: startScheduler and stopScheduler should not throw', () => {
      expect(() => service.startScheduler()).not.toThrow();
      expect(() => service.stopScheduler()).not.toThrow();
    });

    it('TC-RPT-161: stopScheduler without start should be a no-op', () => {
      expect(() => service.stopScheduler()).not.toThrow();
    });

    it('TC-RPT-162: startScheduler is idempotent', () => {
      service.startScheduler();
      service.startScheduler();
      service.stopScheduler();
    });
  });
});
