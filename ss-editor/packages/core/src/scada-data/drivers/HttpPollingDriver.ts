// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AbstractBaseDriver } from './AbstractBaseDriver';
import type { DataSourceConfig, TagValue } from '../types/data-source.types';

interface HttpPollingConfigExt {
  url: string;
  method?: 'GET' | 'POST';
  interval?: number;
  timeout?: number;
  retryCount?: number;
  responsePath?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export class HttpPollingDriver extends AbstractBaseDriver {
  private _config: HttpPollingConfigExt | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  async connect(config: DataSourceConfig): Promise<void> {
    this._rawConfig = config;
    // 标准配置形态为 { type, config: { url, method, ... } }，提取内层 config 作为解析源
    const extConfig = (config as any).config ?? config;
    this._config = this._parseConfig(extConfig);
    this._maxRetries = this._config.retryCount ?? 3;
    this._status = 'connecting';
    await this._poll();
    this._startPolling();
  }

  private _parseConfig(extConfig: any): HttpPollingConfigExt {
    return {
      url: extConfig?.url ?? extConfig?.connection?.url ?? '',
      method: extConfig?.method ?? extConfig?.connection?.method ?? 'GET',
      interval: extConfig?.interval ?? extConfig?.polling?.interval ?? 1000,
      timeout: extConfig?.timeout ?? extConfig?.connection?.timeout ?? 30000,
      retryCount: extConfig?.retryCount ?? extConfig?.connection?.retryCount ?? 3,
      responsePath: extConfig?.responsePath ?? extConfig?.fieldMapping?.dataPath ?? '',
      headers: extConfig?.headers ?? extConfig?.connection?.headers ?? {},
      body: extConfig?.body ?? extConfig?.connection?.body,
    };
  }

  async disconnect(): Promise<void> {
    this._stopPolling();
    this._config = null;
    this._rawConfig = null;
    this._status = 'disconnected';
    this._staleData = null;
  }

  private async _poll(): Promise<void> {
    if (!this._config) return;
    const { url, method = 'GET', timeout = 30000, responsePath, headers, body } = this._config;
    if (!url) {
      this._status = 'error';
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        signal: controller.signal,
      };
      if (method === 'POST' && body !== undefined) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const res = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      let data = await res.json();
      if (responsePath) {
        data = this._extractPath(data, responsePath);
      }
      const values = this._parseResponse(data);
      this._status = 'connected';
      this._retryCount = 0;
      if (values.length > 0) {
        this._staleData = values;
        this._notify(values);
      } else {
        this._notify([]);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      this._retryCount++;

      if (this._retryCount <= this._maxRetries) {
        this._status = 'error';
        const delay = Math.min(1000 * Math.pow(2, this._retryCount - 1), 30000);
        await new Promise((r) => setTimeout(r, delay));
        return this._poll();
      }

      this._status = 'error';
      // 失败时推送 stale 降级数据，统一使用 'stale' 质量码（与 SqlQueryDriver 保持一致）
      this._notifyStaleData(isAbort ? 'uncertain' : 'stale');
    }
  }

  private _startPolling(): void {
    if (this._timer) return;
    const interval = this._config?.interval ?? 1000;
    this._timer = setInterval(() => {
      this._poll().catch(() => { /* error handled in _poll */ });
    }, interval);
  }

  private _stopPolling(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private _extractPath(data: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: any = data;
    for (const p of parts) {
      if (current == null) return null;
      current = current[p];
    }
    return current;
  }

  private _parseResponse(data: unknown): TagValue[] {
    const now = Date.now();
    if (typeof data === 'object' && data !== null) {
      const values: TagValue[] = [];
      for (const [tagId, value] of Object.entries(data as Record<string, unknown>)) {
        if (this._tags.length === 0 || this._tags.includes(tagId)) {
          values.push({
            tagId,
            value,
            quality: 'good',
            timestamp: now,
            sourceId: 'http-polling',
          });
        }
      }
      return values;
    }
    return [];
  }
}
