// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ChartTagBinding, TrendSeriesStyle } from './types';
import { formatNumber } from './format';

/** 折线趋势图 ECharts option 组装输入 */
export interface TrendChartOptionInput {
  tags: ChartTagBinding[];
  /** 每个 tagId → 时间序列数据的取值函数 */
  getSeriesData: (tagId: string) => Array<[number, number]>;
  title: string;
  titleColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  gridColor: string;
  axisColor: string;
  showLegend: boolean;
  legendPosition: string;
  showTooltip: boolean;
  showDataZoom: boolean;
  showXAxis: boolean;
  xAxisLineColor: string;
  xAxisLabelFontSize: number;
  xAxisLabelRotate: number;
  /** 数值显示小数位数（默认 2） */
  decimalPlaces?: number;
}

/** 将每变量趋势样式转为 ECharts 折线 series 配置 */
function buildSeries(style: TrendSeriesStyle) {
  return {
    type: 'line' as const,
    showSymbol: style.symbolSize > 0,
    symbolSize: style.symbolSize,
    lineStyle: {
      width: style.lineStyle.width,
      type: style.lineStyle.type,
      color: style.lineStyle.color,
    },
    itemStyle: { color: style.lineStyle.color },
    label: {
      show: style.label.show,
      fontSize: style.label.fontSize,
      color: style.label.color,
      position: style.label.position,
    },
    areaStyle: style.areaStyle.show
      ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: style.areaStyle.colorStops,
          },
          opacity: style.areaStyle.opacity,
        }
      : undefined,
  };
}

/**
 * 组装折线时序图 ECharts option（title/tooltip/legend/grid/dataZoom/xAxis/yAxis/series）。
 * tag-trend 与 history-trend 复用，消除两份重复的 chartOption 逻辑。
 */
export function buildTrendChartOption(input: TrendChartOptionInput) {
  const {
    tags,
    getSeriesData,
    title,
    titleColor,
    titleFontSize,
    titleFontWeight,
    gridColor,
    axisColor,
    showLegend,
    legendPosition,
    showTooltip,
    showDataZoom,
    showXAxis,
    xAxisLineColor,
    xAxisLabelFontSize,
    xAxisLabelRotate,
    decimalPlaces,
  } = input;

  const series = tags.map((tag) => ({
    name: tag.tagName || tag.tagId,
    ...buildSeries(tag.style),
    data: getSeriesData(tag.tagId),
  }));

  const legendConfig = showLegend
    ? {
        show: true,
        data: tags.map((tag) => tag.tagName || tag.tagId),
        ...(legendPosition === 'bottom' ? { bottom: 0, left: 'center' as const } : {}),
        ...(legendPosition === 'top' ? { top: 0, left: 'center' as const } : {}),
        ...(legendPosition === 'left' ? { left: 0, orient: 'vertical' as const, top: 'middle' as const } : {}),
        ...(legendPosition === 'right' ? { right: 0, orient: 'vertical' as const, top: 'middle' as const } : {}),
      }
    : { show: false };

  const hasTitle = !!title;
  const topPadding = hasTitle ? 44 : 16;
  const dataZoomExtra = showDataZoom ? 24 : 0;
  const bottomPadding = (showLegend && legendPosition === 'bottom' ? 32 : 16) + dataZoomExtra;
  const leftPadding = showLegend && legendPosition === 'left' ? 90 : 52;

  return {
    backgroundColor: 'transparent',
    title: hasTitle
      ? {
          text: title,
          left: 'center',
          textStyle: {
            color: titleColor,
            fontSize: titleFontSize,
            fontWeight: titleFontWeight,
          },
        }
      : undefined,
    tooltip: showTooltip
      ? {
          trigger: 'axis',
          valueFormatter: (value: unknown) => formatNumber(value, decimalPlaces),
        }
      : { show: false },
    legend: legendConfig,
    grid: { left: leftPadding, right: 24, top: topPadding, bottom: bottomPadding },
    dataZoom: showDataZoom
      ? [
          { type: 'inside', xAxisIndex: 0 },
          { type: 'slider', xAxisIndex: 0, height: 18, bottom: 6 },
        ]
      : [],
    xAxis: {
      type: 'time',
      show: showXAxis !== false,
      axisLine: { show: showXAxis !== false, lineStyle: { color: xAxisLineColor || '#CED4DA' } },
      axisLabel: {
        color: axisColor,
        fontSize: Number(xAxisLabelFontSize) || 12,
        rotate: Number(xAxisLabelRotate) || 0,
      },
      splitLine: { show: showXAxis !== false, lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: axisColor,
        formatter: (value: number) => formatNumber(value, decimalPlaces),
      },
      splitLine: { lineStyle: { color: gridColor } },
    },
    series,
  };
}
