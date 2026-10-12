// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const pumpPropertySchema: PluginPropertySchema = {
  name: '泵',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'pump.properties.width', type: 'number', min: 20, step: 1, defaultValue: 80, group: 'basic', groupKey: 'pump.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'pump.properties.height', type: 'number', min: 20, step: 1, defaultValue: 80, group: 'basic', groupKey: 'pump.groups.basic' },
    {
      name: 'status', label: '状态', labelKey: 'pump.properties.status', type: 'select',
      options: [
        { value: 'running', label: '运行中', labelKey: 'pump.options.status.running' },
        { value: 'stopped', label: '已停止', labelKey: 'pump.options.status.stopped' },
        { value: 'fault', label: '故障', labelKey: 'pump.options.status.fault' }
      ],
      defaultValue: 'stopped', group: 'status', groupKey: 'pump.groups.status'
    },
    { name: 'bodyColor', label: '主体颜色', labelKey: 'pump.properties.bodyColor', type: 'color', defaultValue: '#4A90A4FF', group: 'color', groupKey: 'pump.groups.color' },
    { name: 'impellerColor', label: '叶轮颜色', labelKey: 'pump.properties.impellerColor', type: 'color', defaultValue: '#2E6B7DFF', group: 'color', groupKey: 'pump.groups.color' },
    { name: 'highlightColor', label: '高亮颜色', labelKey: 'pump.properties.highlightColor', type: 'color', defaultValue: '#5CB85CFF', group: 'color', groupKey: 'pump.groups.color' },
    { name: 'showAnimation', label: '显示动画', labelKey: 'pump.properties.showAnimation', type: 'boolean', defaultValue: true, group: 'animation', groupKey: 'pump.groups.animation' },
    { name: 'animationSpeed', label: '转速', labelKey: 'pump.properties.animationSpeed', type: 'number', min: 0.1, max: 5, step: 0.1, defaultValue: 1, group: 'animation', groupKey: 'pump.groups.animation' },
    {
      name: 'rotationDirection', label: '旋转方向', labelKey: 'pump.properties.rotationDirection', type: 'select',
      options: [
        { value: 'clockwise', label: '顺时针', labelKey: 'pump.options.rotationDirection.clockwise' },
        { value: 'counterclockwise', label: '逆时针', labelKey: 'pump.options.rotationDirection.counterclockwise' }
      ],
      defaultValue: 'clockwise', group: 'animation', groupKey: 'pump.groups.animation'
    },
    { name: 'showLabel', label: '显示标签', labelKey: 'pump.properties.showLabel', type: 'boolean', defaultValue: true, group: 'label', groupKey: 'pump.groups.label' },
    { name: 'labelText', label: '标签文本', labelKey: 'pump.properties.labelText', type: 'text', defaultValue: '', group: 'label', groupKey: 'pump.groups.label' },
    { name: 'runningValue', label: '运行对应值', labelKey: 'pump.properties.runningValue', type: 'text', defaultValue: '1', group: 'binding', groupKey: 'pump.groups.binding' },
    { name: 'stoppedValue', label: '停止对应值', labelKey: 'pump.properties.stoppedValue', type: 'text', defaultValue: '0', group: 'binding', groupKey: 'pump.groups.binding' },
    { name: 'faultValue', label: '故障对应值', labelKey: 'pump.properties.faultValue', type: 'text', defaultValue: '2', group: 'binding', groupKey: 'pump.groups.binding' },
    {
      name: 'defaultStatus', label: '默认状态', labelKey: 'pump.properties.defaultStatus', type: 'select',
      options: [
        { value: 'running', label: '运行中', labelKey: 'pump.options.status.running' },
        { value: 'stopped', label: '已停止', labelKey: 'pump.options.status.stopped' },
        { value: 'fault', label: '故障', labelKey: 'pump.options.status.fault' }
      ],
      defaultValue: 'stopped', group: 'binding', groupKey: 'pump.groups.binding'
    }
  ],
};
