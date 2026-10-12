// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import { BackupLog } from '../entities/system.entity';

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

const DEFAULT_SYSTEM_CONFIG: CategoryBackupConfig = {
  enabled: true,
  cronExpression: '0 3 * * *',
  retentionDays: 30,
  backupLocation: '',
  maxSizeMb: 1024,
};

const DEFAULT_PROJECT_CONFIG: CategoryBackupConfig = {
  enabled: false,
  cronExpression: '30 3 * * *',
  retentionDays: 30,
  backupLocation: '',
  maxSizeMb: 2048,
};

const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  system: { ...DEFAULT_SYSTEM_CONFIG },
  project: { ...DEFAULT_PROJECT_CONFIG },
};

const SYSTEM_CRON_JOB_NAME = 'backup-system-scheduled';
const PROJECT_CRON_JOB_NAME = 'backup-project-scheduled';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backupRootDir: string;
  private backupConfig: BackupConfig = { ...DEFAULT_BACKUP_CONFIG };

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly pathResolver: PathResolverService,
    @Optional() private readonly schedulerRegistry?: SchedulerRegistry,
    @Optional() @InjectRepository(BackupLog) private readonly backupLogRepo?: Repository<BackupLog>,
  ) {
    this.backupRootDir = this.resolveBackupRootDir();
    this.ensureDir(this.backupRootDir);
    this.ensureDir(this.getSystemBackupDir());
    this.ensureDir(this.getProjectBackupDir());
    this.loadBackupConfig();
    this.registerDynamicCron();
  }

  // ==================== 备份目录解析 ====================

  /** 根目录：优先环境变量 BACKUP_DIR，其次默认 */
  private resolveBackupRootDir(): string {
    if (process.env.BACKUP_DIR) {
      return this.resolvePath(process.env.BACKUP_DIR);
    }
    // fallback：与 dev/prod 项目根对齐，避免写到 process.cwd()/backups
    return path.join(this.getProjectRoot(), 'backups');
  }

  /** 全局数据库备份子目录 */
  getSystemBackupDir(): string {
    const loc = this.backupConfig.system.backupLocation;
    if (loc) return this.resolvePath(loc);
    return path.join(this.backupRootDir, 'system');
  }

  /** 项目数据库备份子目录 */
  getProjectBackupDir(): string {
    const loc = this.backupConfig.project.backupLocation;
    if (loc) return this.resolvePath(loc);
    return path.join(this.backupRootDir, 'project');
  }

  /** 根据 dbType 获取对应备份目录 */
  private getBackupDirFor(dbType: 'system' | 'project'): string {
    return dbType === 'system' ? this.getSystemBackupDir() : this.getProjectBackupDir();
  }

  /**
   * 获取 ss-services/ss-node 项目根目录的绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-system/dist/backup/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node（.env 中相对路径基准）
   *
   * 修复历史：
   * - v1.4 之前用 5 个 '..' 上溯到 ss-services/（多了一级），导致 backupLocation 解析错位
   * - v1.5 之前仅用 __dirname 不区分 prod，prod 模式下 __dirname 位于
   *   node_modules/@ss-node/ss-system/dist/backup/，4 级上溯到 node_modules/（错误）
   * - 现在与 app.module.ts getDatabaseConfig()、project-database.service.ts getProjectDbDir() 保持一致
   */
  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  private resolvePath(p: string): string {
    return this.pathResolver.resolve(p);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // ==================== 备份配置 ====================

  private loadBackupConfig(): void {
    const configPath = path.join(this.backupRootDir, 'backup-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        // 兼容旧版配置（扁平结构）
        if (raw.system && raw.project) {
          this.backupConfig = {
            system: { ...DEFAULT_SYSTEM_CONFIG, ...raw.system },
            project: { ...DEFAULT_PROJECT_CONFIG, ...raw.project },
          };
        } else {
          // 旧版配置迁移到 system 字段
          this.backupConfig = {
            system: { ...DEFAULT_SYSTEM_CONFIG, ...raw },
            project: { ...DEFAULT_PROJECT_CONFIG },
          };
        }
      } catch {
        this.logger.warn('Failed to parse backup config, using defaults');
      }
    }
  }

  getBackupConfig(): BackupConfig {
    return JSON.parse(JSON.stringify(this.backupConfig));
  }

  saveBackupConfig(config: Partial<BackupConfig>): BackupConfig {
    if (config.system) {
      this.backupConfig.system = { ...this.backupConfig.system, ...config.system };
    }
    if (config.project) {
      this.backupConfig.project = { ...this.backupConfig.project, ...config.project };
    }
    const configPath = path.join(this.backupRootDir, 'backup-config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.backupConfig, null, 2), 'utf-8');
    this.logger.log('Backup config updated');

    // 重新确保目录存在
    this.ensureDir(this.getSystemBackupDir());
    this.ensureDir(this.getProjectBackupDir());

    // 重新注册动态 cron 任务
    this.registerDynamicCron();

    return this.getBackupConfig();
  }

  // ==================== 动态 Cron 调度 ====================

  private registerDynamicCron(): void {
    if (!this.schedulerRegistry) {
      this.logger.debug('SchedulerRegistry not available, using default @Cron');
      return;
    }

    this.registerCronJob(SYSTEM_CRON_JOB_NAME, this.backupConfig.system, 'system');
    this.registerCronJob(PROJECT_CRON_JOB_NAME, this.backupConfig.project, 'project');
  }

  private registerCronJob(
    jobName: string,
    config: CategoryBackupConfig,
    dbType: 'system' | 'project',
  ): void {
    // 先删除已有任务
    try {
      this.schedulerRegistry!.deleteCronJob(jobName);
    } catch {
      // 不存在
    }

    if (!config.enabled) {
      this.logger.log(`${dbType} scheduled backup disabled`);
      return;
    }

    try {
      const callback =
        dbType === 'system'
          ? () =>
              this.executeScheduledBackup('system', config, async () => {
                const result = await this.createSystemBackup('auto');
                return result.filename;
              })
          : () =>
              this.executeScheduledBackup('project', config, async () => {
                const results = await this.backupAllProjects('auto');
                return `${results.length} projects`;
              });
      const job = new CronJob(config.cronExpression, callback);
      this.schedulerRegistry!.addCronJob(jobName, job);
      job.start();
      this.logger.log(`Dynamic cron job registered: ${jobName} = "${config.cronExpression}"`);
    } catch (error) {
      this.logger.error(`Failed to register cron job ${jobName}: ${(error as Error).message}`);
    }
  }

  /** 获取当前 cron 任务状态 */
  getCronJobStatus(): {
    system: { exists: boolean; cronTime?: string; running?: boolean; enabled: boolean };
    project: { exists: boolean; cronTime?: string; running?: boolean; enabled: boolean };
  } {
    const build = (jobName: string, config: CategoryBackupConfig) => {
      if (!this.schedulerRegistry) return { exists: false, enabled: config.enabled };
      try {
        const job = this.schedulerRegistry.getCronJob(jobName);
        return {
          exists: true,
          cronTime: config.cronExpression,
          running: job ? true : false,
          enabled: config.enabled,
        };
      } catch {
        return { exists: false, enabled: config.enabled };
      }
    };
    return {
      system: build(SYSTEM_CRON_JOB_NAME, this.backupConfig.system),
      project: build(PROJECT_CRON_JOB_NAME, this.backupConfig.project),
    };
  }

  // ==================== 定时备份（默认 fallback） ====================

  /** 全局数据库定时备份 - 默认每日凌晨3点（仅当 SchedulerRegistry 不可用时作为 fallback） */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledSystemBackup(): Promise<void> {
    if (this.schedulerRegistry) return; // 动态 cron 已注册，跳过 fallback
    await this.executeScheduledBackup('system', this.backupConfig.system, async () => {
      const result = await this.createSystemBackup('auto');
      return result.filename;
    });
  }

  /** 项目数据库定时备份 - 默认每日凌晨3:30（仅当 SchedulerRegistry 不可用时作为 fallback） */
  @Cron('30 3 * * *')
  async scheduledProjectBackup(): Promise<void> {
    if (this.schedulerRegistry) return; // 动态 cron 已注册，跳过 fallback
    await this.executeScheduledBackup('project', this.backupConfig.project, async () => {
      const results = await this.backupAllProjects('auto');
      return `${results.length} projects`;
    });
  }

  /**
   * 通用定时备份执行流程：
   * 检查启用 → 执行备份 → 清理过期 → 清理超限
   */
  private async executeScheduledBackup(
    dbType: 'system' | 'project',
    config: CategoryBackupConfig,
    backupFn: () => Promise<string>,
  ): Promise<void> {
    if (!config.enabled) return;
    this.logger.log(`Starting scheduled ${dbType} backup...`);
    try {
      const detail = await backupFn();
      this.logger.log(`Scheduled ${dbType} backup completed: ${detail}`);
      await this.postBackupCleanup(dbType, config);
    } catch (error) {
      this.logger.error(`Scheduled ${dbType} backup failed: ${(error as Error).message}`);
    }
  }

  /** 备份后清理：过期清理 + 大小限制清理 */
  private async postBackupCleanup(
    dbType: 'system' | 'project',
    config: CategoryBackupConfig,
  ): Promise<void> {
    await this.cleanupExpired(dbType, config.retentionDays);
    if (config.maxSizeMb && config.maxSizeMb > 0) {
      await this.cleanupBySize(dbType, config.maxSizeMb * 1024 * 1024);
    }
  }

  // ==================== 系统数据库备份 ====================

  async createSystemBackup(
    type: 'auto' | 'manual' = 'manual',
    triggeredBy?: string,
  ): Promise<BackupInfo> {
    const dbPath = this.getSystemDatabasePath();
    return this.backupFile(dbPath, 'system', undefined, type, triggeredBy);
  }

  async createProjectBackup(
    projectName: string,
    type: 'auto' | 'manual' = 'manual',
    triggeredBy?: string,
  ): Promise<BackupInfo> {
    const projectsDir = this.getProjectsDir();
    const dbPath = path.join(projectsDir, projectName, 'db', 'system.db');
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Project database not found: ${dbPath}`);
    }
    return this.backupFile(dbPath, 'project', projectName, type, triggeredBy);
  }

  /** 备份选定的项目列表 */
  async backupSelectedProjects(
    projectNames: string[],
    type: 'auto' | 'manual' = 'manual',
    triggeredBy?: string,
  ): Promise<BackupInfo[]> {
    const results: BackupInfo[] = [];
    for (const name of projectNames) {
      try {
        const result = await this.createProjectBackup(name, type, triggeredBy);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to backup project [${name}]: ${(error as Error).message}`);
        // 记录失败日志
        await this.recordBackupLog({
          dbType: 'project',
          backupType: type,
          projectName: name,
          filename: '',
          filePath: null,
          sizeBytes: 0,
          status: 'failed',
          errorMessage: (error as Error).message,
          backupLocation: this.getProjectBackupDir(),
          triggeredBy: triggeredBy || null,
        });
      }
    }
    return results;
  }

  async backupAllProjects(
    type: 'auto' | 'manual' = 'manual',
    triggeredBy?: string,
  ): Promise<BackupInfo[]> {
    const projectsDir = this.getProjectsDir();
    if (!fs.existsSync(projectsDir)) {
      this.logger.warn(`Projects directory not found: ${projectsDir}`);
      return [];
    }

    const results: BackupInfo[] = [];
    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dbPath = path.join(projectsDir, entry.name, 'db', 'system.db');
      if (!fs.existsSync(dbPath)) continue;

      try {
        const result = await this.backupFile(dbPath, 'project', entry.name, type, triggeredBy);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to backup project [${entry.name}]: ${(error as Error).message}`);
      }
    }

    return results;
  }

  private async backupFile(
    dbPath: string,
    dbType: 'system' | 'project',
    projectName: string | undefined,
    type: 'auto' | 'manual',
    triggeredBy?: string,
  ): Promise<BackupInfo> {
    const backupDir = this.getBackupDirFor(dbType);
    this.ensureDir(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = dbType === 'project' ? `project-${projectName}` : 'system';
    const filename = `${prefix}-backup-${type}-${timestamp}.db.gz`;
    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`);
    }

    let info: BackupInfo;
    try {
      const dbData = fs.readFileSync(dbPath);
      const compressed = await this.gzip(dbData);
      fs.writeFileSync(filePath, compressed);

      const stats = fs.statSync(filePath);
      info = {
        id: filename,
        filename,
        size: stats.size,
        createdAt: new Date().toISOString(),
        type,
        dbType,
        projectName,
        status: 'success',
      };

      this.logger.log(`Backup created: ${filename} (${this.formatBytes(stats.size)})`);

      // 记录到数据库
      await this.recordBackupLog({
        dbType,
        backupType: type,
        projectName: projectName || null,
        filename,
        filePath,
        sizeBytes: stats.size,
        status: 'success',
        errorMessage: null,
        backupLocation: backupDir,
        triggeredBy: triggeredBy || null,
      });
    } catch (error) {
      const errMsg = (error as Error).message;
      info = {
        id: filename,
        filename,
        size: 0,
        createdAt: new Date().toISOString(),
        type,
        dbType,
        projectName,
        status: 'failed',
        error: errMsg,
      };
      // 记录失败日志
      await this.recordBackupLog({
        dbType,
        backupType: type,
        projectName: projectName || null,
        filename,
        filePath,
        sizeBytes: 0,
        status: 'failed',
        errorMessage: errMsg,
        backupLocation: backupDir,
        triggeredBy: triggeredBy || null,
      });
      throw error;
    }

    return info;
  }

  // ==================== 备份日志记录 ====================

  private async recordBackupLog(data: {
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
  }): Promise<void> {
    if (!this.backupLogRepo) {
      this.logger.debug('BackupLog repository not available, skipping log');
      return;
    }
    try {
      const log = new BackupLog();
      log.dbType = data.dbType;
      log.backupType = data.backupType;
      log.projectName = data.projectName;
      log.filename = data.filename;
      log.filePath = data.filePath;
      log.sizeBytes = data.sizeBytes;
      log.status = data.status;
      log.errorMessage = data.errorMessage;
      log.backupLocation = data.backupLocation;
      log.triggeredBy = data.triggeredBy;
      await this.backupLogRepo.save(log);
    } catch (error) {
      this.logger.error(`Failed to record backup log: ${(error as Error).message}`);
    }
  }

  /** 查询备份日志 */
  async getBackupLogs(filter?: {
    dbType?: 'system' | 'project';
    backupType?: 'auto' | 'manual';
    projectName?: string;
    status?: 'success' | 'failed';
    limit?: number;
  }): Promise<BackupLog[]> {
    if (!this.backupLogRepo) return [];
    const qb = this.backupLogRepo.createQueryBuilder('log');
    if (filter?.dbType) qb.andWhere('log.dbType = :dbType', { dbType: filter.dbType });
    if (filter?.backupType)
      qb.andWhere('log.backupType = :backupType', { backupType: filter.backupType });
    if (filter?.projectName)
      qb.andWhere('log.projectName = :projectName', { projectName: filter.projectName });
    if (filter?.status) qb.andWhere('log.status = :status', { status: filter.status });
    qb.orderBy('log.createdAt', 'DESC').limit(filter?.limit || 200);
    return qb.getMany();
  }

  // ==================== 备份列表（文件系统扫描） ====================

  async listBackups(dbType?: 'system' | 'project'): Promise<BackupInfo[]> {
    const types: ('system' | 'project')[] = dbType ? [dbType] : ['system', 'project'];
    const all: BackupInfo[] = [];

    for (const t of types) {
      const dir = this.getBackupDirFor(t);
      this.ensureDir(dir);
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (!f.endsWith('.gz')) continue;
        const filePath = path.join(dir, f);
        const stats = fs.statSync(filePath);

        let projectName: string | undefined;
        if (t === 'project') {
          const match = f.match(/^project-(.+?)-backup-/);
          projectName = match ? match[1] : undefined;
        }

        all.push({
          id: f,
          filename: f,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          type: f.includes('-auto-') ? 'auto' : 'manual',
          dbType: t,
          projectName,
          status: 'success',
        });
      }
    }

    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ==================== 备份统计 ====================

  async getBackupStats(): Promise<BackupStats> {
    const backups = await this.listBackups();

    let totalSizeBytes = 0;
    let systemCount = 0;
    let projectCount = 0;
    let autoCount = 0;
    let manualCount = 0;
    let oldestAt: string | undefined;
    let newestAt: string | undefined;

    for (const b of backups) {
      totalSizeBytes += b.size;
      if (b.dbType === 'system') systemCount++;
      else projectCount++;
      if (b.type === 'auto') autoCount++;
      else manualCount++;

      if (!oldestAt || b.createdAt < oldestAt) oldestAt = b.createdAt;
      if (!newestAt || b.createdAt > newestAt) newestAt = b.createdAt;
    }

    let freeSpaceBytes: number | undefined;
    try {
      const stats = fs.statfsSync(this.backupRootDir);
      freeSpaceBytes = stats.bsize * stats.bavail;
    } catch {
      // statfsSync 在某些平台不可用
    }

    return {
      total: backups.length,
      totalSizeBytes,
      totalSizeFormatted: this.formatBytes(totalSizeBytes),
      systemCount,
      projectCount,
      autoCount,
      manualCount,
      oldestAt: oldestAt ? oldestAt : undefined,
      newestAt: newestAt ? newestAt : undefined,
      backupDir: this.backupRootDir,
      freeSpaceBytes,
    };
  }

  // ==================== 下载/删除 ====================

  getBackupPath(filename: string): string {
    // 在两个子目录中查找
    for (const dir of [this.getSystemBackupDir(), this.getProjectBackupDir()]) {
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) return filePath;
    }
    // 兼容：在根目录查找
    const rootPath = path.join(this.backupRootDir, filename);
    if (fs.existsSync(rootPath)) return rootPath;
    throw new Error(`Backup file not found: ${filename}`);
  }

  async deleteBackup(filename: string): Promise<void> {
    const filePath = this.getBackupPath(filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Backup deleted: ${filename}`);
    }
  }

  // ==================== 恢复 ====================

  async restoreBackup(filename: string): Promise<boolean> {
    const filePath = this.getBackupPath(filename);
    const dbPath = this.getSystemDatabasePath();

    // 恢复前先创建当前数据库的紧急备份
    if (fs.existsSync(dbPath)) {
      const emergencyName = `emergency-before-restore-${Date.now()}.db.gz`;
      const emergencyPath = path.join(this.getSystemBackupDir(), emergencyName);
      const dbData = fs.readFileSync(dbPath);
      const compressed = await this.gzip(dbData);
      fs.writeFileSync(emergencyPath, compressed);
      this.logger.log(`Emergency backup created: ${emergencyName}`);
    }

    return this.performRestore(filePath, dbPath);
  }

  async restoreProjectBackup(filename: string, projectName: string): Promise<boolean> {
    const filePath = this.getBackupPath(filename);
    const projectsDir = this.getProjectsDir();
    const dbPath = path.join(projectsDir, projectName, 'db', 'system.db');
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return this.performRestore(filePath, dbPath);
  }

  private async performRestore(filePath: string, targetDbPath: string): Promise<boolean> {
    try {
      const compressed = fs.readFileSync(filePath);
      const uncompressed = await this.gunzip(compressed);

      if (uncompressed.length === 0) {
        throw new Error('Backup integrity check failed: empty file');
      }

      const tempPath = targetDbPath + '.restore';
      fs.writeFileSync(tempPath, uncompressed);

      const header = fs.readFileSync(tempPath, { encoding: 'utf-8', flag: 'r' }).slice(0, 15);
      if (header !== 'SQLite format 3') {
        fs.unlinkSync(tempPath);
        throw new Error('Backup integrity check failed: invalid SQLite header');
      }

      fs.copyFileSync(tempPath, targetDbPath);
      fs.unlinkSync(tempPath);

      this.logger.log(`Restore completed: ${path.basename(filePath)} -> ${targetDbPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Restore failed: ${(error as Error).message}`);
      throw error;
    }
  }

  // ==================== 清理 ====================

  async cleanupExpired(dbType: 'system' | 'project', retentionDays: number = 30): Promise<number> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    const dir = this.getBackupDirFor(dbType);
    this.ensureDir(dir);
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.gz') || file.startsWith('emergency-')) continue;

      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.birthtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired ${dbType} backups`);
    }
    return deleted;
  }

  async cleanupBySize(dbType: 'system' | 'project', maxBytes: number): Promise<number> {
    const dir = this.getBackupDirFor(dbType);
    this.ensureDir(dir);

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.gz'));
    const fileInfos = files.map((f) => {
      const filePath = path.join(dir, f);
      const stats = fs.statSync(filePath);
      return { filename: f, filePath, size: stats.size, birthtimeMs: stats.birthtimeMs };
    });

    let totalSize = fileInfos.reduce((sum, fi) => sum + fi.size, 0);
    let deleted = 0;

    // 从最旧开始删除
    fileInfos.sort((a, b) => a.birthtimeMs - b.birthtimeMs);
    for (const fi of fileInfos) {
      if (totalSize <= maxBytes) break;
      if (fi.filename.startsWith('emergency-')) continue;

      try {
        fs.unlinkSync(fi.filePath);
        totalSize -= fi.size;
        deleted++;
      } catch (error) {
        this.logger.error(`Failed to delete ${fi.filename}: ${(error as Error).message}`);
      }
    }

    if (deleted > 0) {
      this.logger.log(
        `Cleaned up ${deleted} ${dbType} backups by size limit (${this.formatBytes(maxBytes)})`,
      );
    }
    return deleted;
  }

  // ==================== 路径工具 ====================

  private getSystemDatabasePath(): string {
    const dbPath = this.configService.get<string>('DATABASE_PATH') || './data/ss-node.db';
    return this.pathResolver.resolve(dbPath);
  }

  private getProjectsDir(): string {
    const configuredDir =
      this.configService.get<string>('PROJECTS_DIR') || path.join('data', 'projects');
    return this.pathResolver.resolve(configuredDir);
  }

  // ==================== 工具方法 ====================

  private formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }

  private gzip(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  private gunzip(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}
