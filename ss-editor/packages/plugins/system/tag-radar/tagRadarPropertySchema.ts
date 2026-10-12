// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/** tag-radar 变量雷达图全局配置（变量绑定由 TagVariableSelector 自定义 section 管理） */
export const tagRadarPropertySchema: PluginPropertySchema = {
  name: '变量雷达图',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'title', label: '标题', labelKey: 'tagRadar.properties.title', type: 'text', defaultValue: '', group: '标题' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'tagRadar.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: '标题' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'tagRadar.properties.titleFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 14, group: '标题' },
    { name: 'titleFontWeight', label: '标题粗细', labelKey: 'tagRadar.properties.titleFontWeight', type: 'select', options: [
      { value: 'normal', label: '正常', labelKey: 'tagRadar.options.fontWeight.normal' },
      { value: 'bold', label: '粗体', labelKey: 'tagRadar.options.fontWeight.bold' },
    ], defaultValue: 'bold', group: '标题' },

    { name: 'indicatorMax', label: '指标最大值', labelKey: 'tagRadar.properties.indicatorMax', type: 'number', min: 0, step: 0.01, defaultValue: 0, group: '图表' },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'label.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: '图表' },
    { name: 'gridColor', label: '网格颜色', labelKey: 'tagRadar.properties.gridColor', type: 'color', defaultValue: '#E9ECEF', group: '图表' },
    { name: 'axisColor', label: '坐标轴颜色', labelKey: 'tagRadar.properties.axisColor', type: 'color', defaultValue: '#495057', group: '图表' },
    { name: 'showLegend', label: '显示图例', labelKey: 'tagRadar.properties.showLegend', type: 'boolean', defaultValue: true, group: '图表' },
    { name: 'legendPosition', label: '图例位置', labelKey: 'tagRadar.properties.legendPosition', type: 'select', options: [
      { value: 'top', label: '顶部', labelKey: 'tagRadar.options.legendPosition.top' },
      { value: 'bottom', label: '底部', labelKey: 'tagRadar.options.legendPosition.bottom' },
      { value: 'left', label: '左侧', labelKey: 'tagRadar.options.legendPosition.left' },
      { value: 'right', label: '右侧', labelKey: 'tagRadar.options.legendPosition.right' },
    ], defaultValue: 'bottom', group: '图表' },
    { name: 'showTooltip', label: '显示提示框', labelKey: 'tagRadar.properties.showTooltip', type: 'boolean', defaultValue: true, group: '图表' },

    { name: 'backgroundColor', label: '背景色', labelKey: 'tagRadar.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderColor', label: '边框色', labelKey: 'tagRadar.properties.borderColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'tagRadar.properties.borderWidth', type: 'number', min: 0, max: 10, step: 1, defaultValue: 0, group: '样式' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'tagRadar.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'tagRadar.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'tagRadar.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'tagRadar.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: '样式' },
    { name: 'borderRadius', label: '圆角', labelKey: 'tagRadar.properties.borderRadius', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4, group: '样式' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'tagRadar.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'tagRadar.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'tagRadar.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'tagRadar.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: '样式' },
  ],
};
