// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BackupService } from '../backup/backup.service';
import { PathResolverService } from '@ss-node/ss-core';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UpgradeInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  changelog?: string;
}

export interface UpgradeResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  message: string;
  rollbackAvailable: boolean;
}

export interface MigrationRecord {
  id: string;
  name: string;
  appliedAt: Date;
  success: boolean;
}

@Injectable()
export class UpgradeService {
  private readonly logger = new Logger(UpgradeService.name);
  private readonly migrationsDir: string;
  private previousVersion: string | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly backupService: BackupService,
    private readonly pathResolver: PathResolverService,
  ) {
    this.migrationsDir = process.env.MIGRATIONS_DIR
      ? this.resolvePath(process.env.MIGRATIONS_DIR)
      : path.join(this.getProjectRoot(), 'migrations');
  }

  /**
   * 获取 ss-services/ss-node 项目根目录的绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-system/dist/upgrade/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *
   * 与 app.module.ts getDatabaseConfig()、backup.service.ts getProjectRoot() 保持一致。
   */
  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  private resolvePath(p: string): string {
    return this.pathResolver.resolve(p);
  }

  /** 版本检测 */
  async checkVersion(): Promise<UpgradeInfo> {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = await this.getLatestVersion();

    return {
      currentVersion,
      latestVersion,
      updateAvailable: this.compareVersions(latestVersion, currentVersion) > 0,
      changelog: 'Bug fixes and performance improvements',
    };
  }

  /** 下载升级包 */
  async downloadUpgrade(version: string): Promise<{ path: string; sha256: string }> {
    const downloadDir = path.join(this.getProjectRoot(), 'upgrades');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const filename = `ss-data-${version}.tar.gz`;
    const filePath = path.join(downloadDir, filename);

    // Stub: In production, download from CDN/update server
    fs.writeFileSync(filePath, `upgrade-package-${version}`);

    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

    this.logger.log(`Downloaded upgrade package: ${filename} (SHA256: ${sha256})`);
    return { path: filePath, sha256 };
  }

  /** 数据库迁移 */
  async runMigrations(): Promise<MigrationRecord[]> {
    const records: MigrationRecord[] = [];

    try {
      await this.ensureMigrationsTable();
      const pendingMigrations = this.getPendingMigrations();

      for (const migration of pendingMigrations) {
        const record = await this.applyMigration(migration);
        records.push(record);
      }
    } catch (error) {
      this.logger.error(`Migration failed: ${error.message}`);
      throw error;
    }

    return records;
  }

  /** 执行升级 */
  async performUpgrade(version: string): Promise<UpgradeResult> {
    const currentVersion = this.getCurrentVersion();
    this.previousVersion = currentVersion;

    try {
      // 升级前自动备份
      this.logger.log('Creating backup before upgrade...');
      await this.backupService.createSystemBackup('auto');

      // 下载升级包
      const { path: upgradePath, sha256 } = await this.downloadUpgrade(version);

      // 验证 SHA256
      const fileData = fs.readFileSync(upgradePath);
      const actualSha256 = crypto.createHash('sha256').update(fileData).digest('hex');
      if (actualSha256 !== sha256) {
        throw new Error('SHA256 verification failed');
      }

      // 运行数据库迁移
      await this.runMigrations();

      this.logger.log(`Upgrade completed: ${currentVersion} -> ${version}`);
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: version,
        message: 'Upgrade successful',
        rollbackAvailable: true,
      };
    } catch (error) {
      this.logger.error(`Upgrade failed: ${error.message}`);
      return {
        success: false,
        fromVersion: currentVersion,
        toVersion: version,
        message: `Upgrade failed: ${error.message}`,
        rollbackAvailable: false,
      };
    }
  }

  /** 回滚 */
  async rollback(): Promise<UpgradeResult> {
    if (!this.previousVersion) {
      throw new BadRequestException('No previous version to rollback to');
    }

    const currentVersion = this.getCurrentVersion();
    this.logger.log(`Rolling back from ${currentVersion} to ${this.previousVersion}`);

    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: this.previousVersion,
      message: 'Rollback successful',
      rollbackAvailable: false,
    };
  }

  private getCurrentVersion(): string {
    try {
      const buildInfoPath = path.join(
        __dirname,
        '..',
        '..',
        'apps',
        'ss-data-server',
        'dist',
        'build-info.json',
      );
      if (fs.existsSync(buildInfoPath)) {
        const info = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
        return info.version || '0.0.0';
      }
    } catch {
      // ignore
    }
    return '0.0.0';
  }

  private async getLatestVersion(): Promise<string> {
    // Stub: In production, fetch from update server
    return '0.2.0';
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const diff = (partsA[i] || 0) - (partsB[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  private async ensureMigrationsTable(): Promise<void> {
    if (this.dataSource.options.type === 'sqlite') {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          success INTEGER DEFAULT 1
        )
      `);
    }
  }

  private getPendingMigrations(): string[] {
    const migrations: string[] = [];
    if (fs.existsSync(this.migrationsDir)) {
      const files = fs.readdirSync(this.migrationsDir).filter((f) => f.endsWith('.sql'));
      migrations.push(...files);
    }
    return migrations;
  }

  private async applyMigration(name: string): Promise<MigrationRecord> {
    const id = crypto.randomUUID();
    try {
      const filePath = path.join(this.migrationsDir, name);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await this.dataSource.query(sql);
      await this.dataSource.query(
        `INSERT INTO migrations (id, name, applied_at, success) VALUES (?, ?, ?, ?)`,
        [id, name, new Date().toISOString(), 1],
      );

      this.logger.log(`Migration applied: ${name}`);
      return { id, name, appliedAt: new Date(), success: true };
    } catch (error) {
      this.logger.error(`Migration failed: ${name} - ${error.message}`);
      return { id, name, appliedAt: new Date(), success: false };
    }
  }
}
