// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed } from 'vue';
import { usePageStore, useGraphicStore, i18n } from '@scada-editor/core';
import { showConfirm } from '../../../utils/messageBox';
const { t } = i18n.global;

interface GraphicOps {
  lockGraphic(id: string): void; unlockGraphic(id: string): void;
  toggleGraphicLock(id: string): void;
  showGraphic(id: string): void; hideGraphic(id: string): void;
  toggleGraphicVisibility(id: string): void;
  deleteSelectedGraphics(): void; duplicateGraphic(id: string): void;
  copySelectedGraphics(): void; pasteGraphics(): void;
  bringToFront(id: string): void; sendToBack(id: string): void;
  bringForward(id: string): void; sendBackward(id: string): void;
  groupSelectedGraphics(): void; ungroupGraphics(groupId: string): void;
}
interface ExportOps {
  exportGraphicData(): void; exportSceneData(): void;
  exportScene(): void; previewGraphic(): void;
}

export function useContextMenu(g: GraphicOps, e: ExportOps) {
  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();
  const visible = ref(false), pos = ref({ x: 0, y: 0 });
  const ids = () => pageStore.selectedGraphicIds;
  const cfg = (id: string) => (graphicStore.getGraphicById(id)?.config as any)?.config;

  const locked = computed(() =>
    ids().length ? !!graphicStore.getGraphicById(ids()[0])?.getLocked() : false);
  const visibleFlag = computed(() =>
    !ids().length || graphicStore.getGraphicById(ids()[0])?.getVisible() !== false);
  const isGroup = computed(() => {
    const list = ids();
    if (!list.length) return false;
    if (list.length === 1 && graphicStore.getGraphicById(list[0])?.config?.isGroup) return true;
    const gm = (pageStore.currentPage as any)?.getGroupManager?.();
    return gm ? list.some((id: string) => gm.isGraphicInGroup(id) || gm.isGroup(id)) : false;
  });

  const open = (ev: MouseEvent) => {
    ev.preventDefault(); ev.stopPropagation();
    pos.value = { x: ev.clientX, y: ev.clientY }; visible.value = true;
  };
  const close = () => { visible.value = false; };

  const onToggleLock = () => {
    const list = ids();
    if (list.length === 1) g.toggleGraphicLock(list[0]);
    else if (list.length > 1) {
      const hl = list.some(id => cfg(id)?.locked);
      list.forEach(id => hl ? g.unlockGraphic(id) : g.lockGraphic(id));
    }
    close();
  };
  const onToggleVisibility = () => {
    const list = ids();
    if (list.length === 1) g.toggleGraphicVisibility(list[0]);
    else if (list.length > 1) {
      const hv = list.some(id => cfg(id)?.visible === false);
      list.forEach(id => hv ? g.showGraphic(id) : g.hideGraphic(id));
    }
    close();
  };
  const onDelete = async () => {
    if (ids().length && await showConfirm(t('editor.confirmDelete')))
      g.deleteSelectedGraphics();
    close();
  };

  const onDuplicate = () => { if (ids().length) g.duplicateGraphic(ids()[0]); close(); };
  const onCopy = () => { g.copySelectedGraphics(); close(); };
  const onPaste = () => { g.pasteGraphics(); close(); };
  const onBringToFront = () => { if (ids().length) g.bringToFront(ids()[0]); close(); };
  const onSendToBack = () => { if (ids().length) g.sendToBack(ids()[0]); close(); };
  const onBringForward = () => { if (ids().length) g.bringForward(ids()[0]); close(); };
  const onSendBackward = () => { if (ids().length) g.sendBackward(ids()[0]); close(); };
  const onGroup = () => { g.groupSelectedGraphics(); close(); };
  const onUngroup = () => {
    if (ids().length && isGroup.value) {
      let gid = ids()[0];
      const gm = (pageStore.currentPage as any)?.getGroupManager?.();
      if (gm) for (const id of ids()) {
        const grp = gm.getGroupForGraphic(id); if (grp) { gid = grp.id; break; }
      }
      g.ungroupGraphics(gid);
    }
    close();
  };
  const onExportData = () => { e.exportGraphicData(); close(); };
  const onExportSceneData = () => { e.exportSceneData(); close(); };
  const onExportScene = () => { e.exportScene(); close(); };
  const onPreview = () => { e.previewGraphic(); close(); };

  return {
    showContextMenu: visible, contextMenuPosition: pos,
    isGraphicLocked: locked, isGraphicVisible: visibleFlag, isGroup,
    handleContextMenu: open, closeContextMenu: close,
    handleToggleLock: onToggleLock, handleToggleVisibility: onToggleVisibility,
    handleDelete: onDelete, handleDuplicate: onDuplicate,
    handleCopy: onCopy, handlePaste: onPaste,
    handleBringToFront: onBringToFront, handleSendToBack: onSendToBack,
    handleBringForward: onBringForward, handleSendBackward: onSendBackward,
    handleGroup: onGroup, handleUngroup: onUngroup,
    handleExportData: onExportData, handleExportSceneData: onExportSceneData,
    handleExportScene: onExportScene, handlePreview: onPreview,
  };
}