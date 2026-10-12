// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';
export const naiveButtonPropertySchema: PluginPropertySchema = {
  name: 'Naive按钮',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'text', label: '按钮文本', labelKey: 'naiveButton.properties.text', type: 'text', defaultValue: '按钮', group: 'basic' },
    {
      name: 'type', label: '按钮类型', labelKey: 'naiveButton.properties.type', type: 'select',
      options: [
        { value: 'default', label: '默认', labelKey: 'naiveButton.options.type.default' },
        { value: 'primary', label: '主要', labelKey: 'naiveButton.options.type.primary' },
        { value: 'success', label: '成功', labelKey: 'naiveButton.options.type.success' },
        { value: 'warning', label: '警告', labelKey: 'naiveButton.options.type.warning' },
        { value: 'error', label: '错误', labelKey: 'naiveButton.options.type.error' },
        { value: 'info', label: '信息', labelKey: 'naiveButton.options.type.info' }
      ],
      defaultValue: 'primary', group: 'basic'
    },
    {
      name: 'size', label: '尺寸', labelKey: 'naiveButton.properties.size', type: 'select',
      options: [
        { value: 'small', label: '小', labelKey: 'naiveButton.options.size.small' },
        { value: 'medium', label: '中', labelKey: 'naiveButton.options.size.medium' },
        { value: 'large', label: '大', labelKey: 'naiveButton.options.size.large' }
      ],
      defaultValue: 'medium', group: 'basic'
    },
    { name: 'round', label: '圆角按钮', labelKey: 'naiveButton.properties.round', type: 'boolean', defaultValue: false, group: 'basic' },
    { name: 'circle', label: '圆形按钮', labelKey: 'naiveButton.properties.circle', type: 'boolean', defaultValue: false, group: 'basic' },
    { name: 'disabled', label: '禁用', labelKey: 'naiveButton.properties.disabled', type: 'boolean', defaultValue: false, group: 'basic' },
    { name: 'loading', label: '加载状态', labelKey: 'naiveButton.properties.loading', type: 'boolean', defaultValue: false, group: 'basic' }
  ],
};
