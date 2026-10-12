// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const indicatorPropertySchema: PluginPropertySchema = {
  name: '指示灯',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'indicator.properties.width', type: 'number', min: 16, step: 1, defaultValue: 40, group: 'basic', groupKey: 'indicator.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'indicator.properties.height', type: 'number', min: 16, step: 1, defaultValue: 40, group: 'basic', groupKey: 'indicator.groups.basic' },
    {
      name: 'status', label: '状态', labelKey: 'indicator.properties.status', type: 'select',
      options: [
        { value: 'on', label: '点亮', labelKey: 'indicator.options.status.on' },
        { value: 'off', label: '熄灭', labelKey: 'indicator.options.status.off' },
        { value: 'warning', label: '警告', labelKey: 'indicator.options.status.warning' },
        { value: 'fault', label: '故障', labelKey: 'indicator.options.status.fault' }
      ],
      defaultValue: 'off', group: 'status', groupKey: 'indicator.groups.status'
    },
    { name: 'onColor', label: '点亮颜色', labelKey: 'indicator.properties.onColor', type: 'color', defaultValue: '#27AE60FF', group: 'color', groupKey: 'indicator.groups.color' },
    { name: 'offColor', label: '熄灭颜色', labelKey: 'indicator.properties.offColor', type: 'color', defaultValue: '#7F8C8DFF', group: 'color', groupKey: 'indicator.groups.color' },
    { name: 'warningColor', label: '警告颜色', labelKey: 'indicator.properties.warningColor', type: 'color', defaultValue: '#F39C12FF', group: 'color', groupKey: 'indicator.groups.color' },
    { name: 'faultColor', label: '故障颜色', labelKey: 'indicator.properties.faultColor', type: 'color', defaultValue: '#E74C3CFF', group: 'color', groupKey: 'indicator.groups.color' },
    { name: 'blinkOnAlarm', label: '报警闪烁', labelKey: 'indicator.properties.blinkOnAlarm', type: 'boolean', defaultValue: true, group: 'animation', groupKey: 'indicator.groups.animation' },
    { name: 'blinkInterval', label: '闪烁间隔(ms)', labelKey: 'indicator.properties.blinkInterval', type: 'number', min: 100, max: 5000, step: 50, defaultValue: 800, group: 'animation', groupKey: 'indicator.groups.animation' },
    { name: 'showLabel', label: '显示标签', labelKey: 'indicator.properties.showLabel', type: 'boolean', defaultValue: true, group: 'label', groupKey: 'indicator.groups.label' },
    { name: 'labelText', label: '标签文本', labelKey: 'indicator.properties.labelText', type: 'text', defaultValue: '', group: 'label', groupKey: 'indicator.groups.label' },
    { name: 'labelColor', label: '标签颜色', labelKey: 'indicator.properties.labelColor', type: 'color', defaultValue: '#ECF0F1FF', group: 'label', groupKey: 'indicator.groups.label' },
    { name: 'onValue', label: '点亮对应值', labelKey: 'indicator.properties.onValue', type: 'text', defaultValue: '1', group: 'binding', groupKey: 'indicator.groups.binding' },
    { name: 'offValue', label: '熄灭对应值', labelKey: 'indicator.properties.offValue', type: 'text', defaultValue: '0', group: 'binding', groupKey: 'indicator.groups.binding' },
    { name: 'warningValue', label: '警告对应值', labelKey: 'indicator.properties.warningValue', type: 'text', defaultValue: '2', group: 'binding', groupKey: 'indicator.groups.binding' },
    { name: 'faultValue', label: '故障对应值', labelKey: 'indicator.properties.faultValue', type: 'text', defaultValue: '3', group: 'binding', groupKey: 'indicator.groups.binding' },
    {
      name: 'defaultStatus', label: '默认状态', labelKey: 'indicator.properties.defaultStatus', type: 'select',
      options: [
        { value: 'on', label: '点亮', labelKey: 'indicator.options.status.on' },
        { value: 'off', label: '熄灭', labelKey: 'indicator.options.status.off' },
        { value: 'warning', label: '警告', labelKey: 'indicator.options.status.warning' },
        { value: 'fault', label: '故障', labelKey: 'indicator.options.status.fault' }
      ],
      defaultValue: 'off', group: 'binding', groupKey: 'indicator.groups.binding'
    }
  ],
};
