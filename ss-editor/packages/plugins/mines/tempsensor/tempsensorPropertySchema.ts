// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';
export const tempsensorPropertySchema: PluginPropertySchema = {
  name: '温度传感器', layout: 'grid', columns: 2, propsPath: 'customProps',
  fields: [
    { name: 'colors', label: '颜色', labelKey: 'tempsensor.properties.colors', type: 'color-array', defaultValue: ['#f97316','#fb923c'], group: 'color' },
    { name: 'flowColor', label: '流动颜色', labelKey: 'tempsensor.properties.flowColor', type: 'color-array', defaultValue: ['#fdba74'], group: 'color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'tempsensor.properties.pipeColor', type: 'color-array', defaultValue: ['#c2410c'], group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'tempsensor.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'bgWidth', label: '背景宽度', labelKey: 'tempsensor.properties.bgWidth', type: 'number', min: 5, max: 100, step: 1, defaultValue: 8, group: 'style' },
    { name: 'boardWidth', label: '边框宽度', labelKey: 'tempsensor.properties.boardWidth', type: 'number', min: 2, max: 20, step: 1, defaultValue: 2, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'tempsensor.properties.roate', type: 'number', min: 0, max: 360, step: 1, defaultValue: 0, group: 'animation' },
    { name: 'cls', label: '动画方向', labelKey: 'tempsensor.properties.cls', type: 'select', defaultValue: 'svg_an_stop', group: 'animation', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'tempsensor.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'tempsensor.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'tempsensor.options.cls.stop' },
    ]},
    { name: 'dur', label: '动画周期(秒)', labelKey: 'tempsensor.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 2, group: 'animation' },
    { name: 'dataset', label: '数据值', labelKey: 'tempsensor.properties.dataset', type: 'number', min: 0, max: 100, step: 1, defaultValue: 50, group: 'data' },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'tempsensor.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'binding' },
    { name: 'unit', label: '单位', labelKey: 'tempsensor.properties.unit', type: 'text', defaultValue: '°', group: 'binding' },
    { name: 'forwardValue', label: '正转对应值', labelKey: 'tempsensor.properties.forwardValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'backwardValue', label: '反转对应值', labelKey: 'tempsensor.properties.backwardValue', type: 'text', defaultValue: '-1', group: 'binding' },
    { name: 'stopValue', label: '停止对应值', labelKey: 'tempsensor.properties.stopValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'defaultCls', label: '默认动画方向', labelKey: 'tempsensor.properties.defaultCls', type: 'select', defaultValue: 'svg_an_stop', group: 'binding', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'tempsensor.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'tempsensor.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'tempsensor.options.cls.stop' },
    ]},
  ],
};
