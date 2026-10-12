// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-15（装饰艺术）',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color1',
      label: '主金色',
      labelKey: 'border15.properties.color1',
      type: 'color',
      defaultValue: '#d4a853',
      group: 'color',
    },
    {
      name: 'color2',
      label: '深金色',
      labelKey: 'border15.properties.color2',
      type: 'color',
      defaultValue: '#b8860b',
      group: 'color',
    },
    {
      name: 'color3',
      label: '暗色',
      labelKey: 'border15.properties.color3',
      type: 'color',
      defaultValue: '#1a1a2e',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'border15.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'showSunburst',
      label: '放射光芒',
      labelKey: 'border15.properties.showSunburst',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'showCorners',
      label: '角饰',
      labelKey: 'border15.properties.showCorners',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'animationSpeed',
      label: '动画速度',
      labelKey: 'border15.properties.animationSpeed',
      type: 'range',
      defaultValue: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: 'animation',
    },
  ],
};