// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

/**
 * 标签值组件的显示配置 schema。
 * 包含「形态 + 名称/别名 + 装饰图片 + 单位 + 文本/边框/阴影」，显示字段复用 label 的对应字段。
 * 变量绑定字段（deviceId/deviceCode/deviceName/tagId/tagName/dataType）与装饰图片本身
 * （decorationImage）由 TagValueConfig 以自定义 section 管理，不进入本 schema。
 */
export const tagValuePropertySchema: PluginPropertySchema = {
  name: '装饰标签变量',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    // ── 形态 ──
    {
      name: 'shape',
      label: '形态',
      labelKey: 'tagValue.properties.shape',
      type: 'select',
      options: [
        { value: 'rectangle', label: '方形', labelKey: 'tagValue.options.shape.rectangle' },
        { value: 'circle', label: '圆形', labelKey: 'tagValue.options.shape.circle' },
      ],
      defaultValue: 'rectangle',
      group: 'shape',
    },

    // ── 名称 / 别名 ──
    { name: 'alias', label: '别名', labelKey: 'tagValue.properties.alias', type: 'text', defaultValue: '', group: 'name' },
    { name: 'showName', label: '显示名称', labelKey: 'tagValue.properties.showName', type: 'boolean', defaultValue: true, group: 'name' },
    { name: 'nameColor', label: '名称颜色', labelKey: 'tagValue.properties.nameColor', type: 'color', defaultValue: '#333333FF', group: 'name' },
    { name: 'nameFontSize', label: '名称字号', labelKey: 'tagValue.properties.nameFontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 12, group: 'name' },
    { name: 'nameFontWeight', label: '名称粗细', labelKey: 'tagValue.properties.nameFontWeight', type: 'select', options: [{ value: 'normal', label: '正常', labelKey: 'label.options.fontWeight.normal' }, { value: 'bold', label: '粗体', labelKey: 'label.options.fontWeight.bold' }], defaultValue: 'normal', group: 'name' },
    { name: 'nameGap', label: '名称间距', labelKey: 'tagValue.properties.nameGap', type: 'number', min: 0, max: 40, step: 1, defaultValue: 4, group: 'name' },

    // ── 装饰图片 ──
    {
      name: 'decorationImagePosition',
      label: '装饰图位置',
      labelKey: 'tagValue.properties.decorationImagePosition',
      type: 'select',
      options: [
        { value: 'left', label: '左侧', labelKey: 'tagValue.options.decorationPosition.left' },
        { value: 'right', label: '右侧', labelKey: 'tagValue.options.decorationPosition.right' },
        { value: 'background', label: '背景', labelKey: 'tagValue.options.decorationPosition.background' },
        { value: 'center', label: '居中', labelKey: 'tagValue.options.decorationPosition.center' },
      ],
      defaultValue: 'left',
      group: 'decoration',
    },
    { name: 'decorationImageSize', label: '装饰图尺寸', labelKey: 'tagValue.properties.decorationImageSize', type: 'number', min: 4, max: 200, step: 1, defaultValue: 24, group: 'decoration' },
    { name: 'decorationImageOpacity', label: '装饰图透明度', labelKey: 'tagValue.properties.decorationImageOpacity', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 1, group: 'decoration' },

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
    { name: 'backgroundRepeat', label: '背景平铺', labelKey: 'tagValue.properties.backgroundRepeat', type: 'select', options: [
      { value: 'repeat', label: '平铺', labelKey: 'tagValue.options.backgroundRepeat.repeat' },
      { value: 'no-repeat', label: '不平铺', labelKey: 'tagValue.options.backgroundRepeat.no-repeat' },
      { value: 'repeat-x', label: '横向平铺', labelKey: 'tagValue.options.backgroundRepeat.repeat-x' },
      { value: 'repeat-y', label: '纵向平铺', labelKey: 'tagValue.options.backgroundRepeat.repeat-y' },
    ], defaultValue: 'repeat', group: 'style' },
    { name: 'backgroundImageFit', label: '填充样式', labelKey: 'tagValue.properties.backgroundImageFit', type: 'select', options: [
      { value: 'contain', label: '包含', labelKey: 'image.options.imageFit.contain' },
      { value: 'cover', label: '覆盖', labelKey: 'image.options.imageFit.cover' },
      { value: 'fill', label: '填充', labelKey: 'image.options.imageFit.fill' },
      { value: 'none', label: '原始', labelKey: 'image.options.imageFit.none' },
      { value: 'scale-down', label: '缩小', labelKey: 'image.options.imageFit.scale-down' },
    ], defaultValue: 'fill', group: 'style' },
    { name: 'borderColor', label: '边框色', labelKey: 'label.properties.borderColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'label.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'image.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'image.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'image.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'image.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: 'style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'label.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'style' },

    // ── 文字阴影 ──
    { name: 'textShadowColor', label: '文字阴影色', labelKey: 'label.properties.textShadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow' },
    { name: 'textShadowOffsetX', label: '阴影偏移X', labelKey: 'label.properties.textShadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'textShadowOffsetY', label: '阴影偏移Y', labelKey: 'label.properties.textShadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'textShadowBlur', label: '阴影模糊', labelKey: 'label.properties.textShadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow' },
  ],
};
