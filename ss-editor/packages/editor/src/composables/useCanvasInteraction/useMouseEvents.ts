// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { usePageStore, useGraphicStore, displayToLogical } from '@scada-editor/core';
import type { CanvasInteractionOptions } from './types';

export function useMouseEvents(options: CanvasInteractionOptions) {
  const { panX, panY, cursorStyle, hoveredGraphicId, graphicDecorators: _graphicDecorators } = options;
  
  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();

  // 获取当前页面的缩放比例
  const getScale = () => {
    return pageStore.currentPageScaleFactor;
  };

  // 检查是否点击在选择手柄上
  const checkHandleClick = (x: number, y: number) => {
    if (graphicStore.selectedGraphic) {
      const graphic = graphicStore.selectedGraphic;
      const { x: gx, y: gy } = graphic.getPosition();
      const { width, height } = graphic.getSize();
      const handleSize = 8;
      
      const handles = [
        { x: gx - handleSize / 2, y: gy - handleSize / 2, handle: 'TOP_LEFT' },
        { x: gx + width - handleSize / 2, y: gy - handleSize / 2, handle: 'TOP_RIGHT' },
        { x: gx - handleSize / 2, y: gy + height - handleSize / 2, handle: 'BOTTOM_LEFT' },
        { x: gx + width - handleSize / 2, y: gy + height - handleSize / 2, handle: 'BOTTOM_RIGHT' },
        { x: gx - handleSize / 2, y: gy + height / 2 - handleSize / 2, handle: 'LEFT' },
        { x: gx + width - handleSize / 2, y: gy + height / 2 - handleSize / 2, handle: 'RIGHT' },
        { x: gx + width / 2 - handleSize / 2, y: gy - handleSize / 2, handle: 'TOP' },
        { x: gx + width / 2 - handleSize / 2, y: gy + height - handleSize / 2, handle: 'BOTTOM' },
      ];
      
      for (const handle of handles) {
        if (
          x >= handle.x &&
          x <= handle.x + handleSize &&
          y >= handle.y &&
          y <= handle.y + handleSize
        ) {
          return { type: 'resize' as const, handle: handle.handle };
        }
      }
    }
    return null;
  };

  // 检查鼠标是否悬停在控制点上
  const checkControlPointHover = (event: MouseEvent) => {
    const canvas = document.querySelector('canvas.design-canvas');
    if (!canvas) {
      if (cursorStyle) cursorStyle.value = '';
      if (hoveredGraphicId) hoveredGraphicId.value = '';
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;
    const viewState = { 
      scale: getScale(), 
      offset: { 
        x: panX && panX.value ? panX.value : 0, 
        y: panY && panY.value ? panY.value : 0 
      } 
    };
    const logicalPos = displayToLogical({ x: displayX, y: displayY }, viewState);
    const x = logicalPos.x;
    const y = logicalPos.y;

    // 检查单个图形控制点
    if (graphicStore.selectedGraphic) {
      const graphic = graphicStore.selectedGraphic;
      const { x: gx, y: gy } = graphic.getPosition();
      const { width, height } = graphic.getSize();
      const handleSize = 8;
      
      const handles = [
        { x: gx - handleSize / 2, y: gy - handleSize / 2, cursor: 'nwse-resize' },
        { x: gx + width - handleSize / 2, y: gy - handleSize / 2, cursor: 'nesw-resize' },
        { x: gx - handleSize / 2, y: gy + height - handleSize / 2, cursor: 'nesw-resize' },
        { x: gx + width - handleSize / 2, y: gy + height - handleSize / 2, cursor: 'nwse-resize' },
        { x: gx - handleSize / 2, y: gy + height / 2 - handleSize / 2, cursor: 'ew-resize' },
        { x: gx + width - handleSize / 2, y: gy + height / 2 - handleSize / 2, cursor: 'ew-resize' },
        { x: gx + width / 2 - handleSize / 2, y: gy - handleSize / 2, cursor: 'ns-resize' },
        { x: gx + width / 2 - handleSize / 2, y: gy + height - handleSize / 2, cursor: 'ns-resize' },
      ];
      
      for (const handle of handles) {
        if (x >= handle.x && x <= handle.x + handleSize && y >= handle.y && y <= handle.y + handleSize) {
          if (cursorStyle) cursorStyle.value = handle.cursor;
          if (hoveredGraphicId) hoveredGraphicId.value = '';
          return;
        }
      }

      if (graphic.containsPoint(x, y)) {
        if (cursorStyle) cursorStyle.value = 'move';
        if (hoveredGraphicId) hoveredGraphicId.value = '';
        return;
      }
    }

    // 检查多选图形
    if (pageStore.selectedGraphicIds && pageStore.selectedGraphicIds.length > 1) {
      const selectedGraphics = graphicStore.selectedGraphics;
      if (selectedGraphics && selectedGraphics.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const graphic of selectedGraphics) {
          if (!graphic || typeof graphic.getPosition !== 'function') continue;
          const { x: gx, y: gy } = graphic.getPosition();
          const { width, height } = graphic.getSize();
          minX = Math.min(minX, gx);
          minY = Math.min(minY, gy);
          maxX = Math.max(maxX, gx + width);
          maxY = Math.max(maxY, gy + height);
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const handleSize = 8;

        const handles = [
          { x: minX - handleSize / 2, y: minY - handleSize / 2, cursor: 'nwse-resize' },
          { x: maxX - handleSize / 2, y: minY - handleSize / 2, cursor: 'nesw-resize' },
          { x: minX - handleSize / 2, y: maxY - handleSize / 2, cursor: 'nesw-resize' },
          { x: maxX - handleSize / 2, y: maxY - handleSize / 2, cursor: 'nwse-resize' },
          { x: minX - handleSize / 2, y: minY + height / 2 - handleSize / 2, cursor: 'ew-resize' },
          { x: maxX - handleSize / 2, y: minY + height / 2 - handleSize / 2, cursor: 'ew-resize' },
          { x: minX + width / 2 - handleSize / 2, y: minY - handleSize / 2, cursor: 'ns-resize' },
          { x: minX + width / 2 - handleSize / 2, y: maxY - handleSize / 2, cursor: 'ns-resize' },
        ];

        for (const handle of handles) {
          if (x >= handle.x && x <= handle.x + handleSize && y >= handle.y && y <= handle.y + handleSize) {
            if (cursorStyle) cursorStyle.value = handle.cursor;
            if (hoveredGraphicId) hoveredGraphicId.value = '';
            return;
          }
        }

        for (const graphic of selectedGraphics) {
          if (!graphic || typeof graphic.containsPoint !== 'function') continue;
          if (graphic.containsPoint(x, y)) {
            if (cursorStyle) cursorStyle.value = 'move';
            if (hoveredGraphicId) hoveredGraphicId.value = '';
            return;
          }
        }
      }
    }

    // 检查悬停在非选择的图形上
    const graphics = graphicStore.sortedGraphics || [];
    for (let i = graphics.length - 1; i >= 0; i--) {
      const graphic = graphics[i];
      if (!graphic || typeof graphic.containsPoint !== 'function') continue;

      if (pageStore.selectedGraphicIds && 
          !pageStore.selectedGraphicIds.includes(graphic.id) && 
          graphic.containsPoint(x, y)) {
        if (cursorStyle) cursorStyle.value = 'pointer';
        if (hoveredGraphicId) hoveredGraphicId.value = graphic.id;
        return;
      }
    }

    if (cursorStyle) cursorStyle.value = '';
    if (hoveredGraphicId) hoveredGraphicId.value = '';
  };

  return {
    getScale,
    checkHandleClick,
    checkControlPointHover,
  };
}
