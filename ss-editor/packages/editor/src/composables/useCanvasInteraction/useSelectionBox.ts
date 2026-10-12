// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref } from 'vue';
import { usePageStore, useGraphicStore, displayRectToLogical, SelectionMode, keyboardService } from '@scada-editor/core';
import type { CanvasInteractionOptions, DrawCanvasCallback } from './types';

export function useSelectionBox(options: CanvasInteractionOptions) {
  const { panX, panY, graphicDecorators } = options;
  
  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();

  const isSelecting = ref(false);
  const selectionRect = ref({ left: 0, top: 0, width: 0, height: 0 });
  const startX = ref(0);
  const startY = ref(0);
  const selectionMode = ref<SelectionMode>(SelectionMode.SINGLE);

  // 获取当前页面的 SelectionManager
  const getSelectionManager = () => {
    const currentPage = pageStore.currentPage;
    if (currentPage && 'getSelectionManager' in currentPage) {
      return currentPage.getSelectionManager();
    }
    return null;
  };

  // 更新选择模式从按键状态
  const updateSelectionModeFromKeyState = () => {
    const sm = getSelectionManager();
    const keyState = keyboardService.getCurrentKeyState();
    if (keyState.ctrl && keyState.shift) {
      sm?.setMode(SelectionMode.SUBTRACTIVE);
    } else if (keyState.shift || keyState.ctrl) {
      sm?.setMode(SelectionMode.ADDITIVE);
    } else if (!isSelecting.value) {
      sm?.setMode(SelectionMode.SINGLE);
    }
  };

  // 统一同步选择状态
  const syncSelectionState = (selectedIds: string[], oldSelectedIds: string[]) => {
    for (const id of oldSelectedIds) {
      if (!selectedIds.includes(id) && graphicDecorators.value[id]) {
        graphicDecorators.value[id].setSelected(false);
      }
    }
    for (const id of selectedIds) {
      if (!oldSelectedIds.includes(id) && graphicDecorators.value[id]) {
        graphicDecorators.value[id].setSelected(true);
      }
    }
  };

  // 结束框选
  const finishSelecting = (drawCanvas: DrawCanvasCallback) => {
    const canvas = document.querySelector('canvas.design-canvas');
    if (canvas) {
      canvas.getBoundingClientRect();

      const displayRect = {
        x: selectionRect.value.left,
        y: selectionRect.value.top,
        width: selectionRect.value.width,
        height: selectionRect.value.height
      };
      const viewState = { scale: pageStore.currentPageScaleFactor, offset: { x: panX.value, y: panY.value } };
      const logicalRect = displayRectToLogical(displayRect, viewState);
      const selectionLeftCanvas = logicalRect.x;
      const selectionTopCanvas = logicalRect.y;
      const selectionRightCanvas = logicalRect.x + logicalRect.width;
      const selectionBottomCanvas = logicalRect.y + logicalRect.height;

      const selectedIds: string[] = [];
      const graphics = graphicStore.sortedGraphics || [];

      for (const graphic of graphics) {
        if (!graphic || typeof graphic.intersectsRegion !== 'function') continue;

        const isInSelection = graphic.intersectsRegion(
          selectionLeftCanvas,
          selectionTopCanvas,
          selectionRightCanvas - selectionLeftCanvas,
          selectionBottomCanvas - selectionTopCanvas
        );

        if (isInSelection) {
          selectedIds.push(graphic.id);
        }
      }

      const sm = getSelectionManager();
      if (!sm) return;

      const oldSelectedIds = [...pageStore.selectedGraphicIds];

      if (selectedIds.length > 0) {
        const state = sm.selectMultiple(selectedIds);
        syncSelectionState(state.selectedGraphicIds, oldSelectedIds);
      } else {
        sm.clear();
        syncSelectionState([], oldSelectedIds);
      }
    }

    isSelecting.value = false;
    selectionRect.value = { left: 0, top: 0, width: 0, height: 0 };
    const sm2 = getSelectionManager();
    sm2?.setMode(SelectionMode.SINGLE);
    drawCanvas();
    requestAnimationFrame(() => {
      drawCanvas();
    });
  };

  return {
    isSelecting,
    selectionRect,
    startX,
    startY,
    selectionMode,
    getSelectionManager,
    updateSelectionModeFromKeyState,
    syncSelectionState,
    finishSelecting,
  };
}
