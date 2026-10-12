// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const upsPropertySchema: PluginPropertySchema = {
  name: 'UPS电源',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'ups.properties.color', type: 'color', defaultValue: '#ca8a04', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'ups.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'ups.properties.lineWidth', type: 'number', min: 1, max: 8, step: 0.5, defaultValue: 2, group: 'style' },
    { name: 'state', label: '工作状态', labelKey: 'ups.properties.state', type: 'select', defaultValue: 'online', options: [{ value: 'online', label: '在线', labelKey: 'ups.options.state.online' }, { value: 'bypass', label: '旁路', labelKey: 'ups.options.state.bypass' }, { value: 'fault', label: '故障', labelKey: 'ups.options.state.fault' }], group: 'state' },
  ],
};
