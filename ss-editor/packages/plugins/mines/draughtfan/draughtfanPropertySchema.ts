// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const draughtfanPropertySchema: PluginPropertySchema = {
  name: '风机',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'dataset', label: '数据集', labelKey: 'draughtfan.properties.dataset', type: 'number', min: 0, max: 100, defaultValue: 50, group: 'data' },
    { name: 'dur', label: '动画周期(秒)', labelKey: 'draughtfan.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 5, group: 'animation' },
    { name: 'colors', label: '颜色组', labelKey: 'draughtfan.properties.colors', type: 'color', array: true, arrayLength: 3, defaultValue: ['#4fd2dd', '#235fa7', '#545fa7'], group: 'color' },
    { name: 'flowColor', label: '流动颜色', labelKey: 'draughtfan.properties.flowColor', type: 'color', array: true, defaultValue: ['#4fd2dd'], group: 'color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'draughtfan.properties.pipeColor', type: 'color', array: true, defaultValue: ['#235fa7'], group: 'color' },
    { name: 'bgWidth', label: '背景宽度', labelKey: 'draughtfan.properties.bgWidth', type: 'number', min: 5, max: 100, defaultValue: 20, group: 'style' },
    { name: 'boardWidth', label: '边框宽度', labelKey: 'draughtfan.properties.boardWidth', type: 'number', min: 2, max: 20, defaultValue: 4, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'draughtfan.properties.roate', type: 'number', min: 0, max: 360, defaultValue: 0, group: 'animation' },
    { name: 'cls', label: '旋转方向', labelKey: 'draughtfan.properties.cls', type: 'select', options: [
      { label: '顺时针', value: 'svg_pool_fill_left' },
      { label: '逆时针', value: 'svg_pool_fill_right' },
      { label: '停止', value: 'svg_pool_fill_stop' },
    ], defaultValue: 'svg_pool_fill_left', group: 'animation' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'draughtfan.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    {
      name: 'forwardValue',
      label: '正转对应值',
      labelKey: 'draughtfan.properties.forwardValue',
      type: 'text',
      defaultValue: '1',
      group: 'binding',
    },
    {
      name: 'backwardValue',
      label: '反转对应值',
      labelKey: 'draughtfan.properties.backwardValue',
      type: 'text',
      defaultValue: '-1',
      group: 'binding',
    },
    {
      name: 'stopValue',
      label: '停止对应值',
      labelKey: 'draughtfan.properties.stopValue',
      type: 'text',
      defaultValue: '0',
      group: 'binding',
    },
    {
      name: 'defaultCls',
      label: '默认动画方向',
      labelKey: 'draughtfan.properties.defaultCls',
      type: 'select',
      defaultValue: 'svg_pool_fill_stop',
      group: 'binding',
      options: [
        { value: 'svg_pool_fill_left', label: '正转', labelKey: 'draughtfan.options.cls.left' },
        { value: 'svg_pool_fill_right', label: '反转', labelKey: 'draughtfan.options.cls.right' },
        { value: 'svg_pool_fill_stop', label: '停止', labelKey: 'draughtfan.options.cls.stop' },
      ],
    },
    {
      name: 'decimalPlaces',
      label: '小数位数',
      labelKey: 'draughtfan.properties.decimalPlaces',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      group: 'binding',
    },
  ],
};