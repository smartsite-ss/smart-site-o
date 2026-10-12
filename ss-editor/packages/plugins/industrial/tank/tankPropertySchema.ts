// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { type PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const tankPropertySchema: PluginPropertySchema = {
  name: '储罐',
  layout: 'grid',
  columns: 2,
  propsPath: 'customProps',
  fields: [
    { name: 'width', label: '宽度', labelKey: 'tank.properties.width', type: 'number', min: 30, step: 1, defaultValue: 100, group: 'basic', groupKey: 'tank.groups.basic' },
    { name: 'height', label: '高度', labelKey: 'tank.properties.height', type: 'number', min: 30, step: 1, defaultValue: 140, group: 'basic', groupKey: 'tank.groups.basic' },
    { name: 'level', label: '当前液位', labelKey: 'tank.properties.level', type: 'number', min: 0, step: 0.01, defaultValue: 50, group: 'level', groupKey: 'tank.groups.level' },
    { name: 'maxLevel', label: '最大液位', labelKey: 'tank.properties.maxLevel', type: 'number', min: 1, step: 0.01, defaultValue: 100, group: 'level', groupKey: 'tank.groups.level' },
    { name: 'unit', label: '单位', labelKey: 'tank.properties.unit', type: 'text', defaultValue: '%', group: 'level', groupKey: 'tank.groups.level' },
    { name: 'decimalPlaces', label: '小数位数', labelKey: 'tank.properties.decimalPlaces', type: 'number', min: 0, max: 6, step: 1, defaultValue: 2, group: 'level', groupKey: 'tank.groups.level' },
    {
      name: 'status', label: '状态', labelKey: 'tank.properties.status', type: 'select',
      options: [
        { value: 'normal', label: '正常', labelKey: 'tank.options.status.normal' },
        { value: 'warning', label: '警告', labelKey: 'tank.options.status.warning' },
        { value: 'danger', label: '危险', labelKey: 'tank.options.status.danger' }
      ],
      defaultValue: 'normal', group: 'status', groupKey: 'tank.groups.status'
    },
    { name: 'warningLevel', label: '警告液位', labelKey: 'tank.properties.warningLevel', type: 'number', min: 0, step: 0.01, defaultValue: 70, group: 'threshold', groupKey: 'tank.groups.threshold' },
    { name: 'dangerLevel', label: '危险液位', labelKey: 'tank.properties.dangerLevel', type: 'number', min: 0, step: 0.01, defaultValue: 90, group: 'threshold', groupKey: 'tank.groups.threshold' },
    { name: 'bodyColor', label: '罐体颜色', labelKey: 'tank.properties.bodyColor', type: 'color', defaultValue: '#2C3E50FF', group: 'color', groupKey: 'tank.groups.color' },
    { name: 'liquidColor', label: '液体颜色', labelKey: 'tank.properties.liquidColor', type: 'color', defaultValue: '#3498DBFF', group: 'color', groupKey: 'tank.groups.color' },
    { name: 'warningLiquidColor', label: '警告液体色', labelKey: 'tank.properties.warningLiquidColor', type: 'color', defaultValue: '#F39C12FF', group: 'color', groupKey: 'tank.groups.color' },
    { name: 'dangerLiquidColor', label: '危险液体色', labelKey: 'tank.properties.dangerLiquidColor', type: 'color', defaultValue: '#E74C3CFF', group: 'color', groupKey: 'tank.groups.color' },
    { name: 'rimColor', label: '边框颜色', labelKey: 'tank.properties.rimColor', type: 'color', defaultValue: '#34495EFF', group: 'color', groupKey: 'tank.groups.color' },
    { name: 'showLevelText', label: '显示液位文本', labelKey: 'tank.properties.showLevelText', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'tank.groups.display' },
    { name: 'showAnimation', label: '波动动画', labelKey: 'tank.properties.showAnimation', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'tank.groups.display' },
    { name: 'showTicks', label: '显示刻度', labelKey: 'tank.properties.showTicks', type: 'boolean', defaultValue: true, group: 'display', groupKey: 'tank.groups.display' },
    { name: 'tickCount', label: '刻度数量', labelKey: 'tank.properties.tickCount', type: 'number', min: 0, max: 20, step: 1, defaultValue: 5, group: 'display', groupKey: 'tank.groups.display' }
  ],
};