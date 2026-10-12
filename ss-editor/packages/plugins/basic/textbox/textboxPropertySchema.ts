// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const textboxPropertySchema: PluginPropertySchema = {
  name: '文本框',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'text', label: '文本内容', labelKey: 'textbox.properties.text', type: 'textarea', defaultValue: 'Textbox', group: 'basic' },
    { name: 'placeholder', label: '占位符', labelKey: 'textbox.properties.placeholder', type: 'text', defaultValue: 'Enter text...', group: 'basic' },
    { name: 'fontSize', label: '字体大小', labelKey: 'textbox.properties.fontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 14, group: 'text' },
    { name: 'fontWeight', label: '字体粗细', labelKey: 'textbox.properties.fontWeight', type: 'select', options: [{ value: 'normal', label: '正常', labelKey: 'textbox.options.fontWeight.normal' }, { value: 'bold', label: '粗体', labelKey: 'textbox.options.fontWeight.bold' }], defaultValue: 'normal', group: 'text' },
    { name: 'fontStyle', label: '字体样式', labelKey: 'textbox.properties.fontStyle', type: 'select', options: [{ value: 'normal', label: '正常', labelKey: 'textbox.options.fontStyle.normal' }, { value: 'italic', label: '斜体', labelKey: 'textbox.options.fontStyle.italic' }], defaultValue: 'normal', group: 'text' },
    { name: 'textColor', label: '文本颜色', labelKey: 'textbox.properties.textColor', type: 'color', defaultValue: '#333333FF', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'textbox.properties.backgroundColor', type: 'color', defaultValue: '#FFFFFFFF', group: 'style' },
    { name: 'borderColor', label: '边框色', labelKey: 'textbox.properties.borderColor', type: 'color', defaultValue: '#CCCCCCFF', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'textbox.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 1, group: 'style' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'textbox.properties.borderStyle', type: 'select', options: [{ value: 'solid', label: '实线', labelKey: 'textbox.options.borderStyle.solid' }, { value: 'dashed', label: '虚线', labelKey: 'textbox.options.borderStyle.dashed' }, { value: 'dotted', label: '点线', labelKey: 'textbox.options.borderStyle.dotted' }, { value: 'none', label: '无', labelKey: 'textbox.options.borderStyle.none' }], defaultValue: 'solid', group: 'style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'textbox.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'style' },
    { name: 'textAlign', label: '文本对齐', labelKey: 'textbox.properties.textAlign', type: 'select', options: [{ value: 'left', label: '左对齐', labelKey: 'textbox.options.textAlign.left' }, { value: 'center', label: '居中', labelKey: 'textbox.options.textAlign.center' }, { value: 'right', label: '右对齐', labelKey: 'textbox.options.textAlign.right' }], defaultValue: 'left', group: 'text' },
    { name: 'verticalAlignment', label: '垂直对齐', labelKey: 'textbox.properties.verticalAlignment', type: 'select', options: [{ value: 'top', label: '顶部', labelKey: 'textbox.options.verticalAlignment.top' }, { value: 'middle', label: '居中', labelKey: 'textbox.options.verticalAlignment.middle' }, { value: 'bottom', label: '底部', labelKey: 'textbox.options.verticalAlignment.bottom' }], defaultValue: 'top', group: 'text' },
    { name: 'padding', label: '内边距', labelKey: 'textbox.properties.padding', type: 'number', min: 0, step: 1, defaultValue: 10, group: 'style' },
    { name: 'multiline', label: '多行模式', labelKey: 'textbox.properties.multiline', type: 'boolean', defaultValue: true, group: 'basic' },
    { name: 'readOnly', label: '只读', labelKey: 'textbox.properties.readOnly', type: 'boolean', defaultValue: false, group: 'basic' },
  ],
};