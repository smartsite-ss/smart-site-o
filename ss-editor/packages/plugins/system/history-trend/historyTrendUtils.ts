// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ChartTagBinding, TrendSeriesStyle } from '@scada-editor/shared';

// 类型与默认样式统一由 shared 图表基座提供，此处 re-export 以保持对外 API 兼容
export type { TrendSeriesStyle };
/** 单个绑定标签变量（统一含 projectId，对齐 ChartTagBinding） */
export type HistoryTrendTagBinding = ChartTagBinding;
export { DEFAULT_TREND_COLORS, createDefaultSeriesStyle } from '@scada-editor/shared';
