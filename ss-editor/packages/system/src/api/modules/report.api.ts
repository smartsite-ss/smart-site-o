// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, PaginatedApiResponse } from '../types/api';

// ==================== 类型定义 ====================

/** 报表类型（与后端 ReportType 枚举一致） */
export type ReportType = 'daily' | 'monthly' | 'custom' | 'alarm' | 'trend';

/** 报表状态（与后端 ReportStatus 枚举一致） */
export type ReportStatus = 'generating' | 'completed' | 'failed';

/** 报表粒度 */
export type ReportGranularity = 'hour' | 'day' | 'month';

/** 报表趋势方向 */
export type ReportTrend = 'up' | 'down' | 'stable';

/** 图表类型 */
export type ReportChartType = 'line' | 'bar' | 'pie' | 'table';

/** 报表摘要 */
export interface ReportSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  totalAlarms: number;
  avgDataQuality: number;
  [key: string]: unknown;
}

/** 报表指标项 */
export interface ReportItem {
  label: string;
  value: number | string;
  unit?: string;
  trend?: ReportTrend;
  changePercent?: number;
}

/** 图表数据集 */
export interface ReportChartDataset {
  label: string;
  data: number[];
  color?: string;
}

/** 报表图表 */
export interface ReportChart {
  type: ReportChartType;
  title: string;
  labels: string[];
  datasets: ReportChartDataset[];
}

/** 报表数据（嵌套在 Report.data 下） */
export interface ReportData {
  summary?: ReportSummary;
  items?: ReportItem[];
  charts?: ReportChart[];
}

/** 报表配置 */
export interface ReportConfig {
  timeRange?: { start: string; end: string };
  metrics?: string[];
  tagIds?: string[];
  deviceIds?: string[];
  alarmLevels?: string[];
  granularity?: ReportGranularity;
  groupBy?: string[];
}

/**
 * 报表响应对象（与后端 CachedReport 结构一致）
 * 注意：summary/items/charts 嵌套在 data 字段下
 */
export interface Report {
  id: string;
  type: ReportType;
  projectId: string;
  date?: string;
  month?: string;
  dateRange?: string;
  config?: Record<string, unknown>;
  generatedAt: string;
  data: ReportData;
}

/** 导出报表结果 */
export interface ReportExportResult {
  reportId: string;
  format: 'pdf' | 'excel';
  fileName: string;
  filePath: string;
  fileUrl: string;
  exportedAt: string;
  status: ReportStatus;
}

/** 保存的报表配置 */
export interface SavedReportConfig {
  id: string;
  projectId: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  createdAt: string;
}

// ==================== DTO 定义 ====================

export interface GenerateDailyReportDto {
  date: string;
}

export interface GenerateMonthlyReportDto {
  month: string;
}

export interface GenerateCustomReportDto {
  startDate: string;
  endDate: string;
  metrics?: string[];
  tagIds?: string[];
  deviceIds?: string[];
  granularity?: ReportGranularity;
}

export interface AlarmReportDto {
  startDate: string;
  endDate: string;
  levels?: string[];
  deviceIds?: string[];
}

export interface TrendReportDto {
  startDate: string;
  endDate: string;
  tagIds: string[];
  granularity?: ReportGranularity;
}

export interface ExportReportDto {
  format: 'pdf' | 'excel';
}

export interface ReportQueryParams {
  type?: ReportType;
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
}

export interface SaveReportConfigDto {
  name: string;
  description?: string;
  config: Record<string, unknown>;
}

// ==================== API 方法 ====================

const buildUrl = (projectId: string, path: string) =>
  `/projects/${projectId}/reports${path}`;

export const reportApi = {
  /** 生成日报 */
  generateDaily(projectId: string, dto: GenerateDailyReportDto): Promise<ApiResponse<Report>> {
    return client.post(buildUrl(projectId, '/daily'), dto).then((res) => res.data);
  },

  /** 生成月报 */
  generateMonthly(projectId: string, dto: GenerateMonthlyReportDto): Promise<ApiResponse<Report>> {
    return client.post(buildUrl(projectId, '/monthly'), dto).then((res) => res.data);
  },

  /** 生成自定义报表 */
  generateCustom(projectId: string, dto: GenerateCustomReportDto): Promise<ApiResponse<Report>> {
    return client.post(buildUrl(projectId, '/custom'), dto).then((res) => res.data);
  },

  /** 生成告警报表 */
  generateAlarm(projectId: string, dto: AlarmReportDto): Promise<ApiResponse<Report>> {
    return client.post(buildUrl(projectId, '/alarm'), dto).then((res) => res.data);
  },

  /** 生成趋势报表 */
  generateTrend(projectId: string, dto: TrendReportDto): Promise<ApiResponse<Report>> {
    return client.post(buildUrl(projectId, '/trend'), dto).then((res) => res.data);
  },

  /**
   * 导出报表
   * 后端路由为 POST projects/:projectId/reports/:reportId/export（非 GET）
   */
  exportReport(
    projectId: string,
    reportId: string,
    dto: ExportReportDto,
  ): Promise<ApiResponse<ReportExportResult>> {
    return client.post(buildUrl(projectId, `/${reportId}/export`), dto).then((res) => res.data);
  },

  /** 查询报表列表 */
  queryReports(
    projectId: string,
    params?: ReportQueryParams,
  ): Promise<PaginatedApiResponse<Report>> {
    return client.get(buildUrl(projectId, ''), { params }).then((res) => res.data);
  },

  /** 保存报表配置 */
  saveReportConfig(
    projectId: string,
    dto: SaveReportConfigDto,
  ): Promise<ApiResponse<SavedReportConfig>> {
    return client.post(buildUrl(projectId, '/configs'), dto).then((res) => res.data);
  },

  /** 获取报表配置列表 */
  getReportConfigs(projectId: string): Promise<ApiResponse<SavedReportConfig[]>> {
    return client.get(buildUrl(projectId, '/configs')).then((res) => res.data);
  },
};
