// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 数据查询相关类型定义
 * 与后端 ss-storage DataQueryController 对齐
 */

/** 历史数据查询参数 */
export interface HistoryQueryParams {
  /** 标签 ID 列表 */
  tagIds?: string[];
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 返回条数限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序方式 */
  order?: 'asc' | 'desc';
  /** 聚合配置 */
  aggregation?: {
    function: 'avg' | 'max' | 'min' | 'sum' | 'count';
    interval?: string;
  };
}

/** 数据点 */
export interface DataPoint {
  tagId: string;
  value: number | string | boolean | null;
  timestamp: string;
  quality?: string;
}

/** 聚合数据点 */
export interface AggregatedPoint {
  tagId: string;
  value: number;
  timestamp: string;
  count?: number;
}

/** 聚合查询参数 */
export interface AggregatedQueryParams {
  tagIds: string[];
  startTime: Date;
  endTime: Date;
  function: 'avg' | 'max' | 'min' | 'sum' | 'count';
  interval?: string;
}
