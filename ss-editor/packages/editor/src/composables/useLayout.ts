// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { usePageStore, useGraphicStore } from '@scada-editor/core';

// 布局相关的组合式 API
export function useLayout() {
  const pageStore = usePageStore();
  const graphicStore = useGraphicStore();

  // 应用布局
  const applyLayout = () => {
    const currentPage = pageStore.currentPage;
    if (currentPage) {
      currentPage.layout.applyLayout(graphicStore.graphics);
    }
  };

  // 设置页面布局
  const setPageLayout = (layoutType: string) => {
    const currentPage = pageStore.currentPage;
    if (currentPage) {
      pageStore.setPageLayout(currentPage.id, layoutType);
      applyLayout();
    }
  };

  // 更新布局属性
  const updateLayoutProperties = (properties: Partial<Record<string, any>>) => {
    const currentPage = pageStore.currentPage;
    if (currentPage) {
      currentPage.layout.update(properties);
      applyLayout();
    }
  };

  return {
    currentLayout: pageStore.currentPage?.layout,
    applyLayout,
    setPageLayout,
    updateLayoutProperties,
  };
}
