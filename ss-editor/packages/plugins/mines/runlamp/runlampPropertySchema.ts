// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const runlampPropertySchema: PluginPropertySchema = {
  name: '运行指示灯',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'lampColor',
      label: '灯色',
      labelKey: 'runlamp.properties.lampColor',
      type: 'select',
      defaultValue: 'green',
      group: 'color',
      options: [
        { value: 'green', label: '绿色', labelKey: 'runlamp.options.lampColor.green' },
        { value: 'red', label: '红色', labelKey: 'runlamp.options.lampColor.red' },
        { value: 'yellow', label: '黄色', labelKey: 'runlamp.options.lampColor.yellow' },
      ],
    },
    {
      name: 'glowing',
      label: '发光效果',
      labelKey: 'runlamp.properties.glowing',
      type: 'boolean',
      defaultValue: true,
      group: 'style',
    },
    {
      name: 'blinkSpeed',
      label: '闪烁速度',
      labelKey: 'runlamp.properties.blinkSpeed',
      type: 'number',
      min: 0.1,
      max: 5,
      step: 0.1,
      defaultValue: 1,
      group: 'animation',
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'runlamp.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'runningValue',
      label: '运行对应值',
      labelKey: 'runlamp.properties.runningValue',
      type: 'text',
      defaultValue: '1',
      group: 'binding',
    },
    {
      name: 'stoppedValue',
      label: '停止对应值',
      labelKey: 'runlamp.properties.stoppedValue',
      type: 'text',
      defaultValue: '0',
      group: 'binding',
    },
    {
      name: 'faultValue',
      label: '故障对应值',
      labelKey: 'runlamp.properties.faultValue',
      type: 'text',
      defaultValue: '2',
      group: 'binding',
    },
    {
      name: 'defaultStatus',
      label: '默认状态',
      labelKey: 'runlamp.properties.defaultStatus',
      type: 'select',
      defaultValue: 'stopped',
      group: 'binding',
      options: [
        { value: 'running', label: '运行' },
        { value: 'stopped', label: '停止' },
        { value: 'fault', label: '故障' },
      ],
    },
  ],
};