// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { PathResolverService } from '@ss-node/ss-core';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sqlite3 = require('sqlite3');

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
  checkedAt: Date;
}

export interface VacuumResult {
  ok: boolean;
  beforeBytes: number;
  afterBytes: number;
  freedBytes: number;
  freedFormatted: string;
  completedAt: Date;
}

/** 清空表操作结果 */
export interface ClearTableResult {
  ok: boolean;
  /** 删除的总行数 */
  deleted: number;
  /** 被清空的表名列表 */
  tables: string[];
  completedAt: Date;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {}

  // ==================== 数据库状态 ====================

  /** 获取系统数据库状态 */
  async getSystemDatabaseStatus(): Promise<DatabaseStatus> {
    const dbPath = this.getSystemDatabasePath();
    return this.buildDatabaseStatus(dbPath, 'system', '系统数据库');
  }

  /** 获取所有项目数据库状态 */
  async getProjectDatabasesStatus(): Promise<DatabaseStatus[]> {
    const projectsDir = this.getProjectsDir();
    if (!fs.existsSync(projectsDir)) {
      return [];
    }

    const results: DatabaseStatus[] = [];
    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dbPath = path.join(projectsDir, entry.name, 'db', 'system.db');
      results.push(await this.buildDatabaseStatus(dbPath, 'project', entry.name));
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** 获取完整数据库状态（系统 + 项目） */
  async getAllDatabasesStatus(): Promise<{ system: DatabaseStatus; projects: DatabaseStatus[] }> {
    return {
      system: await this.getSystemDatabaseStatus(),
      projects: await this.getProjectDatabasesStatus(),
    };
  }

  private async buildDatabaseStatus(
    dbPath: string,
    type: 'system' | 'project',
    name: string,
  ): Promise<DatabaseStatus> {
    const exists = fs.existsSync(dbPath);
    let sizeBytes = 0;
    let lastModified: string | null = null;
    let tableCount = 0;
    let errorMessage: string | undefined;

    if (exists) {
      try {
        const stats = fs.statSync(dbPath);
        sizeBytes = stats.size;
        lastModified = stats.mtime.toISOString();
        tableCount = await this.countTables(dbPath);
      } catch (error) {
        errorMessage = `Failed to read database: ${(error as Error).message}`;
      }
    } else {
      errorMessage = `Database file not found: ${dbPath}`;
    }

    return {
      type,
      name,
      path: dbPath,
      exists,
      sizeBytes,
      sizeFormatted: this.formatBytes(sizeBytes),
      tableCount,
      lastModified,
      errorMessage,
    };
  }

  private countTables(dbPath: string): Promise<number> {
    return new Promise((resolve) => {
      try {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (openErr: Error | null) => {
          if (openErr) {
            this.logger.warn(
              `countTables: open failed [${path.basename(dbPath)}]: ${openErr.message}`,
            );
            resolve(0);
            return;
          }
          db.get(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            (err: Error | null, row: { cnt: number } | undefined) => {
              db.close();
              if (err) {
                this.logger.warn(
                  `countTables: query failed [${path.basename(dbPath)}]: ${err.message}`,
                );
                resolve(0);
                return;
              }
              resolve(row?.cnt ?? 0);
            },
          );
        });
      } catch (err) {
        this.logger.warn(
          `countTables: exception [${path.basename(dbPath)}]: ${(err as Error).message}`,
        );
        resolve(0);
      }
    });
  }

  // ==================== 完整性检查 ====================

  /** 系统数据库完整性检查 */
  async checkSystemIntegrity(): Promise<IntegrityCheckResult> {
    return this.checkIntegrity(this.getSystemDatabasePath());
  }

  /** 项目数据库完整性检查 */
  async checkProjectIntegrity(projectName: string): Promise<IntegrityCheckResult> {
    return this.checkIntegrity(this.getProjectDbPath(projectName));
  }

