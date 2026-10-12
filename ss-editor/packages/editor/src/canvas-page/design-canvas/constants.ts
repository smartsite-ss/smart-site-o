// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export const VIEWPORT = {
  PADDING: 30,
  SCALE_MIN: 20,
  SCALE_MAX: 300,
  ZOOM_STEP: 1.05,
  /** 预览态 Ctrl+滚轮缩放系数（放大） */
  PREVIEW_WHEEL_ZOOM_IN: 1.2,
  /** 预览态 Ctrl+滚轮缩放系数（缩小，与放大系数保持互逆近似） */
  PREVIEW_WHEEL_ZOOM_OUT: 0.8,
  FIT_MARGIN: 0.9,
  /** 预览/运行态适配边距：显式声明无边距（编辑态用 PADDING=30，两态差异为设计意图，见 98 号优化方案 C1） */
  PREVIEW_MARGIN: 0,
  INIT_RETRY_DELAYS: [50, 150, 300],
  /** 预览态零尺寸重试延迟（与编辑态 INIT_RETRY_DELAYS 对齐，优化方案 P1-2） */
  PREVIEW_INIT_RETRY_DELAYS: [50, 150, 300],
  /** 预览态零尺寸兜底重试上限次数（超出后停止重试，避免无限循环） */
  PREVIEW_INIT_MAX_RETRIES: 5,
  /** 位图分辨率上限：控件态 fitWidth/fitHeight 扩展位图超限时回退 contain（优化方案 P1-3，与 Canvas/WebGL 安全上限对齐） */
  MAX_BITMAP_SIZE: 8192,
  /** 编辑态画布滚动层四周留白（PluginLayerManager 内边距，与 JS 层 PADDING 分属不同用途但同为单一常量来源，优化方案 P2-4） */
  LAYER_PADDING: 20,
  MOVE_THRESHOLD: 3,
  RESIZE_THRESHOLD: 3,
  DEFAULT_CANVAS_WIDTH: 1920,
  DEFAULT_CANVAS_HEIGHT: 1080,
} as const;

export function calculateFitScale(
  containerWidth: number,
  containerHeight: number,
  pageWidth: number,
  pageHeight: number,
  scaleMin: number = VIEWPORT.SCALE_MIN,
): number {
  const availableW = containerWidth - VIEWPORT.PADDING * 2;
  const availableH = containerHeight - VIEWPORT.PADDING * 2;
  if (availableW <= 0 || availableH <= 0) return 1;
  const scaleX = availableW / pageWidth;
  const scaleY = availableH / pageHeight;
  const rawScale = Math.min(scaleX, scaleY, 1);
  return Math.max(scaleMin / 100, rawScale * VIEWPORT.FIT_MARGIN);
}