// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';
export const inputPropertySchema: PluginPropertySchema = {
  name: '输入框',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'value', label: '值', labelKey: 'input.properties.value', type: 'text', defaultValue: '', group: 'basic' },
    { name: 'placeholder', label: '占位符', labelKey: 'input.properties.placeholder', type: 'text', defaultValue: '请输入...', group: 'basic' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'input.properties.backgroundColor', type: 'color', defaultValue: '#FFFFFFFF', group: 'style' },
    { name: 'borderColor', label: '边框色', labelKey: 'input.properties.borderColor', type: 'color', defaultValue: '#CED4DAFF', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'input.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 1, group: 'style' },
    {
      name: 'borderStyle', label: '边框样式', labelKey: 'input.properties.borderStyle', type: 'select',
      options: [
        { value: 'solid', label: '实线', labelKey: 'input.options.borderStyle.solid' },
        { value: 'dashed', label: '虚线', labelKey: 'input.options.borderStyle.dashed' },
        { value: 'dotted', label: '点线', labelKey: 'input.options.borderStyle.dotted' },
      ],
      defaultValue: 'solid', group: 'style'
    },
    { name: 'borderRadius', label: '圆角', labelKey: 'input.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'style' },
    { name: 'textColor', label: '文本颜色', labelKey: 'input.properties.textColor', type: 'color', defaultValue: '#333333FF', group: 'style' },
    { name: 'fontSize', label: '字体大小', labelKey: 'input.properties.fontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 14, group: 'text' },
    {
      name: 'fontWeight', label: '字体粗细', labelKey: 'input.properties.fontWeight', type: 'select',
      options: [
        { value: 'normal', label: '正常', labelKey: 'input.options.fontWeight.normal' },
        { value: 'bold', label: '粗体', labelKey: 'input.options.fontWeight.bold' },
      ],
      defaultValue: 'normal', group: 'text'
    },
    {
      name: 'textAlign', label: '文本对齐', labelKey: 'input.properties.textAlign', type: 'select',
      options: [
        { value: 'left', label: '左对齐', labelKey: 'input.options.textAlign.left' },
        { value: 'center', label: '居中', labelKey: 'input.options.textAlign.center' },
        { value: 'right', label: '右对齐', labelKey: 'input.options.textAlign.right' },
      ],
      defaultValue: 'left', group: 'text'
    },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'input.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'input.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'input.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'input.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow' },
  ],
};