// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  StorageAdapter,
  DataPoint,
  QueryOptions,
  WriteResult,
  AdapterCapabilities,
} from '../interfaces/storage-adapter.interface';
import { STORAGE_ENGINE_TYPES } from '../storage-engine-types';

interface ConnectionPool {
  getConnection: () => Promise<any>;
  releaseConnection: (conn: any) => void;
  end: () => Promise<void>;
}

@Injectable()
export class MysqlStorageAdapter implements StorageAdapter, OnModuleInit, OnModuleDestroy {
  readonly name = 'MySQL';
  readonly engineType: string = STORAGE_ENGINE_TYPES.MYSQL;
  readonly capabilities: AdapterCapabilities = {
    delete: true,
    interpolation: false,
    aggregation: false,
  };
  private readonly logger = new Logger(MysqlStorageAdapter.name);

  private pool: ConnectionPool | null = null;
  private isClosed = false;

  private mysqlHost: string;
  private mysqlPort: number;
  private mysqlUser: string;
  private mysqlPassword: string;
  private mysqlDatabase: string;
  private connectionLimit: number;

  constructor() {
    this.mysqlHost = process.env.MYSQL_HOST || 'localhost';
    this.mysqlPort = parseInt(process.env.MYSQL_PORT || '3306', 10);
    this.mysqlUser = process.env.MYSQL_USER || 'root';
    this.mysqlPassword = process.env.MYSQL_PASSWORD || '';
    this.mysqlDatabase = process.env.MYSQL_DATABASE || 'ss_node_data';
    this.connectionLimit = parseInt(process.env.MYSQL_POOL_SIZE || '10', 10);
  }

  onModuleInit(): void {
    this.logger.log(
      `MysqlStorageAdapter initialized (host: ${this.mysqlHost}:${this.mysqlPort}, db: ${this.mysqlDatabase}, pool: ${this.connectionLimit})`,
    );
    this.pool = this.createConnectionPool();
  }

  onModuleDestroy(): void {
    this.isClosed = true;
    if (this.pool) {
      this.pool.end().catch((err) => {
        this.logger.error(`Error closing MySQL pool: ${err.message}`);
      });
    }
    this.logger.log('MysqlStorageAdapter closed');
  }

  // ──────────── write ────────────

