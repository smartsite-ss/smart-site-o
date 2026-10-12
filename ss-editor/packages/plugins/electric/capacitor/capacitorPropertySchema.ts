// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const capacitorPropertySchema: PluginPropertySchema = {
  name: '电容器组',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'capacitor.properties.color', type: 'color', defaultValue: '#22c55e', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'capacitor.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'capacitor.properties.lineWidth', type: 'number', min: 1, max: 8, step: 0.5, defaultValue: 2, group: 'style' },
  ],
};
