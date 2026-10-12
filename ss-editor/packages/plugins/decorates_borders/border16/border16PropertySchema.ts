// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-16（北欧极简）',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color1',
      label: '主色调',
      labelKey: 'border16.properties.color1',
      type: 'color',
      defaultValue: '#7d9b76',
      group: 'color',
    },
    {
      name: 'color2',
      label: '辅助色',
      labelKey: 'border16.properties.color2',
      type: 'color',
      defaultValue: '#c4a882',
      group: 'color',
    },
    {
      name: 'color3',
      label: '底色',
      labelKey: 'border16.properties.color3',
      type: 'color',
      defaultValue: '#e8e0d5',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'border16.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'showLeaves',
      label: '叶片装饰',
      labelKey: 'border16.properties.showLeaves',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'showDots',
      label: '纹理点阵',
      labelKey: 'border16.properties.showDots',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'animationSpeed',
      label: '动画速度',
      labelKey: 'border16.properties.animationSpeed',
      type: 'range',
      defaultValue: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: 'animation',
    },
  ],
};