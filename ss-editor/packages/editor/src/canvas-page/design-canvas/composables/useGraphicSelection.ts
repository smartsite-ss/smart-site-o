// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed } from 'vue';
import { usePageStore, useGraphicStore } from '@scada-editor/core';

export function useGraphicSelection(drawCanvas: () => void) {
  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();

  const selectedGraphicRotation = computed(() => {
    if (pageStore.selectedGraphicIds.length === 1) {
      const graphic = graphicStore.getGraphicById(pageStore.selectedGraphicIds[0]);
      return graphic?.getRotation ? graphic.getRotation() : 0;
    }
    return 0;
  });

  const selectedGraphicRect = computed<{ left: number; top: number; width: number; height: number } | null>(() => {
    const selectedGraphics = graphicStore.selectedGraphics;
    if (selectedGraphics.length === 1) {
      const graphic = selectedGraphics[0];
      if (graphic && typeof graphic.getPosition === 'function' && typeof graphic.getSize === 'function') {
        const { x, y } = graphic.getPosition();
        const { width, height } = graphic.getSize();
        return { left: x, top: y, width, height };
      }
    } else if (selectedGraphics.length > 1) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const graphic of selectedGraphics) {
        if (!graphic || typeof graphic.getPosition !== 'function' || typeof graphic.getSize !== 'function') continue;
        const { x, y } = graphic.getPosition();
        const { width, height } = graphic.getSize();
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }
      if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) return null;
      return {
        left: minX, top: minY, width: maxX - minX, height: maxY - minY,
      };
    }
    return null;
  });

  const handleGraphicRotate = (rotation: number) => {
    if (pageStore.selectedGraphicIds.length === 1) {
      const graphic = graphicStore.getGraphicById(pageStore.selectedGraphicIds[0]);
      if (graphic && typeof graphic.setRotation === 'function') {
        graphic.setRotation(rotation);
        drawCanvas();
      }
    }
  };

  const handleGraphicResize = (newRect: { left: number; top: number; width: number; height: number }) => {
    const selectedGraphics = graphicStore.selectedGraphics;
    if (selectedGraphics.length === 1) {
      const graphic = selectedGraphics[0];
      if (!graphic || typeof graphic.setPosition !== 'function' || typeof graphic.getSize !== 'function') return;
      if (graphic.getLocked()) return;
      graphic.setPosition(newRect.left, newRect.top);
      graphic.setSize(newRect.width, newRect.height);
    } else if (selectedGraphics.length > 1) {
      for (const graphic of selectedGraphics) {
        if (!graphic || typeof graphic.getPosition !== 'function' || typeof graphic.getSize !== 'function') continue;
        if (graphic.getLocked()) continue;
        const originalPos = graphic.getPosition();
        const originalSize = graphic.getSize();
        const originalRect = selectedGraphicRect.value;
        if (!originalRect) continue;
        const relativeX = (originalPos.x - originalRect.left) / originalRect.width;
        const relativeY = (originalPos.y - originalRect.top) / originalRect.height;
        const relativeW = originalSize.width / originalRect.width;
        const relativeH = originalSize.height / originalRect.height;
        const newX = newRect.left + relativeX * newRect.width;
        const newY = newRect.top + relativeY * newRect.height;
        const newW = relativeW * newRect.width;
        const newH = relativeH * newRect.height;
        graphic.setPosition(newX, newY);
        graphic.setSize(newW, newH);
      }
    }
    drawCanvas();
  };

  return {
    selectedGraphicRotation,
    selectedGraphicRect,
    handleGraphicRotate,
    handleGraphicResize,
  };
}