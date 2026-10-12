// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const valvePropertySchema: PluginPropertySchema = {
  name: '阀门',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'valve.properties.width', type: 'number', min: 20, step: 1, defaultValue: 80, group: 'basic', groupKey: 'valve.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'valve.properties.height', type: 'number', min: 20, step: 1, defaultValue: 80, group: 'basic', groupKey: 'valve.groups.basic' },
    {
      name: 'status', label: '状态', labelKey: 'valve.properties.status', type: 'select',
      options: [
        { value: 'open', label: '开启', labelKey: 'valve.options.status.open' },
        { value: 'closed', label: '关闭', labelKey: 'valve.options.status.closed' },
        { value: 'opening', label: '正在开启', labelKey: 'valve.options.status.opening' },
        { value: 'closing', label: '正在关闭', labelKey: 'valve.options.status.closing' },
        { value: 'fault', label: '故障', labelKey: 'valve.options.status.fault' }
      ],
      defaultValue: 'closed', group: 'status', groupKey: 'valve.groups.status'
    },
    {
      name: 'valveType', label: '阀门类型', labelKey: 'valve.properties.valveType', type: 'select',
      options: [
        { value: 'butterfly', label: '蝶阀', labelKey: 'valve.options.valveType.butterfly' },
        { value: 'gate', label: '闸阀', labelKey: 'valve.options.valveType.gate' }
      ],
      defaultValue: 'butterfly', group: 'basic', groupKey: 'valve.groups.basic'
    },
    { name: 'bodyColor', label: '主体颜色', labelKey: 'valve.properties.bodyColor', type: 'color', defaultValue: '#4A90A4FF', group: 'color', groupKey: 'valve.groups.color' },
    { name: 'stemColor', label: '阀杆颜色', labelKey: 'valve.properties.stemColor', type: 'color', defaultValue: '#BDC3C7FF', group: 'color', groupKey: 'valve.groups.color' },
    { name: 'openColor', label: '开启颜色', labelKey: 'valve.properties.openColor', type: 'color', defaultValue: '#27AE60FF', group: 'statusColor', groupKey: 'valve.groups.statusColor' },
    { name: 'closedColor', label: '关闭颜色', labelKey: 'valve.properties.closedColor', type: 'color', defaultValue: '#E74C3CFF', group: 'statusColor', groupKey: 'valve.groups.statusColor' },
    { name: 'faultColor', label: '故障颜色', labelKey: 'valve.properties.faultColor', type: 'color', defaultValue: '#F39C12FF', group: 'statusColor', groupKey: 'valve.groups.statusColor' },
    { name: 'showLabel', label: '显示标签', labelKey: 'valve.properties.showLabel', type: 'boolean', defaultValue: true, group: 'label', groupKey: 'valve.groups.label' },
    { name: 'labelText', label: '标签文本', labelKey: 'valve.properties.labelText', type: 'text', defaultValue: '', group: 'label', groupKey: 'valve.groups.label' },
    { name: 'openValue', label: '开启对应值', labelKey: 'valve.properties.openValue', type: 'text', defaultValue: '1', group: 'binding', groupKey: 'valve.groups.binding' },
    { name: 'closedValue', label: '关闭对应值', labelKey: 'valve.properties.closedValue', type: 'text', defaultValue: '0', group: 'binding', groupKey: 'valve.groups.binding' },
    { name: 'faultValue', label: '故障对应值', labelKey: 'valve.properties.faultValue', type: 'text', defaultValue: '2', group: 'binding', groupKey: 'valve.groups.binding' },
    {
      name: 'defaultStatus', label: '默认状态', labelKey: 'valve.properties.defaultStatus', type: 'select',
      options: [
        { value: 'open', label: '开启', labelKey: 'valve.options.status.open' },
        { value: 'closed', label: '关闭', labelKey: 'valve.options.status.closed' },
        { value: 'fault', label: '故障', labelKey: 'valve.options.status.fault' }
      ],
      defaultValue: 'closed', group: 'binding', groupKey: 'valve.groups.binding'
    }
  ],
};