// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed, ref } from 'vue';
import { useGraphicStore, usePageStore, useCurrentPage, GraphicFactory, PageExportService, i18n, MessageService, ScadaDataManager } from '@scada-editor/core';
import type { IGraphic } from '@scada-editor/core';
import { useWsStore } from '@scada-editor/system';
import { showAlert } from '../utils/messageBox';

// 数据刷新信号（模块级单例，所有 useGraphic 实例共享）
// WS 数据到达时 wsStore.tagFlushVersion 递增（Pinia 响应式），非 WS 数据由 EventBus 触发
const dataRefreshVersion = ref(0);
let tagValueUnsubscribe: (() => void) | null = null;

function ensureDataRefreshListener() {
  if (tagValueUnsubscribe) return;
  tagValueUnsubscribe = ScadaDataManager.eventBus.on('tagValueChanged', () => {
    dataRefreshVersion.value++;
  });
}

export function useGraphic() {
  const graphicStore = useGraphicStore();
  const pageStore = usePageStore();
  const wsStore = useWsStore();
  const { t } = i18n.global;

  ensureDataRefreshListener();

  const getPage = () => useCurrentPage();

  const applyToSelectedGraphics = (action: (id: string) => void) => {
    const selectedIds = [...(pageStore.currentPage?.selectedGraphicIds || [])];
    selectedIds.forEach(id => {
      try {
        action(id);
      } catch (error) {
        console.error('[useGraphic] 批量操作失败:', error);
      }
    });
  };

  const handleError = (error: unknown, messageKey: string) => {
    console.error('[useGraphic]', messageKey, error);
    showAlert(t(messageKey), t('settings.confirm'), 'error');
  };

  const addGraphic = (type: string, x: number, y: number, width: number, height: number) => {
    try {
      return graphicStore.addGraphic(type, x, y, width, height);
    } catch (error) {
      handleError(error, 'graphic.errorMessages.addGraphicFailed');
      return null;
    }
  };

  const removeGraphic = (id: string) => {
    try { getPage()?.removeGraphic(id); } catch (error) { handleError(error, 'graphic.errorMessages.deleteGraphicFailed'); }
  };

  const deleteSelectedGraphics = () => {
    try {
      const count = getPage()?.selectedGraphicIds?.length || 0;
      getPage()?.deleteSelectedGraphics();
      if (count > 0) {
        MessageService.showDeleteSuccess(t('graphic.deleteSuccess', { count }));
      }
    } catch (error) { handleError(error, 'graphic.errorMessages.deleteGraphicFailed'); }
  };

  const selectGraphic = (id: string | null) => {
    try { getPage()?.selectGraphic(id); } catch (error) { handleError(error, 'graphic.errorMessages.selectGraphicFailed'); }
  };

  const selectMultipleGraphics = (ids: string[]) => {
    try { getPage()?.selectMultipleGraphics(ids); } catch (error) { handleError(error, 'graphic.errorMessages.selectGraphicFailed'); }
  };

  const addToSelection = (id: string) => {
    try { getPage()?.addToSelection(id); } catch (error) { handleError(error, 'graphic.errorMessages.selectGraphicFailed'); }
  };

  const removeFromSelection = (id: string) => {
    try { getPage()?.removeFromSelection(id); } catch (error) { handleError(error, 'graphic.errorMessages.selectGraphicFailed'); }
  };

  const selectAllGraphics = () => {
    try {
      const page = getPage();
      if (page) {
        const allIds = (page.graphics || []).map((g: any) => g.id);
        page.selectMultipleGraphics(allIds);
      }
    } catch (error) { handleError(error, 'graphic.errorMessages.selectGraphicFailed'); }
  };

  const clearSelection = () => {
    try { getPage()?.clearSelection(); } catch (error) { handleError(error, 'graphic.errorMessages.selectGraphicFailed'); }
  };

  const toggleSelection = (id: string) => {
    try {
      const page = getPage();
      if (page) {
        if (page.selectedGraphicIds.includes(id)) {
          page.removeFromSelection(id);
        } else {
          page.addToSelection(id);
        }
      }
    } catch (error) { handleError(error, 'graphic.errorMessages.selectGraphicFailed'); }
  };

  const updateGraphic = (id: string, properties: Partial<Record<string, unknown>>) => {
    try { getPage()?.updateGraphic(id, properties); } catch (error) { handleError(error, 'graphic.errorMessages.updateGraphicFailed'); }
  };

  const moveGraphic = (id: string, x: number, y: number) => {
    try { getPage()?.moveGraphic(id, x, y); } catch (error) { handleError(error, 'graphic.errorMessages.moveGraphicFailed'); }
  };

  const resizeGraphic = (id: string, width: number, height: number) => {
    try { getPage()?.resizeGraphic(id, width, height); } catch (error) { handleError(error, 'graphic.errorMessages.resizeGraphicFailed'); }
  };

  const duplicateGraphic = (id: string) => {
    try { return graphicStore.duplicateGraphic(id); } catch (error) { handleError(error, 'graphic.errorMessages.duplicateGraphicFailed'); return null; }
  };

  const duplicateGroup = (groupId: string) => {
    try { return graphicStore.duplicateGroup(groupId); } catch (error) { handleError(error, 'graphic.errorMessages.duplicateGroupFailed'); return null; }
  };

  const copySelectedGraphics = () => {
    try {
      const count = pageStore.selectedGraphicIds?.length || 0;
      graphicStore.copy();
      if (count > 0) {
        MessageService.showCopySuccess(t('graphic.copySuccess', { count }));
      }
    } catch (error) { handleError(error, 'graphic.errorMessages.copyGraphicFailed'); }
  };

  const cutSelectedGraphics = () => {
    try {
      const count = pageStore.selectedGraphicIds?.length || 0;
      graphicStore.cut();
      if (count > 0) {
        MessageService.showCutSuccess(t('graphic.cutSuccess', { count }));
      }
    } catch (error) { handleError(error, 'graphic.errorMessages.cutGraphicFailed'); }
  };

  const pasteGraphics = (offsetX: number = 20, offsetY: number = 20) => {
    try {
      const result = graphicStore.paste(offsetX, offsetY);
      if (result && result.length > 0) {
        MessageService.showPasteSuccess(t('graphic.pasteSuccess', { count: result.length }));
      }
      return result;
    } catch (error) { handleError(error, 'graphic.errorMessages.pasteGraphicFailed'); return []; }
  };

  const undo = () => {
    try {
      const page = getPage();
      if (!page) return;
      const historyManager = (page as any).getHistoryManager?.();
      const canUndo = historyManager?.canUndo?.() ?? false;
      page.undo();
      if (canUndo) {
        MessageService.showUndoSuccess(t('graphic.undoSuccess'));
      }
    } catch (error) { handleError(error, 'graphic.errorMessages.undoFailed'); }
  };

  const redo = () => {
    try {
      const page = getPage();
      if (!page) return;
      const historyManager = (page as any).getHistoryManager?.();
      const canRedo = historyManager?.canRedo?.() ?? false;
      page.redo();
      if (canRedo) {
        MessageService.showRedoSuccess(t('graphic.redoSuccess'));
      }
    } catch (error) { handleError(error, 'graphic.errorMessages.redoFailed'); }
  };

  const bringToFront = (id: string) => {
    try { getPage()?.bringToFront(id); } catch (error) { handleError(error, 'graphic.errorMessages.bringToFrontFailed'); }
  };

  const sendToBack = (id: string) => {
    try { getPage()?.sendToBack(id); } catch (error) { handleError(error, 'graphic.errorMessages.sendToBackFailed'); }
  };

  const bringForward = (id: string) => {
    try { getPage()?.bringForward(id); } catch (error) { handleError(error, 'graphic.errorMessages.bringForwardFailed'); }
  };

  const sendBackward = (id: string) => {
    try { getPage()?.sendBackward(id); } catch (error) { handleError(error, 'graphic.errorMessages.sendBackwardFailed'); }
  };

  const lockGraphic = (id: string) => {
    try { getPage()?.lockGraphic(id); } catch (error) { handleError(error, 'graphic.errorMessages.lockGraphicFailed'); }
  };

  const lockSelectedGraphics = () => { applyToSelectedGraphics(lockGraphic); };

  const unlockGraphic = (id: string) => {
    try { getPage()?.unlockGraphic(id); } catch (error) { handleError(error, 'graphic.errorMessages.unlockGraphicFailed'); }
  };

  const unlockSelectedGraphics = () => { applyToSelectedGraphics(unlockGraphic); };

  const toggleGraphicLock = (id: string) => {
    try { getPage()?.toggleGraphicLock(id); } catch (error) { handleError(error, 'graphic.errorMessages.toggleGraphicLockFailed'); }
  };

  const showGraphic = (id: string) => {
    try { getPage()?.showGraphic(id); } catch (error) { handleError(error, 'graphic.errorMessages.showGraphicFailed'); }
  };

  const showSelectedGraphics = () => { applyToSelectedGraphics(showGraphic); };

  const hideGraphic = (id: string) => {
    try { getPage()?.hideGraphic(id); } catch (error) { handleError(error, 'graphic.errorMessages.hideGraphicFailed'); }
  };

  const hideSelectedGraphics = () => { applyToSelectedGraphics(hideGraphic); };

  const toggleGraphicVisibility = (id: string) => {
    try { getPage()?.toggleGraphicVisibility(id); } catch (error) { handleError(error, 'graphic.errorMessages.toggleGraphicVisibilityFailed'); }
  };

  const groupSelectedGraphics = () => {
    try {
      const selectedIds = [...(getPage()?.selectedGraphicIds || [])];
      graphicStore.groupGraphics(selectedIds);
    } catch (error) { handleError(error, 'graphic.errorMessages.groupGraphicFailed'); }
  };

  const ungroupGraphics = (groupId: string) => {
    try { graphicStore.ungroupGraphics(groupId); } catch (error) { handleError(error, 'graphic.errorMessages.ungroupGraphicFailed'); }
  };

  const alignGraphics = (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'middle') => {
    try { getPage()?.alignGraphics(alignment as any); } catch (error) { handleError(error, 'graphic.errorMessages.alignGraphicFailed'); }
  };

  const distributeGraphics = (direction: 'horizontal' | 'vertical') => {
    try { getPage()?.distributeGraphics(direction); } catch (error) { handleError(error, 'graphic.errorMessages.distributeGraphicFailed'); }
  };

  const alignLeft = () => alignGraphics('left');
  const alignRight = () => alignGraphics('right');
  const alignTop = () => alignGraphics('top');
  const alignBottom = () => alignGraphics('bottom');
  const alignCenter = () => alignGraphics('center');
  const alignMiddle = () => alignGraphics('middle');
  const distributeHorizontal = () => distributeGraphics('horizontal');
  const distributeVertical = () => distributeGraphics('vertical');

  const autoLayout = (layoutType: 'grid' | 'flow' | 'circle') => {
    try { getPage()?.autoLayout(layoutType); } catch (error) { handleError(error, 'graphic.errorMessages.autoLayoutFailed'); }
  };

  const importGraphics = (data: unknown[]) => {
    try { getPage()?.importGraphics(data); } catch (error) { handleError(error, 'graphic.errorMessages.importGraphicFailed'); }
  };

  const exportGraphics = () => {
    try { return getPage()?.exportGraphics() ?? []; } catch (error) { handleError(error, 'graphic.errorMessages.exportGraphicFailed'); return []; }
  };

  const exportPage = () => {
    try {
      const data = PageExportService.exportPage();
      const page = getPage();
      const filename = `${page?.name || 'scada-page'}-${Date.now()}.json`;
      PageExportService.downloadJSON(data, filename);
      MessageService.showExportSuccess(t('graphic.exportSuccess'));
    } catch (error) { handleError(error, 'graphic.errorMessages.exportPageFailed'); }
  };

  const exportPageRaw = () => {
    try {
      const data = PageExportService.exportPageRaw();
      const page = getPage();
      const filename = `${page?.name || 'scada-page'}-${Date.now()}.json`;
      PageExportService.downloadJSON(data, filename);
    } catch (error) { handleError(error, 'graphic.errorMessages.exportPageFailed'); }
  };

  const exportScene = () => {
    try {
      const data = PageExportService.exportScene();
      const filename = `scada-scene-${Date.now()}.json`;
      PageExportService.downloadJSON(data, filename);
    } catch (error) { handleError(error, 'graphic.errorMessages.exportSceneFailed'); }
  };

  const getPageJsonData = () => {
    try { return PageExportService.exportPage(); } catch (error) { handleError(error, 'graphic.errorMessages.getPageJsonDataFailed'); return null; }
  };

  const importPageJson = (jsonString: string) => {
    try { PageExportService.importPage(jsonString); } catch (error) { handleError(error, 'graphic.errorMessages.importPageJsonFailed'); }
  };

  const downloadJson = (data: unknown, filename: string) => {
    try { PageExportService.downloadJSON(data, filename); } catch (error) { handleError(error, 'graphic.errorMessages.downloadJsonFailed'); }
  };

  const getGraphicInfo = (type: string) => {
    try { return GraphicFactory.getGraphicInfo(type); } catch (error) { handleError(error, 'graphic.errorMessages.getGraphicInfoFailed'); return null; }
  };

  const hasSelectedGraphics = () => {
    return (getPage()?.selectedGraphicIds?.length || 0) > 0;
  };

  return {
    graphics: graphicStore.graphics,
    selectedGraphic: graphicStore.selectedGraphic,
    selectedGraphics: graphicStore.selectedGraphics,
    selectedGraphicId: getPage()?.selectedGraphicId || null,
    selectedGraphicIds: pageStore.selectedGraphicIds || [],
    sortedGraphics: computed(() => {
      // 依赖数据刷新信号：WS 驱动（tagFlushVersion）+ 非 WS 驱动（EventBus → dataRefreshVersion）
      // setProperty 仅做内存写入不改变数组引用，需通过这两信号触发 computed 重算
      void wsStore.tagFlushVersion;
      void dataRefreshVersion.value;

      const currentPage = pageStore.currentPage;
      if (!currentPage) return [];
      const graphics = 'value' in currentPage.graphics
        ? (currentPage.graphics.value as IGraphic[])
        : (currentPage.graphics as IGraphic[]);
      return [...(graphics || [])].sort(
        (a, b) => (a.config.zIndex ?? 0) - (b.config.zIndex ?? 0)
      );
    }),
    addGraphic, removeGraphic, deleteSelectedGraphics,
    selectGraphic, selectMultipleGraphics, selectAllGraphics,
    addToSelection, removeFromSelection, clearSelection, toggleSelection,
    updateGraphic, moveGraphic, resizeGraphic,
    duplicateGraphic, duplicateGroup,
    copySelectedGraphics, cutSelectedGraphics, pasteGraphics,
    undo, redo,
    bringToFront, sendToBack, bringForward, sendBackward,
    lockGraphic, lockSelectedGraphics,
    unlockGraphic, unlockSelectedGraphics,
    toggleGraphicLock,
    showGraphic, showSelectedGraphics,
    hideGraphic, hideSelectedGraphics,
    toggleGraphicVisibility,
    groupSelectedGraphics, ungroupGraphics,
    alignGraphics, alignLeft, alignRight, alignTop, alignBottom, alignCenter, alignMiddle,
    distributeGraphics, distributeHorizontal, distributeVertical,
    autoLayout, importGraphics, exportGraphics,
    exportPage, exportPageRaw, exportScene,
    getPageJsonData, importPageJson, downloadJson,
    getGraphicInfo, hasSelectedGraphics,
  };
}