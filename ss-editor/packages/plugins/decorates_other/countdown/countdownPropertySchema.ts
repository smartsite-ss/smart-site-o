// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  labelKey: 'countdown.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'dataset',
      label: '倒计时(秒)',
      labelKey: 'countdown.properties.dataset',
      type: 'number',
      defaultValue: 600,
      min: 0,
      group: 'data',
    },
    {
      name: 'showDay',
      label: '显示天数',
      labelKey: 'countdown.properties.showDay',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'color1',
      label: '背景色',
      labelKey: 'countdown.properties.color1',
      type: 'color',
      defaultValue: '#E6F7FF',
      group: 'color',
    },
    {
      name: 'color2',
      label: '文字色',
      labelKey: 'countdown.properties.color2',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'flipperWidth',
      label: '数字宽度',
      labelKey: 'countdown.properties.flipperWidth',
      type: 'number',
      defaultValue: 30,
      group: 'style',
    },
    {
      name: 'flipperHeight',
      label: '数字高度',
      labelKey: 'countdown.properties.flipperHeight',
      type: 'number',
      defaultValue: 50,
      group: 'style',
    },
    {
      name: 'flipperGap',
      label: '间距',
      labelKey: 'countdown.properties.flipperGap',
      type: 'number',
      defaultValue: 10,
      min: 0,
      max: 50,
      group: 'style',
    },
  ],
};