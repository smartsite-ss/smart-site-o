// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const gatevalvePropertySchema: PluginPropertySchema = {
  name: '电动闸阀',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'colors',
      label: '颜色',
      labelKey: 'gatevalve.properties.colors',
      type: 'color-array',
      defaultValue: ['#059669', '#047857'],
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'gatevalve.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'lineWidth',
      label: '线宽',
      labelKey: 'gatevalve.properties.lineWidth',
      type: 'number',
      min: 1,
      max: 8,
      step: 1,
      defaultValue: 2,
      group: 'style',
    },
    {
      name: 'closed',
      label: '闭合状态',
      labelKey: 'gatevalve.properties.closed',
      type: 'boolean',
      defaultValue: true,
      group: 'data',
    },
    {
      name: 'state',
      label: '阀门状态',
      labelKey: 'gatevalve.properties.state',
      type: 'select',
      defaultValue: 'closed',
      group: 'data',
      options: [
        { value: 'open', label: '开启', labelKey: 'gatevalve.options.state.open' },
        { value: 'closed', label: '关闭', labelKey: 'gatevalve.options.state.closed' },
        { value: 'fault', label: '故障', labelKey: 'gatevalve.options.state.fault' },
      ],
    },
  ],
};
