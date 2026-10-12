// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const waterpumpPropertySchema: PluginPropertySchema = {
  name: '水泵',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'waterpump.properties.width', type: 'number', min: 60, step: 1, defaultValue: 120, group: 'basic', groupKey: 'waterpump.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'waterpump.properties.height', type: 'number', min: 40, step: 1, defaultValue: 60, group: 'basic', groupKey: 'waterpump.groups.basic' },
    {
      name: 'status', label: '状态', labelKey: 'waterpump.properties.status', type: 'select',
      options: [
        { value: 'running', label: '运行中', labelKey: 'waterpump.options.status.running' },
        { value: 'stopped', label: '已停止', labelKey: 'waterpump.options.status.stopped' },
        { value: 'fault', label: '故障', labelKey: 'waterpump.options.status.fault' }
      ],
      defaultValue: 'stopped', group: 'status', groupKey: 'waterpump.groups.status'
    },
    { name: 'bodyColor', label: '框架颜色', labelKey: 'waterpump.properties.bodyColor', type: 'color', defaultValue: '#5D6D7EFF', group: 'color', groupKey: 'waterpump.groups.color' },
    { name: 'impellerColor', label: '风叶颜色', labelKey: 'waterpump.properties.impellerColor', type: 'color', defaultValue: '#2C3E50FF', group: 'color', groupKey: 'waterpump.groups.color' },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'waterpump.properties.pipeColor', type: 'color', defaultValue: '#7F8C8DFF', group: 'color', groupKey: 'waterpump.groups.color' },
    { name: 'flangeColor', label: '法兰颜色', labelKey: 'waterpump.properties.flangeColor', type: 'color', defaultValue: '#95A5A6FF', group: 'color', groupKey: 'waterpump.groups.color' },
    { name: 'highlightColor', label: '高亮颜色', labelKey: 'waterpump.properties.highlightColor', type: 'color', defaultValue: '#5CB85CFF', group: 'color', groupKey: 'waterpump.groups.color' },
    { name: 'showAnimation', label: '显示动画', labelKey: 'waterpump.properties.showAnimation', type: 'boolean', defaultValue: true, group: 'animation', groupKey: 'waterpump.groups.animation' },
    { name: 'rotationSpeed', label: '转速', labelKey: 'waterpump.properties.rotationSpeed', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 2, group: 'animation', groupKey: 'waterpump.groups.animation' },
    {
      name: 'rotationDirection', label: '旋转方向', labelKey: 'waterpump.properties.rotationDirection', type: 'select',
      options: [
        { value: 'clockwise', label: '顺时针', labelKey: 'waterpump.options.rotationDirection.clockwise' },
        { value: 'counterclockwise', label: '逆时针', labelKey: 'waterpump.options.rotationDirection.counterclockwise' }
      ],
      defaultValue: 'clockwise', group: 'animation', groupKey: 'waterpump.groups.animation'
    },
    { name: 'showLabel', label: '显示标签', labelKey: 'waterpump.properties.showLabel', type: 'boolean', defaultValue: true, group: 'label', groupKey: 'waterpump.groups.label' },
    { name: 'labelText', label: '标签文本', labelKey: 'waterpump.properties.labelText', type: 'text', defaultValue: '', group: 'label', groupKey: 'waterpump.groups.label' },
    { name: 'runningValue', label: '运行对应值', labelKey: 'waterpump.properties.runningValue', type: 'text', defaultValue: '1', group: 'binding', groupKey: 'waterpump.groups.binding' },
    { name: 'stoppedValue', label: '停止对应值', labelKey: 'waterpump.properties.stoppedValue', type: 'text', defaultValue: '0', group: 'binding', groupKey: 'waterpump.groups.binding' },
    { name: 'faultValue', label: '故障对应值', labelKey: 'waterpump.properties.faultValue', type: 'text', defaultValue: '2', group: 'binding', groupKey: 'waterpump.groups.binding' },
    {
      name: 'defaultStatus', label: '默认状态', labelKey: 'waterpump.properties.defaultStatus', type: 'select',
      options: [
        { value: 'running', label: '运行中', labelKey: 'waterpump.options.status.running' },
        { value: 'stopped', label: '已停止', labelKey: 'waterpump.options.status.stopped' },
        { value: 'fault', label: '故障', labelKey: 'waterpump.options.status.fault' }
      ],
      defaultValue: 'stopped', group: 'binding', groupKey: 'waterpump.groups.binding'
    }
  ],
};
