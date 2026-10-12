// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const loadswitchPropertySchema: PluginPropertySchema = {
  name: '负荷开关',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'loadswitch.properties.color', type: 'color', defaultValue: '#ff0000', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'loadswitch.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'loadswitch.properties.lineWidth', type: 'number', min: 1, max: 8, step: 0.5, defaultValue: 2, group: 'style' },
    { name: 'closed', label: '闭合状态', labelKey: 'loadswitch.properties.closed', type: 'boolean', defaultValue: true, group: 'state' },
    { name: 'closedValue', label: '闭合对应值', labelKey: 'loadswitch.properties.closedValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'openValue', label: '断开对应值', labelKey: 'loadswitch.properties.openValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'defaultStatus', label: '默认状态', labelKey: 'loadswitch.properties.defaultStatus', type: 'select', defaultValue: 'closed', group: 'binding', options: [{ value: 'closed', label: '闭合' }, { value: 'open', label: '断开' }] },
  ],
};
