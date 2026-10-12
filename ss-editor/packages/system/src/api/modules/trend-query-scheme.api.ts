// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';

/** 趋势查询方案 */
export interface TrendQueryScheme {
  id: string;
  name: string;
  projectId: string;
  deviceId: string;
  tagIds: string;
  startTime: string | null;
  endTime: string | null;
  interpolationMode: string;
  interpolationInterval: number;
  presetRange: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface CreateTrendQuerySchemeDto {
  name: string;
  projectId: string;
  deviceId: string;
  tagIds: string[];
  startTime?: string;
  endTime?: string;
  interpolationMode?: string;
  interpolationInterval?: number;
  presetRange?: string;
}

export const trendQuerySchemeApi = {
  /** 获取项目下的所有查询方案 */
  list(projectId: string): Promise<TrendQueryScheme[]> {
    return client
      .get('/trend-query-schemes', { params: { projectId } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 创建查询方案 */
  create(dto: CreateTrendQuerySchemeDto): Promise<TrendQueryScheme> {
    return client
      .post('/trend-query-schemes', dto)
      .then((res) => res.data?.data ?? res.data);
  },

  /** 更新查询方案 */
  update(id: string, dto: Partial<CreateTrendQuerySchemeDto>): Promise<TrendQueryScheme> {
    return client
      .patch(`/trend-query-schemes/${id}`, dto)
      .then((res) => res.data?.data ?? res.data);
  },

  /** 删除查询方案 */
  delete(id: string): Promise<{ success: boolean }> {
    return client
      .delete(`/trend-query-schemes/${id}`)
      .then((res) => res.data?.data ?? res.data);
  },
};