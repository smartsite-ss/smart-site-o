// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-07',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'border07.properties.color1', type: 'color', defaultValue: '#11eefd', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'border07.properties.color2', type: 'color', defaultValue: '#0078d2', group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'border07.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
  ],
};