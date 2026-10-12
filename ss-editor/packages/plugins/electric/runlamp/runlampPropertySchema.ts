// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const runlampPropertySchema: PluginPropertySchema = {
  name: '运行指示灯',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'lampColor', label: '灯色', labelKey: 'runlamp.properties.lampColor', type: 'color', defaultValue: '#22c55e', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'runlamp.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'radius', label: '半径', labelKey: 'runlamp.properties.radius', type: 'number', min: 4, max: 20, step: 1, defaultValue: 12, group: 'style' },
    { name: 'state', label: '运行状态', labelKey: 'runlamp.properties.state', type: 'select', options: [{ value: 'running', label: '运行' }, { value: 'stopped', label: '停止' }, { value: 'fault', label: '故障' }], defaultValue: 'running', group: 'state' },
    { name: 'runningValue', label: '运行对应值', labelKey: 'runlamp.properties.runningValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'stoppedValue', label: '停止对应值', labelKey: 'runlamp.properties.stoppedValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'faultValue', label: '故障对应值', labelKey: 'runlamp.properties.faultValue', type: 'text', defaultValue: '2', group: 'binding' },
    { name: 'defaultStatus', label: '默认状态', labelKey: 'runlamp.properties.defaultStatus', type: 'select', defaultValue: 'stopped', group: 'binding', options: [{ value: 'running', label: '运行' }, { value: 'stopped', label: '停止' }, { value: 'fault', label: '故障' }] },
  ],
};
