// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';

// 布局模式
export type LayoutMode = 'grid' | 'random' | 'flow' | 'spiral';

// 单个图元配置
export interface GraphicConfig {
  type: string;                      // 图元类型
  x?: number;                        // X坐标（仅固定位置）
  y?: number;                        // Y坐标（仅固定位置）
  width?: number;                    // 宽度
  height?: number;                   // 高度
  customProps?: Record<string, any>; // 自定义属性
}

// 生成配置
export interface GenerateConfig {
  type: string;                      // 图元类型
  count: number;                     // 生成数量
  layoutMode: LayoutMode;            // 布局模式
  startX: number;                    // 起始X坐标
  startY: number;                    // 起始Y坐标
  areaWidth: number;                 // 区域宽度
  areaHeight: number;                // 区域高度
  
  // 图元尺寸配置
  minWidth?: number;                 // 最小宽度
  maxWidth?: number;                 // 最大宽度
  minHeight?: number;                // 最小高度
  maxHeight?: number;                // 最大高度
  fixedWidth?: number;               // 固定宽度
  fixedHeight?: number;              // 固定高度
  
  // 间距配置
  gapX?: number;                     // 横向间距
  gapY?: number;                     // 纵向间距
  
  // 网格配置
  cols?: number;                     // 网格列数
  
  // 随机配置
  randomColors?: boolean;            // 随机颜色
  randomSizes?: boolean;             // 随机尺寸
  randomRotation?: boolean;          // 随机旋转
}

// 批量生成配置
export interface BatchGenerateConfig {
  graphics: GraphicConfig[];         // 多种图元配置
  layoutMode?: LayoutMode;           // 整体布局
}

// 生成结果
export interface GenerateResult {
  graphics: IGraphic[];              // 生成的图元数组
  duration: number;                  // 生成耗时（毫秒）
  count: number;                     // 实际生成数量
}

// 网格选项
export interface GridOptions {
  startX?: number;
  startY?: number;
  cols?: number;
  gapX?: number;
  gapY?: number;
  width?: number;
  height?: number;
}

// 随机选项
export interface RandomOptions {
  areaWidth?: number;
  areaHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  randomColors?: boolean;
  randomSizes?: boolean;
  randomRotation?: boolean;
}
