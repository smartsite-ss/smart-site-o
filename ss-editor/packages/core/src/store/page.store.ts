// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ILayout } from '../canvas-page/layouts/base/ILayout';
import { IPage } from '../graphic-editing/graphic/base/IPage';
import { BasePage } from '../graphic-editing/graphic/base/BasePage';
import { FreeLayout } from '../canvas-page/layouts/types/FreeLayout';
import { GridLayout } from '../canvas-page/layouts/types/GridLayout';
import { FlowLayout } from '../canvas-page/layouts/types/FlowLayout';
import { CircleLayout } from '../canvas-page/layouts/types/CircleLayout';
import { GraphicFactory } from '../graphic-editing/graphic/factory/GraphicFactory';

// 创建默认页面
function createDefaultPage(): IPage {
  const page = new BasePage();
  page.init({
    id: 'page-1',
    name: 'Page1',
    width: 1920,
    height: 1080, 
    backgroundColor: '#808080',
    themeColors: {
      primary: '#409EFF',
      secondary: '#606266',
      success: '#67C23A',
      warning: '#E6A23C',
      error: '#F56C6C',
    },
    layout: new FreeLayout() as ILayout,
    graphics: [],
    selectedGraphicId: null,
    selectedGraphicIds: [],
    timers: [],
    groups: [],
    guideLines: [],
    dataSource: undefined,
  });
  return page;
}

// 页面分组类型
export interface PageGroup {
  id: string;
  name: string;
}

