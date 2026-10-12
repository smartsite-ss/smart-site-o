// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/**
 * 海康视频组件的视频墙样式 schema。
 * 仅包含「布局 + 播放行为 + 通道名显示 + 容器样式」，字段复用 image 组件对应字段。
 * 通道列表（channels）由 HikvisionVideoConfig 以自定义 section 管理，不进入本 schema。
 */
export const hikvisionVideoPropertySchema: PluginPropertySchema = {
  name: '海康视频',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    // ── 布局 ──
    {
      name: 'layout',
      label: '视频布局',
      labelKey: 'hikvisionVideo.properties.layout',
      type: 'select',
      options: [
        { value: '1x1', label: '1 路', labelKey: 'hikvisionVideo.options.layout.1x1' },
        { value: '2x2', label: '4 路', labelKey: 'hikvisionVideo.options.layout.2x2' },
        { value: '3x3', label: '9 路', labelKey: 'hikvisionVideo.options.layout.3x3' },
      ],
      defaultValue: '1x1',
      group: 'basic',
    },

    // ── 播放行为 ──
    { name: 'autoPlay', label: '自动播放', labelKey: 'hikvisionVideo.properties.autoPlay', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'muted', label: '静音', labelKey: 'hikvisionVideo.properties.muted', type: 'boolean', defaultValue: true, group: 'basic' },
    {
      name: 'objectFit',
      label: '画面适应',
      labelKey: 'hikvisionVideo.properties.objectFit',
      type: 'select',
      options: [
        { value: 'contain', label: '包含', labelKey: 'hikvisionVideo.options.objectFit.contain' },
        { value: 'cover', label: '覆盖', labelKey: 'hikvisionVideo.options.objectFit.cover' },
        { value: 'fill', label: '填充', labelKey: 'hikvisionVideo.options.objectFit.fill' },
      ],
      defaultValue: 'contain',
      group: 'basic',
    },

    // ── 通道名显示 ──
    { name: 'showChannelName', label: '显示通道名', labelKey: 'hikvisionVideo.properties.showChannelName', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'nameColor', label: '通道名颜色', labelKey: 'hikvisionVideo.properties.nameColor', type: 'color', defaultValue: '#FFFFFF', group: 'basic' },
    { name: 'nameFontSize', label: '通道名字号', labelKey: 'hikvisionVideo.properties.nameFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 12, group: 'basic' },
    { name: 'nameBackgroundColor', label: '通道名背景', labelKey: 'hikvisionVideo.properties.nameBackgroundColor', type: 'color', defaultValue: '#00000080', group: 'basic' },

    // ── 容器样式 ──
    { name: 'backgroundColor', label: '背景色', labelKey: 'hikvisionVideo.properties.backgroundColor', type: 'color', defaultValue: '#000000', group: 'visual' },
    { name: 'gap', label: '通道间距', labelKey: 'hikvisionVideo.properties.gap', type: 'number', min: 0, max: 20, step: 1, defaultValue: 2, group: 'visual' },
    { name: 'borderColor', label: '边框颜色', labelKey: 'image.properties.borderColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'image.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },
    {
      name: 'borderStyle',
      label: '边框样式',
      labelKey: 'image.properties.borderStyle',
      type: 'select',
      options: [
        { value: 'solid', label: '实线', labelKey: 'image.options.borderStyle.solid' },
        { value: 'dashed', label: '虚线', labelKey: 'image.options.borderStyle.dashed' },
        { value: 'dotted', label: '点线', labelKey: 'image.options.borderStyle.dotted' },
      ],
      defaultValue: 'solid',
      group: 'style',
    },
    { name: 'borderRadius', label: '圆角', labelKey: 'image.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'image.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'image.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'image.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'image.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow' },
  ],
};
