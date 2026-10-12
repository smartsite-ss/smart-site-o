// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'head04.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'head04.properties.color1', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'head04.properties.color2', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'head04.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'reverse', label: '翻转', labelKey: 'head04.properties.reverse', type: 'boolean', defaultValue: false, group: 'style' },
  ],
};