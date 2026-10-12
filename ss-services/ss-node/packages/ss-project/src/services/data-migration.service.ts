// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 数据迁移结果
 */
export interface MigrationResult {
  /** 项目名称 */
  projectName: string;
  /** 迁移的实体统计 */
  entities: {
    name: string;
    tableName: string;
    rowCount: number;
    errors: number;
  }[];
  /** 警告信息 */
  warnings: string[];
  /** 总耗时（ms） */
  durationMs: number;
}

/**
 * 数据迁移服务
 *
 * 提供 unified → isolated 模式的数据迁移能力
 * 将全局 ss-data.db 中指定项目的数据迁移到项目级 system.db
 */
@Injectable()
export class DataMigrationService {
  private readonly logger = new Logger(DataMigrationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 将指定项目的数据从全局数据库迁移到项目级 system.db
   *
   * @param globalDataSource 全局 ss-data.db DataSource
   * @param projectDataSource 项目级 system.db DataSource
   * @param projectName 项目名称
   * @param tables 要迁移的表配置（表名 → 选择条件）
   */
  async migrateProjectFromGlobal(
    globalDataSource: DataSource,
    projectDataSource: DataSource,
    projectName: string,
    tables: Array<{
      tableName: string;
      /** 从全局库筛选该表数据的 WHERE 条件 */
      whereCondition?: string;
      /** projectId 字段名（默认 "projectId"） */
      projectIdField?: string;
      /** 显示的实体名称 */
      entityName?: string;
    }>,
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const entityResults: MigrationResult['entities'] = [];

    for (const table of tables) {
      const tableName = table.tableName;
      const projectIdField = table.projectIdField || 'projectId';
      const entityName = table.entityName || tableName;
      let rowCount = 0;
      let errors = 0;

      try {
        // 检查目标表是否存在
        const tablesResult = await projectDataSource.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
        );
        if (tablesResult.length === 0) {
          warnings.push(`[${entityName}] 目标表 "${tableName}" 不存在于项目数据库中，已跳过`);
          entityResults.push({ name: entityName, tableName, rowCount: 0, errors: 0 });
          continue;
        }

        // 从全局库查询数据
        let selectSQL = `SELECT * FROM "${tableName}"`;
        if (table.whereCondition) {
          selectSQL += ` WHERE ${table.whereCondition}`;
        } else {
          selectSQL += ` WHERE "${projectIdField}" = ?`;
        }

        const rows = await globalDataSource.query(selectSQL, [projectName]);

        if (rows.length === 0) {
          entityResults.push({ name: entityName, tableName, rowCount: 0, errors: 0 });
          continue;
        }

        // 获取目标表的列
        const columnsResult = await projectDataSource.query(`PRAGMA table_info("${tableName}")`);
        const targetColumns = columnsResult.map((c: any) => c.name);

        // 批量插入到项目数据库
        for (const row of rows) {
          try {
            const filteredRow: Record<string, any> = {};
            for (const col of targetColumns) {
              if (col in row) {
                filteredRow[col] = row[col];
              }
            }

            const columns = Object.keys(filteredRow);
            const placeholders = columns.map(() => '?').join(', ');
            const values = Object.values(filteredRow);
            const insertSQL = `INSERT OR IGNORE INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

            await projectDataSource.query(insertSQL, values);
            rowCount++;
          } catch (err) {
            errors++;
            if (errors <= 5) {
              this.logger.warn(`[${entityName}] 插入行失败: ${(err as Error).message}`);
            }
          }
        }

        this.logger.log(`[${entityName}] 迁移完成: ${rowCount} 行, ${errors} 个错误`);
      } catch (err) {
        const msg = `[${entityName}] 迁移失败: ${(err as Error).message}`;
        this.logger.error(msg);
        warnings.push(msg);
      }

      entityResults.push({ name: entityName, tableName, rowCount, errors });
    }

    const durationMs = Date.now() - startTime;
    const totalRows = entityResults.reduce((sum, e) => sum + e.rowCount, 0);
    const totalErrors = entityResults.reduce((sum, e) => sum + e.errors, 0);
    this.logger.log(
      `[${projectName}] 数据迁移完成: ${totalRows} 行, ${totalErrors} 个错误, 耗时 ${durationMs}ms`,
    );

    return {
      projectName,
      entities: entityResults,
      warnings,
      durationMs,
    };
  }

  /**
   * 备份全局数据库
   *
   * @param globalDataSource 全局 DataSource
   * @param backupDir 备份目录
   */
  async backupGlobalDatabase(globalDataSource: DataSource, backupDir: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `ss-data_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dbPath = (globalDataSource.options as any).database;
    if (!dbPath || !fs.existsSync(dbPath)) {
      throw new Error(`全局数据库文件不存在: ${dbPath}`);
    }

    fs.copyFileSync(dbPath, backupPath);
    this.logger.log(`全局数据库已备份到: ${backupPath}`);
    return backupPath;
  }

  /**
   * 获取全局数据库中指定项目的数据统计
   */
  async getProjectDataStats(
    globalDataSource: DataSource,
    projectName: string,
    tables: string[],
  ): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const tableName of tables) {
      try {
        const whereClause =
          tableName === 'projects' ? `name = '${projectName}'` : `projectId = '${projectName}'`;

        const result = await globalDataSource.query(
          `SELECT COUNT(*) as count FROM "${tableName}" WHERE ${whereClause}`,
        );
        stats[tableName] = result[0]?.count || 0;
      } catch {
        stats[tableName] = -1; // 表不存在或查询失败
      }
    }

    return stats;
  }
}
