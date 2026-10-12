// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';
export const imagePropertySchema: PluginPropertySchema = {
  name: '图像',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'src', label: '图片地址', labelKey: 'image.properties.src', type: 'image', defaultValue: '', group: 'basic' },
    { name: 'alt', label: '替代文本', labelKey: 'image.properties.alt', type: 'text', defaultValue: '', group: 'basic' },
    { name: 'opacity', label: '不透明度', labelKey: 'image.properties.opacity', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 1, group: 'basic' },
    { name: 'imageScale', label: '缩放比例', labelKey: 'image.properties.imageScale', type: 'number', min: 0.01, max: 10, step: 0.1, defaultValue: 1, group: 'basic' },
    { name: 'imageRotation', label: '旋转角度', labelKey: 'image.properties.imageRotation', type: 'number', min: -360, max: 360, step: 1, defaultValue: 0, group: 'basic' },
    {
      name: 'imageFilter', label: '滤镜效果', labelKey: 'image.properties.imageFilter', type: 'select',
      options: [
        { value: 'none', label: '无', labelKey: 'image.options.imageFilter.none' },
        { value: 'grayscale', label: '灰度', labelKey: 'image.options.imageFilter.grayscale' },
        { value: 'sepia', label: '复古', labelKey: 'image.options.imageFilter.sepia' },
        { value: 'invert', label: '反相', labelKey: 'image.options.imageFilter.invert' },
        { value: 'brightness', label: '亮度', labelKey: 'image.options.imageFilter.brightness' },
        { value: 'contrast', label: '对比度', labelKey: 'image.options.imageFilter.contrast' },
        { value: 'saturate', label: '饱和度', labelKey: 'image.options.imageFilter.saturate' }
      ],
      defaultValue: 'none', group: 'basic'
    },
    {
      name: 'imageFit', label: '适应模式', labelKey: 'image.properties.imageFit', type: 'select',
      options: [
        { value: 'contain', label: '包含', labelKey: 'image.options.imageFit.contain' },
        { value: 'cover', label: '覆盖', labelKey: 'image.options.imageFit.cover' },
        { value: 'fill', label: '填充', labelKey: 'image.options.imageFit.fill' },
        { value: 'none', label: '原始', labelKey: 'image.options.imageFit.none' },
        { value: 'scale-down', label: '缩小', labelKey: 'image.options.imageFit.scale-down' }
      ],
      defaultValue: 'contain', group: 'basic'
    },
    { name: 'borderColor', label: '边框颜色', labelKey: 'image.properties.borderColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'image.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'image.properties.borderStyle', type: 'select', options: [{ value: 'solid', label: '实线', labelKey: 'image.options.borderStyle.solid' }, { value: 'dashed', label: '虚线', labelKey: 'image.options.borderStyle.dashed' }, { value: 'dotted', label: '点线', labelKey: 'image.options.borderStyle.dotted' }], defaultValue: 'solid', group: 'style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'image.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'image.properties.shadowColor', type: 'color', defaultValue: '#00000000', group: 'shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'image.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'image.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'image.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'shadow' },
  ],
};