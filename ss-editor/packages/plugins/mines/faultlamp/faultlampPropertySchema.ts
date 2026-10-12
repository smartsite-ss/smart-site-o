// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const faultlampPropertySchema: PluginPropertySchema = {
  name: '故障报警灯',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'alarmColor',
      label: '报警颜色',
      labelKey: 'faultlamp.properties.alarmColor',
      type: 'select',
      defaultValue: 'red',
      group: 'color',
      options: [
        { value: 'red', label: '红色', labelKey: 'faultlamp.options.alarmColor.red' },
        { value: 'amber', label: '琥珀色', labelKey: 'faultlamp.options.alarmColor.amber' },
        { value: 'off', label: '关闭', labelKey: 'faultlamp.options.alarmColor.off' },
      ],
    },
    {
      name: 'backgroundColor',
      label: '背景色',
      labelKey: 'faultlamp.properties.backgroundColor',
      type: 'color',
      defaultValue: '#00000000',
      group: 'color',
    },
    {
      name: 'dataset',
      label: '数据值(0=正常, >0=报警)',
      labelKey: 'faultlamp.properties.dataset',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 0,
      group: 'data',
    },
    {
      name: 'flashing',
      label: '闪烁效果',
      labelKey: 'faultlamp.properties.flashing',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'flashSpeed',
      label: '闪烁速度(秒)',
      labelKey: 'faultlamp.properties.flashSpeed',
      type: 'number',
      min: 0.1,
      max: 3,
      step: 0.1,
      defaultValue: 0.5,
      group: 'animation',
    },
    {
      name: 'showBuzzer',
      label: '显示蜂鸣器',
      labelKey: 'faultlamp.properties.showBuzzer',
      type: 'boolean',
      defaultValue: true,
      group: 'display',
    },
    {
      name: 'alarmValue',
      label: '报警对应值',
      labelKey: 'faultlamp.properties.alarmValue',
      type: 'text',
      defaultValue: '1',
      group: 'binding',
    },
    {
      name: 'normalValue',
      label: '正常对应值',
      labelKey: 'faultlamp.properties.normalValue',
      type: 'text',
      defaultValue: '0',
      group: 'binding',
    },
    {
      name: 'defaultStatus',
      label: '默认状态',
      labelKey: 'faultlamp.properties.defaultStatus',
      type: 'select',
      defaultValue: 'normal',
      group: 'binding',
      options: [
        { value: 'normal', label: '正常' },
        { value: 'alarm', label: '报警中' },
      ],
    },
  ],
};