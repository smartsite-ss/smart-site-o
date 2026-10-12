// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';
import type { OfflineCacheStats, OfflineCacheFlushResult } from '../types/offline-cache';

/**
 * 离线缓存 API
 *
 * 后端端点（由 OfflineCacheController 提供，全局前缀 /api/v1）：
 * - GET    /api/v1/pipeline/offline-cache/stats  — 获取缓存统计
 * - POST   /api/v1/pipeline/offline-cache/flush  — 刷新缓冲（发送到客户端）
 * - DELETE /api/v1/pipeline/offline-cache        — 清空缓冲
 */
export const offlineCacheApi = {
  /** 获取离线缓存统计 */
  getStats(): Promise<ApiResponse<OfflineCacheStats>> {
    return client.get('/pipeline/offline-cache/stats').then((res) => res.data);
  },

  /** 刷新缓冲（将缓存消息发送到客户端） */
  flush(maxBatch?: number): Promise<ApiResponse<OfflineCacheFlushResult>> {
    return client
      .post('/pipeline/offline-cache/flush', undefined, { params: { maxBatch } })
      .then((res) => res.data);
  },

  /** 清空缓冲 */
  clear(): Promise<ApiResponse<null>> {
    return client.delete('/pipeline/offline-cache').then((res) => res.data);
  },
};