  private checkIntegrity(dbPath: string): Promise<IntegrityCheckResult> {
    if (!fs.existsSync(dbPath)) {
      return Promise.resolve({
        ok: false,
        message: `Database file not found: ${dbPath}`,
        checkedAt: new Date(),
      });
    }

    return new Promise((resolve) => {
      try {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (openErr: Error | null) => {
          if (openErr) {
            this.logger.error(`Integrity check open failed [${dbPath}]: ${openErr.message}`);
            resolve({
              ok: false,
              message: `Check failed: ${openErr.message}`,
              checkedAt: new Date(),
            });
            return;
          }
          db.all(
            'PRAGMA integrity_check',
            (err: Error | null, rows: Array<{ integrity_check: string }>) => {
              db.close();
              if (err) {
                this.logger.error(`Integrity check failed [${dbPath}]: ${err.message}`);
                resolve({
                  ok: false,
                  message: `Check failed: ${err.message}`,
                  checkedAt: new Date(),
                });
                return;
              }
              const message = rows?.[0]?.integrity_check || 'unknown';
              const ok = message === 'ok';
              this.logger.log(`Integrity check [${path.basename(dbPath)}]: ${message}`);
              resolve({ ok, message, checkedAt: new Date() });
            },
          );
        });
      } catch (error) {
        this.logger.error(`Integrity check exception [${dbPath}]: ${(error as Error).message}`);
        resolve({
          ok: false,
          message: `Check failed: ${(error as Error).message}`,
          checkedAt: new Date(),
        });
      }
    });
  }

  // ==================== 空间回收 ====================

  /** 系统数据库 VACUUM */
  async vacuumSystem(): Promise<VacuumResult> {
    return this.vacuum(this.getSystemDatabasePath());
  }

  /** 项目数据库 VACUUM */
  async vacuumProject(projectName: string): Promise<VacuumResult> {
    return this.vacuum(this.getProjectDbPath(projectName));
  }

  private vacuum(dbPath: string): Promise<VacuumResult> {
    if (!fs.existsSync(dbPath)) {
      return Promise.reject(new Error(`Database file not found: ${dbPath}`));
    }

    const beforeBytes = fs.statSync(dbPath).size;

    return new Promise((resolve, reject) => {
      try {
        const db = new sqlite3.Database(dbPath, (openErr: Error | null) => {
          if (openErr) {
            this.logger.error(`VACUUM open failed [${dbPath}]: ${openErr.message}`);
            reject(new Error(`VACUUM failed: ${openErr.message}`));
            return;
          }
          db.exec('VACUUM', (execErr: Error | null) => {
            db.close((closeErr: Error | null) => {
              if (execErr) {
                this.logger.error(`VACUUM failed [${dbPath}]: ${execErr.message}`);
                reject(new Error(`VACUUM failed: ${execErr.message}`));
                return;
              }
              if (closeErr) {
                this.logger.warn(`VACUUM close warning [${dbPath}]: ${closeErr.message}`);
              }
              const afterBytes = fs.statSync(dbPath).size;
              const freedBytes = beforeBytes - afterBytes;
              this.logger.log(
                `VACUUM [${path.basename(dbPath)}]: ${this.formatBytes(beforeBytes)} -> ${this.formatBytes(afterBytes)} (freed ${this.formatBytes(Math.max(0, freedBytes))})`,
              );
              resolve({
                ok: true,
                beforeBytes,
                afterBytes,
                freedBytes: Math.max(0, freedBytes),
                freedFormatted: this.formatBytes(Math.max(0, freedBytes)),
                completedAt: new Date(),
              });
            });
          });
        });
      } catch (error) {
        this.logger.error(`VACUUM exception [${dbPath}]: ${(error as Error).message}`);
        reject(error);
      }
    });
  }

  // ==================== 清空表数据 ====================

  /** 告警事件表名（仅清空运行时事件数据，不动配置表） */
  private static readonly EVENT_TABLES = ['alm_alarm_records'];

  /** 日志表名（设备状态日志 + 控制操作日志） */
  private static readonly LOG_TABLES = ['dev_device_status_log', 'control_operation_logs'];

  /**
   * 清空项目的告警事件表
   *
   * 仅清空 alm_alarm_records（告警触发/清除记录），不影响 alm_alarm_rules（规则配置）和 alm_alarm_groups（分组配置）。
   * 使用 raw sqlite3 连接（与 VACUUM/integrity-check 一致），设置 busyTimeout 避免与 TypeORM 连接池冲突。
   *
   * @param projectName 项目名称（目录名）
   * @returns 删除的记录数和被清空的表名列表
   */
  async clearProjectEvents(projectName: string): Promise<ClearTableResult> {
    return this.clearTables(this.getProjectDbPath(projectName), DatabaseService.EVENT_TABLES);
  }

  /**
   * 清空项目的日志表
   *
   * 清空 dev_device_status_log（设备状态变更日志）和 control_operation_logs（控制操作日志）。
   * 不影响设备/标签等配置数据。
   *
   * @param projectName 项目名称（目录名）
   * @returns 删除的记录数和被清空的表名列表
   */
  async clearProjectLogs(projectName: string): Promise<ClearTableResult> {
    return this.clearTables(this.getProjectDbPath(projectName), DatabaseService.LOG_TABLES);
  }

  /**
   * 清空指定项目数据库中的若干表（DELETE FROM，保留表结构）
   *
   * 使用 raw sqlite3 逐表执行 DELETE FROM，通过 changes() 累加删除行数。
   * 表不存在时跳过（静默记录 debug 日志），不视为错误。
   */
  private clearTables(dbPath: string, tables: string[]): Promise<ClearTableResult> {
    if (!fs.existsSync(dbPath)) {
      return Promise.reject(new Error(`Database file not found: ${dbPath}`));
    }

    return new Promise((resolve, reject) => {
      try {
        const db = new sqlite3.Database(dbPath, (openErr: Error | null) => {
          if (openErr) {
            this.logger.error(`clearTables: open failed [${path.basename(dbPath)}]: ${openErr.message}`);
            reject(new Error(`Clear tables failed: ${openErr.message}`));
            return;
          }

          // 设置 busyTimeout，避免与 TypeORM 连接池写入冲突导致 SQLITE_BUSY
          db.configure('busyTimeout', 10000);

          let totalDeleted = 0;
          const clearedTables: string[] = [];
          let idx = 0;

          const processNext = () => {
            if (idx >= tables.length) {
              db.close((closeErr: Error | null) => {
                if (closeErr) {
                  this.logger.warn(`clearTables: close warning [${path.basename(dbPath)}]: ${closeErr.message}`);
                }
                this.logger.log(
                  `clearTables [${path.basename(dbPath)}]: deleted ${totalDeleted} rows from ${clearedTables.join(', ') || '(no tables)'}`,
                );
                resolve({
                  ok: true,
                  deleted: totalDeleted,
                  tables: clearedTables,
                  completedAt: new Date(),
                });
              });
              return;
            }

            const tableName = tables[idx];
            idx++;

            db.run(`DELETE FROM ${tableName}`, (runErr: Error | null) => {
              if (runErr) {
                const msg = runErr.message || String(runErr);
                if (msg.includes('no such table')) {
                  // 表不存在（项目可能未使用该功能），静默跳过
                  this.logger.debug(`clearTables: table "${tableName}" not found [${path.basename(dbPath)}], skipped`);
                  processNext();
                } else {
                  this.logger.error(`clearTables: DELETE FROM ${tableName} failed [${path.basename(dbPath)}]: ${msg}`);
                  db.close();
                  reject(new Error(`Clear table "${tableName}" failed: ${msg}`));
                }
                return;
              }
              // sqlite3@6 的 Database 对象无 changes() 方法，用 SQL 函数 changes() 获取删除行数
              db.get(
                'SELECT changes() AS count',
                (getErr: Error | null, row: { count: number } | undefined) => {
                  const changes = !getErr && row ? row.count || 0 : 0;
                  totalDeleted += changes;
                  if (changes > 0) {
                    clearedTables.push(tableName);
                  }
                  processNext();
                },
              );
            });
          };

          processNext();
        });
      } catch (error) {
        this.logger.error(`clearTables: exception [${dbPath}]: ${(error as Error).message}`);
        reject(error);
      }
    });
  }

  // ==================== 路径工具 ====================

  /**
   * 获取 ss-services/ss-node 项目根目录的绝对路径。
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node
   *   （本文件位于 packages/ss-system/dist/backup/）
   *   .env.dev / .env.ss 中相对路径相对于 ss-services/ss-node 解析
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *   .env 中相对路径相对于该目录解析
   *
   * 修复历史：
   * - v1.3 之前使用 5 个 '..' 向上回溯到 ss-services（多了一级）
   * - v1.5 之前仅用 __dirname 不区分 prod，prod 模式下 __dirname 位于
   *   node_modules/@ss-node/ss-system/dist/backup/，4 级上溯到 node_modules/（错误）
   * - 现在与 app.module.ts getDatabaseConfig()、project-database.service.ts getProjectDbDir() 保持一致
   */
  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  /**
   * 将路径解析为绝对路径。
   * - 绝对路径：原样返回（仅 normalize）
   * - 相对路径：基于项目根目录（ss-services/ss-node）解析为绝对路径
   */
  private resolveAbsolutePath(p: string | undefined): string | undefined {
    if (!p) return undefined;
    return this.pathResolver.resolve(p);
  }

  /**
   * 获取系统数据库文件的绝对路径。
   *
   * DATABASE_PATH 在 .env.ss 中为相对路径（如 ../../ss-run/ss/data/db/ss-node.db），
   * 相对于 ss-services/ss-node 目录解析。
   *
   * 修复历史：v1.3 之前使用 5 个 '..' 向上回溯到 ss-services（多了一级），
   * 导致绝对路径少了一级 ss-v7，系统数据库无法被 fs.existsSync 找到。
   *
   * DATA_DIR 依据：.env.base 中 DATA_DIR=../../ss-run/ss/data（相对于 ss-services/ss-node），
   * DATABASE_PATH=${DATA_DIR}/db/ss-node.db 通过 dotenv-expand 解析。
   */
  private getSystemDatabasePath(): string {
    const dbPath = this.configService.get<string>('DATABASE_PATH') || './data/ss-node.db';
    return this.resolveAbsolutePath(dbPath)!;
  }

  /**
   * 获取项目根目录的绝对路径。
   *
   * PROJECTS_DIR 在 .env.ss 中为相对路径（如 ../../ss-project），
   * 相对于 ss-services/ss-node 目录解析为绝对路径。
   *
   * 修复历史：v1.3 之前直接返回 process.env.PROJECTS_DIR（相对路径），
   * 导致 API 响应中 path 字段为相对路径，依赖 process.cwd() 解析不健壮。
   */
  private getProjectsDir(): string {
    const projectsDir =
      this.configService.get<string>('PROJECTS_DIR') || path.join('data', 'projects');
    return this.resolveAbsolutePath(projectsDir)!;
  }

  /**
   * 获取项目数据库文件的绝对路径
   *
   * @param projectName 项目名称（目录名）
   * @returns 项目 system.db 的绝对路径
   */
  private getProjectDbPath(projectName: string): string {
    return path.join(this.getProjectsDir(), projectName, 'db', 'system.db');
  }

  // ==================== 工具方法 ====================

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
