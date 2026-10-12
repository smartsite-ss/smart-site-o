// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const ammeterPropertySchema: PluginPropertySchema = {
  name: '电流表',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'ammeter.properties.color', type: 'color', defaultValue: '#e74c3c', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'ammeter.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'ammeter.properties.lineWidth', type: 'number', min: 1, max: 8, step: 0.5, defaultValue: 2, group: 'style' },
    { name: 'dataset', label: '静态数据值', labelKey: 'ammeter.properties.dataset', type: 'number', min: -9999, max: 9999, step: 1, defaultValue: 0, group: 'data' },
    { name: 'showDigital', label: '显示数字读数', labelKey: 'ammeter.properties.showDigital', type: 'boolean', defaultValue: true, group: 'data' },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'ammeter.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'data' },
    { name: 'unit', label: '单位', labelKey: 'ammeter.properties.unit', type: 'text', defaultValue: '', group: 'data' },
  ],
};
