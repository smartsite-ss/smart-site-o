// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const threeCubePropertySchema: PluginPropertySchema = {
  fields: [
    { name: 'cubeColor', type: 'color', label: '立方体颜色', labelKey: 'three-cube.properties.cubeColor', defaultValue: '#4A90A4', group: '颜色' },
    { name: 'cubeSize', type: 'number', label: '立方体大小', labelKey: 'three-cube.properties.cubeSize', defaultValue: 2, min: 0.5, max: 10, group: '尺寸' },
    { name: 'rotationSpeed', type: 'number', label: '旋转速度', labelKey: 'three-cube.properties.rotationSpeed', defaultValue: 0.5, min: 0, max: 5, group: '动画' },
    { name: 'showGrid', type: 'boolean', label: '显示网格', labelKey: 'three-cube.properties.showGrid', defaultValue: true, group: '辅助' },
    { name: 'showAxes', type: 'boolean', label: '显示坐标轴', labelKey: 'three-cube.properties.showAxes', defaultValue: false, group: '辅助' },
  ],
};