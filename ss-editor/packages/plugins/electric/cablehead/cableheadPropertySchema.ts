// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const cableheadPropertySchema: PluginPropertySchema = {
  name: '电缆终端头',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'cablehead.properties.color', type: 'color', defaultValue: '#6b7280', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'cablehead.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'cablehead.properties.lineWidth', type: 'number', min: 1, max: 6, step: 0.5, defaultValue: 2, group: 'style' },
  ],
};
