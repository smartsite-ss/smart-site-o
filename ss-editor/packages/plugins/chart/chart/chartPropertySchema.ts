// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const chartPropertySchema: PluginPropertySchema = {
  name: '图表',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'title', label: '标题', labelKey: 'chart.properties.title', type: 'text', defaultValue: '', group: 'basic' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'chart.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: 'visual' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'chart.properties.titleFontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 16, group: 'visual' },
    {
      name: 'titleFontWeight', label: '标题粗细', labelKey: 'chart.properties.titleFontWeight', type: 'select',
      options: [
        { value: 'normal', label: '正常', labelKey: 'chart.options.titleFontWeight.normal' },
        { value: 'bold', label: '粗体', labelKey: 'chart.options.titleFontWeight.bold' },
      ],
      defaultValue: 'bold', group: 'visual'
    },
    { name: 'backgroundColor', label: '背景色', labelKey: 'chart.properties.backgroundColor', type: 'color', defaultValue: '#FFFFFFFF', group: 'style' },
    { name: 'borderColor', label: '边框色', labelKey: 'chart.properties.borderColor', type: 'color', defaultValue: '#DEE2E6FF', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'chart.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 1, group: 'style' },
    {
      name: 'borderStyle', label: '边框样式', labelKey: 'chart.properties.borderStyle', type: 'select',
      options: [
        { value: 'solid', label: '实线', labelKey: 'chart.options.borderStyle.solid' },
        { value: 'dashed', label: '虚线', labelKey: 'chart.options.borderStyle.dashed' },
        { value: 'dotted', label: '点线', labelKey: 'chart.options.borderStyle.dotted' },
      ],
      defaultValue: 'solid', group: 'style'
    },
    { name: 'borderRadius', label: '圆角', labelKey: 'chart.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'style' },
    { name: 'gridColor', label: '网格线颜色', labelKey: 'chart.properties.gridColor', type: 'color', defaultValue: '#E8E8E8FF', group: 'visual' },
    { name: 'axisColor', label: '坐标轴颜色', labelKey: 'chart.properties.axisColor', type: 'color', defaultValue: '#999999FF', group: 'visual' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'chart.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'chart.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'chart.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'chart.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow' },
  ],
};