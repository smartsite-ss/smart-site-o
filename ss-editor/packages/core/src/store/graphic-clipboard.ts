// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '../types';
import { usePageStore } from './page.store';
import { eventBus, Events } from '../platform/event/EventBus';
import { ClipboardManager } from '../graphic-editing/managers/ClipboardManager';
import { InterpageTransferService } from '../services/InterpageTransferService';
import { graphicCache } from './graphic-defaults';
import { getNextGraphicName } from '../utils/graphic/graphicNameUtils';

/** 剪贴板操作需要的 store 状态子集 */
export interface ClipboardStoreState {
  clipboardManager: ClipboardManager;
  transferService: InterpageTransferService;
}

/** 复制选中的图形到剪贴板 */
export function copyHelper(store: ClipboardStoreState) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage || currentPage.selectedGraphicIds.length === 0) return;

  const selectedIds = [...currentPage.selectedGraphicIds];

  const selectedGraphics = currentPage.graphics.filter((g) =>
    selectedIds.includes(g.id)
  );

  const serializedData = store.transferService.serializeGraphics(selectedGraphics);
  store.clipboardManager.setData(serializedData, 'copy', currentPage.id);

  const groupManager = currentPage.getGroupManager();
  if (groupManager && selectedIds.length > 0) {
    const candidateGroup = groupManager.getGroupForGraphic(selectedIds[0]);
    const allInGroup = selectedIds.every((sid: string) => groupManager.isGraphicInGroup(sid));
    if (candidateGroup && allInGroup) {
      const metadata = {
        isGroupCopy: true,
        sourceGroupId: candidateGroup.id,
        groupName: candidateGroup.name,
      };
      store.clipboardManager.setGroupMetadata(metadata);
    }
  }
}

/** 剪切选中的图形到剪贴板 */
export function cutHelper(store: ClipboardStoreState) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage || currentPage.selectedGraphicIds.length === 0) return;

  const selectedGraphics = currentPage.graphics.filter((g) =>
    currentPage.selectedGraphicIds.includes(g.id)
  );
  const serializedData = store.transferService.serializeGraphics(selectedGraphics);
  store.clipboardManager.setData(serializedData, 'cut', currentPage.id);

  // 使用事务化批量删除
  currentPage.deleteSelectedGraphics();
}

/** 从剪贴板粘贴图形到当前页面 */
export function pasteHelper(store: ClipboardStoreState, offsetX: number = 20, offsetY: number = 20): IGraphic[] {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage || store.clipboardManager.isEmpty()) return [];

  const clipboardData = store.clipboardManager.getData();
  const existingIds = currentPage.graphics.map((g) => g.id);
  const pasteCount = store.clipboardManager.getPasteCount();
  const clipboardMode = store.clipboardManager.getClipboardMode();
  const sourcePageId = store.clipboardManager.getSourcePageId();

  // 反序列化
  let graphics = store.transferService.deserializeGraphics(clipboardData);

  // 重新分配 ID
  graphics = store.transferService.reassignIds(graphics, existingIds);

  // ★ 按同类图元最大编码递增名称（在添加之前更新所有粘贴图形的名称）
  for (const graphic of graphics) {
    const type = graphic.type;
    const newName = getNextGraphicName(
      type,
      currentPage.graphics.concat(
        graphics.filter(g => g.id !== graphic.id)
      )
    );
    graphic.config.name = newName;
  }

  // 计算累积偏移位置（每次粘贴都增加 20px）
  const totalOffsetX = offsetX * (pasteCount + 1);
  const totalOffsetY = offsetY * (pasteCount + 1);

  // 偏移位置
  graphics.forEach((graphic) => {
    store.transferService.transformCoordinates(graphic, totalOffsetX, totalOffsetY);
    // 添加到当前页面
    currentPage.addGraphic(graphic);
  });

  // 先清空原选择，再选择新粘贴的图形
  currentPage.clearSelection();
  const newIds = graphics.map((g) => g.id);
  currentPage.selectMultipleGraphics(newIds);

  // ★ 检测源数据是否来自组合，若是则重建组合结构
  const groupMetadata = store.clipboardManager.getGroupMetadata();
  if (groupMetadata?.isGroupCopy && newIds.length > 1) {
    const groupName = groupMetadata.groupName.includes('Copy')
      ? groupMetadata.groupName.replace(/ \(Copy \d+\)$/, '') + ` (Copy ${pasteCount + 1})`
      : `${groupMetadata.groupName} Copy`;
    const group = currentPage.createGroup(newIds, groupName);
    if (group) {
      store.clipboardManager.setGroupMetadata({
        ...groupMetadata,
        groupName,
        sourceGroupId: group.id,
      });
    }
  }

  // 增加粘贴计数
  store.clipboardManager.incrementPasteCount();

  // 如果是剪切模式，粘贴后删除源页面的图元并清空剪贴板
  if (clipboardMode === 'cut' && sourcePageId) {
    const sourcePage = pageStore.pages.find((p) => p.id === sourcePageId);
    if (sourcePage && sourcePage.id !== currentPage.id) {
      // 删除源页面中被剪切的图元
      const clipboardGraphicIds = clipboardData.map((d: any) => d.originalId || d.id).filter(Boolean);
      clipboardGraphicIds.forEach((gid: string) => {
        sourcePage.removeGraphic(gid);
      });
    }
    store.clipboardManager.clearData();
  }

  return graphics;
}

/** 复制整个组合（createGroupCopy）*/
export function duplicateGroupHelper(groupId: string): { groupId: string; memberIds: string[] } | null {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage || typeof currentPage.duplicateGroup !== 'function') {
    console.warn('[duplicateGroup] currentPage has no duplicateGroup method');
    return null;
  }

  const result = currentPage.duplicateGroup(groupId);

  if (result && result.groupId) {
    currentPage.clearSelection();
    currentPage.selectMultipleGraphics(result.memberIds);

    // 失效查找缓存
    graphicCache.invalidate();

    // 触发组创建事件 + 页面更新事件，通知 UI 刷新
    eventBus.emit(Events.GROUP_CREATED, { groupId: result.groupId, isDuplicate: true });
    eventBus.emit(Events.PAGE_UPDATED, { pageId: currentPage.id, change: 'group_duplicate' });
  } else if (result && !result.groupId) {
    console.warn('[duplicateGroup] group creation failed, members were created but not grouped');
  }
  return result;
}

/** 复制图形（支持单个图元和组合）*/
export function duplicateGraphicHelper(id: string) {
  const pageStore = usePageStore();
  const currentPage = pageStore.currentPage;
  if (!currentPage || typeof currentPage.duplicateGraphic !== 'function') {
    console.warn('[duplicateGraphic] currentPage invalid or missing duplicateGraphic method');
    return null;
  }

  // ★ 智能检测：如果选中的是组合成员 → 调用 duplicateGroup
  const groupManager = currentPage.getGroupManager?.();
  if (groupManager && currentPage.selectedGraphicIds.length > 0) {
    const selectedIds = currentPage.selectedGraphicIds;
    const candidateGroup = groupManager.getGroupForGraphic(selectedIds[0]);
    if (candidateGroup && selectedIds.every((sid: string) => groupManager.isGraphicInGroup(sid))) {
      const success = duplicateGroupHelper(candidateGroup.id);
      return success ? { id: candidateGroup.id, isGroup: true } : null;
    }
  }

  const newGraphic = currentPage.duplicateGraphic(id);
  if (newGraphic) {
    currentPage.clearSelection();
    currentPage.selectGraphic(newGraphic.id);
  }
  return newGraphic;
}