  async write(points: DataPoint[]): Promise<WriteResult> {
    if (this.isClosed) {
      return {
        success: false,
        written: 0,
        failed: points.length,
        errors: [new Error('Adapter is closed')],
      };
    }

    let written = 0;
    let failed = 0;
    const errors: Error[] = [];

    const conn = await this.pool!.getConnection();

    try {
      for (const point of points) {
        try {
          await conn.query(
            `INSERT INTO time_series_data (tag_id, device_id, project_id, value, timestamp, quality, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE value = VALUES(value), quality = VALUES(quality), metadata = VALUES(metadata)`,
            [
              point.tagId,
              point.deviceId,
              point.projectId,
              typeof point.value === 'object' ? JSON.stringify(point.value) : point.value,
              point.timestamp,
              point.quality,
              point.metadata ? JSON.stringify(point.metadata) : null,
            ],
          );
          written++;
        } catch (error) {
          failed++;
          errors.push(error);
          this.logger.error(`Write failed for tag ${point.tagId}: ${error.message}`);
        }
      }
    } finally {
      this.pool!.releaseConnection(conn);
    }

    return {
      success: failed === 0,
      written,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ──────────── read ────────────

  async read(options: QueryOptions): Promise<DataPoint[]> {
    const { tagIds, deviceIds, startTime, endTime, limit, offset, order, aggregation } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (tagIds && tagIds.length > 0) {
      conditions.push(`tag_id IN (${tagIds.map(() => '?').join(',')})`);
      params.push(...tagIds);
    }

    if (deviceIds && deviceIds.length > 0) {
      conditions.push(`device_id IN (${deviceIds.map(() => '?').join(',')})`);
      params.push(...deviceIds);
    }

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }

    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }

    let query =
      'SELECT tag_id, device_id, project_id, value, timestamp, quality, metadata FROM time_series_data';

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (aggregation) {
      const intervalSeconds = this.parseIntervalSeconds(aggregation.interval);
      if (intervalSeconds > 0) {
        // Time-series aggregation with partitioning
        query = `
          SELECT
            tag_id,
            device_id,
            project_id,
            ${aggregation.function}(value) as value,
            FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(timestamp) / ${intervalSeconds}) * ${intervalSeconds}) as timestamp,
            AVG(quality) as quality,
            NULL as metadata
          FROM time_series_data
          ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
          GROUP BY tag_id, device_id, project_id, FLOOR(UNIX_TIMESTAMP(timestamp) / ${intervalSeconds})
        `;
      } else {
        query = `
          SELECT
            tag_id,
            device_id,
            project_id,
            ${aggregation.function}(value) as value,
            MAX(timestamp) as timestamp,
            AVG(quality) as quality,
            NULL as metadata
          FROM time_series_data
          ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
          GROUP BY tag_id, device_id, project_id
        `;
      }
    }

    if (order) {
      query += ` ORDER BY timestamp ${order.toUpperCase()}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
      if (offset) {
        query += ` OFFSET ${offset}`;
      }
    }

    const conn = await this.pool!.getConnection();
    try {
      const rows = await conn.query(query, params);
      return this.mapRowsToDataPoints(rows);
    } catch (error) {
      this.logger.error(`MySQL read error: ${error.message}`);
      throw error;
    } finally {
      this.pool!.releaseConnection(conn);
    }
  }

  // ──────────── delete ────────────

  async delete(options: { tagIds?: string[]; before?: Date }): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.tagIds && options.tagIds.length > 0) {
      conditions.push(`tag_id IN (${options.tagIds.map(() => '?').join(',')})`);
      params.push(...options.tagIds);
    }

    if (options.before) {
      conditions.push('timestamp <= ?');
      params.push(options.before);
    }

    if (conditions.length === 0) {
      return 0;
    }

    const query = `DELETE FROM time_series_data WHERE ${conditions.join(' AND ')}`;

    const conn = await this.pool!.getConnection();
    try {
      const result = await conn.query(query, params);
      const deletedCount = result.affectedRows || 0;
      this.logger.log(`Deleted ${deletedCount} records from MySQL`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`MySQL delete error: ${error.message}`);
      throw error;
    } finally {
      this.pool!.releaseConnection(conn);
    }
  }

  // ──────────── health ────────────

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }> {
    const startTime = Date.now();

    try {
      const conn = await this.pool!.getConnection();
      const latency = Date.now() - startTime;

      const [rows] = await conn.query('SELECT 1 as ok');
      this.pool!.releaseConnection(conn);

      const isOk = rows && rows.length > 0;

      return {
        status: isOk ? 'healthy' : 'degraded',
        details: {
          latency,
          poolSize: this.connectionLimit,
          host: this.mysqlHost,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          latency,
          host: this.mysqlHost,
        },
      };
    }
  }

  // ──────────── close ────────────

  async close(): Promise<void> {
    this.isClosed = true;
    if (this.pool) {
      await this.pool.end();
    }
    this.logger.log('MysqlStorageAdapter closed');
  }

  // ──────────── Internal ────────────

  private createConnectionPool(): ConnectionPool {
    // Simulated connection pool (in production, use mysql2/promise)
    const connections: any[] = [];
    let connIndex = 0;

    const createConnection = async () => {
      const conn = {
        id: connIndex++,
        query: async (sql: string, _params?: any[]): Promise<any> => {
          this.logger.debug(`MySQL query: ${sql.substring(0, 100)}...`);
          // Simulated query execution
          return { rows: [], affectedRows: 0 };
        },
        release: () => {},
      };
      connections.push(conn);
      return conn;
    };

    return {
      getConnection: createConnection,
      releaseConnection: (conn: any) => {
        conn.release();
      },
      end: async () => {
        connections.length = 0;
      },
    };
  }

  private mapRowsToDataPoints(rows: any): DataPoint[] {
    const rowArray = Array.isArray(rows) ? rows : rows?.rows || [];
    return rowArray.map((row: any) => ({
      tagId: row.tag_id || row.tagId || '',
      deviceId: row.device_id || row.deviceId || '',
      projectId: row.project_id || row.projectId || '',
      value: this.parseValue(row.value),
      timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
      quality: parseInt(row.quality, 10) || 0,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : undefined,
    }));
  }

  private parseValue(value: any): number | string | boolean {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    const num = parseFloat(value);
    return isNaN(num) ? String(value) : num;
  }

  private parseIntervalSeconds(interval?: string): number {
    if (!interval) return 0;
    const map: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400,
    };
    return map[interval] || 0;
  }
}
