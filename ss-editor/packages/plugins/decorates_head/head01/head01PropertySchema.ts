// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'head01.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'head01.properties.color1', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'head01.properties.color2', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'dur', label: '动画周期(秒)', labelKey: 'head01.properties.dur', type: 'number', min: 1, max: 10, step: 0.5, defaultValue: 3, group: 'animation' },
    { name: 'lineHeight', label: '线条高度', labelKey: 'head01.properties.lineHeight', type: 'number', min: 1, max: 10, step: 1, defaultValue: 2, group: 'style' },
    { name: 'endWidth', label: '滑块宽度', labelKey: 'head01.properties.endWidth', type: 'number', min: 1, max: 20, step: 1, defaultValue: 5, group: 'style' },
  ],
};