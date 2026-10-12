// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import { DbAdapter, ColumnInfo } from './db-adapter.interface';

@Injectable()
export class SqliteAdapter implements DbAdapter {
  private readonly logger = new Logger(SqliteAdapter.name);

  private openDb(config: Record<string, any>): sqlite3.Database {
    return new sqlite3.Database(config.database || config.host || ':memory:');
  }

  async testConnection(
    config: Record<string, any>,
  ): Promise<{ success: boolean; latency: number; error?: string }> {
    const start = Date.now();
    return new Promise((resolve) => {
      const db = this.openDb(config);
      db.get('SELECT 1', (err) => {
        db.close();
        if (err) {
          this.logger.warn(`SQLite connection test failed: ${err.message}`);
          resolve({ success: false, latency: Date.now() - start, error: err.message });
        } else {
          resolve({ success: true, latency: Date.now() - start });
        }
      });
    });
  }

  async getTables(config: Record<string, any>): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const db = this.openDb(config);
      db.all(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
        [],
        (err, rows: any[]) => {
          db.close();
          if (err) reject(err);
          else resolve(rows.map((r) => r.name));
        },
      );
    });
  }

  async getColumns(config: Record<string, any>, tableName: string): Promise<ColumnInfo[]> {
    return new Promise((resolve, reject) => {
      const db = this.openDb(config);
      db.all(`PRAGMA table_info(${tableName})`, [], (err, rows: any[]) => {
        db.close();
        if (err) reject(err);
        else {
          resolve(
            rows.map((r) => ({
              name: r.name,
              type: r.type,
              nullable: r.notnull === 0,
              length: undefined,
            })),
          );
        }
      });
    });
  }

  async executeQuery(config: Record<string, any>, sql: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = this.openDb(config);
      db.all(sql, [], (err, rows: any[]) => {
        db.close();
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}
