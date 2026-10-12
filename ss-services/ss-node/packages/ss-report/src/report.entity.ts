// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ProjectScopedEntity } from '@ss-node/ss-core';

export enum ReportType {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
  ALARM = 'alarm',
  TREND = 'trend',
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
}

@Entity('prj_reports')
export class Report extends ProjectScopedEntity {
  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.GENERATING })
  status: ReportStatus;

  @Column({ type: 'json', nullable: true })
  config: ReportConfig;

  @Column({ type: 'json', nullable: true })
  data: ReportData;

  @Column({ nullable: true })
  dateRange: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileType: string;
}

export interface ReportConfig {
  timeRange?: { start: string; end: string };
  metrics?: string[];
  tagIds?: string[];
  deviceIds?: string[];
  alarmLevels?: string[];
  granularity?: 'hour' | 'day' | 'month';
  groupBy?: string[];
}

export interface ReportData {
  summary?: ReportSummary;
  items?: ReportItem[];
  charts?: ReportChart[];
}

export interface ReportSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  totalAlarms: number;
  avgDataQuality: number;
  [key: string]: unknown;
}

export interface ReportItem {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'table';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

/**
 * 报表模板 — 可复用的报表配置，支持基于模板快速生成报表或定时导出。
 */
@Entity('prj_report_templates')
export class ReportTemplate extends ProjectScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ type: 'json', nullable: true })
  config: ReportConfig;
}

/**
 * 定时导出任务 — 按 cron 表达式定时生成报表并导出为文件。
 */
@Entity('prj_report_schedules')
export class ReportSchedule extends ProjectScopedEntity {
  @Column({ nullable: true })
  templateId: string;

  @Column()
  cronExpression: string;

  @Column({ type: 'enum', enum: ExportFormat, default: ExportFormat.PDF })
  exportFormat: ExportFormat;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastRunAt: Date;

  @Column({ nullable: true })
  lastExportPath: string;
}

/**
 * 定时导出历史记录 — 记录每次定时导出执行结果。
 */
@Entity('prj_report_export_history')
export class ReportExportHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column({ nullable: true })
  scheduleId: string;

  @Column({ nullable: true })
  templateId: string;

  @Column({ nullable: true })
  reportId: string;

  @Column({ nullable: true })
  exportPath: string;

  @Column({ default: 'success' })
  status: 'success' | 'failed';

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  executedAt: Date;
}
