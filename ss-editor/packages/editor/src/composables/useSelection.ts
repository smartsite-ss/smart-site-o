// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed } from 'vue';
import { useGraphicStore, useCurrentPage, IGraphic } from '@scada-editor/core';

export function useSelection() {
  const graphicStore = useGraphicStore();
  const getPage = () => useCurrentPage();

  const selectGraphic = (id: string | null): IGraphic | null => {
    return getPage()?.selectGraphic(id) || null;
  };

  const deselectGraphic = () => {
    getPage()?.selectGraphic(null);
  };

  const isSelected = (id: string) => {
    return graphicStore.selectedGraphicId === id;
  };

  const selectAllGraphics = () => {
    if (graphicStore.graphics.length > 0) {
      const allIds = graphicStore.graphics.map(g => g.id);
      getPage()?.selectMultipleGraphics(allIds);
    }
  };

  const deleteSelectedGraphic = () => {
    if (graphicStore.selectedGraphicId) {
      getPage()?.removeGraphic(graphicStore.selectedGraphicId);
    }
  };

  const duplicateSelectedGraphic = () => {
    if (graphicStore.selectedGraphicId) {
      graphicStore.duplicateGraphic(graphicStore.selectedGraphicId);
    }
  };

  return {
    selectedGraphic: computed(() => graphicStore.selectedGraphic),
    selectedGraphicId: computed(() => graphicStore.selectedGraphicId),
    selectGraphic,
    deselectGraphic,
    isSelected,
    selectAllGraphics,
    deleteSelectedGraphic,
    duplicateSelectedGraphic,
  };
}
