// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-19（瑞士排版风格）',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color1',
      label: '深黑',
      labelKey: 'border19.properties.color1',
      type: 'color',
      defaultValue: '#1a1a1a',
      group: 'color',
    },
    {
      name: 'color2',
      label: '亮红',
      labelKey: 'border19.properties.color2',
      type: 'color',
      defaultValue: '#e63946',
      group: 'color',
    },
    {
      name: 'color3',
      label: '白色',
      labelKey: 'border19.properties.color3',
      type: 'color',
      defaultValue: '#f1f5f9',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'border19.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'showBlocks',
      label: '几何块',
      labelKey: 'border19.properties.showBlocks',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'showAccents',
      label: '装饰圆点',
      labelKey: 'border19.properties.showAccents',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'animationSpeed',
      label: '动画速度',
      labelKey: 'border19.properties.animationSpeed',
      type: 'range',
      defaultValue: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: 'animation',
    },
  ],
};