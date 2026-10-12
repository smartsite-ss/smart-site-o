// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, PaginatedApiResponse, DataTag } from '../types/api';

export interface TagSearchParams {
  q?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface TagBatchValuesRequest {
  tagIds: string[];
}

export interface TagValueResult {
  value: any;
  quality: string;
  timestamp: number;
}

const buildUrl = (projectId: string, path: string) =>
  `/projects/${projectId}/datatags${path}`;

export const datatagApi = {
  search(
    projectId: string,
    params: TagSearchParams = {},
  ): Promise<PaginatedApiResponse<DataTag>> {
    return client
      .get(buildUrl(projectId, '/search'), { params })
      .then((res) => res.data);
  },

  batchGetLatest(
    projectId: string,
    tagIds: string[],
  ): Promise<ApiResponse<Record<string, TagValueResult>>> {
    return client
      .post(buildUrl(projectId, '/batch/values'), { tagIds })
      .then((res) => res.data);
  },
};