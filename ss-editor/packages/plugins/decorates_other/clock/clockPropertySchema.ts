// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'clock.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color1',
      label: '指针颜色',
      labelKey: 'clock.properties.color1',
      type: 'color',
      defaultValue: '#E6F7FF',
      group: 'color',
    },
    {
      name: 'color2',
      label: '表盘背景',
      labelKey: 'clock.properties.color2',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'color3',
      label: '边框颜色',
      labelKey: 'clock.properties.color3',
      type: 'color',
      defaultValue: '#ffffff',
      group: 'color',
    },
    {
      name: 'borderWidth',
      label: '边框宽度',
      labelKey: 'clock.properties.borderWidth',
      type: 'number',
      defaultValue: 6,
      group: 'style',
    },
    {
      name: 'showShadow',
      label: '阴影',
      labelKey: 'clock.properties.showShadow',
      type: 'boolean',
      defaultValue: true,
      group: 'effect',
    },
    {
      name: 'hShadow',
      label: '水平阴影',
      labelKey: 'clock.properties.hShadow',
      type: 'number',
      defaultValue: 0,
      group: 'effect',
    },
    {
      name: 'vShadow',
      label: '垂直阴影',
      labelKey: 'clock.properties.vShadow',
      type: 'number',
      defaultValue: 0,
      group: 'effect',
    },
    {
      name: 'blurShadow',
      label: '模糊半径',
      labelKey: 'clock.properties.blurShadow',
      type: 'number',
      defaultValue: 8,
      min: 0,
      max: 50,
      step: 1,
      group: 'effect',
    },
    {
      name: 'colorShadow',
      label: '阴影颜色',
      labelKey: 'clock.properties.colorShadow',
      type: 'color',
      defaultValue: '#0075ff',
      group: 'effect',
    },
  ],
};