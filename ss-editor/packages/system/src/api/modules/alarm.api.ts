// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type {
  ApiResponse,
  AlarmRule,
  AlarmRecord,
  AlarmStatistics,
  AlarmTrend,
  AlarmTopRule,
  DeviceStats,
  TagStats,
  AlarmSuppressionRule,
  AlarmEscalationRule,
} from '../types/api';
import type {
  LevelStatistics,
  DeviceStatistics,
  TimeSeriesPoint,
  TrendAnalysis,
  TopAlarm,
  ResponseTimeStats,
  AlarmSummary,
} from '../types/alarm-statistics';

const buildUrl = (projectId: string, path: string) =>
  `/projects/${projectId}/alarms${path}`;

export const alarmApi = {
  // ────────── 项目级报警 API ──────────

  getRules(projectId: string): Promise<ApiResponse<AlarmRule[]>> {
    return client.get(buildUrl(projectId, '/rules')).then((res) => res.data);
  },

  getRecords(projectId: string, params?: { limit?: number; level?: string; status?: string; keyword?: string; startDate?: string; endDate?: string; alarmType?: string; dispositionType?: string; isActive?: boolean }): Promise<ApiResponse<AlarmRecord[]>> {
    return client.get(buildUrl(projectId, '/records'), { params }).then((res) => res.data);
  },

  batchAcknowledge(projectId: string, ids: string[]): Promise<ApiResponse<number>> {
    return client.post(buildUrl(projectId, '/records/batch-acknowledge'), { ids }).then((res) => res.data);
  },

  batchClear(projectId: string, ids: string[]): Promise<ApiResponse<number>> {
    return client.post(buildUrl(projectId, '/records/batch-clear'), { ids }).then((res) => res.data);
  },

  acknowledge(projectId: string, recordId: string): Promise<ApiResponse<AlarmRecord>> {
    return client.post(buildUrl(projectId, `/records/${recordId}/acknowledge`)).then((res) => res.data);
  },

  clear(projectId: string, recordId: string): Promise<ApiResponse<AlarmRecord>> {
    return client.post(buildUrl(projectId, `/records/${recordId}/clear`)).then((res) => res.data);
  },

  shelve(projectId: string, recordId: string, reason: string): Promise<ApiResponse<AlarmRecord>> {
    return client.post(buildUrl(projectId, `/records/${recordId}/shelve`), { reason }).then((res) => res.data);
  },

  getStatistics(projectId: string): Promise<ApiResponse<AlarmStatistics>> {
    return client.get(buildUrl(projectId, '/statistics')).then((res) => res.data);
  },

  getTrends(projectId: string, days = 7): Promise<ApiResponse<AlarmTrend[]>> {
    return client.get(buildUrl(projectId, '/trends'), { params: { days } }).then((res) => res.data);
  },

  getTopRules(projectId: string): Promise<ApiResponse<AlarmTopRule[]>> {
    return client.get(buildUrl(projectId, '/top-rules')).then((res) => res.data);
  },

  getStatsByDevice(projectId: string): Promise<ApiResponse<DeviceStats[]>> {
    return client.get(buildUrl(projectId, '/stats-by-device')).then((res) => res.data);
  },

  getStatsByTag(projectId: string): Promise<ApiResponse<TagStats[]>> {
    return client.get(buildUrl(projectId, '/stats-by-tag')).then((res) => res.data);
  },

  getSuppressionRules(projectId: string): Promise<ApiResponse<AlarmSuppressionRule[]>> {
    return client.get(buildUrl(projectId, '/suppression-rules')).then((res) => res.data);
  },

  addSuppressionRule(projectId: string, rule: Partial<AlarmSuppressionRule>): Promise<ApiResponse<AlarmSuppressionRule>> {
    return client.post(buildUrl(projectId, '/suppression-rules'), rule).then((res) => res.data);
  },

  getEscalationRules(projectId: string): Promise<ApiResponse<AlarmEscalationRule[]>> {
    return client.get(buildUrl(projectId, '/escalation-rules')).then((res) => res.data);
  },

  exportReport(projectId: string, format: 'csv' | 'json' = 'json'): Promise<any> {
    return client.get(buildUrl(projectId, '/export'), { params: { format }, responseType: 'blob' });
  },

  testNotificationChannel(type: 'sms' | 'tts', target: string): Promise<boolean> {
    return client
      .post('/system/notification-channels/test', { type, target })
      .then((res) => {
        const data = res.data;
        if (typeof data === 'boolean') return data;
        if (data && typeof data.data === 'boolean') return data.data;
        if (data && typeof data.success === 'boolean') return data.success;
        return !!data;
      })
      .catch(() => false);
  },

  // ────────── 全局级报警统计 API ──────────

  /** 按级别统计报警 */
  getByLevel(projectId?: string, startDate?: string, endDate?: string): Promise<LevelStatistics[]> {
    return client
      .get('/alarms/statistics/by-level', { params: { projectId, startDate, endDate } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 按设备统计报警 */
  getByDevice(deviceId: string, projectId?: string, startDate?: string, endDate?: string): Promise<DeviceStatistics> {
    return client
      .get(`/alarms/statistics/by-device/${deviceId}`, { params: { projectId, startDate, endDate } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 按时间统计报警时间序列 */
  getByTime(
    projectId?: string,
    startDate?: string,
    endDate?: string,
    interval?: 'hourly' | 'daily',
  ): Promise<TimeSeriesPoint[]> {
    return client
      .get('/alarms/statistics/by-time', { params: { projectId, startDate, endDate, interval } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 获取报警趋势分析 */
  getTrend(startDate: string, endDate: string, projectId?: string): Promise<TrendAnalysis> {
    return client
      .get('/alarms/statistics/trend', { params: { projectId, startDate, endDate } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 获取最频繁报警列表 */
  getTopAlarms(limit?: number, projectId?: string, startDate?: string, endDate?: string): Promise<TopAlarm[]> {
    return client
      .get('/alarms/statistics/top', { params: { projectId, limit, startDate, endDate } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 获取响应时间统计 */
  getResponseTime(projectId?: string, startDate?: string, endDate?: string): Promise<ResponseTimeStats> {
    return client
      .get('/alarms/statistics/response-time', { params: { projectId, startDate, endDate } })
      .then((res) => res.data?.data ?? res.data);
  },

  /** 获取报警综合汇总 */
  getSummary(projectId: string, startDate?: string, endDate?: string): Promise<AlarmSummary> {
    return client
      .get(`/alarms/statistics/summary/${projectId}`, { params: { startDate, endDate } })
      .then((res) => res.data?.data ?? res.data);
  },
};