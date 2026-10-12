// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type { TrendSeriesStyle, ChartTagBinding, ChartVariableBinding, ChartContainerStyleInput } from './types';
export { DEFAULT_TREND_COLORS, createDefaultSeriesStyle } from './trend';
export { formatNumber } from './format';
export { registerChartModules } from './echarts';
export { buildContainerStyle } from './container';
export { buildTrendChartOption, type TrendChartOptionInput } from './option';

// 数据源抽象（static / api / database）
export * from './data-source';

// 分类图表 option 组装器（bar / pie / radar / gauge）
export {
  buildBarChartOption,
  buildPieChartOption,
  buildRadarChartOption,
  latestSeriesToCategoryResult,
  type CategoryChartOptionInput,
} from './option-categorical';
export { buildGaugeChartOption, type GaugeChartOptionInput } from './option-gauge';

// 数据源生命周期组合式函数（供 Vue SFC Graphic 复用）
export { useChartSource, type ChartSourceDeps } from './useChartSource';
