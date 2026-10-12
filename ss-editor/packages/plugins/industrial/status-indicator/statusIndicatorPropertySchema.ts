// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const statusIndicatorPropertySchema: PluginPropertySchema = {
  fields: [
    { name: 'status', type: 'select', label: '状态', labelKey: 'statusIndicator.properties.status', defaultValue: 'normal', options: [
      { value: 'normal', label: '正常', labelKey: 'statusIndicator.options.status.normal' },
      { value: 'warning', label: '警告', labelKey: 'statusIndicator.options.status.warning' },
      { value: 'error', label: '故障', labelKey: 'statusIndicator.options.status.error' },
      { value: 'offline', label: '离线', labelKey: 'statusIndicator.options.status.offline' },
    ], group: '基本' },
    { name: 'normalColor', type: 'color', label: '正常颜色', labelKey: 'statusIndicator.properties.normalColor', defaultValue: '#52C41A', group: '颜色' },
    { name: 'warningColor', type: 'color', label: '警告颜色', labelKey: 'statusIndicator.properties.warningColor', defaultValue: '#FAAD14', group: '颜色' },
    { name: 'errorColor', type: 'color', label: '故障颜色', labelKey: 'statusIndicator.properties.errorColor', defaultValue: '#FF4D4F', group: '颜色' },
    { name: 'offlineColor', type: 'color', label: '离线颜色', labelKey: 'statusIndicator.properties.offlineColor', defaultValue: '#8C8C8C', group: '颜色' },
    { name: 'size', type: 'number', label: '指示灯大小', labelKey: 'statusIndicator.properties.size', defaultValue: 20, min: 8, max: 100, group: '样式' },
    { name: 'showGlow', type: 'boolean', label: '显示光晕', labelKey: 'statusIndicator.properties.showGlow', defaultValue: true, group: '样式' },
    { name: 'pulseSpeed', type: 'number', label: '脉冲速度(秒)', labelKey: 'statusIndicator.properties.pulseSpeed', defaultValue: 2, min: 0.5, max: 10, group: '动画' },
    { name: 'normalValue', type: 'text', label: '正常对应值', labelKey: 'statusIndicator.properties.normalValue', defaultValue: '1', group: '绑定映射' },
    { name: 'warningValue', type: 'text', label: '警告对应值', labelKey: 'statusIndicator.properties.warningValue', defaultValue: '2', group: '绑定映射' },
    { name: 'errorValue', type: 'text', label: '故障对应值', labelKey: 'statusIndicator.properties.errorValue', defaultValue: '3', group: '绑定映射' },
    { name: 'offlineValue', type: 'text', label: '离线对应值', labelKey: 'statusIndicator.properties.offlineValue', defaultValue: '0', group: '绑定映射' },
    { name: 'defaultStatus', type: 'select', label: '默认状态', labelKey: 'statusIndicator.properties.defaultStatus', defaultValue: 'offline', options: [
      { value: 'normal', label: '正常', labelKey: 'statusIndicator.options.status.normal' },
      { value: 'warning', label: '警告', labelKey: 'statusIndicator.options.status.warning' },
      { value: 'error', label: '故障', labelKey: 'statusIndicator.options.status.error' },
      { value: 'offline', label: '离线', labelKey: 'statusIndicator.options.status.offline' },
    ], group: '绑定映射' },
  ],
};
