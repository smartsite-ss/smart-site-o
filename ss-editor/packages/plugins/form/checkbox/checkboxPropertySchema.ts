// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';
export const checkboxPropertySchema: PluginPropertySchema = {
  name: '复选框',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'checked', label: '选中状态', labelKey: 'checkbox.properties.checked', type: 'boolean', defaultValue: false, group: 'basic' },
    { name: 'label', label: '标签文本', labelKey: 'checkbox.properties.label', type: 'text', defaultValue: '复选框', group: 'basic' },
    { name: 'disabled', label: '禁用', labelKey: 'checkbox.properties.disabled', type: 'boolean', defaultValue: false, group: 'basic' },
    { name: 'indeterminate', label: '半选状态', labelKey: 'checkbox.properties.indeterminate', type: 'boolean', defaultValue: false, group: 'basic' },
    { name: 'color', label: '选中颜色', labelKey: 'checkbox.properties.color', type: 'color', defaultValue: '#18A058FF', group: 'style' },
    {
      name: 'labelPosition', label: '标签位置', labelKey: 'checkbox.properties.labelPosition', type: 'select',
      options: [
        { value: 'right', label: '右侧', labelKey: 'checkbox.options.labelPosition.right' },
        { value: 'left', label: '左侧', labelKey: 'checkbox.options.labelPosition.left' },
      ],
      defaultValue: 'right', group: 'style'
    },
    {
      name: 'size', label: '尺寸', labelKey: 'checkbox.properties.size', type: 'select',
      options: [
        { value: 'small', label: '小', labelKey: 'checkbox.options.size.small' },
        { value: 'medium', label: '中', labelKey: 'checkbox.options.size.medium' },
        { value: 'large', label: '大', labelKey: 'checkbox.options.size.large' },
      ],
      defaultValue: 'medium', group: 'style'
    }
  ],
};