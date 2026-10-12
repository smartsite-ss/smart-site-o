// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { use } from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  ScatterChart,
  RadarChart,
  FunnelChart,
  HeatmapChart,
  TreemapChart,
  SankeyChart,
  GraphChart,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent,
  GeoComponent,
  DatasetComponent,
  TransformComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

let registered = false;

/**
 * 统一注册 ECharts 图表类型与组件（按需引入）。
 * 供 tag-trend / history-trend 及后续 chart/tag 图表组件复用，
 * 避免各 Graphic 各自调用 use() 造成分散与重复。
 */
export function registerChartModules(): void {
  if (registered) return;
  use([
    // 图表类型
    BarChart,
    LineChart,
    PieChart,
    GaugeChart,
    ScatterChart,
    RadarChart,
    FunnelChart,
    HeatmapChart,
    TreemapChart,
    SankeyChart,
    GraphChart,
    // 组件
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent,
    VisualMapComponent,
    GeoComponent,
    DatasetComponent,
    TransformComponent,
    // 渲染器
    CanvasRenderer,
  ]);
  registered = true;
}
