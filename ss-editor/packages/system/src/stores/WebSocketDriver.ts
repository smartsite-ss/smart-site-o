// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { TagValue, TagMeta } from '@scada-editor/core';
import { useWsStore } from './ws.store';
import type { TagValueEntry } from './ws.store';

export type DataSourceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * WebSocketDriver — 基于 wsStore 的数据源驱动
 *
 * 已从 ws.store.ts 拆分到独立文件，职责：
 * 1. 通过 wsStore.onFlushed 注册增量数据回调，避免 $subscribe 全量触发
 * 2. 仅回调与当前 _tags 匹配的条目，输出符合 IDataSourceDriver.onData 的 TagValue[]
 * 3. 支持 write 操作（通过 wsStore.safeEmit 发送 write:tag 事件）
 *
 * 注意：本类不持有 WebSocket 连接，连接由 wsStore 管理；
 * 本类仅作为 DataSourceManager 的 driver 适配器，将 wsStore 的数据流转换为 driver 协议。
 */
export class WebSocketDriver {
  private _status: DataSourceStatus = 'disconnected';
  private _callbacks: Array<(values: TagValue[]) => void> = [];
  private _tags: string[] = [];
  /** 注册到 wsStore 的 onFlushed 回调注销句柄 */
  private _unregisterFlushed: (() => void) | null = null;

  getStatus(): DataSourceStatus {
    return this._status;
  }

  async connect(config?: unknown): Promise<void> {
    this._status = 'connecting';

    const wsStore = useWsStore();
    const cfg = config as Record<string, unknown> | undefined;

    const projectId = (cfg?.projectId as string) ?? wsStore.subscribedProjectId ?? '';
    const deviceId = (cfg?.deviceId as string);

    if (!projectId) {
      this._status = 'error';
      throw new Error('WebSocketDriver: projectId is required');
    }

    // 通过 onFlushed 注册增量回调，避免 $subscribe 全量触发
    if (this._unregisterFlushed) {
      this._unregisterFlushed();
      this._unregisterFlushed = null;
    }
    this._unregisterFlushed = wsStore.onFlushed((flushedEntries: Map<string, TagValueEntry>) => {
      this._onFlushed(flushedEntries);
    });

    await wsStore.connect(projectId);

    // wsStore.connect 在无 token 时直接 resolve 且未实际连接，必须校验收敛状态
    if (!wsStore.isConnected) {
      // 无 token（未登录）是预期状态，不是错误 —— 设为 disconnected，不抛异常
      // wsStore.error 此时已包含用户友好消息（如 "未登录，无法连接 WebSocket"）
      // DataSourceManager 将通过 getStatus() 读取此状态，在面板中显示"已断开"而非"错误"
      this._status = 'disconnected';
      return Promise.resolve();
    }

    if (deviceId) {
      wsStore.subscribeDevice(deviceId);
    }

    if (this._tags.length > 0) {
      wsStore.subscribeTags(this._tags);
    }

    this._status = 'connected';
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    if (this._unregisterFlushed) {
      this._unregisterFlushed();
      this._unregisterFlushed = null;
    }
    this._status = 'disconnected';
    return Promise.resolve();
  }

  subscribe(tagIds: string[]): void {
    this._tags = [...new Set([...this._tags, ...tagIds])];
    const wsStore = useWsStore();
    if (wsStore.isConnected) {
      wsStore.subscribeTags(tagIds);
    }
  }

  unsubscribe(tagIds: string[]): void {
    this._tags = this._tags.filter((t) => !tagIds.includes(t));
    const wsStore = useWsStore();
    wsStore.unsubscribeTags(tagIds);
  }

  onData(callback: (values: TagValue[]) => void): void {
    this._callbacks.push(callback);
  }

  offData(callback: (values: TagValue[]) => void): void {
    this._callbacks = this._callbacks.filter((c) => c !== callback);
  }

  async write(tagId: string, value: unknown): Promise<void> {
    const wsStore = useWsStore();
    wsStore.safeEmit('write:tag', { tagId, value });
    wsStore.updateTagValue(tagId, value);
    return Promise.resolve();
  }

  getAvailableTags(): TagMeta[] {
    return [];
  }

  /**
   * 处理 wsStore 推送的增量数据（仅本次 flush 的变更条目）。
   * 仅回调与当前 _tags 匹配的条目，避免重复推送未变化的值。
   * 输出符合 IDataSourceDriver.onData 的 TagValue[] 类型，sourceId 占位由 DataSourceManager 覆盖。
   */
  private _onFlushed(flushedEntries: Map<string, TagValueEntry>): void {
    // _tags 为空表示尚未订阅任何 tag，无需回调
    if (this._tags.length === 0 || flushedEntries.size === 0) return;

    const changed: TagValue[] = [];
    for (const tagId of this._tags) {
      const val = flushedEntries.get(tagId);
      if (val) {
        changed.push({
          tagId: val.tagId,
          value: val.value,
          quality: val.quality,
          timestamp: val.timestamp,
          // sourceId 由 DataSourceManager._onDataReceived 中的 TagCache.processReceivedData 覆盖
          sourceId: 'websocket',
        });
      }
    }

    if (changed.length === 0) return;

    for (const cb of this._callbacks) {
      try { cb(changed); } catch { void 0; }
    }
  }
}
