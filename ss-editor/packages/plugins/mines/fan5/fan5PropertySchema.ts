// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const fan5PropertySchema: PluginPropertySchema = {
  name: '风扇5',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'colors', label: '颜色组', labelKey: 'fan5.properties.colors', type: 'color', isArray: true, arrayLength: 2, defaultValue: ['#008000', '#7ABD7A'], group: 'color' },
    { name: 'flowColor', label: '风管颜色', labelKey: 'fan5.properties.flowColor', type: 'color', isArray: true, arrayLength: 1, defaultValue: ['#4fd2dd'], group: 'color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'fan5.properties.pipeColor', type: 'color', isArray: true, arrayLength: 1, defaultValue: ['#235fa7'], group: 'color' },
    { name: 'bgWidth', label: '底座宽度', labelKey: 'fan5.properties.bgWidth', type: 'number', min: 5, max: 100, step: 1, defaultValue: 20, group: 'style' },
    { name: 'boardWidth', label: '板厚', labelKey: 'fan5.properties.boardWidth', type: 'number', min: 2, max: 20, step: 1, defaultValue: 4, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'fan5.properties.roate', type: 'number', min: 0, max: 360, step: 1, defaultValue: 0, group: 'style' },
    { name: 'cls', label: '旋转方向', labelKey: 'fan5.properties.cls', type: 'select', options: [
      { label: '右转', value: 'svg_an_right' },
      { label: '左转', value: 'svg_an_left' },
      { label: '停止', value: 'svg_an_stop' },
    ], defaultValue: 'svg_an_stop', group: 'animation' },
    { name: 'dur', label: '动画周期(秒)', labelKey: 'fan5.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 5, group: 'animation' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'fan5.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'dataset', label: '数据集', labelKey: 'fan5.properties.dataset', type: 'number', min: 0, max: 100, step: 1, defaultValue: 0, group: 'data' },
    {
      name: 'forwardValue',
      label: '正转对应值',
      labelKey: 'fan5.properties.forwardValue',
      type: 'text',
      defaultValue: '1',
      group: 'binding',
    },
    {
      name: 'backwardValue',
      label: '反转对应值',
      labelKey: 'fan5.properties.backwardValue',
      type: 'text',
      defaultValue: '-1',
      group: 'binding',
    },
    {
      name: 'stopValue',
      label: '停止对应值',
      labelKey: 'fan5.properties.stopValue',
      type: 'text',
      defaultValue: '0',
      group: 'binding',
    },
    {
      name: 'defaultCls',
      label: '默认动画方向',
      labelKey: 'fan5.properties.defaultCls',
      type: 'select',
      defaultValue: 'svg_an_stop',
      group: 'binding',
      options: [
        { value: 'svg_an_left', label: '正转', labelKey: 'fan5.options.cls.left' },
        { value: 'svg_an_right', label: '反转', labelKey: 'fan5.options.cls.right' },
        { value: 'svg_an_stop', label: '停止', labelKey: 'fan5.options.cls.stop' },
      ],
    },
    {
      name: 'decimalPlaces',
      label: '小数位数',
      labelKey: 'fan5.properties.decimalPlaces',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      group: 'binding',
    },
  ],
};