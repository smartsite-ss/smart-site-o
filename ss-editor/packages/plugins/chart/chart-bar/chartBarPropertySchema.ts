// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/** chart-bar 柱状图全局配置（数据源由 ChartDataSourceEditor 自定义 section 管理） */
export const chartBarPropertySchema: PluginPropertySchema = {
  name: '柱状图',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    // 标题
    { name: 'title', label: '标题', labelKey: 'chartBar.properties.title', type: 'text', defaultValue: '柱状图', group: '标题' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'chartBar.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: '标题' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'chartBar.properties.titleFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 14, group: '标题' },
    { name: 'titleFontWeight', label: '标题粗细', labelKey: 'chartBar.properties.titleFontWeight', type: 'select', options: [
      { value: 'normal', label: '正常', labelKey: 'chartBar.options.fontWeight.normal' },
      { value: 'bold', label: '粗体', labelKey: 'chartBar.options.fontWeight.bold' },
    ], defaultValue: 'bold', group: '标题' },

    // 图表
    { name: 'horizontal', label: '横向柱状', labelKey: 'chartBar.properties.horizontal', type: 'boolean', defaultValue: false, group: '图表' },
    { name: 'gridColor', label: '网格颜色', labelKey: 'chartBar.properties.gridColor', type: 'color', defaultValue: '#E9ECEF', group: '图表' },
    { name: 'axisColor', label: '坐标轴颜色', labelKey: 'chartBar.properties.axisColor', type: 'color', defaultValue: '#495057', group: '图表' },
    { name: 'showLegend', label: '显示图例', labelKey: 'chartBar.properties.showLegend', type: 'boolean', defaultValue: false, group: '图表' },
    { name: 'legendPosition', label: '图例位置', labelKey: 'chartBar.properties.legendPosition', type: 'select', options: [
      { value: 'top', label: '顶部', labelKey: 'chartBar.options.legendPosition.top' },
      { value: 'bottom', label: '底部', labelKey: 'chartBar.options.legendPosition.bottom' },
      { value: 'left', label: '左侧', labelKey: 'chartBar.options.legendPosition.left' },
      { value: 'right', label: '右侧', labelKey: 'chartBar.options.legendPosition.right' },
    ], defaultValue: 'bottom', group: '图表' },
    { name: 'showTooltip', label: '显示提示框', labelKey: 'chartBar.properties.showTooltip', type: 'boolean', defaultValue: true, group: '图表' },

    // 背景 / 边框 / 阴影
    { name: 'backgroundColor', label: '背景色', labelKey: 'chartBar.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderColor', label: '边框色', labelKey: 'chartBar.properties.borderColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'chartBar.properties.borderWidth', type: 'number', min: 0, max: 10, step: 1, defaultValue: 0, group: '样式' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'chartBar.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'chartBar.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'chartBar.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'chartBar.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: '样式' },
    { name: 'borderRadius', label: '圆角', labelKey: 'chartBar.properties.borderRadius', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4, group: '样式' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'chartBar.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'chartBar.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'chartBar.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'chartBar.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: '样式' },
  ],
};
