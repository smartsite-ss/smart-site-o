// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ==================== 基础类型导出 (避免重复定义) ====================

// 重新导出基础接口，确保类型一致性
export type { IGraphic } from '@scada-editor/plugin-sdk';
export type { IPage } from '../graphic-editing/graphic/base/IPage';
export type { ILayout } from '../canvas-page/layouts/base/ILayout';

// 重新导出图形属性接口
export type {
  IPosition, ISize, IGeometry,
  IGraphicStyle, IGraphicConfig, IGraphicProps,
  IEvent, IGraphicEvent,
  IDataValidation, IDataSource, IAnimation
} from '../graphic-editing/graphic/base/IProperty';

// ==================== 新增类型 (从 UI 迁移) ====================

// 局部渲染选项
export interface PartialRenderOptions {
  partial: boolean;
  dirtyRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// 绘制回调类型
export type DrawCanvasCallback = (options?: PartialRenderOptions) => void;

// 画布状态
export interface CanvasState {
  width: number;
  height: number;
  scale: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  showRulers: boolean;
  showReferenceLines: boolean;
  isSelecting: boolean;
  selectionRect: { left: number; top: number; width: number; height: number };
  selectedIds: string[];
  hoveredId: string | null;
  cursorStyle: string;
}

// 页面相关类型
export interface IThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
}

export interface ISelectionHistoryItem {
  selectedGraphicId: string | null;
  selectedGraphicIds: string[];
}

// 控制点相关类型
export enum ControlPointType {
  RESIZE = 'resize',
  ROTATE = 'rotate',
}

// 选择模式枚举
export enum SelectionMode {
  SINGLE = 'single',           // 单选模式：点击即选中，取消之前选择
  ADDITIVE = 'additive',       // 累加模式：
                               //   - 单个选择：Shift/Ctrl 点击切换选中状态（添加/移除）
                               //   - 框选：Shift/Ctrl 框选切换选中状态（添加未选中的，移除已选中的）
  SUBTRACTIVE = 'subtractive', // 减选模式：Ctrl+Shift 点击或框选从选择中移除
  BOX = 'box',                 // 框选模式：拖动框选替换选择
}

// 选择框渲染数据接口
export interface SelectionRenderData {
  isSelecting: boolean;
  selectionRect: { left: number; top: number; width: number; height: number };
  selectedGraphicIds: string[];
  selectedGraphics: any[];
}

// 选择状态接口
export interface ISelectionState {
  selectedGraphicId: string | null;
  selectedGraphicIds: string[];
  mode: SelectionMode;
  isSelecting: boolean;
  selectionRect: { left: number; top: number; width: number; height: number };
}

export enum ResizeHandleType {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
}



// 项目相关类型 - 已迁移到 project/Project.ts
export type { IProject } from '../project/Project';

// 模板相关类型
export interface GraphicTemplate {
  name: string;
  graphics: any[];
  createdAt: string;
}

// 定时器相关类型
export * from './timer';

// 数据源相关类型
export * from './data-source.types';
