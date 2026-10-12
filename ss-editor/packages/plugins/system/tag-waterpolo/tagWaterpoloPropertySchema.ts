// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/** tag-waterpolo 变量水球图全局配置（变量绑定由 TagVariableSelector 自定义 section 管理） */
export const tagWaterpoloPropertySchema: PluginPropertySchema = {
  name: '变量水球图',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'title', label: '标题', labelKey: 'tagWaterpolo.properties.title', type: 'text', defaultValue: '', group: '标题' },
    { name: 'titleColor', label: '标题颜色', labelKey: 'tagWaterpolo.properties.titleColor', type: 'color', defaultValue: '#333333FF', group: '标题' },
    { name: 'titleFontSize', label: '标题字号', labelKey: 'tagWaterpolo.properties.titleFontSize', type: 'number', min: 8, max: 48, step: 1, defaultValue: 14, group: '标题' },

    { name: 'unit', label: '单位', labelKey: 'tagWaterpolo.properties.unit', type: 'text', defaultValue: '', group: '数值' },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'label.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: '数值' },
    { name: 'minValue', label: '最小值', labelKey: 'tagWaterpolo.properties.minValue', type: 'number', step: 0.01, defaultValue: 0, group: '数值' },
    { name: 'maxValue', label: '最大值', labelKey: 'tagWaterpolo.properties.maxValue', type: 'number', step: 0.01, defaultValue: 100, group: '数值' },
    { name: 'showValue', label: '显示数值', labelKey: 'tagWaterpolo.properties.showValue', type: 'boolean', defaultValue: true, group: '数值' },
    { name: 'valueColor', label: '数值颜色', labelKey: 'tagWaterpolo.properties.valueColor', type: 'color', defaultValue: '#333333FF', group: '数值' },

    { name: 'waterColor', label: '水球颜色', labelKey: 'tagWaterpolo.properties.waterColor', type: 'color', defaultValue: '#1890FFFF', group: '颜色' },
    { name: 'trackColor', label: '轨道颜色', labelKey: 'tagWaterpolo.properties.trackColor', type: 'color', defaultValue: '#E9ECEF', group: '颜色' },

    { name: 'backgroundColor', label: '背景色', labelKey: 'tagWaterpolo.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderColor', label: '边框色', labelKey: 'tagWaterpolo.properties.borderColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'tagWaterpolo.properties.borderWidth', type: 'number', min: 0, max: 10, step: 1, defaultValue: 0, group: '样式' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'tagWaterpolo.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'tagWaterpolo.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'tagWaterpolo.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'tagWaterpolo.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: '样式' },
    { name: 'borderRadius', label: '圆角', labelKey: 'tagWaterpolo.properties.borderRadius', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4, group: '样式' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'tagWaterpolo.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: '样式' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'tagWaterpolo.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'tagWaterpolo.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: '样式' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'tagWaterpolo.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: '样式' },
  ],
};
