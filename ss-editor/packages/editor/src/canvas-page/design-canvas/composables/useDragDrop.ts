// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * useDragDrop - 拖拽创建图元逻辑
 * 处理从组件面板拖拽组件到画布上创建图元的交互
 */
import { ref, type Ref } from 'vue';
import { usePageStore, displayToLogical } from '@scada-editor/core';
import type { AlignTarget, SnapTarget } from '@scada-editor/core';

interface DragDropOptions {
  panX: Ref<number>;
  panY: Ref<number>;
  snapToGrid?: Ref<boolean>;
}

export function useDragDrop(options: DragDropOptions) {
  const { panX, panY, snapToGrid: sharedSnapToGrid } = options;

  const pageStore = usePageStore();

  const alignTargets = ref<AlignTarget[]>([]);
  const snapTargets = ref<SnapTarget[]>([]);

  const internalSnapToGrid = ref(true);
  const gridSize = ref(20);

  const getSnapEnabled = () => sharedSnapToGrid?.value ?? internalSnapToGrid.value;

  const snapToGridPosition = (x: number, y: number) => {
    if (getSnapEnabled()) {
      return {
        x: Math.round(x / gridSize.value) * gridSize.value,
        y: Math.round(y / gridSize.value) * gridSize.value,
      };
    }
    return { x, y };
  };

  const clearIndicators = () => {
    alignTargets.value = [];
    snapTargets.value = [];
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  };

  const handleDrop = (
    event: DragEvent,
    addGraphic: (type: string, x: number, y: number) => void,
    drawCanvas: () => void,
  ) => {
    event.preventDefault();
    const canvas = event.currentTarget as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const scale = pageStore.currentPageScaleFactor;
    const viewState = { scale, offset: { x: panX.value, y: panY.value } };
    const logicalPos = displayToLogical({ x: displayX, y: displayY }, viewState);
    const snappedPos = snapToGridPosition(logicalPos.x - 50, logicalPos.y - 25);

    const graphicType = event.dataTransfer?.getData('text/plain');
    if (graphicType) {
      addGraphic(graphicType, snappedPos.x, snappedPos.y);
      drawCanvas();
    }

    clearIndicators();
  };

  return {
    snapToGrid: internalSnapToGrid,
    gridSize,
    snapToGridPosition,
    alignTargets,
    snapTargets,
    handleDragOver,
    handleDrop,
    clearIndicators,
  };
}