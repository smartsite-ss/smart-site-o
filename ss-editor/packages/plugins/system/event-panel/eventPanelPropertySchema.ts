// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/**
 * 事件面板组件的属性 schema。
 * 仅包含「列表行为 + 列显隐 + 排版 + 容器样式」。
 * 项目筛选（projectId）、事件类型（eventType）、状态（status）由 EventPanelConfig
 * 以自定义 section 管理，不进入本 schema。
 */
export const eventPanelPropertySchema: PluginPropertySchema = {
  name: '事件面板',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    // ── 列表行为 ──
    { name: 'pageSize', label: '每页条数', labelKey: 'eventPanel.properties.pageSize', type: 'number', min: 1, max: 100, step: 1, defaultValue: 20, group: 'basic' },
    { name: 'refreshInterval', label: '刷新间隔(秒)', labelKey: 'eventPanel.properties.refreshInterval', type: 'number', min: 0, max: 3600, step: 5, defaultValue: 30, group: 'basic' },

    // ── 列显隐 ──
    { name: 'showHeader', label: '显示列头', labelKey: 'eventPanel.properties.showHeader', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'showTime', label: '时间列', labelKey: 'eventPanel.properties.showTime', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'showEventType', label: '事件类型列', labelKey: 'eventPanel.properties.showEventType', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'showProject', label: '项目列', labelKey: 'eventPanel.properties.showProject', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'showOperator', label: '操作者列', labelKey: 'eventPanel.properties.showOperator', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'showStatus', label: '状态列', labelKey: 'eventPanel.properties.showStatus', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'showSuccessRatio', label: '成功率列', labelKey: 'eventPanel.properties.showSuccessRatio', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'showDuration', label: '耗时列', labelKey: 'eventPanel.properties.showDuration', type: 'boolean', defaultValue: true, group: 'basic' },

    // ── 排版 ──
    { name: 'fontSize', label: '字号', labelKey: 'eventPanel.properties.fontSize', type: 'number', min: 8, max: 24, step: 1, defaultValue: 12, group: 'visual' },
    { name: 'rowHeight', label: '行高', labelKey: 'eventPanel.properties.rowHeight', type: 'number', min: 16, max: 64, step: 1, defaultValue: 32, group: 'visual' },
    { name: 'headerBackgroundColor', label: '列头背景', labelKey: 'eventPanel.properties.headerBackgroundColor', type: 'color', defaultValue: '#00000000', group: 'visual' },
    { name: 'rowBackgroundColor', label: '行背景', labelKey: 'eventPanel.properties.rowBackgroundColor', type: 'color', defaultValue: '#00000000', group: 'visual' },
    { name: 'alternatingRowColor', label: '隔行背景', labelKey: 'eventPanel.properties.alternatingRowColor', type: 'color', defaultValue: '#00000000', group: 'visual' },
    { name: 'textColor', label: '正文颜色', labelKey: 'eventPanel.properties.textColor', type: 'color', defaultValue: 'var(--text)', group: 'visual' },

    // ── 容器样式 ──
    { name: 'backgroundColor', label: '背景色', labelKey: 'eventPanel.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'visual' },
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
