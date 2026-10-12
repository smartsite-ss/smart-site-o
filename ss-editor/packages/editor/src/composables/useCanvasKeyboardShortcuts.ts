// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { keyboardService, DEFAULT_SHORTCUTS, eventBus } from '@scada-editor/core';

interface CanvasKeyboardOptions {
  drawCanvas: () => void;
  clearSelection: () => void;
  copySelectedGraphics: () => void;
  cutSelectedGraphics: () => void;
  pasteGraphics: () => void;
  duplicateGraphic: (id: string) => void;
  undo: () => void;
  redo: () => void;
  selectMultipleGraphics: (ids: string[]) => void;
  selectAllGraphics: () => void;
  moveSelectedGraphics: (dx: number, dy: number) => void;
  groupSelectedGraphics: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  deleteGraphic: (fromContextMenu: boolean) => void;
  ungroupGraphicsHandler: () => void;
  getCanvasContainer: () => HTMLElement | null;
}

/** 判断当前焦点是否位于编辑区（画布容器）内 */
function isFocusInsideCanvas(container: HTMLElement | null): boolean {
  const active = document.activeElement;
  if (!active || !container) return false;
  return container.contains(active);
}

export function useCanvasKeyboardShortcuts(options: CanvasKeyboardOptions) {
  const {
    drawCanvas,
    clearSelection,
    copySelectedGraphics,
    cutSelectedGraphics,
    pasteGraphics,
    duplicateGraphic,
    undo,
    redo,
    selectAllGraphics,
    moveSelectedGraphics,
    groupSelectedGraphics,
    deleteGraphic,
    ungroupGraphicsHandler,
    getCanvasContainer,
  } = options;

  let registered = false;

  const shortcutHandlers: Record<string, (event: KeyboardEvent) => void> = {
    clearSelection: (event) => {
      clearSelection();
      drawCanvas();
      event.preventDefault();
    },
    deleteSelection: (event) => {
      if (!isFocusInsideCanvas(getCanvasContainer())) return;
      deleteGraphic(false);
      event.preventDefault();
    },
    deleteSelectionBackspace: (event) => {
      if (!isFocusInsideCanvas(getCanvasContainer())) return;
      deleteGraphic(false);
      event.preventDefault();
    },
    copy: (event) => {
      if (!isFocusInsideCanvas(getCanvasContainer())) return;
      event.preventDefault();
      copySelectedGraphics();
    },
    cut: (event) => {
      if (!isFocusInsideCanvas(getCanvasContainer())) return;
      event.preventDefault();
      cutSelectedGraphics();
    },
    paste: (event) => {
      if (!isFocusInsideCanvas(getCanvasContainer())) return;
      event.preventDefault();
      pasteGraphics();
    },
    duplicate: (_event) => {
      // duplicateGraphic takes care of creation & positioning via store
      duplicateGraphic('');
    },
    undo: (_event) => {
      undo();
    },
    redoY: (_event) => {
      redo();
    },
    redoZ: (_event) => {
      redo();
    },
    selectAll: (_event) => {
      selectAllGraphics();
    },
    deselectAll: (_event) => {
      clearSelection();
      drawCanvas();
    },
    moveUp: (_event) => {
      moveSelectedGraphics(0, -1);
    },
    moveDown: (_event) => {
      moveSelectedGraphics(0, 1);
    },
    moveLeft: (_event) => {
      moveSelectedGraphics(-1, 0);
    },
    moveRight: (_event) => {
      moveSelectedGraphics(1, 0);
    },
    moveUpLarge: (_event) => {
      moveSelectedGraphics(0, -10);
    },
    moveDownLarge: (_event) => {
      moveSelectedGraphics(0, 10);
    },
    moveLeftLarge: (_event) => {
      moveSelectedGraphics(-10, 0);
    },
    moveRightLarge: (_event) => {
      moveSelectedGraphics(10, 0);
    },
    group: (_event) => {
      groupSelectedGraphics();
    },
    ungroup: (_event) => {
      ungroupGraphicsHandler();
    },
    bringForward: (_event) => {
      // bringForward needs first selected id
    },
    sendBackward: (_event) => {
      // sendBackward needs first selected id
    },
    bringToFront: (_event) => {
      // bringToFront needs first selected id
    },
    sendToBack: (_event) => {
      // sendToBack needs first selected id
    },
    save: (event) => {
      event.preventDefault();
      eventBus.emit('save-page');
    },
    saveAll: (event) => {
      event.preventDefault();
      eventBus.emit('save-all-pages');
    },
    previewInNewTab: (event) => {
      event.preventDefault();
      eventBus.emit('preview-in-new-tab');
    },
  };

  const registerEditKeys = () => {
    if (registered) return;
    keyboardService.registerShortcuts(DEFAULT_SHORTCUTS, shortcutHandlers);
    registered = true;
  };

  const unregisterEditKeys = () => {
    (keyboardService as any).unregisterShortcuts(DEFAULT_SHORTCUTS);
    registered = false;
  };

  return {
    registerEditKeys,
    unregisterEditKeys,
  };
}
