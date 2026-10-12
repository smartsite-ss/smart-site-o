// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { formatNumber } from './format';

/** 表盘（gauge）ECharts option 组装输入 */
export interface GaugeChartOptionInput {
  value: number;
  minValue: number;
  maxValue: number;
  unit: string;
  /** 数值显示小数位数（默认 2） */
  decimalPlaces?: number;
  title: string;
  titleColor: string;
  titleFontSize: number;
  startAngle: number;
  endAngle: number;
  labelColor: string;
  valueColor: string;
  needleColor: string;
  tickColor: string;
  normalColor: string;
  warningColor: string;
  dangerColor: string;
  showTicks: boolean;
  showLabels: boolean;
  showValue: boolean;
  majorTicks: number;
  warningValue: number;
  dangerValue: number;
}

/** 将数值归一化到 0~1（按 min/max 夹取） */
function clampRatio(value: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(1, (value - min) / range));
}

/** 表盘 ECharts option（复用 gauge 系列，替代现有 Canvas 手绘实现） */
export function buildGaugeChartOption(input: GaugeChartOptionInput): Record<string, unknown> {
  const min = Number(input.minValue);
  const max = Number(input.maxValue);
  const range = max - min;

  const warningRatio = clampRatio(Number(input.warningValue), min, max);
  const dangerRatio = clampRatio(Number(input.dangerValue), min, max);

  const axisLineColor: Array<[number, string]> = [
    [0, input.normalColor],
  ];
  if (range > 0 && Number(input.warningValue) < max) {
    axisLineColor.push([warningRatio, input.warningColor]);
  }
  if (range > 0 && Number(input.dangerValue) < max) {
    axisLineColor.push([dangerRatio, input.dangerColor]);
  }
  axisLineColor.push([1, input.dangerColor]);

  const detailFormatter = input.showValue
    ? (value: number) => {
        const formatted = formatNumber(value, input.decimalPlaces);
        return input.unit ? `${formatted} ${input.unit}` : formatted;
      }
    : undefined;

  return {
    backgroundColor: 'transparent',
    title: input.title
      ? {
          text: input.title,
          left: 'center',
          textStyle: { color: input.titleColor, fontSize: input.titleFontSize },
        }
      : undefined,
    series: [
      {
        type: 'gauge',
        startAngle: Number(input.startAngle),
        endAngle: Number(input.endAngle),
        min,
        max,
        center: ['50%', '58%'],
        radius: '90%',
        axisLine: {
          lineStyle: { width: 14, color: axisLineColor },
        },
        splitLine: {
          show: input.showTicks,
          length: 12,
          distance: -16,
          lineStyle: { color: input.tickColor, width: 1 },
        },
        axisTick: {
          show: input.showTicks,
          splitNumber: Number(input.majorTicks) || 10,
          distance: -16,
          lineStyle: { color: input.tickColor, width: 1 },
        },
        axisLabel: {
          show: input.showLabels,
          distance: 18,
          color: input.labelColor,
          fontSize: 11,
          formatter: (value: number) => formatNumber(value, input.decimalPlaces),
        },
        pointer: {
          itemStyle: { color: input.needleColor },
        },
        detail: {
          valueAnimation: true,
          formatter: detailFormatter,
          color: input.valueColor,
          fontSize: 22,
          offsetCenter: [0, '62%'],
          rich: {
            unit: { fontSize: 12, color: input.labelColor, padding: [0, 0, 0, 2] },
          },
        },
        data: [{ value: Number(input.value) }],
      },
    ],
  };
}
