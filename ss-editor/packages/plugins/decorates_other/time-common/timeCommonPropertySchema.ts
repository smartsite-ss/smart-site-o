// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'time-common.label',
  layout: 'grid',
  columns: 1,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '文字颜色', labelKey: 'time-common.properties.textColor', type: 'color', defaultValue: '#E6F7FF', group: 'color' },
    { name: 'timeSize', label: '字号', labelKey: 'time-common.properties.fontSize', type: 'number', min: 12, max: 72, step: 1, defaultValue: 24, group: 'text' },
    { name: 'timeLineHeight', label: '行高', labelKey: 'time-common.properties.timeLineHeight', type: 'number', min: 20, max: 100, step: 1, defaultValue: 50, group: 'text' },
    { name: 'timeTextIndent', label: '文本缩进', labelKey: 'time-common.properties.timeTextIndent', type: 'number', min: 0, max: 20, step: 1, defaultValue: 2, group: 'text' },
    {
      name: 'fontWeight', label: '字重', labelKey: 'time-common.properties.fontWeight', type: 'select', defaultValue: 'normal', group: 'text',
      options: [
        { value: 'normal', label: '正常', labelKey: 'time-common.options.fontWeight.normal' },
        { value: 'bold', label: '加粗', labelKey: 'time-common.options.fontWeight.bold' },
        { value: 'lighter', label: '细体', labelKey: 'time-common.options.fontWeight.lighter' },
      ],
    },
    { name: 'backgroundColor', label: '背景色', labelKey: 'time-common.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'showShadow', label: '阴影', labelKey: 'time-common.properties.shadow', type: 'boolean', defaultValue: true, group: 'effect' },
    { name: 'hShadow', label: '水平阴影', labelKey: 'time-common.properties.hShadow', type: 'number', defaultValue: 0, group: 'effect' },
    { name: 'vShadow', label: '垂直阴影', labelKey: 'time-common.properties.vShadow', type: 'number', defaultValue: 0, group: 'effect' },
    { name: 'blurShadow', label: '模糊半径', labelKey: 'time-common.properties.blurShadow', type: 'number', defaultValue: 8, group: 'effect' },
    { name: 'colorShadow', label: '阴影颜色', labelKey: 'time-common.properties.colorShadow', type: 'color', defaultValue: '#0075ff', group: 'effect' },
  ],
};