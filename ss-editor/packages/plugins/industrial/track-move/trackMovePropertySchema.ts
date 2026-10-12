// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const trackMovePropertySchema: PluginPropertySchema = {
  name: '轨迹动态',
  labelKey: 'track-move.label',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    // === 动画点 ===
    {
      name: 'dotStyle', label: '点样式', labelKey: 'track-move.properties.dotStyle', type: 'select', group: 'dot', groupKey: 'track-move.groups.dot',
      options: [
        { value: 'circle', label: '圆形', labelKey: 'track-move.options.dotStyle.circle' },
        { value: 'image', label: '图片', labelKey: 'track-move.options.dotStyle.image' },
      ],
      defaultValue: 'circle',
    },
    { name: 'dotColor', label: '点颜色', labelKey: 'track-move.properties.dotColor', type: 'color', defaultValue: '#FF5722FF', group: 'dot', groupKey: 'track-move.groups.dot' },
    { name: 'dotSize', label: '点大小', labelKey: 'track-move.properties.dotSize', type: 'number', min: 4, max: 60, step: 2, defaultValue: 12, group: 'dot', groupKey: 'track-move.groups.dot' },
    { name: 'dotImage', label: '图片URL', labelKey: 'track-move.properties.dotImage', type: 'text', defaultValue: '', group: 'dot', groupKey: 'track-move.groups.dot', placeholder: '输入图片URL' },
    { name: 'imageWidth', label: '图片宽度', labelKey: 'track-move.properties.imageWidth', type: 'number', min: 8, max: 120, step: 2, defaultValue: 24, group: 'dot', groupKey: 'track-move.groups.dot' },
    { name: 'imageHeight', label: '图片高度', labelKey: 'track-move.properties.imageHeight', type: 'number', min: 8, max: 120, step: 2, defaultValue: 24, group: 'dot', groupKey: 'track-move.groups.dot' },

    // === 轨道 ===
    { name: 'trackColor', label: '轨道颜色', labelKey: 'track-move.properties.trackColor', type: 'color', defaultValue: '#4A90A4FF', group: 'track', groupKey: 'track-move.groups.track' },
    { name: 'trackWidth', label: '轨道宽度', labelKey: 'track-move.properties.trackWidth', type: 'number', min: 1, max: 10, step: 1, defaultValue: 2, group: 'track', groupKey: 'track-move.groups.track' },
    {
      name: 'trackStyle', label: '轨道样式', labelKey: 'track-move.properties.trackStyle', type: 'select', group: 'track', groupKey: 'track-move.groups.track',
      options: [
        { value: 'solid', label: '实线', labelKey: 'track-move.options.trackStyle.solid' },
        { value: 'dashed', label: '虚线', labelKey: 'track-move.options.trackStyle.dashed' },
      ],
      defaultValue: 'dashed',
    },

    // === 运动 ===
    { name: 'status', label: '动画状态', labelKey: 'track-move.properties.status', type: 'boolean', defaultValue: true, group: 'motion', groupKey: 'track-move.groups.motion' },
    {
      name: 'direction', label: '移动方向', labelKey: 'track-move.properties.direction', type: 'select', group: 'motion', groupKey: 'track-move.groups.motion',
      options: [
        { value: 'forward', label: '正向', labelKey: 'track-move.options.direction.forward' },
        { value: 'backward', label: '反向', labelKey: 'track-move.options.direction.backward' },
      ],
      defaultValue: 'forward',
    },
    {
      name: 'loopMode', label: '循环模式', labelKey: 'track-move.properties.loopMode', type: 'select', group: 'motion', groupKey: 'track-move.groups.motion',
      options: [
        { value: 'loop', label: '循环', labelKey: 'track-move.options.loopMode.loop' },
        { value: 'once', label: '单次', labelKey: 'track-move.options.loopMode.once' },
        { value: 'bounce', label: '来回弹跳', labelKey: 'track-move.options.loopMode.bounce' },
      ],
      defaultValue: 'bounce',
    },
    { name: 'speed', label: '速度(px/s)', labelKey: 'track-move.properties.speed', type: 'number', min: 5, max: 500, step: 5, defaultValue: 50, group: 'motion', groupKey: 'track-move.groups.motion' },
  ],
};