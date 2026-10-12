// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';
export const converterPropertySchema: PluginPropertySchema = {
  name: '转炉', layout: 'grid', columns: 2, propsPath: 'customProps',
  fields: [
    { name: 'colors', label: '颜色', labelKey: 'converter.properties.colors', type: 'color-array', defaultValue: ['#991b1b','#dc2626'], group: 'color' },
    { name: 'flowColor', label: '流动颜色', labelKey: 'converter.properties.flowColor', type: 'color-array', defaultValue: ['#f87171'], group: 'color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'converter.properties.pipeColor', type: 'color-array', defaultValue: ['#7f1d1d'], group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'converter.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'bgWidth', label: '背景宽度', labelKey: 'converter.properties.bgWidth', type: 'number', min: 5, max: 100, step: 1, defaultValue: 12, group: 'style' },
    { name: 'boardWidth', label: '边框宽度', labelKey: 'converter.properties.boardWidth', type: 'number', min: 2, max: 20, step: 1, defaultValue: 2, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'converter.properties.roate', type: 'number', min: 0, max: 360, step: 1, defaultValue: 0, group: 'animation' },
    { name: 'cls', label: '动画方向', labelKey: 'converter.properties.cls', type: 'select', defaultValue: 'svg_an_stop', group: 'animation', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'converter.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'converter.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'converter.options.cls.stop' },
    ]},
    { name: 'dur', label: '动画周期(秒)', labelKey: 'converter.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 4, group: 'animation' },
    { name: 'dataset', label: '数据值', labelKey: 'converter.properties.dataset', type: 'number', min: 0, max: 100, step: 1, defaultValue: 50, group: 'data' },
    { name: 'forwardValue', label: '正转对应值', labelKey: 'converter.properties.forwardValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'backwardValue', label: '反转对应值', labelKey: 'converter.properties.backwardValue', type: 'text', defaultValue: '-1', group: 'binding' },
    { name: 'stopValue', label: '停止对应值', labelKey: 'converter.properties.stopValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'defaultCls', label: '默认动画方向', labelKey: 'converter.properties.defaultCls', type: 'select', defaultValue: 'svg_an_stop', group: 'binding', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'converter.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'converter.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'converter.options.cls.stop' },
    ]},
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'converter.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'binding' },
  ],
};
