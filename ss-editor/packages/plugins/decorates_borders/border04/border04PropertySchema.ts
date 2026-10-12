// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  name: '边框-04',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'colors',
      label: '颜色',
      labelKey: 'border04.properties.colors',
      type: 'color-array',
      defaultValue: ['#8aaafb', '#1f33a2'],
      group: 'color',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'border04.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'borderTitle',
      label: '标题文字',
      labelKey: 'border04.properties.borderTitle',
      type: 'text',
      defaultValue: '边框-04',
      group: 'title',
    },
    {
      name: 'borderTitleColor',
      label: '标题颜色',
      labelKey: 'border04.properties.borderTitleColor',
      type: 'color',
      defaultValue: '#fff',
      group: 'title',
    },
    {
      name: 'borderTitleSize',
      label: '标题字号',
      labelKey: 'border04.properties.borderTitleSize',
      type: 'number',
      min: 10,
      max: 80,
      step: 1,
      defaultValue: 18,
      group: 'title',
    },
    {
      name: 'borderTitleWidth',
      label: '标题区域宽度',
      labelKey: 'border04.properties.borderTitleWidth',
      type: 'number',
      min: 50,
      max: 1000,
      step: 10,
      defaultValue: 250,
      group: 'title',
    },
    {
      name: 'borderTitleHeight',
      label: '标题高度',
      labelKey: 'border04.properties.borderTitleHeight',
      type: 'number',
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 32,
      group: 'title',
    },
  ],
};