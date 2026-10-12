// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { TrendSeriesStyle } from './types';

/** 默认色板（8 色），新增变量时按顺序循环分配 */
export const DEFAULT_TREND_COLORS = [
  '#4dabf7',
  '#51cf66',
  '#ff922b',
  '#f06595',
  '#845ef7',
  '#22b8cf',
  '#ffd43b',
  '#ff6b6b',
];

/** 依据主色构建默认趋势样式（对齐参考组件 LineCommon 默认项） */
export function createDefaultSeriesStyle(color: string): TrendSeriesStyle {
  return {
    lineStyle: { width: 3, type: 'solid', color },
    symbolSize: 5,
    label: { show: false, fontSize: 12, color: '#ffffff', position: 'top' },
    areaStyle: {
      show: true,
      colorStops: [
        { offset: 0, color },
        { offset: 0.5, color },
        { offset: 1, color },
      ],
      opacity: 0.3,
    },
  };
}
