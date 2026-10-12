// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-17（赛博朋克霓虹）',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color1',
      label: '霓虹青',
      labelKey: 'border17.properties.color1',
      type: 'color',
      defaultValue: '#00ffff',
      group: 'color',
    },
    {
      name: 'color2',
      label: '霓虹粉',
      labelKey: 'border17.properties.color2',
      type: 'color',
      defaultValue: '#ff00ff',
      group: 'color',
    },
    {
      name: 'color3',
      label: '底色',
      labelKey: 'border17.properties.color3',
      type: 'color',
      defaultValue: '#0a0a1a',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'border17.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'showCircuit',
      label: '电路纹理',
      labelKey: 'border17.properties.showCircuit',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'showScanline',
      label: '扫描线',
      labelKey: 'border17.properties.showScanline',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'animationSpeed',
      label: '动画速度',
      labelKey: 'border17.properties.animationSpeed',
      type: 'range',
      defaultValue: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: 'animation',
    },
  ],
};