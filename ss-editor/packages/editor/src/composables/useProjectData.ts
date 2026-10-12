// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { usePageStore, BasePage, type ProjectData } from '@scada-editor/core';

export function useProjectData() {
  const pageStore = usePageStore();

  const collectProjectData = (): ProjectData | null => {
    const currentPage = pageStore.currentPage;
    if (!currentPage) {
      return null;
    }

    // 保存当前页面 ID 到 localStorage，用于下次打开时恢复
    try {
      localStorage.setItem('scada-last-page-id', currentPage.id);
    } catch { /* ignore */ }

    const groupNames: Record<string, string> = {};
    for (const group of pageStore.pageGroups) {
      groupNames[group.id] = group.name;
    }

    return {
      version: '1.0',
      savedAt: Date.now(),
      currentPageId: currentPage.id,
      pages: pageStore.pages.map(page => page.toJSON()),
      pageGroups: { ...pageStore.pageGroupMap },
      groupNames,
    } as any;
  };

  /**
   * 从 ProjectData 恢复页面到 Store
   * @returns 返回需要按需加载的页面名数组（_lazy 标记的页面）
   */
  const restorePagesToStore = (projectData: ProjectData | null): string[] => {
    if (!projectData?.pages?.length) {
      return [];
    }

    const lazyPageNames: string[] = [];

    const restoredPages = projectData.pages.map((pageJson: any) => {
      const page = new BasePage();
      page.init({
        id: pageJson.id,
        name: pageJson.name,
        width: pageJson.width,
        height: pageJson.height,
        backgroundColor: pageJson.backgroundColor
      });

      // 保留来自大纲的预览小图 URL
      if (pageJson.previewSmallUrl) {
        (page as any).previewSmallUrl = pageJson.previewSmallUrl;
      }

      // 保留来自大纲的背景图路径（相对路径，由调用方在加载页面数据时解析为完整 URL）
      if (pageJson.backgroundImage) {
        (page as any).backgroundImage = pageJson.backgroundImage;
      }

      // 如果标记为延迟加载（来自大纲），只初始不加载 graphics
      if (pageJson._lazy) {
        (page as any)._lazy = true; // 将 _lazy 标记写入 page 实例，确保 ensurePageDataLoaded 能识别
        lazyPageNames.push(pageJson.name || pageJson.id);
      } else {
        // 完整数据加载 graphics
        page.fromJSON(pageJson);
      }

      return page;
    });

    pageStore.pages = restoredPages;

    // 从 localStorage 读取上次打开的页面 ID
    let lastPageId = projectData.currentPageId;
    try {
      const savedId = localStorage.getItem('scada-last-page-id');
      if (savedId && restoredPages.some(p => p.id === savedId)) {
        lastPageId = savedId;
      }
    } catch { /* ignore */ }

    if (lastPageId) {
      pageStore.currentPageId = lastPageId;
    }

    // 关闭除当前页面外的所有页面，避免全部打开
    const openPageId = lastPageId || (restoredPages[0]?.id);
    if (openPageId) {
      pageStore.closedPageIds = restoredPages
        .filter(p => p.id !== openPageId)
        .map(p => p.id);
    }

    const savedPageGroups = (projectData as any).pageGroups as Record<string, string> | undefined;
    if (savedPageGroups) {
      pageStore.pageGroupMap = savedPageGroups;
    }

    const savedGroupNames = (projectData as any).groupNames as Record<string, string> | undefined;
    if (savedGroupNames) {
      pageStore.pageGroups = Object.entries(savedGroupNames).map(([id, name]) => ({
        id,
        name: name.replace(/^(p_|g_)/, ''), // 安全去前缀
      }));
    }

    return lazyPageNames;
  };

  return {
    collectProjectData,
    restorePagesToStore,
  };
}