// 页面状态管理
export const usePageStore = defineStore('page', {
  state: () => ({
    pages: [
      createDefaultPage(),
    ] as IPage[],
    currentPageId: 'page-1',
    closedPageIds: [] as string[],
    pageGroups: [] as PageGroup[],
    pageGroupMap: {} as Record<string, string>,
    enableAutoFit: true,
    scaleMin: 20,
    scaleMax: 300,
    zoomStep: 1.05,
    pageMode: 'edit' as 'edit' | 'preview',
    /** Phase 15.5: 编辑态图元级原值浮层开关（DataPanel checkbox 控制） */
    showValueOverlay: false,
  }),

  getters: {
    currentPage: (state): IPage | undefined => {
      return state.pages.find((page) => page.id === state.currentPageId);
    },
    openPages: (state): IPage[] => {
      // 访问 dirty 确保响应式系统能追踪页面修改状态变化
      state.pages.forEach(p => { void p.dirty; });
      return state.pages.filter((p) => !state.closedPageIds.includes(p.id));
    },
    selectedGraphicIds: (state): string[] => {
      const currentPage = state.pages.find((page) => page.id === state.currentPageId);
      return currentPage?.selectedGraphicIds || [];
    },
    currentPageScale: (state): number => {
      const currentPage = state.pages.find((page) => page.id === state.currentPageId);
      return currentPage?.scale || 100;
    },
    currentPageScaleFactor: (state): number => {
      const currentPage = state.pages.find((page) => page.id === state.currentPageId);
      return (currentPage?.scale || 100) / 100;
    },
    currentPageMode: (state): 'edit' | 'preview' => {
      return state.pageMode;
    },
    currentScaleMin: (state): number => {
      return state.scaleMin;
    },
    currentScaleMax: (state): number => {
      return state.scaleMax;
    },
    currentZoomStep: (state): number => {
      return state.zoomStep;
    },
    getPagesByGroup: (state) => (groupId: string): IPage[] => {
      return state.pages.filter((p) => state.pageGroupMap[p.id] === groupId);
    },
    getUngroupedPages: (state): IPage[] => {
      return state.pages.filter((p) => !state.pageGroupMap[p.id]);
    },
    isPageNameDuplicate: (state) => (name: string, groupId?: string, excludePageId?: string): boolean => {
      const pagesInContext = groupId
        ? state.pages.filter((p) => state.pageGroupMap[p.id] === groupId)
        : state.pages.filter((p) => !state.pageGroupMap[p.id]);
      return pagesInContext.some(
        (p) => p.name === name && p.id !== excludePageId
      );
    },
  },

  actions: {
    // 添加页面
    addPage(name?: string, groupId?: string): IPage {
      const pageName = name || `Page${this.pages.length + 1}`;
      const newPage = new BasePage();
      const uniqueId = `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      newPage.init({
        id: uniqueId,
        name: pageName,
        width: 1920,
        height: 1080,
        backgroundColor: '#808080',
        themeColors: {
          primary: '#409EFF',
          secondary: '#606266',
          success: '#67C23A',
          warning: '#E6A23C',
          error: '#F56C6C',
        },
        layout: new FreeLayout(),
        graphics: [],
        selectedGraphicId: null,
        selectedGraphicIds: [],
        timers: [],
        groups: [],
        guideLines: [],
        dataSource: undefined,
      });
      this.pages.push(newPage);
      if (groupId) {
        this.pageGroupMap[newPage.id] = groupId;
      }
      this.setCurrentPage(newPage.id);

      return newPage;
    },

    // 删除页面
    removePage(id: string) {
      const index = this.pages.findIndex((page) => page.id === id);
      if (index === -1 || this.pages.length <= 1) return;

      const wasCurrentPage = this.currentPageId === id;

      if (wasCurrentPage) {
        const nextIndex = index > 0 ? index - 1 : 0;
        this.setCurrentPage(this.pages[nextIndex].id);
      }

      this.pages.splice(index, 1);
      delete this.pageGroupMap[id];
    },

    // 添加页面分组
    addPageGroup(name: string): PageGroup {
      const group: PageGroup = {
        id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
      };
      this.pageGroups.push(group);
      return group;
    },

    // 删除页面分组
    removePageGroup(groupId: string) {
      const index = this.pageGroups.findIndex((g) => g.id === groupId);
      if (index === -1) return;
      this.pageGroups.splice(index, 1);
      for (const pageId of Object.keys(this.pageGroupMap)) {
        if (this.pageGroupMap[pageId] === groupId) {
          delete this.pageGroupMap[pageId];
        }
      }
    },

    // 重命名页面分组
    renamePageGroup(groupId: string, name: string) {
      const group = this.pageGroups.find((g) => g.id === groupId);
      if (group) {
        group.name = name;
      }
    },

    // 移动页面到分组
    movePageToGroup(pageId: string, groupId: string) {
      this.pageGroupMap[pageId] = groupId;
    },

    // 从分组中移除页面
    removePageFromGroup(pageId: string) {
      delete this.pageGroupMap[pageId];
    },

    // 复制页面
    copyPage(id: string): IPage | null {
      const page = this.pages.find((page) => page.id === id);
      if (page) {
        const newPage = new BasePage();
        // 使用唯一 ID，避免删除后重建产生重复
        const uniqueId = `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        newPage.init({
          id: uniqueId,
          name: `${page.name} Copy`,
          width: page.width,
          height: page.height,
          backgroundColor: page.backgroundColor,
          backgroundImage: page.backgroundImage,
          themeColors: { ...page.themeColors },
          layout: page.layout.clone() as ILayout,
          graphics: page.graphics.map((g) => {
            // 深度克隆图形
            const clonedGraphic = GraphicFactory.createGraphicFromJSON(
              g.toJSON()
            );
            return clonedGraphic;
          }),
          selectedGraphicId: null,
          selectedGraphicIds: [],
          timers: page.timers.map(t => ({ ...t })),
          groups: page.groups.map(g => ({ ...g, children: [...g.children] })),
          guideLines: page.guideLines.map(l => ({ ...l })),
          dataSource: page.dataSource ? { ...page.dataSource } : undefined,
        });
        this.pages.push(newPage);
        this.setCurrentPage(newPage.id);

        return newPage;
      }
      return null;
    },

    // 重命名页面
    renamePage(id: string, name: string) {
      const page = this.pages.find((page) => page.id === id);
      if (page) {
        page.name = name;
      }
    },

    // 页面排序
    reorderPages(oldIndex: number, newIndex: number) {
      if (
        oldIndex >= 0 &&
        oldIndex < this.pages.length &&
        newIndex >= 0 &&
        newIndex < this.pages.length &&
        oldIndex !== newIndex
      ) {
        const [movedPage] = this.pages.splice(oldIndex, 1);
        this.pages.splice(newIndex, 0, movedPage);
      }
    },

    // 在同一分组内拖拽排序
    reorderPageInGroup(pageId: string, targetPageId: string) {
      const draggedIndex = this.pages.findIndex(p => p.id === pageId);
      const targetIndex = this.pages.findIndex(p => p.id === targetPageId);
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
      this.reorderPages(draggedIndex, targetIndex);
    },

    // 移动页面到指定位置
    movePage(id: string, direction: 'prev' | 'next' | 'first' | 'last') {
      const index = this.pages.findIndex((p) => p.id === id);
      if (index === -1) return;
      const [page] = this.pages.splice(index, 1);
      let newIndex = index;
      switch (direction) {
        case 'prev': newIndex = Math.max(0, index - 1); break;
        case 'next': newIndex = Math.min(this.pages.length, index + 1); break;
        case 'first': newIndex = 0; break;
        case 'last': newIndex = this.pages.length; break;
      }
      this.pages.splice(newIndex, 0, page);
    },

    // 设置页面图标
    setPageIcon(id: string, icon: string) {
      const page = this.pages.find((p) => p.id === id);
      if (page) {
        (page as any).icon = icon;
      }
    },

    // 设置当前页面
    setCurrentPage(id: string) {
      const closedIndex = this.closedPageIds.indexOf(id);
      if (closedIndex !== -1) {
        this.closedPageIds.splice(closedIndex, 1);
      }
      this.currentPageId = id;
      // 记录最近打开的页面到 localStorage，下次打开工程时只恢复此页面
      try {
        localStorage.setItem('scada-last-page-id', id);
      } catch { /* ignore */ }
    },

    // 切换编辑态缩放居中
    toggleAutoFit() {
      this.enableAutoFit = !this.enableAutoFit;
    },

    setScaleMin(val: number) {
      this.scaleMin = val;
    },
    setScaleMax(val: number) {
      this.scaleMax = val;
    },
    setZoomStep(val: number) {
      this.zoomStep = val;
    },

    setPageMode(mode: 'edit' | 'preview') {
      this.pageMode = mode;
    },

    closePage(id: string) {
      const openPages = this.pages.filter((p) => !this.closedPageIds.includes(p.id));
      if (this.pages.length <= 1) return;
      if (openPages.length <= 1) return;
      if (this.currentPageId === id) {
        const remainingOpen = openPages.filter((p) => p.id !== id);
        if (remainingOpen.length > 0) {
          this.currentPageId = remainingOpen[0].id;
        }
      }
      if (!this.closedPageIds.includes(id)) {
        this.closedPageIds.push(id);
      }
    },

    closeOtherPages(id: string) {
      const allPages = this.pages;
      const otherPageIds = allPages.filter((p) => p.id !== id).map((p) => p.id);
      for (const otherId of otherPageIds) {
        if (!this.closedPageIds.includes(otherId)) {
          this.closedPageIds.push(otherId);
        }
      }
      const closedIndex = this.closedPageIds.indexOf(id);
      if (closedIndex !== -1) {
        this.closedPageIds.splice(closedIndex, 1);
      }
      if (this.currentPageId !== id) {
        this.currentPageId = id;
      }
    },

    closeRightPages(id: string) {
      const index = this.pages.findIndex((p) => p.id === id);
      if (index === -1) return;
      const rightPageIds = this.pages.slice(index + 1).map((p) => p.id);
      for (const rightId of rightPageIds) {
        if (!this.closedPageIds.includes(rightId)) {
          this.closedPageIds.push(rightId);
        }
      }
    },

    reopenPage(id: string) {
      const index = this.closedPageIds.indexOf(id);
      if (index !== -1) {
        this.closedPageIds.splice(index, 1);
      }
    },

    // 更新页面属性
    updatePage(id: string, properties: Partial<IPage>) {
      const page = this.pages.find((page) => page.id === id);
      if (page) {
        Object.assign(page, properties);
      }
    },

    // 设置页面布局
    setPageLayout(id: string, layoutType: string) {
      const page = this.pages.find((page) => page.id === id);
      if (page) {
        switch (layoutType) {
          case 'free':
            page.layout = new FreeLayout();
            break;
          case 'grid':
            page.layout = new GridLayout();
            break;
          case 'flow':
            page.layout = new FlowLayout();
            break;
          case 'circle':
            page.layout = new CircleLayout();
            break;
        }
      }
    },

    // 导入页面
    importPages(data: any[]) {
      this.pages = data.map((pageData) => {
        const page = new BasePage();
        page.fromJSON(pageData);
        return page;
      });
      if (this.pages.length > 0) {
        this.setCurrentPage(this.pages[0].id);
      }
    },

    // 导出页面
    exportPages() {
      return this.pages.map((page) => ({
        ...page,
        layout: page.layout?.toJSON?.() ?? page.layout,
      }));
    },

    // 从 JSON 创建布局
    createLayoutFromJSON(data: any): ILayout {
      switch (data.type) {
        case 'free':
          const freeLayout = new FreeLayout();
          freeLayout.fromJSON(data);
          return freeLayout;
        case 'grid':
          const gridLayout = new GridLayout();
          gridLayout.fromJSON(data);
          return gridLayout;
        case 'flow':
          const flowLayout = new FlowLayout();
          flowLayout.fromJSON(data);
          return flowLayout;
        case 'circle':
          const circleLayout = new CircleLayout();
          circleLayout.fromJSON(data);
          return circleLayout;
        default:
          return new FreeLayout();
      }
    },
  },
});
