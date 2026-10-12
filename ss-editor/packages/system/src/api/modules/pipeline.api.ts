// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';
import type {
  PipelineMetricsSnapshot,
  PipelineTimingBreakdown,
  StepTimingStats,
  ProtocolMetrics,
  ProtocolSummary,
} from '../types/pipeline';

/**
 * Pipeline 指标 API
 *
 * 后端端点（由 PipelineMetricsController 提供）：
 * - GET /api/v1/pipeline/metrics                    — Prometheus 文本格式
 * - GET /api/v1/pipeline/metrics/json               — JSON 格式快照（全局聚合）
 * - GET /api/v1/pipeline/metrics/percentiles        — P50/P95/P99 延迟统计
 * - GET /api/v1/pipeline/metrics/breakdowns         — 耗时分解（火焰图数据）
 * - GET /api/v1/pipeline/metrics/diagnostic         — 诊断信息
 * - GET /api/v1/pipeline/metrics/protocols          — 有指标数据的协议列表
 * - GET /api/v1/pipeline/metrics/protocol?protocol= — 按协议查询指标
 */
export const pipelineApi = {
  /** 获取 Prometheus 文本格式指标 */
  getPrometheusMetrics(): Promise<string> {
    return client
      .get('/pipeline/metrics', { responseType: 'text', transformResponse: (x) => x })
      .then((res) => res.data as string);
  },

  /** 获取 JSON 格式指标快照 */
  getJsonMetrics(): Promise<ApiResponse<PipelineMetricsSnapshot>> {
    return client.get('/pipeline/metrics/json').then((res) => res.data);
  },

  /** 获取各步骤耗时统计（P50/P95/P99） */
  getPercentiles(): Promise<ApiResponse<StepTimingStats[]>> {
    return client.get('/pipeline/metrics/percentiles').then((res) => res.data);
  },

  /** 获取最近 N 次 Pipeline 耗时分解（火焰图数据） */
  getBreakdowns(limit?: number): Promise<ApiResponse<PipelineTimingBreakdown[]>> {
    const params = limit !== undefined ? { limit } : undefined;
    return client.get('/pipeline/metrics/breakdowns', { params }).then((res) => res.data);
  },

  /**
   * 获取诊断信息（用于排查 Pipeline 指标无数据问题）。
   * 返回 orchestrator 内部状态、scheduler 任务列表、自动诊断结论。
   */
  getDiagnostic(): Promise<ApiResponse<any>> {
    return client.get('/pipeline/metrics/diagnostic').then((res) => res.data);
  },

  /** 获取有指标数据的协议列表 */
  getProtocols(): Promise<ApiResponse<ProtocolSummary[]>> {
    return client.get('/pipeline/metrics/protocols').then((res) => res.data);
  },

  /** 按协议获取指标详情 */
  getProtocolMetrics(protocol: string): Promise<ApiResponse<ProtocolMetrics>> {
    return client.get('/pipeline/metrics/protocol', { params: { protocol } }).then((res) => res.data);
  },
};
