// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const pressuregaugePropertySchema: PluginPropertySchema = {
  name: '压力表',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color',
      label: '颜色',
      labelKey: 'pressuregauge.properties.color',
      type: 'color',
      defaultValue: '#e74c3c',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'pressuregauge.properties.backgroundColor',
      type: 'color',
      defaultValue: '#1a1a2e',
      group: 'color',
    },
    {
      name: 'lineWidth',
      label: '线宽',
      labelKey: 'pressuregauge.properties.lineWidth',
      type: 'number',
      min: 2,
      max: 10,
      step: 1,
      defaultValue: 4,
      group: 'style',
    },
    {
      name: 'dataset',
      label: '数据值(0-100)',
      labelKey: 'pressuregauge.properties.dataset',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      group: 'data',
    },
    {
      name: 'maxPressure',
      label: '最大量程(MPa)',
      labelKey: 'pressuregauge.properties.maxPressure',
      type: 'number',
      min: 0.1,
      max: 100,
      step: 0.1,
      defaultValue: 2.5,
      group: 'data',
    },
    {
      name: 'decimalPlaces',
      label: '小数位数',
      labelKey: 'pressuregauge.properties.decimalPlaces',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      group: 'binding',
    },
    {
      name: 'unit',
      label: '单位',
      labelKey: 'pressuregauge.properties.unit',
      type: 'text',
      defaultValue: 'MPa',
      group: 'binding',
    },
  ],
};
