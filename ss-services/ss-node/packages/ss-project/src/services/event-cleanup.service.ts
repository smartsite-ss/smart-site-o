// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ProjectDatabaseService, PathResolverService, SystemEventService } from '@ss-node/ss-core';

/** 清理调度器配置 */
export interface CleanupSchedulerConfig {
  /** 清理间隔（毫秒），默认 86400000（24小时） */
  intervalMs: number;
  /** 是否启用自动清理，默认 true */
  enabled: boolean;
}

/**
 * 事件数据保留策略
 */
export interface RetentionPolicy {
  /** 表名 */
  tableName: string;
  /** 保留天数（默认 90 天） */
  retentionDays: number;
  /** 时间戳字段名（默认 "createdAt"） */
  timestampField?: string;
  /** 是否在清理后执行 VACUUM */
  vacuum?: boolean;
}

/**
 * 清理结果
 */
export interface CleanupResult {
  /** 表名 */
  tableName: string;
  /** 删除的行数 */
  deletedRows: number;
  /** 错误信息（如有） */
  error?: string;
}

/**
 * 事件数据自动归档与清理服务
 *
 * 定时清理 system.db 中的过期事件数据：
 * - 告警记录：默认保留 365 天
 */
@Injectable()
export class EventCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger(EventCleanupService.name);

  /** 调度器定时器引用 */
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  /** 调度器运行状态 */
  private schedulerRunning = false;

  /** 上次清理时间戳 */
  private lastCleanupTime: Date | null = null;

  /** 清理统计 */
  private cleanupStats = {
    totalRuns: 0,
    totalDeletedRows: 0,
    totalErrors: 0,
    lastRunDurationMs: 0,
  };

  /** system.db 中的表保留策略 */
  private readonly policies: RetentionPolicy[] = [
    { tableName: 'alm_alarm_records', retentionDays: 365, vacuum: true },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly projectDbService: ProjectDatabaseService,
    private readonly pathResolver: PathResolverService,
    @Optional() private readonly systemEventService?: SystemEventService,
  ) {}

  /**
   * 清理所有项目的过期事件数据
   * 建议通过外部调度器（如 @nestjs/schedule 或 cron job）定期调用
   */
  async cleanupAllProjects(): Promise<void> {
    if (this.projectDbService.getMode() !== 'isolated') {
      // unified 模式下暂不执行项目级清理
      return;
    }

    this.logger.log('Starting event data cleanup for all projects...');
    const projects = this.getProjectNames();

    for (const projectName of projects) {
      await this.cleanupProjectEvents(projectName);
    }

    // P1-6: 清理全局 sys_events 表中的过期事件
    await this.cleanupGlobalEvents();

    this.logger.log('Event data cleanup completed');
  }

  /**
   * 清理指定项目的过期事件数据
   *
   * @param projectName 项目名称
   * @param policies    自定义保留策略（不传则使用默认的）
   */
  async cleanupProjectEvents(
    projectName: string,
    policies: RetentionPolicy[] = this.policies,
  ): Promise<{ projectName: string; results: CleanupResult[] }> {
    const results: CleanupResult[] = [];

    // 清理 system.db 中的表（如 alm_alarm_records）
    const systemDs = this.projectDbService.getLoadedSystemDb(projectName);
    if (systemDs) {
      for (const policy of policies) {
        try {
          const result = await this.cleanupTable(systemDs, policy);
          results.push(result);
        } catch (err) {
          const errorMsg = `[${policy.tableName}] 清理失败: ${(err as Error).message}`;
          this.logger.error(`[${projectName}] ${errorMsg}`);
          results.push({ tableName: policy.tableName, deletedRows: 0, error: errorMsg });
        }
      }
      // system.db VACUUM
      try {
        await systemDs.query('VACUUM');
        this.logger.log(`[${projectName}] system.db VACUUM completed`);
      } catch (err) {
        this.logger.warn(`[${projectName}] system.db VACUUM failed: ${(err as Error).message}`);
      }
    } else {
      this.logger.warn(`[${projectName}] system.db not loaded, skip cleanup`);
    }

    const totalDeleted = results.reduce((sum, r) => sum + r.deletedRows, 0);
    if (totalDeleted > 0) {
      this.logger.log(`[${projectName}] Cleanup completed: ${totalDeleted} rows deleted`);
    }

    return { projectName, results };
  }

  /**
   * 清理单个表
   */
  private async cleanupTable(
    dataSource: DataSource,
    policy: RetentionPolicy,
  ): Promise<CleanupResult> {
    const tableName = policy.tableName;
    const timestampField = policy.timestampField || 'createdAt';
    const cutoffDate = new Date(Date.now() - policy.retentionDays * 86400000);
    const cutoffISO = cutoffDate.toISOString();

    // 检查表是否存在
    const tables = await dataSource.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
    );
    if (tables.length === 0) {
      return { tableName, deletedRows: 0 };
    }

    const deleteSQL = `DELETE FROM "${tableName}" WHERE "${timestampField}" < ?`;
    const _result = await dataSource.query(deleteSQL, [cutoffISO]);

    // SQLite 的 DELETE 不直接返回 affected rows，需用 changes()
    const changesResult = await dataSource.query('SELECT changes() as count');
    const deletedRows = changesResult[0]?.count || 0;

    if (policy.vacuum && deletedRows > 0) {
      await dataSource.query('VACUUM');
    }

    if (deletedRows > 0) {
      this.logger.log(
        `[${tableName}] 清理完成: ${deletedRows} 行 (保留 ${policy.retentionDays} 天，截止 ${cutoffISO})`,
      );
    }

    return { tableName, deletedRows };
  }

  /**
   * P1-6: 清理全局 sys_events 表中的过期系统事件
   * 默认保留 90 天，通过 SystemEventService.cleanupExpired 执行
   */
  private async cleanupGlobalEvents(): Promise<void> {
    if (!this.systemEventService) {
      this.logger.debug('SystemEventService not available, skip global events cleanup');
      return;
    }

    try {
      const deletedCount = await this.systemEventService.cleanupExpired(90);
      if (deletedCount > 0) {
        this.logger.log(`Global sys_events cleanup: ${deletedCount} expired events removed`);
        this.cleanupStats.totalDeletedRows += deletedCount;
      }
    } catch (err: any) {
      this.cleanupStats.totalErrors++;
      this.logger.error(`Global sys_events cleanup failed: ${err.message}`);
    }
  }

  /**
   * 手动清理指定项目的指定表
   *
   * @param projectName   项目名称
   * @param tableName     表名
   * @param retentionDays 保留天数
   * @param timestampField 时间戳字段
   */
  async manualCleanup(
    projectName: string,
    tableName: string,
    retentionDays: number,
    timestampField: string = 'createdAt',
  ): Promise<CleanupResult> {
    const policy: RetentionPolicy = {
      tableName,
      retentionDays,
      timestampField,
      vacuum: true,
    };

    const systemDs = this.projectDbService.getLoadedSystemDb(projectName);
    if (!systemDs) {
      throw new Error(`[${projectName}] system.db not loaded`);
    }
    return this.cleanupTable(systemDs, policy);
  }

  /**
   * 获取数据库文件大小统计
   */
  async getDatabaseSizeStats(projectName: string): Promise<{
    systemDbSize: number;
    systemDbSizeHuman: string;
  }> {
    const fs = require('fs');
    const path = require('path');
    const dbDir = this.projectDbService.getProjectDbDir(projectName);

    const systemDbPath = path.join(dbDir, 'system.db');
    const systemDbSize = fs.existsSync(systemDbPath) ? fs.statSync(systemDbPath).size : 0;

    return {
      systemDbSize,
      systemDbSizeHuman: this.formatBytes(systemDbSize),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 获取所有项目目录名称
   *
   * 路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node
   *   （本文件编译后位于 packages/ss-project/dist/services/，4 级上溯：
   *    dist/services/ → dist/ → ss-project/ → packages/ → ss-node/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *
   * 修复历史：之前用 3 级上溯且不区分 dev/prod，dev 模式下解析到 packages/（错误），
   * 生产模式下 __dirname 位于 node_modules/@ss-node/ss-project/dist/services/，
   * 3 级上溯到 node_modules/（错误）。与 project-database.service.ts getProjectDbDir() 保持一致。
   */
  private getProjectNames(): string[] {
    const fs = require('fs');
    const projectsDir = this.configService.get<string>('PROJECTS_DIR') || './data/projects';
    const absoluteDir = this.pathResolver.resolve(projectsDir);

    if (!fs.existsSync(absoluteDir)) return [];

    return fs
      .readdirSync(absoluteDir, { withFileTypes: true })
      .filter((e: any) => e.isDirectory())
      .map((e: any) => e.name);
  }

  // ============================================================
  // 自动清理调度器
  // ============================================================

  /**
   * 启动自动清理调度器
   *
   * @param config 调度器配置（不传则使用默认值：24小时间隔，启用）
   */
  startScheduler(config?: Partial<CleanupSchedulerConfig>): void {
    if (this.schedulerTimer) {
      this.logger.warn('Scheduler is already running, stop it first');
      return;
    }

    const enabled = config?.enabled !== false;
    if (!enabled) {
      this.logger.log('Auto-cleanup scheduler is disabled by config');
      return;
    }

    const intervalMs = config?.intervalMs || 86400000; // 默认 24 小时
    this.logger.log(
      `Starting auto-cleanup scheduler (interval: ${intervalMs}ms ≈ ${(intervalMs / 3600000).toFixed(1)}h)`,
    );

    // 立即执行一次清理
    this.runScheduledCleanup();

    // 定时执行
    this.schedulerTimer = setInterval(() => {
      this.runScheduledCleanup();
    }, intervalMs);
  }

  /**
   * 停止自动清理调度器
   */
  stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
      this.logger.log('Auto-cleanup scheduler stopped');
    }
  }

  /**
   * 检查调度器是否正在运行
   */
  isSchedulerRunning(): boolean {
    return this.schedulerTimer !== null;
  }

  /**
   * 获取调度器状态和统计信息
   */
  getSchedulerStatus(): {
    running: boolean;
    lastCleanupTime: Date | null;
    totalRuns: number;
    totalDeletedRows: number;
    totalErrors: number;
    lastRunDurationMs: number;
  } {
    return {
      running: this.isSchedulerRunning(),
      lastCleanupTime: this.lastCleanupTime,
      ...this.cleanupStats,
    };
  }

  /**
   * 执行一次定时清理任务
   */
  private async runScheduledCleanup(): Promise<void> {
    if (this.schedulerRunning) {
      this.logger.warn('Previous cleanup still running, skipping this cycle');
      return;
    }

    this.schedulerRunning = true;
    const startTime = Date.now();

    try {
      await this.cleanupAllProjects();
      this.cleanupStats.totalRuns++;
      this.lastCleanupTime = new Date();
    } catch (err) {
      this.cleanupStats.totalErrors++;
      this.logger.error(`Scheduled cleanup failed: ${(err as Error).message}`);
    } finally {
      this.cleanupStats.lastRunDurationMs = Date.now() - startTime;
      this.schedulerRunning = false;
    }
  }

  /**
   * 模块销毁时停止调度器
   */
  onModuleDestroy(): void {
    this.stopScheduler();
  }
}
