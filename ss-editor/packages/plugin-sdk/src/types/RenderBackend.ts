// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export enum RenderBackend {
  VUE_COMPONENT = 'vue',
  CANVAS_2D = 'canvas2d',
  SVG_DOM = 'svg-dom',
  CSS_DOM = 'css-dom',
  THREE_3D = 'three3d',
}

export type RenderBackendCategory =
  | 'basic'
  | 'form'
  | 'chart'
  | 'industrial'
  | 'media'
  | 'layout'
  | '3d';