// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-18（摩洛哥蔓藤花纹）',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color1',
      label: '宝石青',
      labelKey: 'border18.properties.color1',
      type: 'color',
      defaultValue: '#1a6b6b',
      group: 'color',
    },
    {
      name: 'color2',
      label: '陶土色',
      labelKey: 'border18.properties.color2',
      type: 'color',
      defaultValue: '#c1784b',
      group: 'color',
    },
    {
      name: 'color3',
      label: '金色',
      labelKey: 'border18.properties.color3',
      type: 'color',
      defaultValue: '#d4a853',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'border18.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'showStars',
      label: '星星图案',
      labelKey: 'border18.properties.showStars',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'showArches',
      label: '拱形边饰',
      labelKey: 'border18.properties.showArches',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'animationSpeed',
      label: '动画速度',
      labelKey: 'border18.properties.animationSpeed',
      type: 'range',
      defaultValue: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: 'animation',
    },
  ],
};