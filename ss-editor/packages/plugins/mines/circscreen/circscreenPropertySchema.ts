// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const circscreenPropertySchema: PluginPropertySchema = {
  name: '圆振动筛', layout: 'grid', columns: 2, propsPath: 'customProps',
  fields: [
    { name: 'colors', label: '颜色', labelKey: 'circscreen.properties.colors', type: 'color-array', defaultValue: ['#eab308','#facc15'], group: 'color' },
    { name: 'flowColor', label: '流动颜色', labelKey: 'circscreen.properties.flowColor', type: 'color-array', defaultValue: ['#fde047'], group: 'color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'circscreen.properties.pipeColor', type: 'color-array', defaultValue: ['#a16207'], group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'circscreen.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'bgWidth', label: '背景宽度', labelKey: 'circscreen.properties.bgWidth', type: 'number', min: 5, max: 100, step: 1, defaultValue: 15, group: 'style' },
    { name: 'boardWidth', label: '边框宽度', labelKey: 'circscreen.properties.boardWidth', type: 'number', min: 2, max: 20, step: 1, defaultValue: 3, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'circscreen.properties.roate', type: 'number', min: 0, max: 360, step: 1, defaultValue: 0, group: 'animation' },
    { name: 'cls', label: '动画方向', labelKey: 'circscreen.properties.cls', type: 'select', defaultValue: 'svg_an_stop', group: 'animation', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'circscreen.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'circscreen.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'circscreen.options.cls.stop' },
    ]},
    { name: 'dur', label: '动画周期(秒)', labelKey: 'circscreen.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 2, group: 'animation' },
    { name: 'dataset', label: '数据值', labelKey: 'circscreen.properties.dataset', type: 'number', min: 0, max: 100, step: 1, defaultValue: 50, group: 'data' },
    {
      name: 'forwardValue',
      label: '正转对应值',
      labelKey: 'circscreen.properties.forwardValue',
      type: 'text',
      defaultValue: '1',
      group: 'binding',
    },
    {
      name: 'backwardValue',
      label: '反转对应值',
      labelKey: 'circscreen.properties.backwardValue',
      type: 'text',
      defaultValue: '-1',
      group: 'binding',
    },
    {
      name: 'stopValue',
      label: '停止对应值',
      labelKey: 'circscreen.properties.stopValue',
      type: 'text',
      defaultValue: '0',
      group: 'binding',
    },
    {
      name: 'defaultCls',
      label: '默认动画方向',
      labelKey: 'circscreen.properties.defaultCls',
      type: 'select',
      defaultValue: 'svg_an_stop',
      group: 'binding',
      options: [
        { value: 'svg_an_left', label: '正转', labelKey: 'circscreen.options.cls.left' },
        { value: 'svg_an_right', label: '反转', labelKey: 'circscreen.options.cls.right' },
        { value: 'svg_an_stop', label: '停止', labelKey: 'circscreen.options.cls.stop' },
      ],
    },
    {
      name: 'decimalPlaces',
      label: '小数位数',
      labelKey: 'circscreen.properties.decimalPlaces',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      group: 'binding',
    },
  ],
};
