// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AbstractBaseDriver } from '../drivers/AbstractBaseDriver';
import type { DataSourceConfig, TagValue } from '../types/data-source.types';

interface StaticVariableEntry {
  tagId: string;
  tagName?: string;
  value: unknown;
  dataType?: string;
}

/**
 * StaticDataSource 配置的运行时形态。
 * 设计文档 StaticConfig 接口为 { value, dataType }，但编辑器 StaticSourceEditor 实际持久化的
 * 是 { jsonContent, variables: [{ tagId, tagName, value, dataType }] } 数组结构。
 * 此处兼容两种形态。
 */
interface StaticRuntimeConfig {
  /** 单值模式（StaticConfig.value） */
  value?: unknown;
  dataType?: string;
  /** 数组模式（编辑器实际持久化结构） */
  jsonContent?: string;
  variables?: StaticVariableEntry[];
}

export class StaticDataSourceDriver extends AbstractBaseDriver {
  private _values: Map<string, unknown> = new Map();

  async connect(config: DataSourceConfig | StaticRuntimeConfig): Promise<void> {
    this._rawConfig = config as DataSourceConfig;
    // 兼容两种 config 形态：
    // - 完整 DataSourceConfig: { type: 'static', config: { variables, ... } }
    // - 内层 config（运行时 DataSourceManager 传入）: { variables, ... }
    const innerConfig = this._extractInnerConfig(config);
    this._status = 'connected';
    // Phase 15.4.1: connect 时主动推送初始值，使 static 数据源值能经 EventBus 流入 BindingManager
    this._pushInitialValues(innerConfig);
  }

  async disconnect(): Promise<void> {
    this._rawConfig = null;
    this._status = 'disconnected';
  }

  /** StaticDataSource 支持写入（覆盖基类的默认抛错） */
  async write(tagId: string, value: unknown): Promise<void> {
    this._values.set(tagId, value);
  }

  setTagValue(tagId: string, value: unknown, quality: TagValue['quality'] = 'good'): void {
    this._values.set(tagId, value);
    const tagValue: TagValue = { tagId, value, quality, timestamp: Date.now(), sourceId: 'static' };
    this._notify([tagValue]);
  }

  setTagValues(values: Record<string, unknown>): void {
    const now = Date.now();
    const tagValues: TagValue[] = [];
    for (const [tagId, value] of Object.entries(values)) {
      this._values.set(tagId, value);
      tagValues.push({ tagId, value, quality: 'good', timestamp: now, sourceId: 'static' });
    }
    this._notify(tagValues);
  }

  /**
   * 提取内层配置，兼容两种形态：
   * - { type: 'static', config: { variables, ... } } → 返回 config 字段
   * - { variables, ... } → 直接返回
   */
  private _extractInnerConfig(config: DataSourceConfig | StaticRuntimeConfig): StaticRuntimeConfig {
    const maybeOuter = config as { type?: string; config?: StaticRuntimeConfig };
    if (maybeOuter.type === 'static' && maybeOuter.config) {
      return maybeOuter.config;
    }
    // 兜底：尝试 (config as any).config（与其他 driver 保持一致的提取方式）
    const nestedConfig = (config as { config?: StaticRuntimeConfig }).config;
    if (nestedConfig && (nestedConfig.variables || nestedConfig.value !== undefined)) {
      return nestedConfig;
    }
    return config as StaticRuntimeConfig;
  }

  /**
   * Phase 15.4.1: connect 时主动推送初始值。
   * - 数组模式：从 config.variables 读取 [{ tagId, value, ... }] 推送
   * - 单值模式：从 config.value 读取，tagId 用 subscribe 注册的第一个 tag（或 'static_value'）
   * - jsonContent 模式：尝试 JSON.parse(jsonContent) 后按数组模式处理
   */
  private _pushInitialValues(innerConfig: StaticRuntimeConfig): void {
    const entries = this._collectStaticEntries(innerConfig);
    if (entries.length === 0) return;
    const now = Date.now();
    const tagValues: TagValue[] = entries.map((entry) => {
      this._values.set(entry.tagId, entry.value);
      return {
        tagId: entry.tagId,
        value: entry.value,
        quality: 'good',
        timestamp: now,
        sourceId: 'static',
      };
    });
    this._notify(tagValues);
  }

  private _collectStaticEntries(innerConfig: StaticRuntimeConfig): StaticVariableEntry[] {
    // 优先使用 variables 数组
    if (Array.isArray(innerConfig.variables) && innerConfig.variables.length > 0) {
      return innerConfig.variables.filter((v) => v && typeof v.tagId === 'string');
    }
    // 兜底：从 jsonContent 解析
    if (innerConfig.jsonContent) {
      try {
        const parsed = JSON.parse(innerConfig.jsonContent);
        const vars = parsed?.variables ?? parsed;
        if (Array.isArray(vars)) {
          return vars
            .filter((v: any) => v && typeof v.tagId === 'string')
            .map((v: any) => ({
              tagId: v.tagId,
              tagName: v.tagName,
              value: v.value,
              dataType: v.dataType,
            }));
        }
        if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
          return Object.entries(vars as Record<string, any>).map(([key, value]) => ({
            tagId: key,
            tagName: key,
            value,
          }));
        }
      } catch {
        // JSON 解析失败，忽略
      }
    }
    // 单值模式：用订阅的第一个 tagId 或 'static_value' 作为 tagId
    if (innerConfig.value !== undefined) {
      const fallbackTagId = this._tags[0] || 'static_value';
      return [{ tagId: fallbackTagId, value: innerConfig.value, dataType: innerConfig.dataType }];
    }
    return [];
  }
}
