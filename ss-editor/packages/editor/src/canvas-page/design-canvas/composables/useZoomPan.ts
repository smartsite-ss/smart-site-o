// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed, type Ref, nextTick } from 'vue';
import { usePageStore, useGraphicStore, debounce } from '@scada-editor/core';
import { useViewportStore } from '../../../stores/useViewportStore';
import { useAutoFit } from './useAutoFit';
import { VIEWPORT, calculateFitScale } from '../constants';

const EDITOR_SELECTOR = '.plugin-layer-manager';

interface ZoomPanOptions {
  canvasWidth: Ref<number>;
  canvasHeight: Ref<number>;
}

export function useZoomPan(options: ZoomPanOptions) {
  const { canvasWidth, canvasHeight } = options;
  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();
  const viewportStore = useViewportStore();

  const { containerRef } = useAutoFit(canvasWidth, canvasHeight,
    ref(viewportStore.panX), ref(viewportStore.panY));

  const mousePosition = ref<{ x: number; y: number } | null>(null);
  const showGrid = ref(true);
  const showRuler = ref(true);
  const showReferenceLines = ref(false);

  const snapToHundred = (current: number, target: number): number => {
    if (current < 100 && target >= 100 / viewportStore.zoomStep) return 100;
    if (current > 100 && target <= 100 * viewportStore.zoomStep) return 100;
    return target;
  };

  const zoomAtAnchor = (ax: number, ay: number, newScaleVal: number, dc: () => void) => {
    if (!pageStore.currentPage) return;
    newScaleVal = Math.max(viewportStore.scaleMin, Math.min(viewportStore.scaleMax, newScaleVal));
    const oldZoom = pageStore.currentPage.scale / 100, newZoom = newScaleVal / 100;
    const pw = pageStore.currentPage.width || 1920, ph = pageStore.currentPage.height || 1080;
    const editorEl = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
    const ew = editorEl ? editorEl.clientWidth : 0, eh = editorEl ? editorEl.clientHeight : 0;
    const oldOffX = ew > pw * oldZoom ? (ew - pw * oldZoom) / 2 : 0;
    const oldOffY = eh > ph * oldZoom ? (eh - ph * oldZoom) / 2 : 0;
    const sl = editorEl ? editorEl.scrollLeft : 0, st = editorEl ? editorEl.scrollTop : 0;
    const adx = ax * oldZoom + oldOffX - sl, ady = ay * oldZoom + oldOffY - st;
    viewportStore.scale = newScaleVal;
    dc();
    nextTick(() => {
      const ed = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
      if (!ed) return;
      const nox = ew > pw * newZoom ? (ew - pw * newZoom) / 2 : 0;
      const noy = eh > ph * newZoom ? (eh - ph * newZoom) / 2 : 0;
      ed.scrollLeft = ax * newZoom + nox - adx;
      ed.scrollTop = ay * newZoom + noy - ady;
    });
  };

  const pageAnchor = () => ({
    x: (pageStore.currentPage?.width || 1920) / 2,
    y: (pageStore.currentPage?.height || 1080) / 2,
  });

  const zoomIn = (dc: () => void) => {
    if (!pageStore.currentPage) return;
    const nsv = snapToHundred(pageStore.currentPage.scale,
      pageStore.currentPage.scale * viewportStore.zoomStep);
    zoomAtAnchor(pageAnchor().x, pageAnchor().y, nsv, dc);
  };
  const zoomOut = (dc: () => void) => {
    if (!pageStore.currentPage) return;
    const nsv = snapToHundred(pageStore.currentPage.scale,
      pageStore.currentPage.scale / viewportStore.zoomStep);
    zoomAtAnchor(pageAnchor().x, pageAnchor().y, nsv, dc);
  };
  const resetZoom = (dc: () => void) => { viewportStore.scale = 100; dc(); };

  const fitToWindow = (dc: () => void) => {
    const editorEl = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
    if (!editorEl) return;
    const cw = pageStore.currentPage?.width || 1920, ch = pageStore.currentPage?.height || 1080;
    const ns = calculateFitScale(editorEl.clientWidth, editorEl.clientHeight, cw, ch, viewportStore.scaleMin);
    viewportStore.scale = Math.round(ns * 100);
    dc();
  };

  const fitToContent = (dc: () => void) => {
    const graphics = graphicStore.sortedGraphics || [];
    if (graphics.length === 0) { fitToWindow(dc); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const g of graphics) {
      if (!g || typeof g.getPosition !== 'function') continue;
      const { x, y } = g.getPosition(), { width, height } = g.getSize();
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width); maxY = Math.max(maxY, y + height);
    }
    const cw = maxX - minX + 100, ch = maxY - minY + 100;
    const editorEl = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
    if (!editorEl || editorEl.clientWidth <= 0) return;
    const scaleX = editorEl.clientWidth / cw, scaleY = editorEl.clientHeight / ch;
    const ns = Math.max(viewportStore.scaleMin / 100, Math.min(scaleX, scaleY) * VIEWPORT.FIT_MARGIN);
    viewportStore.scale = Math.round(ns * 100);
    dc();
    nextTick(() => {
      const e = document.querySelector(EDITOR_SELECTOR) as HTMLElement | null;
      if (e) { e.scrollLeft = (minX - 50) * ns; e.scrollTop = (minY - 50) * ns; }
    });
  };

  const centerZoom = (delta: number, dc: () => void) => {
    if (!pageStore.currentPage) return;
    const a = pageAnchor();
    zoomAtAnchor(a.x, a.y, pageStore.currentPage.scale + delta, dc);
  };

  const handleWheel = (event: WheelEvent, dc: () => void) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    if (!pageStore.currentPage) return;
    const delta = event.deltaY > 0 ? -10 : 10;
    const canvasEl = document.querySelector('canvas.design-canvas') as HTMLElement | null;
    if (!canvasEl) return;
    const r = canvasEl.getBoundingClientRect();
    const z = pageStore.currentPage.scale / 100;
    const lx = (event.clientX - r.left) / z, ly = (event.clientY - r.top) / z;
    zoomAtAnchor(lx, ly, snapToHundred(pageStore.currentPage.scale,
      pageStore.currentPage.scale + delta), dc);
  };

  const handleScroll = (event: Event) => {
    const t = event.target as HTMLElement;
    viewportStore.setScrollPosition(t.scrollLeft, t.scrollTop);
  };

  const showAutoFitCentering = computed(() => {
    if (!pageStore.enableAutoFit) return false;
    if (!containerRef.value) return true;
    const r = containerRef.value.getBoundingClientRect();
    const aw = r.width - VIEWPORT.PADDING * 2, ah = r.height - VIEWPORT.PADDING * 2;
    if (aw <= 0 || ah <= 0) return true;
    const s = pageStore.currentPageScaleFactor;
    return canvasWidth.value * s <= aw + 5 && canvasHeight.value * s <= ah + 5;
  });

  const updateCanvasMousePosition = (event: MouseEvent, canvasEl: HTMLCanvasElement | null) => {
    if (!canvasEl) return;
    const r = canvasEl.getBoundingClientRect(), s = pageStore.currentPageScaleFactor;
    mousePosition.value = {
      x: (event.clientX - r.left + viewportStore.scrollLeft) / s,
      y: (event.clientY - r.top + viewportStore.scrollTop) / s,
    };
  };

  const updateMousePosition = (p: { x: number; y: number } | null) => { mousePosition.value = p; };
  const handleMouseLeave = debounce(() => updateMousePosition(null), 50);
  const toggleGrid = () => { showGrid.value = !showGrid.value; };
  const toggleRuler = () => { showRuler.value = !showRuler.value; };
  const toggleReferenceLines = () => { showReferenceLines.value = !showReferenceLines.value; };

  return {
    mousePosition, showGrid, showRuler, showReferenceLines,
    containerRef, showAutoFitCentering,
    zoomIn, zoomOut, resetZoom, fitToWindow, fitToContent, centerZoom, handleWheel,
    handleScroll, updateCanvasMousePosition, updateMousePosition, handleMouseLeave,
    toggleGrid, toggleRuler, toggleReferenceLines,
  };
}