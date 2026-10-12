// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed, nextTick } from 'vue';
import { usePageStore, useGraphicStore } from '@scada-editor/core';
import { useViewportStore } from '../../stores/useViewportStore';
import type { CanvasInteractionOptions, DrawCanvasCallback } from './types';
import { VIEWPORT, calculateFitScale } from '../../canvas-page/design-canvas/constants';

export function useTransform(options: CanvasInteractionOptions) {
  const { canvasWidth, canvasHeight } = options;

  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();
  const viewportStore = useViewportStore();

  // 平移状态
  const isPanning = ref(false);
  const startPanX = ref(0);
  const startPanY = ref(0);

  // 移动状态
  const isMoving = ref(false);
  const moveStartX = ref(0);
  const moveStartY = ref(0);
  const startGraphicPositions = ref<Record<string, { x: number; y: number }>>({});

  // 缩放状态
  const isResizing = ref(false);
  const resizeStartX = ref(0);
  const resizeStartY = ref(0);
  const resizeHandle = ref('');
  const startGraphicSizes = ref<Record<string, { width: number; height: number; x: number; y: number }>>({});

  // 旋转状态
  const isRotating = ref(false);
  const rotateStartX = ref(0);
  const rotateStartY = ref(0);
  const startGraphicRotations = ref<Record<string, number>>({});

  // ===== 视口管理常量 =====
  const EDITOR_SELECTOR = '.plugin-layer-manager';

  const _debug = (...args: any[]) => {
    if (import.meta.env.DEV) console.debug('[Viewport]', ...args);
  };

  /**
   * 乘法步进时（ZOOM_STEP=1.2），从非100%的起始比例无法精确回到100%。
   * 当步进目标位于"距100一步之遥"的范围内时，自动吸附到100%。
   *
   * 范围定义：再执行一步 zoomIn/out 就能跨过 100% 的值区间。
   *   - zoomIn:  目标 ≥ 100/zoom_step ≈ 83.3%（即来自 69.4% 以上的值）
   *   - zoomOut: 目标 ≤ 100×zoom_step = 120%（即来自 144% 以下的值）
   */
  const snapToHundred = (current: number, target: number): number => {
    if (current < 100 && target >= 100 / viewportStore.zoomStep) return 100;
    if (current > 100 && target <= 100 * viewportStore.zoomStep) return 100;
    return target;
  };

  // ===== 组合图元变换支持 =====
  // 检测当前选中的是否是组合图元
  const isGroupSelected = computed(() => {
    if (pageStore.selectedGraphicIds.length === 0) return false;

    const currentPage = pageStore.currentPage;
    if (!currentPage || typeof currentPage.getGroupManager !== 'function') return false;

    const groupManager = currentPage.getGroupManager();
    if (!groupManager) return false;

    // 检查选中的图元是否在同一个组中
    for (const id of pageStore.selectedGraphicIds) {
      if (groupManager.isGraphicInGroup(id)) {
        return true;
      }
      if (groupManager.isGroup(id)) {
        return true;
      }
    }
    return false;
  });

  // 获取当前选中的组合ID（如果有）
  const selectedGroupId = computed(() => {
    if (!isGroupSelected.value) return null;

    const currentPage = pageStore.currentPage;
    if (!currentPage || typeof currentPage.getGroupManager !== 'function') return null;

    const groupManager = currentPage.getGroupManager();
    if (!groupManager) return null;

    // 尝试找到包含所有选中图元的组
    for (const id of pageStore.selectedGraphicIds) {
      const group = groupManager.getGroupForGraphic(id);
      if (group) return group.id;
    }
    return null;
  });

  // 组合图元移动
  const moveGroup = (dx: number, dy: number, drawCanvas: DrawCanvasCallback) => {
    if (!selectedGroupId.value) return;

    const currentPage = pageStore.currentPage;
    if (!currentPage || typeof currentPage.getGroupManager !== 'function') return;

    const groupManager = currentPage.getGroupManager();
    if (!groupManager) return;

    groupManager.moveGroup(selectedGroupId.value, dx, dy);
    drawCanvas();
  };

  // 组合图元缩放
  const scaleGroup = (scaleX: number, scaleY: number, drawCanvas: DrawCanvasCallback) => {
    if (!selectedGroupId.value) return;

    const currentPage = pageStore.currentPage;
    if (!currentPage || typeof currentPage.getGroupManager !== 'function') return;

    const groupManager = currentPage.getGroupManager();
    if (!groupManager) return;

    groupManager.scaleGroup(selectedGroupId.value, scaleX, scaleY);
    drawCanvas();
  };

  // 组合图元旋转
  const rotateGroup = (angle: number, drawCanvas: DrawCanvasCallback) => {
    if (!selectedGroupId.value) return;

    const currentPage = pageStore.currentPage;
    if (!currentPage || typeof currentPage.getGroupManager !== 'function') return;

    const groupManager = currentPage.getGroupManager();
    if (!groupManager) return;

    groupManager.rotateGroup(selectedGroupId.value, angle);
    drawCanvas();
  };

  // ====== 智能视口管理系统 ======

  /**
   * 获取画布容器的实际可用尺寸（减去padding）
   */
  const getContainerSize = () => {
    const editor = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;

    if (editor) {
      return {
        width: editor.clientWidth,
        height: editor.clientHeight,
      };
    }

    return {
      width: canvasWidth.value,
      height: canvasHeight.value,
    };
  };

  /**
   * CSS驱动模型下无需pan约束
   * flexbox负责居中，scroll-wrapper负责滚动
   */
  const clampPan = () => {
  };

  /**
   * 以指定锚点进行缩放（保持该点在视口中位置不变）
   * 新模型：canvas CSS=page×zoom，通过调整scroll保持锚点
   */
  const zoomAtAnchor = (
    anchorLogicalX: number,
    anchorLogicalY: number,
    newScaleVal: number,
    drawCanvas: DrawCanvasCallback
  ) => {
    if (!pageStore.currentPage) return;

    _debug('zoomAtAnchor', { anchorLogicalX, anchorLogicalY, targetScale: newScaleVal });
    newScaleVal = Math.max(viewportStore.scaleMin, Math.min(viewportStore.scaleMax, newScaleVal));

    const oldZoom = pageStore.currentPage.scale / 100;
    const newZoom = newScaleVal / 100;
    const pageW = pageStore.currentPage.width || 1920;
    const pageH = pageStore.currentPage.height || 1080;

    const editorEl = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
    const editorWidth = editorEl ? editorEl.clientWidth : 0;
    const editorHeight = editorEl ? editorEl.clientHeight : 0;

    const oldCanvasCSSW = pageW * oldZoom;
    const oldCanvasCSSH = pageH * oldZoom;
    const oldFlexOffsetX = editorWidth > oldCanvasCSSW ? (editorWidth - oldCanvasCSSW) / 2 : 0;
    const oldFlexOffsetY = editorHeight > oldCanvasCSSH ? (editorHeight - oldCanvasCSSH) / 2 : 0;

    const scrollLeft = editorEl ? editorEl.scrollLeft : 0;
    const scrollTop = editorEl ? editorEl.scrollTop : 0;

    const anchorDisplayX = anchorLogicalX * oldZoom + oldFlexOffsetX - scrollLeft;
    const anchorDisplayY = anchorLogicalY * oldZoom + oldFlexOffsetY - scrollTop;

    viewportStore.scale = newScaleVal;

    drawCanvas();

    nextTick(() => {
      const editor = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
      if (!editor) return;
      const newCanvasCSSW = pageW * newZoom;
      const newCanvasCSSH = pageH * newZoom;
      const newFlexOffsetX = editorWidth > newCanvasCSSW ? (editorWidth - newCanvasCSSW) / 2 : 0;
      const newFlexOffsetY = editorHeight > newCanvasCSSH ? (editorHeight - newCanvasCSSH) / 2 : 0;

      editor.scrollLeft = anchorLogicalX * newZoom + newFlexOffsetX - anchorDisplayX;
      editor.scrollTop = anchorLogicalY * newZoom + newFlexOffsetY - anchorDisplayY;
    });
  };

  /**
   * 缩放画布（以视口中心为锚点）- 修复版
   */
  const zoomIn = (drawCanvas: DrawCanvasCallback) => {
    if (!pageStore.currentPage) return;

    _debug('zoomIn', { currentScale: pageStore.currentPage.scale });
    const currentScale = pageStore.currentPage.scale;
    let newScaleVal = currentScale * viewportStore.zoomStep;

    newScaleVal = snapToHundred(currentScale, newScaleVal);

    // 使用画布逻辑中心作为锚点
    const anchorX = (pageStore.currentPage.width || 1920) / 2;
    const anchorY = (pageStore.currentPage.height || 1080) / 2;

    zoomAtAnchor(anchorX, anchorY, newScaleVal, drawCanvas);
  };

  /**
   * 缩小画布（以视口中心为锚点）- 修复版
   */
  const zoomOut = (drawCanvas: DrawCanvasCallback) => {
    if (!pageStore.currentPage) return;

    const currentScale = pageStore.currentPage.scale;
    let newScaleVal = currentScale / viewportStore.zoomStep;

    newScaleVal = snapToHundred(currentScale, newScaleVal);

    // 使用画布逻辑中心作为锚点
    const anchorX = (pageStore.currentPage.width || 1920) / 2;
    const anchorY = (pageStore.currentPage.height || 1080) / 2;

    zoomAtAnchor(anchorX, anchorY, newScaleVal, drawCanvas);
  };

  /**
   * 重置缩放到100%
   */
  const resetZoom = (drawCanvas: DrawCanvasCallback) => {
    viewportStore.scale = 100;
    drawCanvas();
  };

  /**
   * 适应窗口：计算scale使canvas CSS尺寸适合容器，flex居中自动处理
   */
  const fitToWindow = (drawCanvas: DrawCanvasCallback) => {
    const container = getContainerSize();

    _debug('fitToWindow', container);
    if (container.width <= 0 || container.height <= 0) {
      console.warn('[useTransform] fitToWindow: invalid container size');
      return;
    }

    const cw = pageStore.currentPage?.width || 1920;
    const ch = pageStore.currentPage?.height || 1080;

    const newScale = calculateFitScale(container.width, container.height, cw, ch, viewportStore.scaleMin);

    viewportStore.scale = Math.round(newScale * 100);
    drawCanvas();
  };

  /**
   * 适应内容：针对有图元的场景
   */
  const fitToContent = (drawCanvas: DrawCanvasCallback) => {
    const graphics = graphicStore.sortedGraphics || [];
    if (graphics.length === 0) {
      fitToWindow(drawCanvas);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const graphic of graphics) {
      if (!graphic || typeof graphic.getPosition !== 'function') continue;

      const { x, y } = graphic.getPosition();
      const { width, height } = graphic.getSize();
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }

    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    const container = getContainerSize();

    if (container.width <= 0 || container.height <= 0) {
      return;
    }

    const scaleX = container.width / contentWidth;
    const scaleY = container.height / contentHeight;
    const newScale = Math.max(
      viewportStore.scaleMin / 100,
      Math.min(scaleX, scaleY) * VIEWPORT.FIT_MARGIN
    );

    viewportStore.scale = Math.round(newScale * 100);

    drawCanvas();

    nextTick(() => {
      const editor = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
      if (editor) {
        editor.scrollLeft = (minX - 50) * newScale;
        editor.scrollTop = (minY - 50) * newScale;
      }
    });
  };

  /**
   * 以画布中心为锚点的缩放入口（供按钮/slider调用）
   */
  const centerZoom = (delta: number, drawCanvas: DrawCanvasCallback) => {
    if (!pageStore.currentPage) return;
    
    const newScaleVal = pageStore.currentPage.scale + delta;
    
    // 使用画布逻辑中心作为锚点
    const anchorX = (pageStore.currentPage.width || 1920) / 2;
    const anchorY = (pageStore.currentPage.height || 1080) / 2;

    zoomAtAnchor(anchorX, anchorY, newScaleVal, drawCanvas);
  };

  /**
   * 鼠标滚轮缩放（以鼠标位置为基准）
   * 新模型：鼠标相对canvas的像素位置→canvas逻辑坐标→zoom后保持该位置
   */
  const handleWheel = (event: WheelEvent, drawCanvas: DrawCanvasCallback) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();

      const step = 10;
      const delta = event.deltaY > 0 ? -step : step;

      if (!pageStore.currentPage) return;

      const canvasEl = document.querySelector('canvas.design-canvas') as HTMLElement | null;
      if (!canvasEl) return;

      const canvasRect = canvasEl.getBoundingClientRect();
      const currentZoom = pageStore.currentPage.scale / 100;

      const mouseCSSX = event.clientX - canvasRect.left;
      const mouseCSSY = event.clientY - canvasRect.top;

      const logicalX = mouseCSSX / currentZoom;
      const logicalY = mouseCSSY / currentZoom;

      const newScaleVal = pageStore.currentPage.scale + delta;

      zoomAtAnchor(logicalX, logicalY, snapToHundred(pageStore.currentPage.scale, newScaleVal), drawCanvas);
    }
  };

  /**
   * 确保内容在可视区域内（智能适配）
   * 在页面切换、窗口resize等场景调用
   */
  const ensureContentVisible = (drawCanvas: DrawCanvasCallback) => {
    // 如果有图元，使用fitToContent；否则使用fitToWindow
    const graphics = graphicStore.sortedGraphics || [];
    
    if (graphics.length > 0) {
      fitToContent(drawCanvas);
    } else {
      fitToWindow(drawCanvas);
    }
  };

  return {
    isPanning,
    startPanX,
    startPanY,
    isMoving,
    moveStartX,
    moveStartY,
    startGraphicPositions,
    isResizing,
    resizeStartX,
    resizeStartY,
    resizeHandle,
    startGraphicSizes,
    isRotating,
    rotateStartX,
    rotateStartY,
    startGraphicRotations,
    // 组合图元支持
    isGroupSelected,
    selectedGroupId,
    moveGroup,
    scaleGroup,
    rotateGroup,
    // 画布缩放（已优化）
    zoomIn,
    zoomOut,
    resetZoom,
    fitToWindow,
    fitToContent,
    centerZoom,
    handleWheel,
    zoomAtAnchor,
    // 新增：视口管理
    ensureContentVisible,
    clampPan,
    getContainerSize,
  };
}
