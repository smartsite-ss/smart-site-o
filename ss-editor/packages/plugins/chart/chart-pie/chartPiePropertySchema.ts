// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/** chart-pie 饼图全局配置（数据源由 ChartDataSourceEditor 自定义 section 管理） */
export const chartPiePropertySchema: PluginPropertySchema = {
  name: '饼图',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'title', label: '标题', labelKey: 'chartPie.properties.title', type: 'text', defaultValue: '饼图', group: '标题' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'chartPie.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: '标题' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'chartPie.properties.titleFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 14, group: '标题' },
    { name: 'titleFontWeight', label: '标题粗细', labelKey: 'chartPie.properties.titleFontWeight', type: 'select', options: [
      { value: 'normal', label: '正常', labelKey: 'chartPie.options.fontWeight.normal' },
      { value: 'bold', label: '粗体', labelKey: 'chartPie.options.fontWeight.bold' },
    ], defaultValue: 'bold', group: '标题' },

    { name: 'donut', label: '环形', labelKey: 'chartPie.properties.donut', type: 'boolean', defaultValue: false, group: '图表' },
    { name: 'labelFontSize', label: '标签字号', labelKey: 'chartPie.properties.labelFontSize', type: 'number', min: 8, max: 24, step: 1, defaultValue: 12, group: '图表' },
    { name: 'labelColor', label: '标签颜色', labelKey: 'chartPie.properties.labelColor', type: 'color', defaultValue: '#666666', group: '图表' },
    { name: 'showLegend', label: '显示图例', labelKey: 'chartPie.properties.showLegend', type: 'boolean', defaultValue: true, group: '图表' },
    { name: 'legendPosition', label: '图例位置', labelKey: 'chartPie.properties.legendPosition', type: 'select', options: [
      { value: 'top', label: '顶部', labelKey: 'chartPie.options.legendPosition.top' },
      { value: 'bottom', label: '底部', labelKey: 'chartPie.options.legendPosition.bottom' },
      { value: 'left', label: '左侧', labelKey: 'chartPie.options.legendPosition.left' },
      { value: 'right', label: '右侧', labelKey: 'chartPie.options.legendPosition.right' },
    ], defaultValue: 'bottom', group: '图表' },
    { name: 'showTooltip', label: '显示提示框', labelKey: 'chartPie.properties.showTooltip', type: 'boolean', defaultValue: true, group: '图表' },

    { name: 'backgroundColor', label: '背景色', labelKey: 'chartPie.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderColor', label: '边框色', labelKey: 'chartPie.properties.borderColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'chartPie.properties.borderWidth', type: 'number', min: 0, max: 10, step: 1, defaultValue: 0, group: '样式' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'chartPie.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'chartPie.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'chartPie.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'chartPie.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: '样式' },
    { name: 'borderRadius', label: '圆角', labelKey: 'chartPie.properties.borderRadius', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4, group: '样式' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'chartPie.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'chartPie.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'chartPie.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'chartPie.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: '样式' },
  ],
};
