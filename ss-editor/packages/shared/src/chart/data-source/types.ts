// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ChartVariableBinding } from '../types';

/** 数据源加载状态 */
export type ChartDataSourceState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/**
 * 数据源取数结果的统一输出模型。
 * 三类数据源（static / api / database）取数后归一化为此结构，屏蔽来源差异。
 *
 * 约定：
 * - static / api / database(aggregate) 以 `source` 为主输出（配合 dimensions 引用列）；
 * - database(series / latest) 以 `series` 为主输出（时序 [time, value] 或单值）。
 */
export interface ChartDataResult {
  /** 维度（列名，与 ECharts dataset.dimensions 对齐） */
  dimensions: string[];
  /** 数据行（与 ECharts dataset.source 对齐） */
  source: Array<Record<string, unknown>>;
  /** 序列级数据（时序 / 最新值，供 series.data 直接使用） */
  series?: Array<{
    tagId: string;
    name: string;
    /** 时序：[time, value]；最新值：单元素 */
    data: Array<[number, number]> | Array<number>;
  }>;
  /** 加载状态 */
  state: ChartDataSourceState;
  /** 错误信息（state === 'error' 时） */
  error?: string;
}

/** 数据源类型：决定组件分类归属（static/api → chart；database → system） */
export type ChartDataSourceType = 'static' | 'api' | 'database';

/** 数据库数据源子模式 */
export type DatabaseSourceMode = 'series' | 'latest' | 'aggregate';

/**
 * 图表数据源抽象接口（生命周期）。
 * 数据源只负责「取数 + 归一化」，Graphic 只负责「读 ChartDataResult 拼 ECharts option」。
 */
export interface ChartDataSource {
  readonly type: ChartDataSourceType;

  /** 一次性取数（历史 / 静态 / API 首次加载） */
  load(): Promise<ChartDataResult>;

  /** 订阅实时（database 的 series/latest 模式；static/api 默认空实现） */
  subscribe(): void;

  /** 退订 + 清理资源 */
  unsubscribe(): void;

  /** 实时数据变更监听（WS 批量刷新 / 轮询触发），返回取消监听函数 */
  onChange(listener: (result: ChartDataResult) => void): () => void;
}

/** 静态数据源配置 */
export interface StaticSourceConfig {
  /** 维度定义 */
  dimensions: string[];
  /** 数据行（与 ECharts dataset.source 对齐） */
  source: Array<Record<string, unknown>>;
}

/** API 数据源响应 → dataset 字段映射 */
export interface ApiMappingConfig {
  /** 维度列名 */
  dimensions: string[];
  /** 分类 / 维度取值字段 */
  categoryField: string;
  /** 数值取值字段 */
  valueField: string;
}

/** API 数据源配置 */
export interface ApiSourceConfig {
  /** 请求地址 */
  url: string;
  /** 请求方法 */
  method: 'GET' | 'POST';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体（POST） */
  body?: Record<string, unknown>;
  /** 响应数据路径（如 'data.list'，支持点号取嵌套） */
  dataPath?: string;
  /** 轮询间隔（毫秒，0 表示不轮询） */
  pollingInterval?: number;
  /** 超时（毫秒） */
  timeout?: number;
  /** 失败重试次数 */
  retryCount?: number;
  /** 响应 → dataset 字段映射 */
  mapping: ApiMappingConfig;
}

/** 数据库（变量相关）数据源配置 */
export interface DatabaseSourceConfig {
  /** 数据模式 */
  mode: DatabaseSourceMode;
  /** 绑定的标签变量 */
  tags: ChartVariableBinding[];
  /** series 模式：时序查询参数 */
  seriesConfig?: {
    startTime?: string;
    endTime?: string;
    maxPoints?: number;
    /** 插值方式：原始 / 线性 / 阶梯 */
    interpolation?: 'raw' | 'linear' | 'step';
    /** 插值间隔（毫秒） */
    interval?: number;
    /** 是否订阅 WS 实时 */
    realtime?: boolean;
  };
  /** aggregate 模式：聚合参数 */
  aggregateConfig?: {
    function: 'avg' | 'max' | 'min' | 'sum' | 'count';
    interval?: string;
  };
}

/** 图表数据源统一配置（写入组件 customProps.dataSource） */
export interface ChartDataSourceConfig {
  /** 数据源类型（决定组件分类归属） */
  type: ChartDataSourceType;
  /** 静态数据源配置 */
  staticConfig?: StaticSourceConfig;
  /** API 数据源配置 */
  apiConfig?: ApiSourceConfig;
  /** 数据库（变量相关）数据源配置 */
  databaseConfig?: DatabaseSourceConfig;
}
