// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IDataSourceDriver } from '../drivers/IDataSourceDriver';

/** 标签值变更回调 */
export type TagValueChangeHandler = (payload: {
  tagId: string;
  value: unknown;
  previousValue: unknown;
  quality: string;
  sourceId: string;
  timestamp: number;
}) => void;

export interface BindingInfo {
  graphicId: string;
  graphicName: string;
  graphicType: string;
  tagId: string;
  filterScript?: string;
  driverScript?: string;
  /** 图元属性路径，运行时 BindingManager.applyProperty 据此写入；缺省 'config.customProps.text' */
  propertyPath?: string;
}

export interface VariableInfo {
  tagId: string;
  tagName: string;
  dataSourceId: string;
  dataType: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  alarmHigh?: number;
  alarmHighHigh?: number;
  alarmLow?: number;
  alarmLowLow?: number;
  decimalPlaces?: number;
}

/**
 * SubscriptionManager — 数据订阅/取消/推送管理
 *
 * 职责：
 * - 管理图元绑定关系（graphicBindings）
 * - 管理变量元数据（variables）
 * - 管理标签值变更监听器（onTagValueChanged）
 * - 订阅/取消订阅标签数据
 * - 分发标签值变更通知
 */
export class SubscriptionManager {
  private _bindings: BindingInfo[] = [];
  private _variables: Map<string, VariableInfo> = new Map();
  private _tagChangeHandlers: TagValueChangeHandler[] = [];

  init(bindings: BindingInfo[], variables: VariableInfo[]): void {
    this._bindings = bindings.map((b) => ({ ...b }));
    this._variables.clear();
    for (const v of variables) {
      this._variables.set(v.tagId, v);
    }
  }

  getBindings(): BindingInfo[] {
    return [...this._bindings];
  }

  /** 按 tagId 检索所有相关绑定（供 DataPipelineBridge 执行 filter/driver 脚本） */
  getBindingsByTagId(tagId: string): BindingInfo[] {
    return this._bindings.filter((b) => b.tagId === tagId);
  }

  getVariableMeta(tagId: string): VariableInfo | undefined {
    return this._variables.get(tagId);
  }

  /**
   * 注册标签值变更监听器，返回取消注册函数。
   */
  onTagValueChanged(handler: TagValueChangeHandler): () => void {
    this._tagChangeHandlers.push(handler);
    return () => {
      const idx = this._tagChangeHandlers.indexOf(handler);
      if (idx >= 0) {
        this._tagChangeHandlers.splice(idx, 1);
      }
    };
  }

  /**
   * 向驱动订阅指定标签
   */
  subscribeToSource(driver: IDataSourceDriver | undefined, tagIds: string[]): void {
    if (driver) {
      driver.subscribe(tagIds);
    }
  }

  /**
   * 广播标签值变更给所有监听器。
   */
  notifyTagValueChanged(payload: {
    tagId: string;
    value: unknown;
    previousValue: unknown;
    quality: string;
    sourceId: string;
    timestamp: number;
  }): void {
    for (const handler of this._tagChangeHandlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error('[DataSourceManager] tagChangeHandler error:', err);
      }
    }
  }

  clear(): void {
    this._bindings = [];
    this._variables.clear();
    this._tagChangeHandlers = [];
  }
}