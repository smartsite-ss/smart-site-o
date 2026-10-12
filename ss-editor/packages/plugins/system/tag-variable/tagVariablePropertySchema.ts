// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/**
 * 标签变量组件的显示配置 schema。
 * 仅包含「单位 + 显示格式 + 文本/边框/阴影样式」，字段复用 label 的对应字段。
 * 变量绑定字段（deviceId/deviceCode/deviceName/tagId/tagName/dataType）由
 * TagVariableConfig 以自定义 section 管理，不进入本 schema。
 */
export const tagVariablePropertySchema: PluginPropertySchema = {
  name: '标签变量',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    // ── 显示格式 + 单位（对齐 label） ──
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'label.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'unit' },
    { name: 'unit', label: '单位', labelKey: 'label.properties.unit', type: 'text', defaultValue: '', group: 'unit', options: [
      { value: '°C', label: '°C' },
      { value: '°F', label: '°F' },
      { value: '%', label: '%' },
      { value: 'MPa', label: 'MPa' },
      { value: 'kPa', label: 'kPa' },
      { value: 'Pa', label: 'Pa' },
      { value: 'bar', label: 'bar' },
      { value: 'V', label: 'V' },
      { value: 'kV', label: 'kV' },
      { value: 'A', label: 'A' },
      { value: 'mA', label: 'mA' },
      { value: 'W', label: 'W' },
      { value: 'kW', label: 'kW' },
      { value: 'Hz', label: 'Hz' },
      { value: 'rpm', label: 'rpm' },
      { value: 'm', label: 'm' },
      { value: 'cm', label: 'cm' },
      { value: 'mm', label: 'mm' },
      { value: 'm/s', label: 'm/s' },
      { value: 'm³/h', label: 'm³/h' },
      { value: 'L/s', label: 'L/s' },
      { value: 't/h', label: 't/h' },
      { value: 'kg', label: 'kg' },
      { value: 'ton', label: 'ton' },
      { value: 'pH', label: 'pH' },
      { value: 'lux', label: 'lux' },
      { value: 'dB', label: 'dB' },
      { value: 'ppm', label: 'ppm' },
    ] },
    { name: 'unitFontSize', label: '单位字体大小', labelKey: 'label.properties.unitFontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 12, group: 'unit' },
    { name: 'unitFontColor', label: '单位字体颜色', labelKey: 'label.properties.unitFontColor', type: 'color', defaultValue: '#666666FF', group: 'unit' },
    { name: 'unitGap', label: '单位间距', labelKey: 'label.properties.unitGap', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4, group: 'unit' },

    // ── 文本样式 ──
    { name: 'textColor', label: '文本颜色', labelKey: 'label.properties.textColor', type: 'color', defaultValue: '#333333FF', group: 'text' },
    { name: 'fontSize', label: '字体大小', labelKey: 'label.properties.fontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 14, group: 'text' },
    { name: 'fontWeight', label: '字体粗细', labelKey: 'label.properties.fontWeight', type: 'select', options: [{ value: 'normal', label: '正常', labelKey: 'label.options.fontWeight.normal' }, { value: 'bold', label: '粗体', labelKey: 'label.options.fontWeight.bold' }], defaultValue: 'normal', group: 'text' },
    { name: 'fontStyle', label: '字体样式', labelKey: 'label.properties.fontStyle', type: 'select', options: [{ value: 'normal', label: '正常', labelKey: 'label.options.fontStyle.normal' }, { value: 'italic', label: '斜体', labelKey: 'label.options.fontStyle.italic' }], defaultValue: 'normal', group: 'text' },
    { name: 'textAlign', label: '文本对齐', labelKey: 'label.properties.textAlign', type: 'select', options: [{ value: 'left', label: '左对齐', labelKey: 'label.options.textAlign.left' }, { value: 'center', label: '居中', labelKey: 'label.options.textAlign.center' }, { value: 'right', label: '右对齐', labelKey: 'label.options.textAlign.right' }], defaultValue: 'left', group: 'text' },
    { name: 'verticalAlignment', label: '垂直对齐', labelKey: 'label.properties.verticalAlignment', type: 'select', options: [{ value: 'top', label: '顶部', labelKey: 'label.options.verticalAlignment.top' }, { value: 'middle', label: '居中', labelKey: 'label.options.verticalAlignment.middle' }, { value: 'bottom', label: '底部', labelKey: 'label.options.verticalAlignment.bottom' }], defaultValue: 'middle', group: 'text' },

    // ── 背景 / 边框 ──
    { name: 'backgroundColor', label: '背景色', labelKey: 'label.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'borderColor', label: '边框色', labelKey: 'label.properties.borderColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'label.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'label.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },

    // ── 文字阴影 ──
    { name: 'textShadowColor', label: '文字阴影色', labelKey: 'label.properties.textShadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow' },
    { name: 'textShadowOffsetX', label: '阴影偏移X', labelKey: 'label.properties.textShadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'textShadowOffsetY', label: '阴影偏移Y', labelKey: 'label.properties.textShadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'textShadowBlur', label: '阴影模糊', labelKey: 'label.properties.textShadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow' },
  ],
};
