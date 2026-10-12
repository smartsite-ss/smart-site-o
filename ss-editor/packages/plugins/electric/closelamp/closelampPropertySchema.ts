// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const closelampPropertySchema: PluginPropertySchema = {
  name: '合闸指示灯',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'lampColor', label: '灯色', labelKey: 'closelamp.properties.lampColor', type: 'color', defaultValue: '#22c55e', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'closelamp.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'radius', label: '半径', labelKey: 'closelamp.properties.radius', type: 'number', min: 4, max: 16, step: 1, defaultValue: 8, group: 'style' },
    { name: 'closed', label: '合闸状态', labelKey: 'closelamp.properties.closed', type: 'boolean', defaultValue: true, group: 'state' },
    { name: 'closedValue', label: '闭合对应值', labelKey: 'closelamp.properties.closedValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'openValue', label: '断开对应值', labelKey: 'closelamp.properties.openValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'defaultStatus', label: '默认状态', labelKey: 'closelamp.properties.defaultStatus', type: 'select', defaultValue: 'closed', group: 'binding', options: [{ value: 'closed', label: '闭合' }, { value: 'open', label: '断开' }] },
  ],
};
