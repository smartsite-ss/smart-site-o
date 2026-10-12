// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const multiChartPropertySchema: PluginPropertySchema = {
  name: '多图表',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'title', label: '标题', labelKey: 'multiChart.properties.title', type: 'text', defaultValue: '', group: 'basic', groupKey: 'multiChart.groups.basic' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'multiChart.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: 'basic', groupKey: 'multiChart.groups.basic' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'multiChart.properties.titleFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 14, group: 'basic', groupKey: 'multiChart.groups.basic' },
    {
      name: 'chartType', label: '图表类型', labelKey: 'multiChart.properties.chartType', type: 'select',
      options: [
        { value: 'bar', label: '柱状图', labelKey: 'multiChart.options.chartType.bar' },
        { value: 'pie', label: '饼图', labelKey: 'multiChart.options.chartType.pie' },
        { value: 'heatmap', label: '热力图', labelKey: 'multiChart.options.chartType.heatmap' },
      ],
      defaultValue: 'bar', group: 'basic', groupKey: 'multiChart.groups.basic'
    },
    { name: 'backgroundColor', label: '背景色', labelKey: 'multiChart.properties.backgroundColor', type: 'color', defaultValue: '#FFFFFFFF', group: 'style', groupKey: 'multiChart.groups.style' },
    { name: 'borderColor', label: '边框色', labelKey: 'multiChart.properties.borderColor', type: 'color', defaultValue: '#DEE2E6FF', group: 'style', groupKey: 'multiChart.groups.style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'multiChart.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 1, group: 'style', groupKey: 'multiChart.groups.style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'multiChart.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'style', groupKey: 'multiChart.groups.style' },
    { name: 'barColor', label: '柱状图颜色', labelKey: 'multiChart.properties.barColor', type: 'color', defaultValue: '#4DABF7FF', group: 'bar', groupKey: 'multiChart.groups.bar' },
    { name: 'barGap', label: '柱间距', labelKey: 'multiChart.properties.barGap', type: 'number', min: 0, max: 0.5, step: 0.05, defaultValue: 0.2, group: 'bar', groupKey: 'multiChart.groups.bar' },
    { name: 'pieColors', label: '饼图颜色序列', labelKey: 'multiChart.properties.pieColors', type: 'text', defaultValue: '#4DABF7,#F06595,#FFD43B,#69DB7C,#DA77F2,#FF922B,#20C997,#748FFC', group: 'pie', groupKey: 'multiChart.groups.pie' },
    { name: 'pieInnerRadius', label: '内半径比例', labelKey: 'multiChart.properties.pieInnerRadius', type: 'number', min: 0, max: 0.8, step: 0.05, defaultValue: 0, group: 'pie', groupKey: 'multiChart.groups.pie' },
    { name: 'pieShowLabels', label: '显示标签', labelKey: 'multiChart.properties.pieShowLabels', type: 'boolean', defaultValue: true, group: 'pie', groupKey: 'multiChart.groups.pie' },
    { name: 'heatmapColorLow', label: '热力图低值颜色', labelKey: 'multiChart.properties.heatmapColorLow', type: 'color', defaultValue: '#69DB7CFF', group: 'heatmap', groupKey: 'multiChart.groups.heatmap' },
    { name: 'heatmapColorHigh', label: '热力图高值颜色', labelKey: 'multiChart.properties.heatmapColorHigh', type: 'color', defaultValue: '#E74C3CFF', group: 'heatmap', groupKey: 'multiChart.groups.heatmap' },
    { name: 'heatmapRows', label: '行数', labelKey: 'multiChart.properties.heatmapRows', type: 'number', min: 2, max: 20, step: 1, defaultValue: 5, group: 'heatmap', groupKey: 'multiChart.groups.heatmap' },
    { name: 'heatmapCols', label: '列数', labelKey: 'multiChart.properties.heatmapCols', type: 'number', min: 2, max: 20, step: 1, defaultValue: 5, group: 'heatmap', groupKey: 'multiChart.groups.heatmap' },
    { name: 'showLegend', label: '显示图例', labelKey: 'multiChart.properties.showLegend', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'multiChart.groups.display' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'multiChart.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow', groupKey: 'multiChart.groups.shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'multiChart.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow', groupKey: 'multiChart.groups.shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'multiChart.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow', groupKey: 'multiChart.groups.shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'multiChart.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow', groupKey: 'multiChart.groups.shadow' },
  ],
};