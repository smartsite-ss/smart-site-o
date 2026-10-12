// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed } from 'vue';
import { usePageStore } from '@scada-editor/core';

export function useGuideLines() {
  const pageStore = usePageStore();

  const guideLines = computed(() => {
    if (pageStore.currentPage && typeof (pageStore.currentPage as any).getAllGuideLines === 'function') {
      return (pageStore.currentPage as any).getAllGuideLines();
    }
    return [];
  });

  const handleCreateGuideLine = (position: number, direction: 'horizontal' | 'vertical') => {
    if (pageStore.currentPage && typeof (pageStore.currentPage as any).addGuideLine === 'function') {
      (pageStore.currentPage as any).addGuideLine(position, direction);
    }
  };

  const handleMoveGuideLine = (id: string, position: number) => {
    if (pageStore.currentPage && typeof (pageStore.currentPage as any).updateGuideLinePosition === 'function') {
      (pageStore.currentPage as any).updateGuideLinePosition(id, position);
    }
  };

  const handleDeleteGuideLine = (id: string) => {
    if (pageStore.currentPage && typeof (pageStore.currentPage as any).removeGuideLine === 'function') {
      (pageStore.currentPage as any).removeGuideLine(id);
    }
  };

  return {
    guideLines,
    handleCreateGuideLine,
    handleMoveGuideLine,
    handleDeleteGuideLine,
  };
}