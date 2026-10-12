// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const busbarPropertySchema: PluginPropertySchema = {
  name: '母线段',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'busbar.properties.color', type: 'color', defaultValue: '#dc2626', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'busbar.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'busbar.properties.lineWidth', type: 'number', min: 1, max: 12, step: 1, defaultValue: 4, group: 'style' },
    { name: 'labelText', label: '标签文本', labelKey: 'busbar.properties.labelText', type: 'string', defaultValue: '', group: 'style' },
  ],
};
