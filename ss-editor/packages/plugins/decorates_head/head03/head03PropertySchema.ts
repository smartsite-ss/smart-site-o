// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'head03.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'head03.properties.color1', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'head03.properties.color2', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'dataset', label: '显示文本', labelKey: 'head03.properties.dataset', type: 'string', defaultValue: '我是标题', group: 'text' },
    { name: 'textColor', label: '文本颜色', labelKey: 'head03.properties.textColor', type: 'color', defaultValue: '#fff', group: 'text' },
    { name: 'textSize', label: '字号', labelKey: 'head03.properties.textSize', type: 'number', min: 12, max: 80, step: 1, defaultValue: 32, group: 'text' },
  ],
};