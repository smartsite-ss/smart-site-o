// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const buttonPropertySchema: PluginPropertySchema = {
  name: '按钮',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'text', label: '文本', labelKey: 'button.properties.text', type: 'text', defaultValue: 'Button', group: 'basic' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'button.properties.backgroundColor', type: 'color', defaultValue: '#2196F3FF', group: 'style' },
    { name: 'fontColor', label: '文本色', labelKey: 'button.properties.fontColor', type: 'color', defaultValue: '#FFFFFFFF', group: 'style' },
    { name: 'borderColor', label: '边框色', labelKey: 'button.properties.borderColor', type: 'color', defaultValue: '#2196F3FF', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'button.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 1, group: 'style' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'button.properties.borderStyle', type: 'select', options: [{ value: 'solid', label: '实线', labelKey: 'button.options.borderStyle.solid' }, { value: 'dashed', label: '虚线', labelKey: 'button.options.borderStyle.dashed' }, { value: 'dotted', label: '点线', labelKey: 'button.options.borderStyle.dotted' }], defaultValue: 'solid', group: 'style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'button.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'style' },
    { name: 'fontSize', label: '字体大小', labelKey: 'button.properties.fontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 14, group: 'text' },
    { name: 'fontWeight', label: '字体粗细', labelKey: 'button.properties.fontWeight', type: 'select', options: [{ value: 'normal', label: '正常', labelKey: 'button.options.fontWeight.normal' }, { value: 'bold', label: '粗体', labelKey: 'button.options.fontWeight.bold' }], defaultValue: 'normal', group: 'text' },
    { name: 'textAlign', label: '文本对齐', labelKey: 'button.properties.textAlign', type: 'select', options: [{ value: 'left', label: '左对齐', labelKey: 'button.options.textAlign.left' }, { value: 'center', label: '居中', labelKey: 'button.options.textAlign.center' }, { value: 'right', label: '右对齐', labelKey: 'button.options.textAlign.right' }], defaultValue: 'center', group: 'text' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'button.properties.shadowColor', type: 'color', defaultValue: '#0000004C', group: 'shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'button.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 2, group: 'shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'button.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 2, group: 'shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'button.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'shadow' },
    { name: 'targetType', label: '点击动作', labelKey: 'button.properties.targetType', type: 'select', options: [{ value: 'none', label: '无', labelKey: 'button.options.targetType.none' }, { value: 'page', label: '打开页面', labelKey: 'button.options.targetType.page' }, { value: 'url', label: '打开URL', labelKey: 'button.options.targetType.url' }], defaultValue: 'none', group: 'action' },
    { name: 'targetPage', label: '目标页面', labelKey: 'button.properties.targetPage', type: 'select', optionsProvider: 'pageStore.pages', group: 'action' },
    { name: 'targetUrl', label: '目标URL', labelKey: 'button.properties.targetUrl', type: 'text', defaultValue: '', placeholder: 'https://', group: 'action' },
  ],
};