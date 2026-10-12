// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-14',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color1',
      label: '主色调',
      labelKey: 'border14.properties.color1',
      type: 'color',
      defaultValue: '#00d4ff',
      group: 'color',
    },
    {
      name: 'color2',
      label: '辅助色',
      labelKey: 'border14.properties.color2',
      type: 'color',
      defaultValue: '#0066cc',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'border14.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'showHexGrid',
      label: '六边形网格',
      labelKey: 'border14.properties.showHexGrid',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'showScanLine',
      label: '扫描线',
      labelKey: 'border14.properties.showScanLine',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'showCoreLines',
      label: '中心十字线',
      labelKey: 'border14.properties.showCoreLines',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'animationSpeed',
      label: '动画速度',
      labelKey: 'border14.properties.animationSpeed',
      type: 'range',
      defaultValue: 1,
      min: 0.2,
      max: 3,
      step: 0.1,
      group: 'animation',
    },
  ],
};