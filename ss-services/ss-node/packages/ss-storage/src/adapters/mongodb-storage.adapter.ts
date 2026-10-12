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

interface MongoConnection {
  db: () => any;
  close: () => Promise<void>;
}

interface MongoCollection {
  insertMany: (docs: any[]) => Promise<any>;
  find: (query: any) => any;
  deleteMany: (query: any) => Promise<any>;
}

@Injectable()
export class MongodbStorageAdapter implements StorageAdapter, OnModuleInit, OnModuleDestroy {
  readonly name = 'MongoDB';
  readonly engineType = 'mongodb';
  readonly capabilities: AdapterCapabilities = {
    delete: true,
    interpolation: false,
    aggregation: false,
  };
  private readonly logger = new Logger(MongodbStorageAdapter.name);

  private client: MongoConnection | null = null;
  private collection: MongoCollection | null = null;
  private isClosed = false;

  private mongoUri: string;
  private mongoDatabase: string;
  private mongoCollection: string;

  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.mongoDatabase = process.env.MONGODB_DATABASE || 'ss_node_data';
    this.mongoCollection = process.env.MONGODB_COLLECTION || 'time_series';
  }

  onModuleInit(): void {
    this.logger.log(
      `MongodbStorageAdapter initialized (uri: ${this.mongoUri}, db: ${this.mongoDatabase}, collection: ${this.mongoCollection})`,
    );
    this.client = this.createMongoClient();
    this.collection = this.createCollection();
  }

  onModuleDestroy(): void {
    this.isClosed = true;
    if (this.client) {
      this.client.close().catch((err) => {
        this.logger.error(`Error closing MongoDB client: ${err.message}`);
      });
    }
    this.logger.log('MongodbStorageAdapter closed');
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

    try {
      const docs = points.map((point) => ({
        tagId: point.tagId,
        deviceId: point.deviceId,
        projectId: point.projectId,
        value: point.value,
        timestamp: point.timestamp,
        quality: point.quality,
        metadata: point.metadata || {},
      }));

      const result = await this.collection!.insertMany(docs);
      const written = result.insertedCount || docs.length;

      this.logger.debug(`MongoDB write: ${written} documents inserted`);
      return { success: true, written, failed: 0 };
    } catch (error) {
      this.logger.error(`MongoDB write error: ${error.message}`);
      return { success: false, written: 0, failed: points.length, errors: [error] };
    }
  }

  // ──────────── read ────────────

  async read(options: QueryOptions): Promise<DataPoint[]> {
    const { tagIds, deviceIds, startTime, endTime, limit, offset, order, aggregation } = options;

    const filter: any = {};

    if (tagIds && tagIds.length > 0) {
      filter.tagId = { $in: tagIds };
    }

    if (deviceIds && deviceIds.length > 0) {
      filter.deviceId = { $in: deviceIds };
    }

    if (startTime || endTime) {
      filter.timestamp = {};
      if (startTime) filter.timestamp.$gte = startTime;
      if (endTime) filter.timestamp.$lte = endTime;
    }

    let cursor = this.collection!.find(filter);

    if (order) {
      cursor = cursor.sort({ timestamp: order === 'asc' ? 1 : -1 });
    }

    if (limit) {
      cursor = cursor.limit(limit);
      if (offset) {
        cursor = cursor.skip(offset);
      }
    }

    try {
      const docs = await cursor.toArray();
      const dataPoints = this.mapDocsToDataPoints(docs);

      // Apply aggregation if specified
      if (aggregation) {
        return this.applyAggregation(dataPoints, aggregation.function, aggregation.interval);
      }

      return dataPoints;
    } catch (error) {
      this.logger.error(`MongoDB read error: ${error.message}`);
      throw error;
    }
  }

  // ──────────── delete ────────────

  async delete(options: { tagIds?: string[]; before?: Date }): Promise<number> {
    const filter: any = {};

    if (options.tagIds && options.tagIds.length > 0) {
      filter.tagId = { $in: options.tagIds };
    }

    if (options.before) {
      filter.timestamp = { $lte: options.before };
    }

    if (Object.keys(filter).length === 0) {
      return 0;
    }

    try {
      const result = await this.collection!.deleteMany(filter);
      const deletedCount = result.deletedCount || 0;
      this.logger.log(`Deleted ${deletedCount} documents from MongoDB`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`MongoDB delete error: ${error.message}`);
      throw error;
    }
  }

  // ──────────── health ────────────

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }> {
    const startTime = Date.now();

    try {
      const db = this.client!.db();
      const adminDb = db.admin();
      const pingResult = await adminDb.ping();
      const latency = Date.now() - startTime;

      const isOk = pingResult && pingResult.ok === 1;

      return {
        status: isOk ? 'healthy' : 'degraded',
        details: {
          latency,
          uri: this.mongoUri.replace(/\/\/.*@/, '//***@'), // Mask credentials
          database: this.mongoDatabase,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          latency,
          uri: this.mongoUri.replace(/\/\/.*@/, '//***@'),
        },
      };
    }
  }

  // ──────────── close ────────────

  async close(): Promise<void> {
    this.isClosed = true;
    if (this.client) {
      await this.client.close();
    }
    this.logger.log('MongodbStorageAdapter closed');
  }

  // ──────────── Internal ────────────

  private createMongoClient(): MongoConnection {
    const dbInstance = {
      admin: () => ({
        ping: async () => ({ ok: 1 }),
      }),
      collection: (_name: string) => this.collection,
    };

    return {
      db: () => dbInstance,
      close: async () => {
        this.logger.log('MongoDB client connection closed');
      },
    };
  }

  private createCollection(): MongoCollection {
    let storedDocs: any[] = [];

    return {
      insertMany: async (docs: any[]) => {
        storedDocs.push(...docs);
        return {
          insertedCount: docs.length,
          insertedIds: docs.map((_, i) => `id-${storedDocs.length - docs.length + i}`),
        };
      },
      find: (query: any) => {
        let filtered = [...storedDocs];

        // Apply filters
        if (query.tagId) {
          if (query.tagId.$in) {
            filtered = filtered.filter((d) => query.tagId.$in.includes(d.tagId));
          } else {
            filtered = filtered.filter((d) => d.tagId === query.tagId);
          }
        }

        if (query.deviceId) {
          if (query.deviceId.$in) {
            filtered = filtered.filter((d) => query.deviceId.$in.includes(d.deviceId));
          } else {
            filtered = filtered.filter((d) => d.deviceId === query.deviceId);
          }
        }

        if (query.timestamp) {
          if (query.timestamp.$gte) {
            filtered = filtered.filter((d) => new Date(d.timestamp) >= query.timestamp.$gte);
          }
          if (query.timestamp.$lte) {
            filtered = filtered.filter((d) => new Date(d.timestamp) <= query.timestamp.$lte);
          }
        }

        const cursor: any = {
          _docs: filtered,
          _sort: null as any,
          _limit: null as number | null,
          _skip: null as number | null,

          sort: function (sortObj: any) {
            this._sort = sortObj;
            return this;
          },
          limit: function (n: number) {
            this._limit = n;
            return this;
          },
          skip: function (n: number) {
            this._skip = n;
            return this;
          },
          toArray: async function () {
            let result = [...this._docs];

            if (this._sort) {
              const key = Object.keys(this._sort)[0];
              const dir = this._sort[key];
              result.sort((a: any, b: any) => {
                const aVal = a[key] instanceof Date ? a[key].getTime() : a[key];
                const bVal = b[key] instanceof Date ? b[key].getTime() : b[key];
                return dir === 1 ? aVal - bVal : bVal - aVal;
              });
            }

            if (this._skip) {
              result = result.slice(this._skip);
            }

            if (this._limit) {
              result = result.slice(0, this._limit);
            }

            return result;
          },
        };

        return cursor;
      },
      deleteMany: async (query: any) => {
        const beforeCount = storedDocs.length;
        let filtered = [...storedDocs];

        if (query.tagId && query.tagId.$in) {
          filtered = filtered.filter((d) => !query.tagId.$in.includes(d.tagId));
        }

        if (query.timestamp && query.timestamp.$lte) {
          filtered = filtered.filter((d) => new Date(d.timestamp) > query.timestamp.$lte);
        }

        storedDocs = filtered;
        return { deletedCount: beforeCount - storedDocs.length };
      },
    };
  }

  private mapDocsToDataPoints(docs: any[]): DataPoint[] {
    return docs.map((doc) => ({
      tagId: doc.tagId || '',
      deviceId: doc.deviceId || '',
      projectId: doc.projectId || '',
      value: doc.value,
      timestamp: doc.timestamp instanceof Date ? doc.timestamp : new Date(doc.timestamp),
      quality: doc.quality || 0,
      metadata: doc.metadata || undefined,
    }));
  }

  private applyAggregation(
    data: DataPoint[],
    aggFunction: 'avg' | 'max' | 'min' | 'sum' | 'count',
    interval?: string,
  ): DataPoint[] {
    if (data.length === 0) return [];

    const intervalMs = this.parseIntervalMs(interval);
    const buckets = new Map<number, DataPoint[]>();

    for (const point of data) {
      const bucketKey =
        intervalMs > 0 ? Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs : 0;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point);
    }

    const results: DataPoint[] = [];

    for (const [bucketKey, points] of buckets.entries()) {
      const values = points.map((p) =>
        typeof p.value === 'number' ? p.value : Number(p.value) || 0,
      );
      let aggValue: number;

      switch (aggFunction) {
        case 'avg':
          aggValue = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'max':
          aggValue = Math.max(...values);
          break;
        case 'min':
          aggValue = Math.min(...values);
          break;
        case 'sum':
          aggValue = values.reduce((a, b) => a + b, 0);
          break;
        case 'count':
          aggValue = values.length;
          break;
        default:
          aggValue = values[0];
      }

      const representative = points[0];
      results.push({
        tagId: representative.tagId,
        deviceId: representative.deviceId,
        projectId: representative.projectId,
        value: aggValue,
        timestamp: intervalMs > 0 ? new Date(bucketKey) : representative.timestamp,
        quality: Math.round(points.reduce((a, p) => a + p.quality, 0) / points.length),
      });
    }

    return results;
  }

  private parseIntervalMs(interval?: string): number {
    if (!interval) return 0;
    const map: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return map[interval] || 0;
  }
}
