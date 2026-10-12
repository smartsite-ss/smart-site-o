// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const navigationButtonPropertySchema: PluginPropertySchema = {
  fields: [
    // ── 基本 ──
    { name: 'text', type: 'text', label: '按钮文本', labelKey: 'navigationButton.properties.text', defaultValue: '导航按钮', group: '基本', dataBindable: true },
    { name: 'type', type: 'select', label: '按钮类型', labelKey: 'navigationButton.properties.type', defaultValue: 'primary', dataBindable: true, options: [
      { value: 'primary', label: '主要', labelKey: 'navigationButton.options.type.primary' },
      { value: 'success', label: '成功', labelKey: 'navigationButton.options.type.success' },
      { value: 'warning', label: '警告', labelKey: 'navigationButton.options.type.warning' },
      { value: 'danger', label: '危险', labelKey: 'navigationButton.options.type.danger' },
      { value: 'default', label: '默认', labelKey: 'navigationButton.options.type.default' },
    ], group: '基本' },
    { name: 'size', type: 'select', label: '尺寸', labelKey: 'navigationButton.properties.size', defaultValue: 'default', options: [
      { value: 'large', label: '大', labelKey: 'navigationButton.options.size.large' },
      { value: 'default', label: '中', labelKey: 'navigationButton.options.size.default' },
      { value: 'small', label: '小', labelKey: 'navigationButton.options.size.small' },
    ], group: '基本' },
    { name: 'disabled', type: 'boolean', label: '禁用', labelKey: 'navigationButton.properties.disabled', defaultValue: false, group: '基本', dataBindable: true },
    // ── 样式 ──
    { name: 'transparent', type: 'checkbox', label: '透明', labelKey: 'navigationButton.properties.transparent', defaultValue: false, group: '样式' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'button.properties.backgroundColor', type: 'color', defaultValue: '', group: '样式', dataBindable: true },
    { name: 'fontColor', label: '文本色', labelKey: 'button.properties.fontColor', type: 'color', defaultValue: '', group: '样式', dataBindable: true },
    { name: 'borderColor', label: '边框色', labelKey: 'button.properties.borderColor', type: 'color', defaultValue: '', group: '样式', dataBindable: true },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'button.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 1, group: '样式' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'button.properties.borderStyle', type: 'select', options: [
      { value: 'solid', label: '实线', labelKey: 'button.options.borderStyle.solid' },
      { value: 'dashed', label: '虚线', labelKey: 'button.options.borderStyle.dashed' },
      { value: 'dotted', label: '点线', labelKey: 'button.options.borderStyle.dotted' },
    ], defaultValue: 'solid', group: '样式' },
    { name: 'borderRadius', label: '圆角', labelKey: 'button.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 4, group: '样式' },
    // ── 文字 ──
    { name: 'fontSize', label: '字体大小', labelKey: 'button.properties.fontSize', type: 'number', min: 8, max: 72, step: 1, defaultValue: 13, group: '文字' },
    { name: 'fontWeight', label: '字体粗细', labelKey: 'button.properties.fontWeight', type: 'select', options: [
      { value: 'normal', label: '正常', labelKey: 'button.options.fontWeight.normal' },
      { value: 'bold', label: '粗体', labelKey: 'button.options.fontWeight.bold' },
    ], defaultValue: 'normal', group: '文字' },
    { name: 'textAlign', label: '文本对齐', labelKey: 'button.properties.textAlign', type: 'select', options: [
      { value: 'left', label: '左对齐', labelKey: 'button.options.textAlign.left' },
      { value: 'center', label: '居中', labelKey: 'button.options.textAlign.center' },
      { value: 'right', label: '右对齐', labelKey: 'button.options.textAlign.right' },
    ], defaultValue: 'center', group: '文字' },
    // ── 阴影 ──
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'button.properties.shadowColor', type: 'color', defaultValue: '', group: '阴影' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'button.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: '阴影' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'button.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: '阴影' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'button.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: '阴影' },
    // ── 交互 ──
    { name: 'targetType', label: '点击动作', labelKey: 'navigationButton.properties.targetType', type: 'select', defaultValue: 'none', group: '交互',
      options: [
        { value: 'none', label: '无', labelKey: 'navigationButton.options.targetType.none' },
        { value: 'page', label: '打开页面', labelKey: 'navigationButton.options.targetType.page' },
        { value: 'url', label: '打开URL', labelKey: 'navigationButton.options.targetType.url' },
      ] },
    { name: 'targetPage', label: '目标页面', labelKey: 'navigationButton.properties.targetPage', type: 'select', optionsProvider: 'pageStore.pages', defaultValue: '', group: '交互', dataBindable: true },
    { name: 'targetUrl', label: '目标URL', labelKey: 'navigationButton.properties.targetUrl', type: 'text', defaultValue: '', placeholder: 'https://', group: '交互' },
  ],
};
