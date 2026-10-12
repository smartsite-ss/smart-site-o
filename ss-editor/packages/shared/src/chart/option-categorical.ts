// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ChartDataResult } from './data-source';
import { formatNumber } from './format';

/**
 * 将 database(latest) 的 series 单值结果归一化为分类图表（bar/pie/radar）可消费的 source 结构。
 * 每个绑定变量 → 一行 `{ name, value }`。
 */
export function latestSeriesToCategoryResult(result: ChartDataResult): ChartDataResult {
  const series = result.series ?? [];
  return {
    dimensions: ['name', 'value'],
    source: series.map((item) => ({
      name: item.name,
      value: Array.isArray(item.data) ? Number(item.data[0] ?? 0) : 0,
    })),
    state: result.state,
    error: result.error,
  };
}

/** 分类图表公共外观配置（标题 / 图例 / 提示框 / 网格与坐标轴颜色） */
export interface CategoryChartOptionInput {
  result: ChartDataResult;
  title: string;
  titleColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  gridColor: string;
  axisColor: string;
  showLegend: boolean;
  legendPosition: string;
  showTooltip: boolean;
  /** 柱/饼/雷达主色板 */
  palette: string[];
  /** 数值显示小数位数（默认 2） */
  decimalPlaces?: number;
}

function buildTitle(input: CategoryChartOptionInput) {
  if (!input.title) return undefined;
  return {
    text: input.title,
    left: 'center',
    textStyle: {
      color: input.titleColor,
      fontSize: input.titleFontSize,
      fontWeight: input.titleFontWeight,
    },
  };
}

function buildLegend(input: CategoryChartOptionInput, data: string[]) {
  if (!input.showLegend) return { show: false };
  const base: Record<string, unknown> = { show: true, data };
  if (input.legendPosition === 'bottom') return { ...base, bottom: 0, left: 'center' };
  if (input.legendPosition === 'top') return { ...base, top: 0, left: 'center' };
  if (input.legendPosition === 'left') return { ...base, left: 0, orient: 'vertical', top: 'middle' };
  if (input.legendPosition === 'right') return { ...base, right: 0, orient: 'vertical', top: 'middle' };
  return { ...base, bottom: 0, left: 'center' };
}

/** 取分类维度字段名（默认 'name'） */
function categoryField(result: ChartDataResult): string {
  return result.dimensions?.[0] ?? 'name';
}

/** 取数值维度字段名列表（默认 ['value']） */
function valueFields(result: ChartDataResult): string[] {
  const fields = result.dimensions?.slice(1) ?? [];
  return fields.length > 0 ? fields : ['value'];
}

/** 取分类取值（按字段名，缺省回退 'name'） */
function categoryValue(row: Record<string, unknown>, field: string, index: number): string {
  const value = row[field] ?? row.name ?? `分类${index + 1}`;
  return String(value);
}

/** 柱状图 ECharts option（支持多数值字段 → 多系列；horizontal 切换横向） */
export function buildBarChartOption(input: CategoryChartOptionInput & { horizontal?: boolean }): Record<string, unknown> {
  const { result, horizontal } = input;
  const categories = result.source.map((row, i) => categoryValue(row, categoryField(result), i));
  const fields = valueFields(result);

  const series = fields.map((field, fieldIndex) => ({
    name: field,
    type: 'bar' as const,
    barMaxWidth: 48,
    itemStyle: { color: input.palette[fieldIndex % input.palette.length] },
    data: result.source.map((row) => Number(row[field] ?? 0)),
  }));

  const legendData = input.showLegend ? fields : [];
  const hasTitle = !!input.title;
  const grid = {
    left: input.showLegend && input.legendPosition === 'left' ? 90 : 48,
    right: 24,
    top: hasTitle ? 44 : 16,
    bottom: input.showLegend && input.legendPosition === 'bottom' ? 32 : 16,
    containLabel: true,
  };

  const categoryAxis = {
    type: 'category' as const,
    data: categories,
    axisLabel: { color: input.axisColor },
    axisLine: { lineStyle: { color: input.gridColor } },
    splitLine: { show: false },
  };
  const valueAxis = {
    type: 'value' as const,
    axisLabel: {
      color: input.axisColor,
      formatter: (value: number) => formatNumber(value, input.decimalPlaces),
    },
    splitLine: { lineStyle: { color: input.gridColor } },
  };

  return {
    backgroundColor: 'transparent',
    title: buildTitle(input),
    tooltip: input.showTooltip
      ? {
          trigger: 'axis',
          valueFormatter: (value: unknown) => formatNumber(value, input.decimalPlaces),
        }
      : { show: false },
    legend: buildLegend(input, legendData),
    grid,
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series,
  };
}

/** 饼图 ECharts option（category 列 → name，value 列 → value） */
export function buildPieChartOption(
  input: CategoryChartOptionInput & { donut?: boolean; labelFontSize?: number; labelColor?: string },
): Record<string, unknown> {
  const { result, donut } = input;
  const catField = categoryField(result);
  const valField = valueFields(result)[0];

  const data = result.source.map((row, i) => ({
    name: categoryValue(row, catField, i),
    value: Number(row[valField] ?? 0),
  }));

  return {
    backgroundColor: 'transparent',
    title: buildTitle(input),
    tooltip: input.showTooltip
      ? {
          trigger: 'item',
          valueFormatter: (value: unknown) => formatNumber(value, input.decimalPlaces),
        }
      : { show: false },
    legend: buildLegend(input, data.map((d) => d.name)),
    series: [
      {
        type: 'pie',
        radius: donut ? ['42%', '68%'] : '68%',
        center: ['50%', '54%'],
        color: input.palette,
        label: {
          fontSize: input.labelFontSize ?? 12,
          color: input.labelColor ?? '#666666',
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        data,
      },
    ],
  };
}

/** 雷达图 ECharts option（每个维度一个指标，取单行数值） */
export function buildRadarChartOption(
  input: CategoryChartOptionInput & { indicatorMax?: number },
): Record<string, unknown> {
  const { result } = input;
  const catField = categoryField(result);
  const valField = valueFields(result)[0];

  const row = result.source[0] ?? {};
  const names = result.source.map((r, i) => categoryValue(r, catField, i));
  const values = result.source.map((r) => Number(r[valField] ?? 0));

  // 指标最大值：优先显式配置，否则取数据最大值的 1.2 倍（至少为 1）
  const maxValue = Math.max(1, ...values);
  const indicatorMax = input.indicatorMax && input.indicatorMax > 0 ? input.indicatorMax : Math.ceil(maxValue * 1.2);

  return {
    backgroundColor: 'transparent',
    title: buildTitle(input),
    tooltip: input.showTooltip
      ? {
          trigger: 'item',
          formatter: () =>
            names
              .map((name, index) => `${name}: ${formatNumber(values[index], input.decimalPlaces)}`)
              .join('<br/>'),
        }
      : { show: false },
    legend: buildLegend(input, [input.title || '数据']),
    radar: {
      indicator: names.map((name) => ({ name, max: indicatorMax })),
      axisName: { color: input.axisColor },
      splitLine: { lineStyle: { color: input.gridColor } },
      splitArea: { areaStyle: { color: ['transparent'] } },
    },
    series: [
      {
        type: 'radar',
        data: [{ value: values, name: input.title || '数据' }],
        symbolSize: 4,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.25 },
        itemStyle: { color: input.palette[0] },
      },
    ],
  };
}
