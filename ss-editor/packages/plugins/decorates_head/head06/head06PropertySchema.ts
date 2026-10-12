// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'head06.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '填充色', labelKey: 'head06.properties.color1', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'color2', label: '边框色', labelKey: 'head06.properties.color2', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'dataset', label: '文本', labelKey: 'head06.properties.dataset', type: 'string', defaultValue: '我是标题', group: 'text' },
    { name: 'textColor', label: '文字色', labelKey: 'head06.properties.textColor', type: 'color', defaultValue: '#fff', group: 'text' },
    { name: 'textSize', label: '文字大小', labelKey: 'head06.properties.textSize', type: 'number', min: 12, max: 100, step: 1, defaultValue: 32, group: 'text' },
  ],
};