// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const levelgaugePropertySchema: PluginPropertySchema = {
  name: '液位计',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'color',
      label: '颜色',
      labelKey: 'levelgauge.properties.color',
      type: 'color',
      defaultValue: '#2563eb',
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'levelgauge.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'lineWidth',
      label: '线宽',
      labelKey: 'levelgauge.properties.lineWidth',
      type: 'number',
      min: 1,
      max: 8,
      step: 1,
      defaultValue: 2,
      group: 'style',
    },
    {
      name: 'dataset',
      label: '数据值(0-100)',
      labelKey: 'levelgauge.properties.dataset',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      group: 'data',
    },
    {
      name: 'showNumeric',
      label: '显示数值',
      labelKey: 'levelgauge.properties.showNumeric',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'unit',
      label: '单位',
      labelKey: 'levelgauge.properties.unit',
      type: 'text',
      defaultValue: '%',
      group: 'binding',
    },
    {
      name: 'decimalPlaces',
      label: '小数位数',
      labelKey: 'levelgauge.properties.decimalPlaces',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      group: 'binding',
    },
  ],
};
