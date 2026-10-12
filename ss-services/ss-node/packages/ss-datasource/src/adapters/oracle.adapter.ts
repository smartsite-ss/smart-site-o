// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import { getConnection, Connection, OUT_FORMAT_OBJECT } from 'oracledb';
import { DbAdapter, ColumnInfo } from './db-adapter.interface';

@Injectable()
export class OracleAdapter implements DbAdapter {
  private readonly logger = new Logger(OracleAdapter.name);

  async testConnection(
    config: Record<string, any>,
  ): Promise<{ success: boolean; latency: number; error?: string }> {
    const start = Date.now();
    let conn: Connection | null = null;
    try {
      conn = await getConnection({
        connectString: `${config.host}:${config.port || 1521}/${config.database}`,
        user: config.username,
        password: config.password,
      });
      await conn.execute('SELECT 1 FROM DUAL');
      return { success: true, latency: Date.now() - start };
    } catch (err: any) {
      this.logger.warn(`Oracle connection test failed: ${err.message}`);
      return { success: false, latency: Date.now() - start, error: err.message };
    } finally {
      if (conn) await conn.close();
    }
  }

  async getTables(config: Record<string, any>): Promise<string[]> {
    let conn: Connection | null = null;
    try {
      conn = await getConnection({
        connectString: `${config.host}:${config.port || 1521}/${config.database}`,
        user: config.username,
        password: config.password,
      });
      const result = await conn.execute(`SELECT table_name FROM user_tables ORDER BY table_name`);
      return (result.rows as any[]).map((r) => r[0] || r.TABLE_NAME);
    } finally {
      if (conn) await conn.close();
    }
  }

  async getColumns(config: Record<string, any>, tableName: string): Promise<ColumnInfo[]> {
    let conn: Connection | null = null;
    try {
      conn = await getConnection({
        connectString: `${config.host}:${config.port || 1521}/${config.database}`,
        user: config.username,
        password: config.password,
      });
      const result = await conn.execute(
        `SELECT column_name, data_type, nullable, data_length
         FROM user_tab_columns
         WHERE table_name = :tableName`,
        { tableName: tableName.toUpperCase() },
      );
      return (result.rows as any[]).map((r) => ({
        name: r[0] || r.COLUMN_NAME,
        type: r[1] || r.DATA_TYPE,
        nullable: (r[2] || r.NULLABLE) === 'Y',
        length: r[3] || r.DATA_LENGTH,
      }));
    } finally {
      if (conn) await conn.close();
    }
  }

  async executeQuery(config: Record<string, any>, sql: string): Promise<any[]> {
    let conn: Connection | null = null;
    try {
      conn = await getConnection({
        connectString: `${config.host}:${config.port || 1521}/${config.database}`,
        user: config.username,
        password: config.password,
      });
      const result = await conn.execute(sql, [], { outFormat: OUT_FORMAT_OBJECT });
      return (result.rows as any[]) || [];
    } finally {
      if (conn) await conn.close();
    }
  }
}
