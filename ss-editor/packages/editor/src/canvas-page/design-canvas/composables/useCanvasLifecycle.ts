// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { onMounted, onUnmounted } from 'vue';
import { eventBus, Events, keyboardService, KeyboardContext, debounce } from '@scada-editor/core';

interface CanvasLifecycleHandlers {
  drawCanvas: () => void;
  registerEditKeys: () => void;
  closeContextMenu: () => void;
  setupGlobalMouseUpListener: (handler: (event: MouseEvent) => void) => void;
  cleanupGlobalMouseUpListener: () => void;
  updateSelectionModeFromKeyState: (event: KeyboardEvent) => void;
  handleCanvasMouseUp: (event: MouseEvent, drawCanvas: () => void) => void;
}

export function useCanvasLifecycle(handlers: CanvasLifecycleHandlers) {
  const {
    drawCanvas,
    registerEditKeys,
    closeContextMenu,
    setupGlobalMouseUpListener,
    cleanupGlobalMouseUpListener,
    updateSelectionModeFromKeyState,
    handleCanvasMouseUp,
  } = handlers;

  const debouncedDrawCanvas = debounce(drawCanvas, 50);

  const DRAW_EVENTS = [
    Events.GRAPHIC_ADDED,
    Events.GRAPHIC_REMOVED,
    Events.GRAPHIC_UPDATED,
    Events.GRAPHIC_MOVED,
    Events.GRAPHIC_RESIZED,
  ];

  onMounted(() => {
    keyboardService.setContext(KeyboardContext.EDIT);
    registerEditKeys();

    DRAW_EVENTS.forEach((event) => {
      eventBus.on(event, debouncedDrawCanvas);
    });

    document.addEventListener('click', closeContextMenu);
    document.addEventListener('contextmenu', closeContextMenu);

    setupGlobalMouseUpListener((event: MouseEvent) => {
      handleCanvasMouseUp(event, drawCanvas);
    });

    document.addEventListener('keydown', updateSelectionModeFromKeyState);
    document.addEventListener('keyup', updateSelectionModeFromKeyState);
  });

  onUnmounted(() => {
    keyboardService.unregisterContext(KeyboardContext.EDIT);
    keyboardService.setContext(KeyboardContext.GLOBAL);

    DRAW_EVENTS.forEach((event) => {
      eventBus.off(event, debouncedDrawCanvas);
    });

    document.removeEventListener('click', closeContextMenu);
    document.removeEventListener('contextmenu', closeContextMenu);

    cleanupGlobalMouseUpListener();

    document.removeEventListener('keydown', updateSelectionModeFromKeyState);
    document.removeEventListener('keyup', updateSelectionModeFromKeyState);
  });

  return {
    debouncedDrawCanvas,
  };
}