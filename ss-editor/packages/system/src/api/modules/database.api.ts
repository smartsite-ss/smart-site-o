// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'auto' | 'manual';
  dbType: 'system' | 'project';
  projectName?: string;
  status: 'success' | 'failed';
  error?: string;
}

/** 单类备份配置（全局或项目） */
export interface CategoryBackupConfig {
  enabled: boolean;
  cronExpression: string;
  retentionDays: number;
  /** 备份存储位置（覆盖默认），为空时使用默认路径 */
  backupLocation?: string;
  /** 备份总大小上限（MB），超过时自动清理最旧备份 */
  maxSizeMb?: number;
}

/** 备份配置根对象：包含全局与项目两套独立配置 */
export interface BackupConfig {
  /** 全局数据库备份配置 */
  system: CategoryBackupConfig;
  /** 项目数据库备份配置 */
  project: CategoryBackupConfig;
}

export interface BackupStats {
  total: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  systemCount: number;
  projectCount: number;
  autoCount: number;
  manualCount: number;
  oldestAt?: string;
  newestAt?: string;
  backupDir: string;
  freeSpaceBytes?: number;
}

/** 单类 Cron 任务状态 */
export interface CategoryCronStatus {
  exists: boolean;
  cronTime?: string;
  running?: boolean;
  enabled: boolean;
}

/** Cron 任务状态（全局+项目） */
export interface CronJobStatus {
  system: CategoryCronStatus;
  project: CategoryCronStatus;
}

/** 备份日志条目 */
export interface BackupLogEntry {
  id: string;
  dbType: 'system' | 'project';
  backupType: 'auto' | 'manual';
  projectName: string | null;
  filename: string;
  filePath: string | null;
  sizeBytes: number;
  status: 'success' | 'failed';
  errorMessage: string | null;
  backupLocation: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

export interface DatabaseStatus {
  type: 'system' | 'project';
  name: string;
  path: string;
  exists: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  tableCount: number;
  lastModified: string | null;
  /** 异常原因（exists=false 时填充） */
  errorMessage?: string;
}

export interface IntegrityCheckResult {
  ok: boolean;
  message: string;
  checkedAt: string;
}

export interface VacuumResult {
  ok: boolean;
  beforeBytes: number;
  afterBytes: number;
  freedBytes: number;
  freedFormatted: string;
  completedAt: string;
}

/** 清空表操作结果 */
export interface ClearTableResult {
  ok: boolean;
  /** 删除的总行数 */
  deleted: number;
  /** 被清空的表名列表 */
  tables: string[];
  completedAt: string;
}

export const databaseApi = {
  // ==================== 备份列表（可按 dbType 过滤） ====================

  getBackups(dbType?: 'system' | 'project'): Promise<ApiResponse<BackupInfo[]>> {
    return client.get('/system/backup', { params: { dbType } }).then((res) => res.data);
  },

  // ==================== 手动备份 ====================

  createSystemBackup(): Promise<ApiResponse<BackupInfo>> {
    return client.post('/system/backup/system').then((res) => res.data);
  },

  createProjectBackup(projectName: string): Promise<ApiResponse<BackupInfo>> {
    return client.post(`/system/backup/project/${projectName}`).then((res) => res.data);
  },

  backupAllProjects(): Promise<ApiResponse<BackupInfo[]>> {
    return client.post('/system/backup/all-projects').then((res) => res.data);
  },

  backupSelectedProjects(projectNames: string[]): Promise<ApiResponse<BackupInfo[]>> {
    return client.post('/system/backup/selected-projects', { projectNames }).then((res) => res.data);
  },

  // ==================== 下载/删除/恢复 ====================

  downloadBackup(filename: string): Promise<Blob> {
    return client.get(`/system/backup/${filename}/download`, { responseType: 'blob' }).then((res) => res.data);
  },

  deleteBackup(filename: string): Promise<ApiResponse<{ ok: boolean }>> {
    return client.delete(`/system/backup/${filename}`).then((res) => res.data);
  },

  restoreBackup(filename: string): Promise<ApiResponse<{ ok: boolean; message: string }>> {
    return client.post(`/system/backup/${filename}/restore`).then((res) => res.data);
  },

  restoreProjectBackup(filename: string, projectName: string): Promise<ApiResponse<{ ok: boolean; message: string }>> {
    return client.post(`/system/backup/${filename}/restore-project/${projectName}`).then((res) => res.data);
  },

  // ==================== 备份配置（拆分结构） ====================

  getBackupConfig(): Promise<ApiResponse<BackupConfig>> {
    return client.get('/system/backup/config').then((res) => res.data);
  },

  saveBackupConfig(config: Partial<BackupConfig>): Promise<ApiResponse<BackupConfig>> {
    return client.post('/system/backup/config', config).then((res) => res.data);
  },

  getCronStatus(): Promise<ApiResponse<CronJobStatus>> {
    return client.get('/system/backup/cron-status').then((res) => res.data);
  },

  getBackupStats(): Promise<ApiResponse<BackupStats>> {
    return client.get('/system/backup/stats').then((res) => res.data);
  },

  // ==================== 备份日志 ====================

  getBackupLogs(filter?: {
    dbType?: 'system' | 'project';
    backupType?: 'auto' | 'manual';
    projectName?: string;
    status?: 'success' | 'failed';
    limit?: number;
  }): Promise<ApiResponse<BackupLogEntry[]>> {
    return client.get('/system/backup/logs', { params: filter }).then((res) => res.data);
  },

  // ==================== 清理（按类型） ====================

  cleanupExpired(dbType: 'system' | 'project', days: number): Promise<ApiResponse<{ ok: boolean; deleted: number }>> {
    return client.delete(`/system/backup/cleanup/${dbType}/${days}`).then((res) => res.data);
  },

  // ==================== 数据库状态 ====================

  getDatabaseStatus(): Promise<ApiResponse<{ system: DatabaseStatus; projects: DatabaseStatus[] }>> {
    return client.get('/system/database/status').then((res) => res.data);
  },

  checkIntegrity(): Promise<ApiResponse<IntegrityCheckResult>> {
    return client.post('/system/database/integrity-check').then((res) => res.data);
  },

  checkProjectIntegrity(projectName: string): Promise<ApiResponse<IntegrityCheckResult>> {
    return client.post(`/system/database/integrity-check/${projectName}`).then((res) => res.data);
  },

  vacuumSystem(): Promise<ApiResponse<VacuumResult>> {
    return client.post('/system/database/vacuum').then((res) => res.data);
  },

  vacuumProject(projectName: string): Promise<ApiResponse<VacuumResult>> {
    return client.post(`/system/database/vacuum/${projectName}`).then((res) => res.data);
  },

  // ==================== 清空表数据 ====================

  clearProjectEvents(projectName: string): Promise<ApiResponse<ClearTableResult>> {
    return client.post(`/system/database/clear-events/${projectName}`).then((res) => res.data);
  },

  clearProjectLogs(projectName: string): Promise<ApiResponse<ClearTableResult>> {
    return client.post(`/system/database/clear-logs/${projectName}`).then((res) => res.data);
  },
};
