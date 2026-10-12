// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AbstractBaseDriver } from '../drivers/AbstractBaseDriver';
import type { DataSourceConfig, TagValue, ExpressionConfig } from '../types/data-source.types';
import { ScriptEngine } from './ScriptEngine';

interface EventBusLike {
  on(eventType: string, callback: (event: { type: string; timestamp: number; payload: unknown }) => void): string;
  offById(listenerId: string): void;
}

export class ExpressionDataSourceDriver extends AbstractBaseDriver {
  private _config: ExpressionConfig | null = null;
  private _tagId: string = '';
  private _listenerIds: string[] = [];
  private _eventBus: EventBusLike;

  constructor(eventBus?: EventBusLike) {
    super();
    this._eventBus = eventBus!;
  }

  setEventBus(eventBus: EventBusLike): void {
    this._eventBus = eventBus;
  }

  async connect(config: DataSourceConfig): Promise<void> {
    this._rawConfig = config;
    if (config.type !== 'expression') throw new Error('ExpressionDataSourceDriver only supports expression type');
    this._config = (config as unknown) as ExpressionConfig;
    this._status = 'connected';
  }

  async disconnect(): Promise<void> {
    this._clearListeners();
    this._rawConfig = null;
    this._status = 'disconnected';
  }

  /** 覆盖基类订阅：除记录 tagId 外，还为每个依赖注册 EventBus 监听 */
  subscribe(tagIds: string[]): void {
    super.subscribe(tagIds);
    if (tagIds.length > 0 && this._eventBus) {
      this._tagId = tagIds[0];
      const deps = this._config?.dependencies ?? [];
      for (const depTagId of deps) {
        const listenerId = this._eventBus.on('tagValueChanged', (event) => {
          const p = event.payload as { tagId: string };
          if (p.tagId === depTagId) { this._evaluate(); }
        });
        this._listenerIds.push(listenerId);
      }
      this._evaluate();
    }
  }

  /** 覆盖基类取消订阅：同时清理 EventBus 监听 */
  unsubscribe(tagIds: string[]): void {
    super.unsubscribe(tagIds);
    this._clearListeners();
  }

  private _clearListeners(): void {
    if (this._listenerIds.length > 0 && this._eventBus) {
      for (const id of this._listenerIds) {
        this._eventBus.offById(id);
      }
      this._listenerIds = [];
    }
  }

  private _evaluate(): void {
    if (!this._config || !this._tagId) return;
    // 统一走 ScriptEngine.evaluateExpression，启用沙箱隔离（拦截 BLOCKED_GLOBALS + 步数限制）
    const result = ScriptEngine.getInstance().evaluateExpression(this._config.expression, undefined);
    const tagValue: TagValue = {
      tagId: this._tagId, value: result, quality: 'good',
      timestamp: Date.now(), sourceId: 'expression',
    };
    this._notify([tagValue]);
  }
}
