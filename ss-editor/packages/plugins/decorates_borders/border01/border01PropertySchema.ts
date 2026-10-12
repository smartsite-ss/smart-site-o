// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const border01PropertySchema: PluginPropertySchema = {
  name: '边框-01',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'border01.properties.color1', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'border01.properties.color2', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'border01.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'borderColor', label: '边框线色', labelKey: 'border01.properties.borderColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'dur', label: '动画周期(秒)', labelKey: 'border01.properties.dur', type: 'number', min: 1, max: 10, step: 0.5, defaultValue: 0.5, group: 'animation' },
    { name: 'showAnimation', label: '启用动画', labelKey: 'border01.properties.showAnimation', type: 'boolean', defaultValue: true, group: 'animation' },
  ],
};