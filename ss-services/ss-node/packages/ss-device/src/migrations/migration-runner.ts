// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 数据库迁移运行器
 * 用于在生产环境中执行 SQL 迁移脚本
 */
@Injectable()
export class MigrationRunner {
  private readonly logger = new Logger(MigrationRunner.name);

  /**
   * 执行指定目录下的所有 SQL 迁移脚本
   * @param migrationsDir 迁移脚本目录路径
   * @param db 数据库实例（需支持 exec 方法）
   */
  async runMigrations(migrationsDir: string, db: any): Promise<void> {
    if (!fs.existsSync(migrationsDir)) {
      this.logger.warn(`Migrations directory not found: ${migrationsDir}`);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      this.logger.log('No migration files found');
      return;
    }

    // 创建迁移记录表
    await this.ensureMigrationTable(db);

    for (const file of files) {
      await this.runMigration(migrationsDir, file, db);
    }
  }

  /**
   * 执行单个迁移脚本
   */
  private async runMigration(migrationsDir: string, file: string, db: any): Promise<void> {
    // 检查是否已执行
    const alreadyRun = await this.isMigrationRun(db, file);
    if (alreadyRun) {
      this.logger.debug(`Migration already executed: ${file}`);
      return;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    this.logger.log(`Running migration: ${file}`);

    try {
      await this.execSql(db, sql);
      await this.recordMigration(db, file);
      this.logger.log(`Migration completed: ${file}`);
    } catch (err) {
      this.logger.error(`Migration failed: ${file} - ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * 确保迁移记录表存在
   */
  private async ensureMigrationTable(db: any): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "name"      TEXT PRIMARY KEY,
        "executedAt" DATETIME NOT NULL DEFAULT (datetime('now'))
      );
    `;
    await this.execSql(db, sql);
  }

  /**
   * 检查迁移是否已执行
   */
  private async isMigrationRun(db: any, name: string): Promise<boolean> {
    try {
      const result = await this.querySql(
        db,
        `SELECT COUNT(*) as count FROM "_migrations" WHERE "name" = ?`,
        [name],
      );
      return result[0]?.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * 记录迁移已执行
   */
  private async recordMigration(db: any, name: string): Promise<void> {
    await this.execSql(db, `INSERT INTO "_migrations" ("name") VALUES (?)`, [name]);
  }

  /**
   * 执行 SQL（多条语句分号分隔）
   */
  private async execSql(db: any, sql: string, params?: any[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (params) {
        db.run(sql, params, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        db.exec(sql, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  }

  /**
   * 查询 SQL
   */
  private async querySql(db: any, sql: string, params?: any[]): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      db.all(sql, params || [], (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}
