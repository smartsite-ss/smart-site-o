// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/**
 * tag 历史趋势组件的全局配置 schema。
 * 仅包含「默认查询方式/默认时间范围 + 标题 + 坐标轴/网格 + 图例 + tooltip + dataZoom + 背景/边框/阴影」。
 * 变量绑定（tags 数组）与每变量趋势样式由 HistoryTrendConfig 以自定义 section 管理，
 * 不进入本 schema。
 */
export const historyTrendPropertySchema: PluginPropertySchema = {
  name: '历史趋势',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    // ── 默认查询（组态时配置，运行态可覆盖） ──
    { name: 'defaultInterpolation', label: '默认查询方式', labelKey: 'historyTrend.properties.defaultInterpolation', type: 'select', options: [
      { value: 'raw', label: '原始值', labelKey: 'historyTrend.options.interpolation.raw' },
      { value: 'linear', label: '线性插值', labelKey: 'historyTrend.options.interpolation.linear' },
      { value: 'step', label: '阶梯插值', labelKey: 'historyTrend.options.interpolation.step' },
    ], defaultValue: 'raw', group: '查询' },
    { name: 'defaultInterval', label: '默认插值间隔(ms)', labelKey: 'historyTrend.properties.defaultInterval', type: 'select', options: [
      { value: 500, label: '500ms' },
      { value: 1000, label: '1s' },
      { value: 5000, label: '5s' },
      { value: 10000, label: '10s' },
      { value: 30000, label: '30s' },
      { value: 60000, label: '1min' },
    ], defaultValue: 1000, group: '查询' },
    { name: 'defaultPresetRange', label: '默认时间范围', labelKey: 'historyTrend.properties.defaultPresetRange', type: 'select', options: [
      { value: '1h', label: '最近1小时', labelKey: 'historyTrend.options.presetRange.1h' },
      { value: '6h', label: '最近6小时', labelKey: 'historyTrend.options.presetRange.6h' },
      { value: '24h', label: '最近24小时', labelKey: 'historyTrend.options.presetRange.24h' },
      { value: '7d', label: '最近7天', labelKey: 'historyTrend.options.presetRange.7d' },
      { value: 'custom', label: '自定义', labelKey: 'historyTrend.options.presetRange.custom' },
    ], defaultValue: '1h', group: '查询' },
    { name: 'defaultCustomStart', label: '自定义开始时间', labelKey: 'historyTrend.properties.defaultCustomStart', type: 'text', defaultValue: '', group: '查询' },
    { name: 'defaultCustomEnd', label: '自定义结束时间', labelKey: 'historyTrend.properties.defaultCustomEnd', type: 'text', defaultValue: '', group: '查询' },
    { name: 'maxPoints', label: '显示最大点数', labelKey: 'historyTrend.properties.maxPoints', type: 'number', min: 100, max: 20000, step: 100, defaultValue: 2000, group: '查询' },

    // ── 标题 ──
    { name: 'title', label: '标题', labelKey: 'historyTrend.properties.title', type: 'text', defaultValue: '历史趋势', group: '标题' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'historyTrend.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: '标题' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'historyTrend.properties.titleFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 14, group: '标题' },
    { name: 'titleFontWeight', label: '标题粗细', labelKey: 'historyTrend.properties.titleFontWeight', type: 'select', options: [
      { value: 'normal', label: '正常', labelKey: 'historyTrend.options.fontWeight.normal' },
      { value: 'bold', label: '粗体', labelKey: 'historyTrend.options.fontWeight.bold' },
    ], defaultValue: 'bold', group: '标题' },

    // ── 图表 ──
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'label.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: '图表' },
    { name: 'gridColor', label: '网格颜色', labelKey: 'historyTrend.properties.gridColor', type: 'color', defaultValue: '#E9ECEF', group: '图表' },
    { name: 'axisColor', label: '坐标轴颜色', labelKey: 'historyTrend.properties.axisColor', type: 'color', defaultValue: '#495057', group: '图表' },
    { name: 'showLegend', label: '显示图例', labelKey: 'historyTrend.properties.showLegend', type: 'boolean', defaultValue: true, group: '图表' },
    { name: 'legendPosition', label: '图例位置', labelKey: 'historyTrend.properties.legendPosition', type: 'select', options: [
      { value: 'top', label: '顶部', labelKey: 'historyTrend.options.legendPosition.top' },
      { value: 'bottom', label: '底部', labelKey: 'historyTrend.options.legendPosition.bottom' },
      { value: 'left', label: '左侧', labelKey: 'historyTrend.options.legendPosition.left' },
      { value: 'right', label: '右侧', labelKey: 'historyTrend.options.legendPosition.right' },
    ], defaultValue: 'bottom', group: '图表' },
    { name: 'showTooltip', label: '显示提示框', labelKey: 'historyTrend.properties.showTooltip', type: 'boolean', defaultValue: true, group: '图表' },
    { name: 'showDataZoom', label: '时间轴缩放', labelKey: 'historyTrend.properties.showDataZoom', type: 'boolean', defaultValue: true, group: '图表' },

    // ── 时间轴 ──
    { name: 'showXAxis', label: '显示时间轴', labelKey: 'historyTrend.properties.showXAxis', type: 'boolean', defaultValue: true, group: '时间轴' },
    { name: 'xAxisLineColor', label: '时间轴颜色', labelKey: 'historyTrend.properties.xAxisLineColor', type: 'color', defaultValue: '#CED4DA', group: '时间轴' },
    { name: 'xAxisLabelFontSize', label: '时间轴字号', labelKey: 'historyTrend.properties.xAxisLabelFontSize', type: 'number', min: 8, max: 24, step: 1, defaultValue: 12, group: '时间轴' },
    { name: 'xAxisLabelRotate', label: '时间轴文字斜度', labelKey: 'historyTrend.properties.xAxisLabelRotate', type: 'number', min: -90, max: 90, step: 1, defaultValue: 0, group: '时间轴' },

    // ── 背景 / 边框 / 阴影 ──
    { name: 'backgroundColor', label: '背景色', labelKey: 'historyTrend.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderColor', label: '边框色', labelKey: 'historyTrend.properties.borderColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'historyTrend.properties.borderWidth', type: 'number', min: 0, max: 10, step: 1, defaultValue: 0, group: '样式' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'historyTrend.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'historyTrend.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'historyTrend.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'historyTrend.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: '样式' },
    { name: 'borderRadius', label: '圆角', labelKey: 'historyTrend.properties.borderRadius', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4, group: '样式' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'historyTrend.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'historyTrend.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'historyTrend.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'historyTrend.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: '样式' },
  ],
};
