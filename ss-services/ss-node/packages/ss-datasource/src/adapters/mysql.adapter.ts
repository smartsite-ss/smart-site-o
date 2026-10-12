// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { createConnection, Connection } from 'mysql2/promise';
import { DbAdapter, ColumnInfo } from './db-adapter.interface';

@Injectable()
export class MysqlAdapter implements DbAdapter {
  private readonly logger = new Logger(MysqlAdapter.name);

  async testConnection(
    config: Record<string, any>,
  ): Promise<{ success: boolean; latency: number; error?: string }> {
    const start = Date.now();
    let conn: Connection | null = null;
    try {
      conn = await createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.username,
        password: config.password,
        database: config.database,
        connectTimeout: 10000,
      });
      await conn.execute('SELECT 1');
      return { success: true, latency: Date.now() - start };
    } catch (err: any) {
      this.logger.warn(`MySQL connection test failed: ${err.message}`);
      return { success: false, latency: Date.now() - start, error: err.message };
    } finally {
      if (conn) await conn.end();
    }
  }

  async getTables(config: Record<string, any>): Promise<string[]> {
    let conn: Connection | null = null;
    try {
      conn = await createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.username,
        password: config.password,
        database: config.database,
        connectTimeout: 10000,
      });
      const [rows] = await conn.execute(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
        [config.database],
      );
      return (rows as any[]).map((r) => r.TABLE_NAME || r.table_name);
    } finally {
      if (conn) await conn.end();
    }
  }

  async getColumns(config: Record<string, any>, tableName: string): Promise<ColumnInfo[]> {
    let conn: Connection | null = null;
    try {
      conn = await createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.username,
        password: config.password,
        database: config.database,
        connectTimeout: 10000,
      });
      const [rows] = await conn.execute(
        `SELECT column_name, data_type, is_nullable, character_maximum_length
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?`,
        [config.database, tableName],
      );
      return (rows as any[]).map((r) => ({
        name: r.COLUMN_NAME || r.column_name,
        type: r.DATA_TYPE || r.data_type,
        nullable: (r.IS_NULLABLE || r.is_nullable) === 'YES',
        length: r.CHARACTER_MAXIMUM_LENGTH || r.character_maximum_length,
      }));
    } finally {
      if (conn) await conn.end();
    }
  }

  async executeQuery(config: Record<string, any>, sql: string): Promise<any[]> {
    let conn: Connection | null = null;
    try {
      conn = await createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.username,
        password: config.password,
        database: config.database,
        connectTimeout: 10000,
      });
      const [rows] = await conn.execute(sql);
      return rows as any[];
    } finally {
      if (conn) await conn.end();
    }
  }
}
