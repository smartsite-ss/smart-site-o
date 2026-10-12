// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 图表数值格式化工具。
 * 供 gauge / bar / pie / radar / trend 等 ECharts option 组装器复用，
 * 统一按配置的小数位数（decimalPlaces）格式化数值展示。
 */

/**
 * 将任意值按小数位数格式化为字符串。
 * 非有限数值（NaN / Infinity）与空值原样转字符串，避免 toFixed 抛错。
 */
export function formatNumber(value: unknown, decimalPlaces: number | undefined): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');
  const places = Number.isInteger(decimalPlaces) ? Math.max(0, decimalPlaces as number) : 2;
  return number.toFixed(places);
}
