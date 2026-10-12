// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const gaugePropertySchema: PluginPropertySchema = {
  name: '仪表',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'gauge.properties.width', type: 'number', min: 50, step: 1, defaultValue: 150, group: 'basic', groupKey: 'gauge.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'gauge.properties.height', type: 'number', min: 50, step: 1, defaultValue: 150, group: 'basic', groupKey: 'gauge.groups.basic' },
    { name: 'value', label: '当前值', labelKey: 'gauge.properties.value', type: 'number', step: 0.01, defaultValue: 0, group: 'value', groupKey: 'gauge.groups.value' },
    { name: 'minValue', label: '最小值', labelKey: 'gauge.properties.minValue', type: 'number', step: 0.01, defaultValue: 0, group: 'value', groupKey: 'gauge.groups.value' },
    { name: 'maxValue', label: '最大值', labelKey: 'gauge.properties.maxValue', type: 'number', step: 0.01, defaultValue: 100, group: 'value', groupKey: 'gauge.groups.value' },
    { name: 'unit', label: '单位', labelKey: 'gauge.properties.unit', type: 'text', defaultValue: '', group: 'value', groupKey: 'gauge.groups.value' },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'gauge.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'value', groupKey: 'gauge.groups.value' },
    { name: 'startAngle', label: '起始角度', labelKey: 'gauge.properties.startAngle', type: 'number', min: -360, max: 360, step: 1, defaultValue: 225, group: 'gauge', groupKey: 'gauge.groups.gauge' },
    { name: 'endAngle', label: '结束角度', labelKey: 'gauge.properties.endAngle', type: 'number', min: -360, max: 360, step: 1, defaultValue: -45, group: 'gauge', groupKey: 'gauge.groups.gauge' },
    { name: 'faceColor', label: '表盘颜色', labelKey: 'gauge.properties.faceColor', type: 'color', defaultValue: '#1A2332FF', group: 'color', groupKey: 'gauge.groups.color' },
    { name: 'rimColor', label: '边框颜色', labelKey: 'gauge.properties.rimColor', type: 'color', defaultValue: '#34495EFF', group: 'color', groupKey: 'gauge.groups.color' },
    { name: 'needleColor', label: '指针颜色', labelKey: 'gauge.properties.needleColor', type: 'color', defaultValue: '#E74C3CFF', group: 'color', groupKey: 'gauge.groups.color' },
    { name: 'tickColor', label: '刻度线颜色', labelKey: 'gauge.properties.tickColor', type: 'color', defaultValue: '#BDC3C7FF', group: 'color', groupKey: 'gauge.groups.color' },
    { name: 'labelColor', label: '标签颜色', labelKey: 'gauge.properties.labelColor', type: 'color', defaultValue: '#ECF0F1FF', group: 'color', groupKey: 'gauge.groups.color' },
    { name: 'valueColor', label: '数值颜色', labelKey: 'gauge.properties.valueColor', type: 'color', defaultValue: '#FFFFFFFF', group: 'color', groupKey: 'gauge.groups.color' },
    { name: 'showTicks', label: '显示刻度', labelKey: 'gauge.properties.showTicks', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'gauge.groups.display' },
    { name: 'showLabels', label: '显示标签', labelKey: 'gauge.properties.showLabels', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'gauge.groups.display' },
    { name: 'showValue', label: '显示数值', labelKey: 'gauge.properties.showValue', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'gauge.groups.display' },
    { name: 'majorTicks', label: '主刻度数', labelKey: 'gauge.properties.majorTicks', type: 'number', min: 2, max: 20, step: 1, defaultValue: 10, group: 'ticks', groupKey: 'gauge.groups.ticks' },
    { name: 'minorTicks', label: '副刻度数', labelKey: 'gauge.properties.minorTicks', type: 'number', min: 0, max: 10, step: 1, defaultValue: 5, group: 'ticks', groupKey: 'gauge.groups.ticks' },
    { name: 'warningValue', label: '警告阈值', labelKey: 'gauge.properties.warningValue', type: 'number', step: 0.01, defaultValue: 70, group: 'alarm', groupKey: 'gauge.groups.alarm' },
    { name: 'dangerValue', label: '危险阈值', labelKey: 'gauge.properties.dangerValue', type: 'number', step: 0.01, defaultValue: 90, group: 'alarm', groupKey: 'gauge.groups.alarm' },
    { name: 'warningColor', label: '警告颜色', labelKey: 'gauge.properties.warningColor', type: 'color', defaultValue: '#F39C12FF', group: 'alarm', groupKey: 'gauge.groups.alarm' },
    { name: 'dangerColor', label: '危险颜色', labelKey: 'gauge.properties.dangerColor', type: 'color', defaultValue: '#E74C3CFF', group: 'alarm', groupKey: 'gauge.groups.alarm' }
  ],
};