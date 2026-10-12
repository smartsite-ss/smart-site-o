// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { useCurrentPage } from '@scada-editor/core';
import type { DrawCanvasCallback } from './types';

export function useAlignment() {
  const getPage = () => useCurrentPage();

  const alignLeft = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.alignGraphics('left' as any);
    drawCanvas();
  };

  const alignRight = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.alignGraphics('right' as any);
    drawCanvas();
  };

  const alignTop = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.alignGraphics('top' as any);
    drawCanvas();
  };

  const alignBottom = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.alignGraphics('bottom' as any);
    drawCanvas();
  };

  const alignCenter = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.alignGraphics('center' as any);
    drawCanvas();
  };

  const alignMiddle = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.alignGraphics('middle' as any);
    drawCanvas();
  };

  const distributeHorizontal = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.distributeGraphics('horizontal');
    drawCanvas();
  };

  const distributeVertical = (drawCanvas: DrawCanvasCallback) => {
    getPage()?.distributeGraphics('vertical');
    drawCanvas();
  };

  return {
    alignLeft,
    alignRight,
    alignTop,
    alignBottom,
    alignCenter,
    alignMiddle,
    distributeHorizontal,
    distributeVertical,
  };
}
