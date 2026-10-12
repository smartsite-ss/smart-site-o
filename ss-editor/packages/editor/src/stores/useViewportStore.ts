// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { usePageStore } from '@scada-editor/core';
import { VIEWPORT } from '../canvas-page/design-canvas/constants';

export const useViewportStore = defineStore('viewport', () => {
  const pageStore = usePageStore();

  const panX = ref(0);
  const panY = ref(0);
  const enableAutoFit = computed({
    get: () => pageStore.enableAutoFit ?? true,
    set: (val: boolean) => { pageStore.enableAutoFit = val; },
  });
  const containerSize = ref({ width: 0, height: 0 });
  const scrollLeft = ref(0);
  const scrollTop = ref(0);

  const scaleMin = computed(() => pageStore.scaleMin ?? VIEWPORT.SCALE_MIN);
  const scaleMax = computed(() => pageStore.scaleMax ?? VIEWPORT.SCALE_MAX);
  const zoomStep = computed(() => pageStore.zoomStep ?? VIEWPORT.ZOOM_STEP);

  const scale = computed({
    get: () => pageStore.currentPage?.scale ?? 100,
    set: (val: number) => {
      if (pageStore.currentPage) {
        pageStore.currentPage.scale = Math.max(scaleMin.value, Math.min(scaleMax.value, val));
      }
    },
  });

  const scaleFactor = computed(() => scale.value / 100);

  const isCentered = computed(() => enableAutoFit.value);

  const viewportStyle = computed(() => {
    const cw = pageStore.currentPage?.width ?? VIEWPORT.DEFAULT_CANVAS_WIDTH;
    const ch = pageStore.currentPage?.height ?? VIEWPORT.DEFAULT_CANVAS_HEIGHT;
    const s = scaleFactor.value;
    return {
      width: (cw * s) + 'px',
      height: (ch * s) + 'px',
    };
  });

  function resetView() {
    scale.value = 100;
    panX.value = 0;
    panY.value = 0;
  }

  function setScrollPosition(sl: number, st: number) {
    scrollLeft.value = sl;
    scrollTop.value = st;
  }

  function fitToWindow() {
    const cw = pageStore.currentPage?.width ?? VIEWPORT.DEFAULT_CANVAS_WIDTH;
    const ch = pageStore.currentPage?.height ?? VIEWPORT.DEFAULT_CANVAS_HEIGHT;
    const availableWidth = containerSize.value.width - VIEWPORT.PADDING * 2;
    const availableHeight = containerSize.value.height - VIEWPORT.PADDING * 2;

    if (availableWidth <= 0 || availableHeight <= 0) return;

    const scaleX = availableWidth / cw;
    const scaleY = availableHeight / ch;
    const newScale = Math.min(scaleX, scaleY, 1) * VIEWPORT.FIT_MARGIN;

    scale.value = newScale * 100;
    panX.value = (availableWidth - cw * newScale) / 2 + VIEWPORT.PADDING;
    panY.value = (availableHeight - ch * newScale) / 2 + VIEWPORT.PADDING;
  }

  return {
    panX,
    panY,
    enableAutoFit,
    containerSize,
    scrollLeft,
    scrollTop,
    scale,
    scaleFactor,
    scaleMin,
    scaleMax,
    zoomStep,
    isCentered,
    viewportStyle,
    resetView,
    fitToWindow,
    setScrollPosition,
  };
});