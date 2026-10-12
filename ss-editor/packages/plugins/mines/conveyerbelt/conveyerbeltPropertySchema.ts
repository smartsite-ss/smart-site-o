// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const conveyerbeltPropertySchema: PluginPropertySchema = {
  name: '传送带',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color1', label: '颜色一', labelKey: 'conveyerbelt.properties.color1', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'color2', label: '颜色二', labelKey: 'conveyerbelt.properties.color2', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'color3', label: '颜色三', labelKey: 'conveyerbelt.properties.color3', type: 'color', defaultValue: '#545fa7', group: 'color' },
    { name: 'flowColor', label: '流动色', labelKey: 'conveyerbelt.properties.flowColor', type: 'color', defaultValue: '#4fd2dd', group: 'color' },
    { name: 'pipeColor', label: '管道色', labelKey: 'conveyerbelt.properties.pipeColor', type: 'color', defaultValue: '#235fa7', group: 'color' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'conveyerbelt.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'color' },
    { name: 'bgWidth', label: '背景宽度', labelKey: 'conveyerbelt.properties.bgWidth', type: 'number', min: 5, max: 100, defaultValue: 20, group: 'style' },
    { name: 'boardWidth', label: '边框宽度', labelKey: 'conveyerbelt.properties.boardWidth', type: 'number', min: 2, max: 20, defaultValue: 4, group: 'style' },
    { name: 'roate', label: '旋转角度', labelKey: 'conveyerbelt.properties.roate', type: 'number', min: 0, max: 360, defaultValue: 0, group: 'style' },
    { name: 'cls', label: '动画方向', labelKey: 'conveyerbelt.properties.cls', type: 'select', defaultValue: 'svg_an_stop', group: 'animation', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'conveyerbelt.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'conveyerbelt.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'conveyerbelt.options.cls.stop' },
    ] },
    { name: 'dur', label: '动画周期(秒)', labelKey: 'conveyerbelt.properties.dur', type: 'number', min: 0.5, max: 30, step: 0.5, defaultValue: 5, group: 'animation' },
    { name: 'dataset', label: '数据值', labelKey: 'conveyerbelt.properties.dataset', type: 'number', min: 0, max: 100, defaultValue: 50, group: 'data' },
    { name: 'forwardValue', label: '正转对应值', labelKey: 'conveyerbelt.properties.forwardValue', type: 'text', defaultValue: '1', group: 'binding' },
    { name: 'backwardValue', label: '反转对应值', labelKey: 'conveyerbelt.properties.backwardValue', type: 'text', defaultValue: '-1', group: 'binding' },
    { name: 'stopValue', label: '停止对应值', labelKey: 'conveyerbelt.properties.stopValue', type: 'text', defaultValue: '0', group: 'binding' },
    { name: 'defaultCls', label: '默认动画方向', labelKey: 'conveyerbelt.properties.defaultCls', type: 'select', defaultValue: 'svg_an_stop', group: 'binding', options: [
      { value: 'svg_an_left', label: '正转', labelKey: 'conveyerbelt.options.cls.left' },
      { value: 'svg_an_right', label: '反转', labelKey: 'conveyerbelt.options.cls.right' },
      { value: 'svg_an_stop', label: '停止', labelKey: 'conveyerbelt.options.cls.stop' },
    ] },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'conveyerbelt.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'binding' },
  ],
};