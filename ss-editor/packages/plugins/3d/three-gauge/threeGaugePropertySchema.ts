// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const threeGaugePropertySchema: PluginPropertySchema = {
  fields: [
    { name: 'value', type: 'number', label: '当前值', labelKey: 'three-gauge.properties.value', defaultValue: 50, min: 0, max: 100, group: '数据' },
    { name: 'min', type: 'number', label: '最小值', labelKey: 'three-gauge.properties.min', defaultValue: 0, group: '数据' },
    { name: 'max', type: 'number', label: '最大值', labelKey: 'three-gauge.properties.max', defaultValue: 100, group: '数据' },
    { name: 'gaugeColor', type: 'color', label: '正常颜色', labelKey: 'three-gauge.properties.gaugeColor', defaultValue: '#4CAF50', group: '颜色' },
    { name: 'warningColor', type: 'color', label: '警告颜色', labelKey: 'three-gauge.properties.warningColor', defaultValue: '#FF9800', group: '颜色' },
    { name: 'dangerColor', type: 'color', label: '危险颜色', labelKey: 'three-gauge.properties.dangerColor', defaultValue: '#F44336', group: '颜色' },
    { name: 'warningThreshold', type: 'number', label: '警告阈值', labelKey: 'three-gauge.properties.warningThreshold', defaultValue: 70, min: 0, max: 100, group: '阈值' },
    { name: 'dangerThreshold', type: 'number', label: '危险阈值', labelKey: 'three-gauge.properties.dangerThreshold', defaultValue: 90, min: 0, max: 100, group: '阈值' },
    { name: 'showTicks', type: 'boolean', label: '显示刻度', labelKey: 'three-gauge.properties.showTicks', defaultValue: true, group: '显示' },
    { name: 'showLabels', type: 'boolean', label: '显示标签', labelKey: 'three-gauge.properties.showLabels', defaultValue: true, group: '显示' },
    { name: 'needleColor', type: 'color', label: '指针颜色', labelKey: 'three-gauge.properties.needleColor', defaultValue: '#E53935', group: '颜色' },
    { name: 'backgroundColor', type: 'color', label: '背景颜色', labelKey: 'three-gauge.properties.backgroundColor', defaultValue: '#1a1a2e', group: '颜色' },
    { name: 'rimColor', type: 'color', label: '边框颜色', labelKey: 'three-gauge.properties.rimColor', defaultValue: '#555555', group: '颜色' },
  ],
};