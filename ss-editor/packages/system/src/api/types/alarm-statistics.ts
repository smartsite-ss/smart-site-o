// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 报警统计相关类型定义
 * 与后端 ss-alarm AlarmStatisticsService 对齐
 */

/** 按级别统计 */
export interface LevelStatistics {
  level: string;
  count: number;
}

/** 按设备统计 */
export interface DeviceStatistics {
  deviceId: string;
  count: number;
}

/** 时间序列数据点 */
export interface TimeSeriesPoint {
  time: string;
  count: number;
}

/** 趋势分析 */
export interface TrendAnalysis {
  currentPeriod: { startDate: string; endDate: string; count: number };
  previousPeriod: { startDate: string; endDate: string; count: number };
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

/** 最频繁报警 */
export interface TopAlarm {
  ruleName: string;
  message: string;
  count: number;
  level: string;
}

/** 响应时间统计 */
export interface ResponseTimeStats {
  average: number;
  median: number;
  max: number;
  min: number;
  totalSamples: number;
}

/** 报警综合汇总 */
export interface AlarmSummary {
  projectId: string;
  totalAlarms: number;
  byLevel: Record<string, number>;
  byDevice: Record<string, number>;
  trend: TrendAnalysis;
}
