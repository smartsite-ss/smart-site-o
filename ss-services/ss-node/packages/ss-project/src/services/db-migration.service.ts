// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathResolverService } from '@ss-node/ss-core';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 迁移脚本元数据
 */
export interface MigrationScript {
  /** 文件名 */
  name: string;
  /** 文件路径 */
  filePath: string;
  /** 迁移版本号（从文件名中提取） */
  version: number;
  /** 迁移类型 */
  targetDb: 'system';
}

/**
 * 项目级数据库迁移管理服务
 *
 * 职责：
 * 1. 管理项目级数据库迁移脚本（db/migration/ 目录）
 * 2. 追踪已执行的迁移版本（存储在 projectinfo.json 中）
 * 3. 按序执行待迁移脚本
 */
@Injectable()
export class DbMigrationService {
  private readonly logger = new Logger(DbMigrationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly pathResolver: PathResolverService,
  ) {}

  /**
   * 获取项目迁移脚本目录
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node
   *   （本文件编译后位于 packages/ss-project/dist/services/，4 级上溯：
   *    dist/services/ → dist/ → ss-project/ → packages/ → ss-node/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *
   * 修复历史：之前用 3 级上溯且不区分 dev/prod，dev 模式下解析到 packages/（错误），
   * 生产模式下 __dirname 位于 node_modules/@ss-node/ss-project/dist/services/，
   * 3 级上溯到 node_modules/（错误）。与 project-database.service.ts getProjectDbDir() 保持一致。
   */
  getMigrationDir(projectName: string): string {
    const projectsDir = this.configService.get<string>('PROJECTS_DIR') || './data/projects';
    const absoluteProjectsDir = this.pathResolver.resolve(projectsDir);
    return path.join(absoluteProjectsDir, projectName, 'db', 'migration');
  }

  /**
   * 扫描项目迁移脚本目录，返回待执行的迁移脚本列表
   *
   * 文件命名规范：{序号}_system_{描述}.sql
   * 示例：
   *   001_system_init.sql
   *   002_system_add_alarm_priority.sql
   */
  scanMigrations(projectName: string): MigrationScript[] {
    const migrationDir = this.getMigrationDir(projectName);
    if (!fs.existsSync(migrationDir)) {
      return [];
    }

    const files = fs
      .readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // 按文件名排序

    const migrations: MigrationScript[] = [];
    for (const file of files) {
      const match = file.match(/^(\d+)_system_(.+)\.sql$/);
      if (match) {
        migrations.push({
          name: file,
          filePath: path.join(migrationDir, file),
          version: parseInt(match[1], 10),
          targetDb: 'system',
        });
      } else {
        this.logger.warn(`[${projectName}] Skip invalid migration file: ${file}`);
      }
    }

    return migrations;
  }

  /**
   * 获取已执行的迁移版本列表
   */
  getExecutedMigrations(projectName: string): string[] {
    const infoPath = this.getProjectInfoPath(projectName);
    if (!fs.existsSync(infoPath)) {
      return [];
    }

    try {
      const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      return raw.dbMigrations || [];
    } catch {
      return [];
    }
  }

  /**
   * 记录已执行的迁移
   */
  recordMigration(projectName: string, migrationName: string): void {
    const infoPath = this.getProjectInfoPath(projectName);
    if (!fs.existsSync(infoPath)) {
      this.logger.warn(`[${projectName}] projectinfo.json not found, cannot record migration`);
      return;
    }

    const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    const executed = raw.dbMigrations || [];
    if (!executed.includes(migrationName)) {
      executed.push(migrationName);
      raw.dbMigrations = executed;
      fs.writeFileSync(infoPath, JSON.stringify(raw, null, 2), 'utf-8');
    }
  }

  /**
   * 获取当前数据库结构版本号
   */
  getDbSchemaVersion(projectName: string): number {
    const infoPath = this.getProjectInfoPath(projectName);
    if (!fs.existsSync(infoPath)) {
      return 0;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      return raw.dbSchemaVersion || 0;
    } catch {
      return 0;
    }
  }

  /**
   * 更新数据库结构版本号
   */
  setDbSchemaVersion(projectName: string, version: number): void {
    const infoPath = this.getProjectInfoPath(projectName);
    if (!fs.existsSync(infoPath)) return;

    const raw = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    raw.dbSchemaVersion = version;
    fs.writeFileSync(infoPath, JSON.stringify(raw, null, 2), 'utf-8');
  }

  /**
   * 执行项目数据库迁移
   *
   * @param projectName 项目名称
   * @param systemDs    system.db DataSource
   * @returns 本次执行的迁移数量
   */
  async migrateProject(projectName: string, systemDs: DataSource): Promise<number> {
    const migrations = this.scanMigrations(projectName);
    if (migrations.length === 0) {
      return 0;
    }

    const executedNames = this.getExecutedMigrations(projectName);
    const pending = migrations.filter((m) => !executedNames.includes(m.name));

    if (pending.length === 0) {
      this.logger.log(`[${projectName}] No pending migrations`);
      return 0;
    }

    let count = 0;
    for (const migration of pending) {
      try {
        const sql = fs.readFileSync(migration.filePath, 'utf-8');

        this.logger.log(`[${projectName}] Executing migration: ${migration.name}`);
        await systemDs.query(sql);

        this.recordMigration(projectName, migration.name);
        this.setDbSchemaVersion(projectName, migration.version);
        count++;
      } catch (err) {
        this.logger.error(
          `[${projectName}] Migration "${migration.name}" failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
        // 不中断后续迁移
      }
    }

    this.logger.log(`[${projectName}] Migrations completed: ${count}/${pending.length} executed`);
    return count;
  }

  /**
   * 生成空白迁移脚本文件
   *
   * @param projectName 项目名称
   * @param description 迁移描述
   * @param targetDb    目标数据库
   */
  createMigrationFile(projectName: string, description: string, targetDb: 'system'): string {
    const migrationDir = this.getMigrationDir(projectName);
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }

    const existing = this.scanMigrations(projectName);
    const nextVersion = existing.length > 0 ? Math.max(...existing.map((m) => m.version)) + 1 : 1;

    const safeDesc = description.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_').slice(0, 50);
    const fileName = `${String(nextVersion).padStart(3, '0')}_${targetDb}_${safeDesc}.sql`;
    const filePath = path.join(migrationDir, fileName);

    const template = `-- Migration: ${description}
-- Target: ${targetDb}.db
-- Created: ${new Date().toISOString()}
-- Version: ${nextVersion}

-- TODO: Write your migration SQL here
`;
    fs.writeFileSync(filePath, template, 'utf-8');
    this.logger.log(`[${projectName}] Migration file created: ${fileName}`);
    return filePath;
  }

  /**
   * 获取项目的 projectinfo.json 路径
   *
   * 路径基准与 getMigrationDir() 一致：dev 模式 4 级上溯，生产模式 process.cwd()。
   */
  private getProjectInfoPath(projectName: string): string {
    const projectsDir = this.configService.get<string>('PROJECTS_DIR') || './data/projects';
    const absoluteProjectsDir = this.pathResolver.resolve(projectsDir);
    return path.join(absoluteProjectsDir, projectName, 'projectinfo.json');
  }
}
