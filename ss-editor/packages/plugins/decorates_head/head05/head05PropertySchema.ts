// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'head05.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'head05.properties.color1', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'head05.properties.color2', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'dur', label: '动画周期(秒)', labelKey: 'head05.properties.dur', type: 'number', min: 1, max: 10, step: 0.5, defaultValue: 3, group: 'animation' },
  ],
};