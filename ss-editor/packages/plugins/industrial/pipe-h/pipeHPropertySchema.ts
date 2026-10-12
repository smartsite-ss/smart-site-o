// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const pipeHPropertySchema: PluginPropertySchema = {
  name: '管道-横向',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'pipeH.properties.width', type: 'number', min: 24, step: 1, defaultValue: 120, group: 'basic', groupKey: 'pipeH.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'pipeH.properties.height', type: 'number', min: 8, step: 1, defaultValue: 30, group: 'basic', groupKey: 'pipeH.groups.basic' },
    {
      name: 'status', label: '状态', labelKey: 'pipeH.properties.status', type: 'select',
      options: [
        { value: 'flowing', label: '流动中', labelKey: 'pipeH.options.status.flowing' },
        { value: 'stopped', label: '停止', labelKey: 'pipeH.options.status.stopped' },
        { value: 'blocked', label: '堵塞', labelKey: 'pipeH.options.status.blocked' }
      ],
      defaultValue: 'stopped', group: 'status', groupKey: 'pipeH.groups.status'
    },
    {
      name: 'direction', label: '流向', labelKey: 'pipeH.properties.direction', type: 'select',
      options: [
        { value: 'right', label: '向右', labelKey: 'pipeH.options.direction.right' },
        { value: 'left', label: '向左', labelKey: 'pipeH.options.direction.left' }
      ],
      defaultValue: 'right', group: 'basic', groupKey: 'pipeH.groups.basic'
    },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'pipeH.properties.pipeColor', type: 'color', defaultValue: '#4A90A4FF', group: 'color', groupKey: 'pipeH.groups.color' },
    { name: 'flowingColor', label: '流动颜色', labelKey: 'pipeH.properties.flowingColor', type: 'color', defaultValue: '#3498DBFF', group: 'color', groupKey: 'pipeH.groups.color' },
    { name: 'stoppedColor', label: '停止颜色', labelKey: 'pipeH.properties.stoppedColor', type: 'color', defaultValue: '#7F8C8DFF', group: 'color', groupKey: 'pipeH.groups.color' },
    { name: 'blockedColor', label: '堵塞颜色', labelKey: 'pipeH.properties.blockedColor', type: 'color', defaultValue: '#E74C3CFF', group: 'color', groupKey: 'pipeH.groups.color' },
    { name: 'pipeThickness', label: '管道粗细', labelKey: 'pipeH.properties.pipeThickness', type: 'number', min: 4, max: 60, step: 1, defaultValue: 20, group: 'style', groupKey: 'pipeH.groups.style' },
    { name: 'showFlange', label: '显示法兰', labelKey: 'pipeH.properties.showFlange', type: 'boolean', defaultValue: true, group: 'style', groupKey: 'pipeH.groups.style' },
    { name: 'flowSpeed', label: '流速', labelKey: 'pipeH.properties.flowSpeed', type: 'number', min: 0.1, max: 5, step: 0.1, defaultValue: 1, group: 'animation', groupKey: 'pipeH.groups.animation' },
    { name: 'showFlowAnimation', label: '显示流动动画', labelKey: 'pipeH.properties.showFlowAnimation', type: 'boolean', defaultValue: true, group: 'animation', groupKey: 'pipeH.groups.animation' }
  ],
};