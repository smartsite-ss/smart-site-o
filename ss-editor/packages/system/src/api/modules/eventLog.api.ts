// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type {
  ApiResponse,
  EventLogItem,
  EventLogQueryParams,
} from '../types/api';

/**
 * 事件日志 API — 调用后端 /system/event-logs 接口
 *
 * 参考 system.api.ts 的 getOperationLogs 模式：
 * - 使用 client（axios 实例）发送 GET 请求
 * - 通过 params 传递查询参数
 * - 返回 ApiResponse<T> 格式
 */
export const eventLogApi = {
  /** 查询事件日志（分页，支持多维筛选） */
  getEventLogs(
    params?: EventLogQueryParams,
  ): Promise<ApiResponse<{ items: EventLogItem[]; total: number }>> {
    return client.get('/system/event-logs', { params }).then((res) => res.data);
  },

  /** 查询事件日志详情（含订阅者追踪记录和业务效果） */
  getEventLogDetail(id: string): Promise<ApiResponse<EventLogItem>> {
    return client.get(`/system/event-logs/${id}`).then((res) => res.data);
  },

  /** 查询失败/部分失败的事件（运维诊断，不分页） */
  getFailedEventLogs(
    params?: { projectId?: string; startTime?: string; endTime?: string },
  ): Promise<ApiResponse<EventLogItem[]>> {
    return client.get('/system/event-logs/failed', { params }).then((res) => res.data);
  },

  /** 清空所有事件日志（运维操作，不可恢复） */
  clearEventLogs(): Promise<ApiResponse<{ deleted: number }>> {
    return client.delete('/system/event-logs').then((res) => res.data);
  },
};
