// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const svgPipePropertySchema: PluginPropertySchema = {
  name: 'SVG 管道',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'status', label: '状态', labelKey: 'svg-pipe.properties.status', type: 'select', group: 'status', groupKey: 'svg-pipe.groups.status',
      options: [
        { value: 'flowing', label: '流动中', labelKey: 'svg-pipe.options.status.flowing' },
        { value: 'stopped', label: '停止', labelKey: 'svg-pipe.options.status.stopped' },
        { value: 'blocked', label: '堵塞', labelKey: 'svg-pipe.options.status.blocked' },
      ],
      defaultValue: 'stopped',
    },
    {
      name: 'flowDirection', label: '流向', labelKey: 'svg-pipe.properties.flowDirection', type: 'select', group: 'status', groupKey: 'svg-pipe.groups.status',
      options: [
        { value: 'forward', label: '正向', labelKey: 'svg-pipe.options.flowDirection.forward' },
        { value: 'backward', label: '反向', labelKey: 'svg-pipe.options.flowDirection.backward' },
        { value: 'bidirectional', label: '双向', labelKey: 'svg-pipe.options.flowDirection.bidirectional' },
      ],
      defaultValue: 'forward',
    },
    { name: 'strokeColor', label: '管道颜色', labelKey: 'svg-pipe.properties.strokeColor', type: 'color', defaultValue: '#4A90A4FF', group: 'color', groupKey: 'svg-pipe.groups.color' },
    { name: 'flowingColor', label: '流动颜色', labelKey: 'svg-pipe.properties.flowingColor', type: 'color', defaultValue: '#3498DBFF', group: 'color', groupKey: 'svg-pipe.groups.color' },
    { name: 'stoppedColor', label: '停止颜色', labelKey: 'svg-pipe.properties.stoppedColor', type: 'color', defaultValue: '#7F8C8DFF', group: 'color', groupKey: 'svg-pipe.groups.color' },
    { name: 'blockedColor', label: '堵塞颜色', labelKey: 'svg-pipe.properties.blockedColor', type: 'color', defaultValue: '#E74C3CFF', group: 'color', groupKey: 'svg-pipe.groups.color' },
    { name: 'strokeWidth', label: '管径', labelKey: 'svg-pipe.properties.strokeWidth', type: 'number', min: 4, max: 100, step: 1, defaultValue: 20, group: 'style', groupKey: 'svg-pipe.groups.style' },
    {
      name: 'strokeLinecap', label: '端点样式', labelKey: 'svg-pipe.properties.strokeLinecap', type: 'select', group: 'style', groupKey: 'svg-pipe.groups.style',
      options: [
        { value: 'butt', label: '平头', labelKey: 'svg-pipe.options.strokeLinecap.butt' },
        { value: 'round', label: '圆头', labelKey: 'svg-pipe.options.strokeLinecap.round' },
        { value: 'square', label: '方头', labelKey: 'svg-pipe.options.strokeLinecap.square' },
      ],
      defaultValue: 'butt',
    },
    {
      name: 'strokeLinejoin', label: '连接样式', labelKey: 'svg-pipe.properties.strokeLinejoin', type: 'select', group: 'style', groupKey: 'svg-pipe.groups.style',
      options: [
        { value: 'miter', label: '尖角', labelKey: 'svg-pipe.options.strokeLinejoin.miter' },
        { value: 'round', label: '圆角', labelKey: 'svg-pipe.options.strokeLinejoin.round' },
        { value: 'bevel', label: '切角', labelKey: 'svg-pipe.options.strokeLinejoin.bevel' },
      ],
      defaultValue: 'round',
    },
    { name: 'strokeDasharray', label: '虚线', labelKey: 'svg-pipe.properties.strokeDasharray', type: 'text', defaultValue: '', group: 'style', groupKey: 'svg-pipe.groups.style' },
    {
      name: 'gradientType', label: '渐变类型', labelKey: 'svg-pipe.properties.gradientType', type: 'select', group: 'style', groupKey: 'svg-pipe.groups.style',
      options: [
        { value: 'none', label: '纯色', labelKey: 'svg-pipe.options.gradientType.none' },
        { value: 'linear', label: '线性渐变', labelKey: 'svg-pipe.options.gradientType.linear' },
        { value: 'radial', label: '径向渐变', labelKey: 'svg-pipe.options.gradientType.radial' },
      ],
      defaultValue: 'none',
    },
    { name: 'gradientStartColor', label: '渐变起始色', labelKey: 'svg-pipe.properties.gradientStartColor', type: 'color', defaultValue: '#3498DBFF', group: 'style', groupKey: 'svg-pipe.groups.style' },
    { name: 'gradientEndColor', label: '渐变结束色', labelKey: 'svg-pipe.properties.gradientEndColor', type: 'color', defaultValue: '#2C3E50FF', group: 'style', groupKey: 'svg-pipe.groups.style' },
    { name: 'filterShadow', label: '阴影', labelKey: 'svg-pipe.properties.filterShadow', type: 'boolean', defaultValue: false, group: 'style', groupKey: 'svg-pipe.groups.style' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'svg-pipe.properties.shadowColor', type: 'color', defaultValue: '#00000080', group: 'style', groupKey: 'svg-pipe.groups.style' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'svg-pipe.properties.shadowBlur', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4, group: 'style', groupKey: 'svg-pipe.groups.style' },
    { name: 'showFlowAnimation', label: '流动动画', labelKey: 'svg-pipe.properties.showFlowAnimation', type: 'boolean', defaultValue: true, group: 'animation', groupKey: 'svg-pipe.groups.animation' },
    { name: 'flowSpeed', label: '流速', labelKey: 'svg-pipe.properties.flowSpeed', type: 'number', min: 0.1, max: 5, step: 0.1, defaultValue: 1, group: 'animation', groupKey: 'svg-pipe.groups.animation' },
    { name: 'arrowSpacing', label: '箭头间距', labelKey: 'svg-pipe.properties.arrowSpacing', type: 'number', min: 10, max: 100, step: 5, defaultValue: 30, group: 'animation', groupKey: 'svg-pipe.groups.animation' },
    { name: 'arrowSize', label: '箭头大小', labelKey: 'svg-pipe.properties.arrowSize', type: 'number', min: 4, max: 30, step: 1, defaultValue: 8, group: 'animation', groupKey: 'svg-pipe.groups.animation' },
    {
      name: 'arrowStyle', label: '箭头样式', labelKey: 'svg-pipe.properties.arrowStyle', type: 'select', group: 'animation', groupKey: 'svg-pipe.groups.animation',
      options: [
        { value: 'triangle', label: '三角块', labelKey: 'svg-pipe.options.arrowStyle.triangle' },
        { value: 'rectangle', label: '长方形', labelKey: 'svg-pipe.options.arrowStyle.rectangle' },
        { value: 'square', label: '正方形', labelKey: 'svg-pipe.options.arrowStyle.square' },
      ],
      defaultValue: 'triangle',
    },
  ],
};