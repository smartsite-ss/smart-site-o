// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IDataSourceDriver } from './IDataSourceDriver';
import type { DataSourceConfig, DataSourceStatus, TagValue, TagMeta } from '../types/data-source.types';

/**
 * AbstractBaseDriver — 数据源驱动抽象基类
 *
 * 封装 5 个 driver 共有的样板逻辑：
 * - _callbacks 数组 + onData / offData / _notify 三件套
 * - _tags 集合 + subscribe / unsubscribe 默认实现
 * - _status 字段 + getStatus
 * - write() 默认抛 UnsupportedError
 * - getAvailableTags() 默认返回空数组
 * - 指数退避重试工具方法 _withRetry
 * - staleData 降级推送，统一质量码为 'stale'
 *
 * 子类只需实现：connect / disconnect / _fetchOnce（业务逻辑）
 */
export abstract class AbstractBaseDriver implements IDataSourceDriver {
  protected _status: DataSourceStatus = 'disconnected';
  protected _callbacks: Array<(values: TagValue[]) => void> = [];
  protected _tags: string[] = [];
  protected _staleData: TagValue[] | null = null;

  /** 子类共享的配置，connect 时由子类解析后写入 */
  protected _rawConfig: DataSourceConfig | null = null;

  /** 默认最大重试次数，子类可覆盖 */
  protected _maxRetries = 3;

  /** 当前重试计数（每次成功后归零） */
  protected _retryCount = 0;

  abstract connect(config: DataSourceConfig): Promise<void>;

  abstract disconnect(): Promise<void>;

  /** 默认订阅实现：合并去重；子类可覆盖以添加事件监听等副作用 */
  subscribe(tagIds: string[]): void {
    this._tags = [...new Set([...this._tags, ...tagIds])];
  }

  /** 默认取消订阅实现：差集过滤 */
  unsubscribe(tagIds: string[]): void {
    this._tags = this._tags.filter((t) => !tagIds.includes(t));
  }

  onData(callback: (values: TagValue[]) => void): void {
    this._callbacks.push(callback);
  }

  offData(callback: (values: TagValue[]) => void): void {
    this._callbacks = this._callbacks.filter((c) => c !== callback);
  }

  getStatus(): DataSourceStatus {
    return this._status;
  }

  /** 默认不支持写操作；StaticDataSource 等可写驱动覆盖此方法 */
  async write(_tagId: string, _value: unknown): Promise<void> {
    throw new Error(`${this.constructor.name} does not support write operations`);
  }

  getAvailableTags(): TagMeta[] {
    return [];
  }

  /**
   * 通知所有 onData 回调，每个回调独立 try/catch 避免单回调异常影响其他回调。
   */
  protected _notify(values: TagValue[]): void {
    for (const cb of this._callbacks) {
      try { cb(values); } catch { void 0; }
    }
  }

  /**
   * 推送 stale 降级数据。统一质量码为 'stale'，消除 HttpPolling/SqlQuery 之前的语义分歧。
   * @param fallbackQuality 可选，覆盖默认的 'stale'（用于保留 driver 特有语义）
   */
  protected _notifyStaleData(fallbackQuality: TagValue['quality'] = 'stale'): void {
    if (!this._staleData || this._staleData.length === 0) return;
    const now = Date.now();
    this._notify(this._staleData.map((v) => ({
      ...v,
      quality: fallbackQuality,
      timestamp: now,
    })));
  }

  /**
   * 指数退避重试工具方法。
   * - 退避公式：min(1000 * 2^(retry-1), 30000)
   * - 成功时 _retryCount 归零
   * - 超过 _maxRetries 时推送 stale 降级数据并抛出最后一次错误
   *
   * @param fn 待重试的异步操作
   * @param staleFallbackQuality 降级时使用的质量码
   */
  protected async _withRetry<T>(
    fn: () => Promise<T>,
    staleFallbackQuality: TagValue['quality'] = 'stale',
  ): Promise<T> {
    try {
      const result = await fn();
      this._retryCount = 0;
      return result;
    } catch (err: unknown) {
      this._retryCount++;
      this._status = 'error';

      if (this._retryCount <= this._maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this._retryCount - 1), 30000);
        await new Promise((r) => setTimeout(r, delay));
        return this._withRetry(fn, staleFallbackQuality);
      }

      // 超过最大重试次数，推送降级数据
      this._notifyStaleData(staleFallbackQuality);
      throw err;
    }
  }
}
