// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const pipePropertySchema: PluginPropertySchema = {
  name: '管道-竖向',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'pipe.properties.width', type: 'number', min: 24, step: 1, defaultValue: 120, group: 'basic', groupKey: 'pipe.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'pipe.properties.height', type: 'number', min: 8, step: 1, defaultValue: 24, group: 'basic', groupKey: 'pipe.groups.basic' },
    {
      name: 'status', label: '状态', labelKey: 'pipe.properties.status', type: 'select',
      options: [
        { value: 'flowing', label: '流动中', labelKey: 'pipe.options.status.flowing' },
        { value: 'stopped', label: '停止', labelKey: 'pipe.options.status.stopped' },
        { value: 'blocked', label: '堵塞', labelKey: 'pipe.options.status.blocked' }
      ],
      defaultValue: 'stopped', group: 'status', groupKey: 'pipe.groups.status'
    },
    {
      name: 'direction', label: '流向', labelKey: 'pipe.properties.direction', type: 'select',
      options: [
        { value: 'down', label: '向下', labelKey: 'pipe.options.direction.down' },
        { value: 'up', label: '向上', labelKey: 'pipe.options.direction.up' }
      ],
      defaultValue: 'down', group: 'basic', groupKey: 'pipe.groups.basic'
    },
    { name: 'pipeColor', label: '管道颜色', labelKey: 'pipe.properties.pipeColor', type: 'color', defaultValue: '#4A90A4FF', group: 'color', groupKey: 'pipe.groups.color' },
    { name: 'flowingColor', label: '流动颜色', labelKey: 'pipe.properties.flowingColor', type: 'color', defaultValue: '#3498DBFF', group: 'color', groupKey: 'pipe.groups.color' },
    { name: 'stoppedColor', label: '停止颜色', labelKey: 'pipe.properties.stoppedColor', type: 'color', defaultValue: '#7F8C8DFF', group: 'color', groupKey: 'pipe.groups.color' },
    { name: 'blockedColor', label: '堵塞颜色', labelKey: 'pipe.properties.blockedColor', type: 'color', defaultValue: '#E74C3CFF', group: 'color', groupKey: 'pipe.groups.color' },
    { name: 'pipeThickness', label: '管道粗细', labelKey: 'pipe.properties.pipeThickness', type: 'number', min: 4, max: 60, step: 1, defaultValue: 20, group: 'style', groupKey: 'pipe.groups.style' },
    { name: 'showFlange', label: '显示法兰', labelKey: 'pipe.properties.showFlange', type: 'boolean', defaultValue: true, group: 'style', groupKey: 'pipe.groups.style' },
    { name: 'flowSpeed', label: '流速', labelKey: 'pipe.properties.flowSpeed', type: 'number', min: 0.1, max: 5, step: 0.1, defaultValue: 1, group: 'animation', groupKey: 'pipe.groups.animation' },
    { name: 'showFlowAnimation', label: '显示流动动画', labelKey: 'pipe.properties.showFlowAnimation', type: 'boolean', defaultValue: true, group: 'animation', groupKey: 'pipe.groups.animation' }
  ],
};