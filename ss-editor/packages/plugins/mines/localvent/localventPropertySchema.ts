// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const localventPropertySchema: PluginPropertySchema = {
  name: '局部通风机',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'colors', label: '颜色', labelKey: 'localvent.properties.colors', type: 'color-array', defaultValue: ['#22c55e', '#4ade80'], group: 'color' },
    { name: 'flowColor', label: '流动颜色', labelKey: 'localvent.properties.flowColor', type: 'color-array', defaultValue: ['#86efac'], group: 'color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'localvent.properties.pipeColor', type: 'color-array', defaultValue: ['#15803d'], group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'localvent.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'bgWidth', label: '背景宽度', labelKey: 'localvent.properties.bgWidth', type: 'number', min: 5, max: 100, step: 1, defaultValue: 15, group: 'style' },
    { name: 'boardWidth', label: '边框宽度', labelKey: 'localvent.properties.boardWidth', type: 'number', min: 2, max: 20, step: 1, defaultValue: 3, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'localvent.properties.roate', type: 'number', min: 0, max: 360, step: 1, defaultValue: 0, group: 'animation' },
    { name: 'cls', label: '动画方向', labelKey: 'localvent.properties.cls', type: 'select', defaultValue: 'svg_an_stop', group: 'animation', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'localvent.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'localvent.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'localvent.options.cls.stop' },
    ]},
    { name: 'dur', label: '动画周期(秒)', labelKey: 'localvent.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 3, group: 'animation' },
    { name: 'dataset', label: '数据值', labelKey: 'localvent.properties.dataset', type: 'number', min: 0, max: 100, step: 1, defaultValue: 50, group: 'data' },
    { name: 'forwardValue', label: '正转对应值', labelKey: 'localvent.properties.forwardValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'backwardValue', label: '反转对应值', labelKey: 'localvent.properties.backwardValue', type: 'text', defaultValue: '-1', group: 'binding' },
    { name: 'stopValue', label: '停止对应值', labelKey: 'localvent.properties.stopValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'defaultCls', label: '默认动画方向', labelKey: 'localvent.properties.defaultCls', type: 'select', defaultValue: 'svg_an_stop', group: 'binding', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'localvent.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'localvent.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'localvent.options.cls.stop' },
    ]},
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'localvent.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'binding' },
  ],
};
