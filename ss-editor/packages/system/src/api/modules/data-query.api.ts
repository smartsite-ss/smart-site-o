// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { DataPoint, AggregatedPoint, HistoryQueryParams, AggregatedQueryParams } from '../types/data-query';

/**
 * 数据查询 API
 *
 * 后端端点（由 DataQueryController 提供，全局前缀 /api/v1）：
 * - GET /api/v1/data/history     — 查询历史数据
 * - GET /api/v1/data/latest      — 获取最新值
 * - GET /api/v1/data/aggregated  — 获取聚合数据
 * - GET /api/v1/data/all-latest  — 获取项目下所有最新值
 */
export const dataQueryApi = {
  /** 查询历史数据 */
  getHistory(params: HistoryQueryParams): Promise<DataPoint[]> {
    return client
      .get('/data/history', {
        params: {
          tagIds: params.tagIds?.join(','),
          startTime: params.startTime?.toISOString(),
          endTime: params.endTime?.toISOString(),
          limit: params.limit,
          offset: params.offset,
          order: params.order,
          aggFunction: params.aggregation?.function,
          aggInterval: params.aggregation?.interval,
        },
      })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 获取指定标签的最新值 */
  getLatest(tagIds: string[]): Promise<DataPoint[]> {
    return client
      .get('/data/latest', { params: { tagIds: tagIds.join(',') } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 获取聚合数据 */
  getAggregated(params: AggregatedQueryParams): Promise<AggregatedPoint[]> {
    return client
      .get('/data/aggregated', {
        params: {
          tagIds: params.tagIds.join(','),
          startTime: params.startTime.toISOString(),
          endTime: params.endTime.toISOString(),
          function: params.function,
          interval: params.interval,
        },
      })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 获取项目下所有标签的最新值 */
  getAllLatest(projectId: string): Promise<DataPoint[]> {
    return client
      .get('/data/all-latest', { params: { projectId } })
      .then((res) => res.data?.data ?? res.data);
  },

  /**
   * 趋势图查询（走 POST /data/trend/query，支持 LTTB 降采样 + 插值）
   */
  queryTrend(params: {
    tagIds: string[];
    startTime: string;
    endTime: string;
    maxPoints?: number;
    projectId?: string;
    /** 插值方式：raw | linear | step */
    interpolation?: string;
    /** 插值间隔（毫秒） */
    interval?: number;
  }): Promise<{ data: Array<{ tagId: string; data: Array<{ timestamp: string; value: number | null }> }>; pagination: { total: number } }> {
    return client
      .post('/data/trend/query', params)
      .then((res) => ({ data: res.data?.data, pagination: res.data?.pagination }));
  },
};
