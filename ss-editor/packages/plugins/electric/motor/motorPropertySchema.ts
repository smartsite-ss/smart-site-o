// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const motorPropertySchema: PluginPropertySchema = {
  name: '电动机',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'motor.properties.color', type: 'color', defaultValue: '#2563eb', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'motor.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'motor.properties.lineWidth', type: 'number', min: 1, max: 8, step: 0.5, defaultValue: 2, group: 'style' },
    { name: 'running', label: '运行状态', labelKey: 'motor.properties.running', type: 'boolean', defaultValue: true, group: 'state' },
    { name: 'runningValue', label: '运行对应值', labelKey: 'motor.properties.runningValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'stoppedValue', label: '停止对应值', labelKey: 'motor.properties.stoppedValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'faultValue', label: '故障对应值', labelKey: 'motor.properties.faultValue', type: 'text', defaultValue: '2', group: 'binding' },
    { name: 'defaultStatus', label: '默认状态', labelKey: 'motor.properties.defaultStatus', type: 'select', defaultValue: 'stopped', group: 'binding', options: [{ value: 'running', label: '运行' }, { value: 'stopped', label: '停止' }, { value: 'fault', label: '故障' }] },
  ],
};
