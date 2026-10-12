// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref } from 'vue';
import { usePageStore, useGraphicStore, displayToLogical } from '@scada-editor/core';
import type { CanvasInteractionOptions } from '../../types';
import type { DrawCanvasCallback, AlignTarget, SnapTarget } from '@scada-editor/core';
import {
  emitWidgetTemplateDrop,
  WIDGET_TEMPLATE_MIME,
} from '../../canvas-page/templates/widget-template-drop-bus';

export function useDragDrop(options: CanvasInteractionOptions) {
  const { panX, panY } = options;

  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();

  const snapToGrid = ref(true);
  const gridSize = ref(20);

  // ===== 智能对齐支持 =====
  const alignTargets = ref<AlignTarget[]>([]);
  const showAlignLines = ref(true);

  // ===== 网格吸附支持 =====
  const snapTargets = ref<SnapTarget[]>([]);
  const showSnapIndicator = ref(true);

  // ===== 拖拽状态追踪（修复坐标系问题）=====
  const isDragging = ref(false);
  const startDisplayPos = ref<{ x: number; y: number } | null>(null);
  const startGraphicLogicalPos = ref<{ x: number; y: number } | null>(null);

  // 获取当前页面的缩放比例
  const getScale = () => {
    return pageStore.currentPageScaleFactor;
  };

  // 获取 SmartAlignManager 实例
  const getSmartAlignManager = () => {
    try {
      const currentPage = pageStore.currentPage;
      if (currentPage && typeof currentPage.getSmartAlignManager === 'function') {
        return currentPage.getSmartAlignManager();
      }
    } catch (e) {
      console.warn('Failed to get SmartAlignManager:', e);
    }
    return null;
  };

  // 获取 GridSnapManager 实例
  const getGridSnapManager = () => {
    try {
      const currentPage = pageStore.currentPage;
      if (currentPage && typeof currentPage.getGridSnapManager === 'function') {
        return currentPage.getGridSnapManager();
      }
    } catch (e) {
      console.warn('Failed to get GridSnapManager:', e);
    }
    return null;
  };

  const snapToGridPosition = (x: number, y: number) => {
    if (snapToGrid.value) {
      return {
        x: Math.round(x / gridSize.value) * gridSize.value,
        y: Math.round(y / gridSize.value) * gridSize.value,
      };
    }
    return { x, y };
  };

  const toggleSnapToGrid = () => {
    snapToGrid.value = !snapToGrid.value;
  };

  const isGraphicLocked = (id: string): boolean => {
    const graphic = (graphicStore.sortedGraphics || []).find((g) => g.id === id);
    return graphic ? graphic.config.locked : false;
  };

  // ===== 增强的拖拽处理 - 集成智能对齐和网格吸附 =====
  const handleGraphicDrag = (
    event: MouseEvent,
    drawCanvas: DrawCanvasCallback
  ) => {
    const canvas = document.querySelector('canvas.design-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const viewState = { scale: getScale(), offset: { x: panX.value, y: panY.value } };

    // 获取当前拖拽的图元
    const selectedGraphics = graphicStore.selectedGraphics || [];
    if (selectedGraphics.length === 0) return;

    const draggingGraphic = selectedGraphics[0];

    // 记录拖拽起始位置（首次调用时）
    if (!isDragging.value || !startDisplayPos.value || !startGraphicLogicalPos.value) {
      isDragging.value = true;
      startDisplayPos.value = { x: displayX, y: displayY };
      const graphicPos = draggingGraphic.getPosition();
      startGraphicLogicalPos.value = { x: graphicPos.x, y: graphicPos.y };
    }

    // 基于偏移量计算新的逻辑坐标（修复坐标系问题）
    const displayDeltaX = displayX - startDisplayPos.value.x;
    const displayDeltaY = displayY - startDisplayPos.value.y;
    const logicalDeltaX = displayDeltaX / viewState.scale;
    const logicalDeltaY = displayDeltaY / viewState.scale;

    const newLogicalX = startGraphicLogicalPos.value.x + logicalDeltaX;
    const newLogicalY = startGraphicLogicalPos.value.y + logicalDeltaY;

    // 1. 检测智能对齐目标
    const smartAlignManager = getSmartAlignManager();
    if (smartAlignManager && showAlignLines.value) {
      const otherGraphics = (graphicStore.sortedGraphics || []).filter(
        (g) => g.id !== draggingGraphic.id
      );
      const targets = smartAlignManager.detectAlignTargets(draggingGraphic, otherGraphics);
      alignTargets.value = targets;

      // 如果有对齐目标，应用对齐
      if (targets.length > 0) {
        smartAlignManager.applyAlignment(draggingGraphic, targets[0]);
        drawCanvas();
        return;
      }
    } else {
      alignTargets.value = [];
    }

    // 2. 网格吸附（基于正确的逻辑坐标）
    const gridSnapManager = getGridSnapManager();
    if (gridSnapManager && snapToGrid.value) {
      const otherGraphics = (graphicStore.sortedGraphics || []).filter(
        (g) => g.id !== draggingGraphic.id
      );
      const snapResult = gridSnapManager.snapPosition(
        newLogicalX,
        newLogicalY,
        otherGraphics
      );

      snapTargets.value = snapResult.targets;

      // 应用吸附位置
      if (snapResult.targets.length > 0) {
        draggingGraphic.setPosition(snapResult.x, snapResult.y);
        drawCanvas();
        return;
      }
    } else {
      snapTargets.value = [];
    }

    // 3. 默认移动（基于正确的逻辑坐标）
    const snappedPos = snapToGridPosition(newLogicalX, newLogicalY);
    draggingGraphic.setPosition(snappedPos.x, snappedPos.y);
    drawCanvas();
  };

  // 重置拖拽状态（在 mouseup 时调用）
  const resetDragState = () => {
    isDragging.value = false;
    startDisplayPos.value = null;
    startGraphicLogicalPos.value = null;
  };

  // 清除对齐和吸附指示器
  const clearAlignAndSnapIndicators = () => {
    alignTargets.value = [];
    snapTargets.value = [];
    resetDragState();  // 同时重置拖拽状态
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent, addGraphic: any, drawCanvas: DrawCanvasCallback) => {
    event.preventDefault();
    const canvas = event.currentTarget as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const viewState = { scale: getScale(), offset: { x: panX.value, y: panY.value } };
    const logicalPos = displayToLogical({ x: displayX, y: displayY }, viewState);
    const snappedPos = snapToGridPosition(logicalPos.x - 50, logicalPos.y - 25);

    // 组件模板拖放：交给组件模板面板处理（读取/变量赋值/实例化）
    const widgetTemplateId = event.dataTransfer?.getData(WIDGET_TEMPLATE_MIME);
    if (widgetTemplateId) {
      emitWidgetTemplateDrop({
        templateId: widgetTemplateId,
        logicalPos: snapToGridPosition(logicalPos.x, logicalPos.y),
      });
      clearAlignAndSnapIndicators();
      return;
    }

    const graphicType = event.dataTransfer?.getData('text/plain');
    if (graphicType) {
      addGraphic(graphicType, snappedPos.x, snappedPos.y);
      drawCanvas();
    }

    // 清除指示器
    clearAlignAndSnapIndicators();
  };

  return {
    snapToGrid,
    gridSize,
    getScale,
    snapToGridPosition,
    toggleSnapToGrid,
    isGraphicLocked,
    // 智能对齐
    alignTargets,
    showAlignLines,
    // 网格吸附
    snapTargets,
    showSnapIndicator,
    // 增强功能
    handleGraphicDrag,
    clearAlignAndSnapIndicators,
    resetDragState,
    handleDragOver,
    handleDrop,
  };
}
