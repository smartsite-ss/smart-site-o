// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const voltmeterPropertySchema: PluginPropertySchema = {
  name: '电压表',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'color', label: '线条颜色', labelKey: 'voltmeter.properties.color', type: 'color', defaultValue: '#e74c3c', group: 'style' },
    { name: 'backgroundColor', label: '背景色', labelKey: 'voltmeter.properties.backgroundColor', type: 'color', defaultValue: '#00000000', group: 'style' },
    { name: 'lineWidth', label: '线宽', labelKey: 'voltmeter.properties.lineWidth', type: 'number', min: 1, max: 8, step: 0.5, defaultValue: 2, group: 'style' },
    { name: 'dataset', label: '静态数据值', labelKey: 'voltmeter.properties.dataset', type: 'number', min: -9999, max: 9999, step: 1, defaultValue: 0, group: 'data' },
    { name: 'showDigital', label: '显示数字读数', labelKey: 'voltmeter.properties.showDigital', type: 'boolean', defaultValue: true, group: 'data' },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'voltmeter.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'data' },
    { name: 'unit', label: '单位', labelKey: 'voltmeter.properties.unit', type: 'text', defaultValue: '', group: 'data' },
  ],
};
