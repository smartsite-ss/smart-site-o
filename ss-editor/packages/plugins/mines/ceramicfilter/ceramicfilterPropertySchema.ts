// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';
export const ceramicfilterPropertySchema: PluginPropertySchema = {
  name: '陶瓷过滤机', layout: 'grid', columns: 2, propsPath: 'customProps',
  fields: [
    { name: 'colors', label: '颜色', labelKey: 'ceramicfilter.properties.colors', type: 'color-array', defaultValue: ['#166534','#228b22'], group: 'color' },
    { name: 'flowColor', label: '流动颜色', labelKey: 'ceramicfilter.properties.flowColor', type: 'color-array', defaultValue: ['#4ade80'], group: 'color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'ceramicfilter.properties.pipeColor', type: 'color-array', defaultValue: ['#14532d'], group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'ceramicfilter.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'bgWidth', label: '背景宽度', labelKey: 'ceramicfilter.properties.bgWidth', type: 'number', min: 5, max: 100, step: 1, defaultValue: 15, group: 'style' },
    { name: 'boardWidth', label: '边框宽度', labelKey: 'ceramicfilter.properties.boardWidth', type: 'number', min: 2, max: 20, step: 1, defaultValue: 2, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'ceramicfilter.properties.roate', type: 'number', min: 0, max: 360, step: 1, defaultValue: 0, group: 'animation' },
    { name: 'cls', label: '动画方向', labelKey: 'ceramicfilter.properties.cls', type: 'select', defaultValue: 'svg_an_stop', group: 'animation', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'ceramicfilter.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'ceramicfilter.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'ceramicfilter.options.cls.stop' },
    ]},
    { name: 'dur', label: '动画周期(秒)', labelKey: 'ceramicfilter.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 5, group: 'animation' },
    { name: 'dataset', label: '数据值', labelKey: 'ceramicfilter.properties.dataset', type: 'number', min: 0, max: 100, step: 1, defaultValue: 50, group: 'data' },
    {
      name: 'forwardValue',
      label: '正转对应值',
      labelKey: 'ceramicfilter.properties.forwardValue',
      type: 'text',
      defaultValue: '1',
      group: 'binding',
    },
    {
      name: 'backwardValue',
      label: '反转对应值',
      labelKey: 'ceramicfilter.properties.backwardValue',
      type: 'text',
      defaultValue: '-1',
      group: 'binding',
    },
    {
      name: 'stopValue',
      label: '停止对应值',
      labelKey: 'ceramicfilter.properties.stopValue',
      type: 'text',
      defaultValue: '0',
      group: 'binding',
    },
    {
      name: 'defaultCls',
      label: '默认动画方向',
      labelKey: 'ceramicfilter.properties.defaultCls',
      type: 'select',
      defaultValue: 'svg_an_stop',
      group: 'binding',
      options: [
        { value: 'svg_an_left', label: '正转', labelKey: 'ceramicfilter.options.cls.left' },
        { value: 'svg_an_right', label: '反转', labelKey: 'ceramicfilter.options.cls.right' },
        { value: 'svg_an_stop', label: '停止', labelKey: 'ceramicfilter.options.cls.stop' },
      ],
    },
    {
      name: 'decimalPlaces',
      label: '小数位数',
      labelKey: 'ceramicfilter.properties.decimalPlaces',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      group: 'binding',
    },
  ],
};
