// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const shapePropertySchema: PluginPropertySchema = {
  name: '形状',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    {
      name: 'shapeType', label: '形状类型', labelKey: 'shape.properties.shapeType', type: 'select',
      options: [
        { value: 'rectangle', label: '矩形', labelKey: 'shape.options.shapeType.rectangle' },
        { value: 'rounded-rectangle', label: '圆角矩形', labelKey: 'shape.options.shapeType.roundedRectangle' },
        { value: 'circle', label: '圆形', labelKey: 'shape.options.shapeType.circle' },
        { value: 'ellipse', label: '椭圆', labelKey: 'shape.options.shapeType.ellipse' },
        { value: 'triangle', label: '三角形', labelKey: 'shape.options.shapeType.triangle' },
        { value: 'diamond', label: '菱形', labelKey: 'shape.options.shapeType.diamond' },
        { value: 'polygon', label: '多边形', labelKey: 'shape.options.shapeType.polygon' },
        { value: 'arrow-up', label: '上箭头', labelKey: 'shape.options.shapeType.arrowUp' },
        { value: 'arrow-down', label: '下箭头', labelKey: 'shape.options.shapeType.arrowDown' },
        { value: 'arrow-left', label: '左箭头', labelKey: 'shape.options.shapeType.arrowLeft' },
        { value: 'arrow-right', label: '右箭头', labelKey: 'shape.options.shapeType.arrowRight' },
        { value: 'line', label: '直线', labelKey: 'shape.options.shapeType.line' }
      ],
      defaultValue: 'rectangle', group: 'basic'
    },
    { name: 'fillColor', label: '填充颜色', labelKey: 'shape.properties.fillColor', type: 'color', defaultValue: '#2196F3FF', group: 'style' },
    { name: 'fillOpacity', label: '填充不透明度', labelKey: 'shape.properties.fillOpacity', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 1, group: 'style' },
    { name: 'borderColor', label: '边框颜色', labelKey: 'shape.properties.borderColor', type: 'color', defaultValue: '#2196F3FF', group: 'style' },
    { name: 'borderWidth', label: '边框宽度', labelKey: 'shape.properties.borderWidth', type: 'number', min: 0, step: 1, defaultValue: 2, group: 'style' },
    { name: 'borderStyle', label: '边框样式', labelKey: 'shape.properties.borderStyle', type: 'select', options: [{ value: 'solid', label: '实线', labelKey: 'shape.options.borderStyle.solid' }, { value: 'dashed', label: '虚线', labelKey: 'shape.options.borderStyle.dashed' }, { value: 'dotted', label: '点线', labelKey: 'shape.options.borderStyle.dotted' }], defaultValue: 'solid', group: 'style' },
    { name: 'borderRadius', label: '圆角', labelKey: 'shape.properties.borderRadius', type: 'number', min: 0, step: 1, defaultValue: 0, group: 'style' },
    { name: 'shadowColor', label: '阴影颜色', labelKey: 'shape.properties.shadowColor', type: 'color', defaultValue: '#00000033', group: 'shadow' },
    { name: 'shadowOffsetX', label: '阴影偏移X', labelKey: 'shape.properties.shadowOffsetX', type: 'number', step: 1, defaultValue: 0, group: 'shadow' },
    { name: 'shadowOffsetY', label: '阴影偏移Y', labelKey: 'shape.properties.shadowOffsetY', type: 'number', step: 1, defaultValue: 2, group: 'shadow' },
    { name: 'shadowBlur', label: '阴影模糊', labelKey: 'shape.properties.shadowBlur', type: 'number', min: 0, step: 1, defaultValue: 4, group: 'shadow' },
  ],
};