// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-08',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'border08.properties.color1', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'border08.properties.color2', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'border08.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'dur', label: '动画周期(秒)', labelKey: 'border08.properties.dur', type: 'number', min: 1, max: 10, step: 0.5, defaultValue: 3, group: 'animation' },
    { name: 'reverse', label: '反向运动', labelKey: 'border08.properties.reverse', type: 'boolean', defaultValue: false, group: 'animation' },
  ],
};