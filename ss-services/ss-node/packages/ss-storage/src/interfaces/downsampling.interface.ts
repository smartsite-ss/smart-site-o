// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 降采样功能注入 Token，用于可选注入 InfluxDB 适配器实例。
 * 当 InfluxDB 适配器在 DI 容器中注册时，DownsamplingService 可通过此 Token 获取它。
 */
export const INFLUXDB_ADAPTER = 'INFLUXDB_ADAPTER';

/**
 * 降采样聚合函数类型。
 * - mean: 平均值
 * - max: 最大值
 * - min: 最小值
 * - last: 最后一个值
 */
export type DownsamplingAggregation = 'mean' | 'max' | 'min' | 'last';

/**
 * 降采样粒度类型。
 * - 1h: 按小时聚合
 * - 1d: 按天聚合
 */
export type DownsamplingGranularity = '1h' | '1d';

/**
 * 单个降采样任务配置。
 */
export interface DownsamplingTask {
  /** 源 measurement 名称，例如 "tag_values" */
  measurement: string;
  /** 聚合窗口粒度，例如 '1h', '1d', '7d' */
  granularity: string;
  /** 聚合函数 */
  aggregation: DownsamplingAggregation;
  /** 目标 measurement 保留天数（0 表示永久保留） */
  retentionDays: number;
  /** 降采样结果写入的目标 measurement 名称，例如 "tag_values_1h" */
  targetMeasurement: string;
}

/**
 * 降采样整体配置。
 */
export interface DownsamplingConfig {
  /** 是否启用降采样 */
  enabled: boolean;
  /** 降采样任务列表 */
  tasks: DownsamplingTask[];
}

/**
 * 降采样执行结果。
 */
export interface DownsamplingResult {
  /** 源 measurement */
  measurement: string;
  /** 目标 measurement */
  targetMeasurement: string;
  /** 聚合粒度 */
  granularity: string;
  /** 处理的数据点数量 */
  processedCount: number;
  /** 写入的数据点数量 */
  writtenCount: number;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: string;
}
