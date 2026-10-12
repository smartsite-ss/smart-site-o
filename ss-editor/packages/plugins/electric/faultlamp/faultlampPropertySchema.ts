// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const faultlampPropertySchema: PluginPropertySchema = {
  name: '故障报警灯',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '颜色', labelKey: 'faultlamp.properties.color', type: 'color', defaultValue: '#ef4444', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'faultlamp.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'faultlamp.properties.lineWidth', type: 'number', min: 1, max: 6, step: 0.5, defaultValue: 2, group: 'style' },
    { name: 'alarming', label: '报警状态', labelKey: 'faultlamp.properties.alarming', type: 'boolean', defaultValue: false, group: 'state' },
    { name: 'alarmValue', label: '报警对应值', labelKey: 'faultlamp.properties.alarmValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'normalValue', label: '正常对应值', labelKey: 'faultlamp.properties.normalValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'defaultStatus', label: '默认状态', labelKey: 'faultlamp.properties.defaultStatus', type: 'select', defaultValue: 'normal', group: 'binding', options: [{ value: 'normal', label: '正常' }, { value: 'alarm', label: '报警中' }] },
  ],
};
