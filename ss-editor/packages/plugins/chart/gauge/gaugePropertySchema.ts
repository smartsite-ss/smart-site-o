// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const gaugePropertySchema: PluginPropertySchema = {
  name: '仪表盘',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'title', label: '标题', labelKey: 'chartGauge.properties.title', type: 'text', defaultValue: '', group: 'basic', groupKey: 'chartGauge.groups.basic' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'chartGauge.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: 'basic', groupKey: 'chartGauge.groups.basic' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'chartGauge.properties.titleFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 14, group: 'basic', groupKey: 'chartGauge.groups.basic' },
    { name: 'value', label: '当前值', labelKey: 'chartGauge.properties.value', type: 'number', step: 0.01, defaultValue: 0, group: 'value', groupKey: 'chartGauge.groups.value' },
    { name: 'minValue', label: '最小值', labelKey: 'chartGauge.properties.minValue', type: 'number', step: 0.01, defaultValue: 0, group: 'value', groupKey: 'chartGauge.groups.value' },
    { name: 'maxValue', label: '最大值', labelKey: 'chartGauge.properties.maxValue', type: 'number', step: 0.01, defaultValue: 100, group: 'value', groupKey: 'chartGauge.groups.value' },
    { name: 'unit', label: '单位', labelKey: 'chartGauge.properties.unit', type: 'text', defaultValue: '', group: 'value', groupKey: 'chartGauge.groups.value' },
    { name: 'startAngle', label: '起始角度', labelKey: 'chartGauge.properties.startAngle', type: 'number', min: -360, max: 360, step: 1, defaultValue: 225, group: 'gauge', groupKey: 'chartGauge.groups.gauge' },
    { name: 'endAngle', label: '结束角度', labelKey: 'chartGauge.properties.endAngle', type: 'number', min: -360, max: 360, step: 1, defaultValue: -45, group: 'gauge', groupKey: 'chartGauge.groups.gauge' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'chartGauge.properties.backgroundColor', type: 'color', defaultValue: '#FFFFFFFF', group: 'style', groupKey: 'chartGauge.groups.style' },
    { name: 'borderColor', label: '边框色', labelKey: 'chartGauge.properties.borderColor', type: 'color', defaultValue: '#DEE2E6FF', group: 'style', groupKey: 'chartGauge.groups.style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'chartGauge.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 1, group: 'style', groupKey: 'chartGauge.groups.style' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'chartGauge.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'chartGauge.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'chartGauge.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'chartGauge.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: 'style', groupKey: 'chartGauge.groups.style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'chartGauge.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'style', groupKey: 'chartGauge.groups.style' },
    { name: 'faceColor', label: '表盘颜色', labelKey: 'chartGauge.properties.faceColor', type: 'color', defaultValue: '#F8F9FAFF', group: 'color', groupKey: 'chartGauge.groups.color' },
    { name: 'rimColor', label: '边框颜色', labelKey: 'chartGauge.properties.rimColor', type: 'color', defaultValue: '#DEE2E6FF', group: 'color', groupKey: 'chartGauge.groups.color' },
    { name: 'normalColor', label: '正常区颜色', labelKey: 'chartGauge.properties.normalColor', type: 'color', defaultValue: '#18A058FF', group: 'color', groupKey: 'chartGauge.groups.color' },
    { name: 'needleColor', label: '指针颜色', labelKey: 'chartGauge.properties.needleColor', type: 'color', defaultValue: '#E74C3CFF', group: 'color', groupKey: 'chartGauge.groups.color' },
    { name: 'tickColor', label: '刻度线颜色', labelKey: 'chartGauge.properties.tickColor', type: 'color', defaultValue: '#999999FF', group: 'color', groupKey: 'chartGauge.groups.color' },
    { name: 'labelColor', label: '标签颜色', labelKey: 'chartGauge.properties.labelColor', type: 'color', defaultValue: '#333333FF', group: 'color', groupKey: 'chartGauge.groups.color' },
    { name: 'valueColor', label: '数值颜色', labelKey: 'chartGauge.properties.valueColor', type: 'color', defaultValue: '#333333FF', group: 'color', groupKey: 'chartGauge.groups.color' },
    { name: 'showTicks', label: '显示刻度', labelKey: 'chartGauge.properties.showTicks', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'chartGauge.groups.display' },
    { name: 'showLabels', label: '显示标签', labelKey: 'chartGauge.properties.showLabels', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'chartGauge.groups.display' },
    { name: 'showValue', label: '显示数值', labelKey: 'chartGauge.properties.showValue', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'chartGauge.groups.display' },
    { name: 'majorTicks', label: '主刻度数', labelKey: 'chartGauge.properties.majorTicks', type: 'number', min: 2, max: 20, step: 1, defaultValue: 10, group: 'ticks', groupKey: 'chartGauge.groups.ticks' },
    { name: 'minorTicks', label: '副刻度数', labelKey: 'chartGauge.properties.minorTicks', type: 'number', min: 0, max: 10, step: 1, defaultValue: 5, group: 'ticks', groupKey: 'chartGauge.groups.ticks' },
    { name: 'warningValue', label: '警告阈值', labelKey: 'chartGauge.properties.warningValue', type: 'number', step: 0.01, defaultValue: 70, group: 'alarm', groupKey: 'chartGauge.groups.alarm' },
    { name: 'dangerValue', label: '危险阈值', labelKey: 'chartGauge.properties.dangerValue', type: 'number', step: 0.01, defaultValue: 90, group: 'alarm', groupKey: 'chartGauge.groups.alarm' },
    { name: 'warningColor', label: '警告颜色', labelKey: 'chartGauge.properties.warningColor', type: 'color', defaultValue: '#F39C12FF', group: 'alarm', groupKey: 'chartGauge.groups.alarm' },
    { name: 'dangerColor', label: '危险颜色', labelKey: 'chartGauge.properties.dangerColor', type: 'color', defaultValue: '#E74C3CFF', group: 'alarm', groupKey: 'chartGauge.groups.alarm' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'chartGauge.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow', groupKey: 'chartGauge.groups.shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'chartGauge.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow', groupKey: 'chartGauge.groups.shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'chartGauge.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow', groupKey: 'chartGauge.groups.shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'chartGauge.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow', groupKey: 'chartGauge.groups.shadow' },
  ],
};