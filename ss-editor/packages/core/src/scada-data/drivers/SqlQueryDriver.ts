// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AbstractBaseDriver } from './AbstractBaseDriver';
import type { DataSourceConfig, TagValue } from '../types/data-source.types';

export class SqlQueryDriver extends AbstractBaseDriver {
  private _config: Record<string, unknown> = {};
  private _timer: ReturnType<typeof setInterval> | null = null;

  async connect(config: DataSourceConfig): Promise<void> {
    this._rawConfig = config;
    if (config.type !== 'sql') {
      this._status = 'connected';
      this._config = (config as any).config || {};
      await this._executeQuery();
      this._startPolling();
      return;
    }
    this._config = (config as any).config || {};
    this._status = 'connecting';
    await this._executeQuery();
    this._startPolling();
  }

  async disconnect(): Promise<void> {
    this._stopPolling();
    this._config = {};
    this._rawConfig = null;
    this._status = 'disconnected';
    this._staleData = null;
  }

  private async _executeQuery(): Promise<void> {
    const now = Date.now();
    const query = this._config?.query as string;
    const tableName = this._config?.tableName as string;
    const columns = this._config?.columns as string[];

    try {
      let result: unknown[] = [];

      if (query) {
        result = await this._executeSqlQuery(query);
      } else if (tableName && columns) {
        result = await this._executeTableQuery(tableName, columns);
      }

      const values = this._parseResult(result, now);

      this._status = 'connected';
      this._retryCount = 0;
      if (values.length > 0) {
        this._staleData = values;
        this._notify(values);
      }
    } catch (err: unknown) {
      this._retryCount++;
      this._status = 'error';

      if (this._retryCount <= this._maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this._retryCount - 1), 30000);
        await new Promise((r) => setTimeout(r, delay));
        return this._executeQuery();
      }

      // 超过最大重试次数，推送 stale 降级数据（统一质量码 'stale'）
      this._notifyStaleData('stale');
      throw err;
    }
  }

  private async _executeSqlQuery(query: string): Promise<unknown[]> {
    const baseUrl = (this._config?.baseUrl as string) || '/api/datasource/query';
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: query }),
    });

    if (!response.ok) {
      throw new Error(`SQL query failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data?.rows ?? data?.data ?? []);
  }

  private async _executeTableQuery(tableName: string, columns: string[]): Promise<unknown[]> {
    const selectColumns = columns.length > 0 ? columns.join(', ') : '*';
    const query = `SELECT ${selectColumns} FROM ${tableName}`;
    return this._executeSqlQuery(query);
  }

  private _parseResult(result: unknown[], now: number): TagValue[] {
    const values: TagValue[] = [];

    for (const row of result) {
      if (row && typeof row === 'object') {
        const record = row as Record<string, unknown>;

        if (this._tags.length > 0) {
          for (const tagId of this._tags) {
            if (tagId in record) {
              values.push({
                tagId,
                value: record[tagId],
                quality: 'good',
                timestamp: now,
                sourceId: 'sql-query',
              });
            }
          }
        } else {
          for (const [key, val] of Object.entries(record)) {
            if (key.startsWith('_')) continue;
            values.push({
              tagId: key,
              value: val,
              quality: 'good',
              timestamp: now,
              sourceId: 'sql-query',
            });
          }
        }
      }
    }

    return values;
  }

  private _startPolling(): void {
    if (this._timer) return;
    const interval = (this._config?.interval as number) ?? 60000;
    this._timer = setInterval(() => {
      this._executeQuery().catch(() => { /* error handled in _executeQuery */ });
    }, interval);
  }

  private _stopPolling(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
