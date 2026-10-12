// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { IGraphic } from '../types';
import { usePageStore } from './page.store';
import { stateService } from '../services/state.service';
import { BasePage } from '../graphic-editing/graphic/base/BasePage';
import { ClipboardManager } from '../graphic-editing/managers/ClipboardManager';
import { InterpageTransferService } from '../services/InterpageTransferService';

// 子模块: 默认值、常量、缓存
import { graphicCache } from './graphic-defaults';

// 子模块: CRUD 操作
import {
  getGraphicById,
  getCurrentPage,
  getCurrentPageGraphics,
  findGraphicById,
  addGraphic,
  removeGraphic,
  copyPageGraphics,
  removePageGraphics,
  toggleSelection,
  adjustSpacing,
  batchEdit,
  saveAsTemplate,
  applyTemplate,
} from './graphic-crud';

// 子模块: 剪贴板操作
import {
  copyHelper,
  cutHelper,
  pasteHelper,
  duplicateGraphicHelper,
  duplicateGroupHelper,
} from './graphic-clipboard';

// 子模块: 样式操作
import {
  applyStyleHelper,
  copyStyleHelper,
  pasteStyleHelper,
  resetStyleHelper,
  applyPropertyHelper,
  applyQualityIndicatorHelper,
} from './graphic-style';

// 子模块: 数据绑定、事件、动画
import {
  bindDataHelper,
  unbindDataHelper,
  applyDataHelper,
  addEventHandlerHelper,
  removeEventHandlerHelper,
  addActionHelper,
  removeActionHelper,
  triggerEventHandlerHelper,
  executeActionHelper,
  addAnimationHelper,
  removeAnimationHelper,
} from './graphic-binding';

// 图形状态管理
export const useGraphicStore = defineStore('graphic', {
  state: () => ({
    // 样式剪贴板（多个页面共享）
    styleClipboard: null as Record<string, any> | null,
    // 图形剪贴板（跨页面共享）
    clipboardManager: new ClipboardManager(),
    transferService: new InterpageTransferService(),
    // 性能优化相关
    isBatchOperating: false,
    batchDepth: 0,
    useGraphicCache: false,
    autoSaveInterval: null as any,
  }),

  getters: {
    // 获取当前页面的图形列表
    graphics: (): IGraphic[] => {
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;
      if (!currentPage) return [];
      const graphics = currentPage.graphics;
      return Array.isArray(graphics)
        ? graphics
        : ((graphics as { value: IGraphic[] }).value ?? []);
    },

    /**
     * 排序后的图形列表（带缓存，避免每次 getter 都重新 sort）
     * 缓存在 graphicCache 中，invalidate 后重建
     */
    sortedGraphics: (): IGraphic[] => {
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;
      if (!currentPage) return [];
      const graphics =
        'value' in currentPage.graphics
          ? (currentPage.graphics.value as IGraphic[])
          : (currentPage.graphics as IGraphic[]);
      return graphicCache.getSorted(graphics);
    },

    selectedGraphic: (): IGraphic | undefined => {
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;
      if (!currentPage) return undefined;
      const selectedId = currentPage.selectedGraphicId;
      if (!selectedId) return undefined;
      const graphics =
        'value' in currentPage.graphics
          ? currentPage.graphics.value
          : currentPage.graphics;
      return ((graphics as IGraphic[]).find(
        (graphic: IGraphic) => graphic.id === selectedId
      )) as IGraphic | undefined;
    },


    selectedGraphicId: () => {
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;
      return currentPage?.selectedGraphicId || null;
    },

    selectedGraphicIds: () => {
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;
      return currentPage?.selectedGraphicIds || [];
    },

    /**
     * 选中的图形列表（使用 ID Map 加速过滤）
     */
    selectedGraphics: (): IGraphic[] => {
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;
      if (!currentPage || !currentPage.selectedGraphicIds?.length) return [];
      const graphics =
        'value' in currentPage.graphics
          ? currentPage.graphics.value
          : (currentPage.graphics as IGraphic[]);
      const idSet = new Set(currentPage.selectedGraphicIds);
      return (graphics as IGraphic[]).filter((g: IGraphic) => idSet.has(g.id));
    },
  },

  actions: {
    // ========== CRUD 操作 (委托到 graphic-crud.ts) ==========

    /** 根据ID获取图形 */
    getGraphicById(id: string): IGraphic | undefined {
      return getGraphicById(id);
    },

    /** 获取当前页面 */
    getCurrentPage() {
      return getCurrentPage();
    },

    /** 获取当前页面的图形列表 */
    getCurrentPageGraphics(): IGraphic[] | undefined {
      return getCurrentPageGraphics();
    },

    /** 根据ID查找图形 */
    findGraphicById(id: string): IGraphic | undefined {
      return findGraphicById(id);
    },

    /** 添加图形 */
    addGraphic(
      type: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): IGraphic | undefined {
      return addGraphic(type, x, y, width, height);
    },

    /** 删除图形 */
    removeGraphic(id: string) {
      removeGraphic(id);
    },

    /** 切换选择状态 */
    toggleSelection(id: string) {
      toggleSelection(id);
    },

    /** 复制页面图形 */
    copyPageGraphics(sourcePageId: string, targetPageId: string) {
      copyPageGraphics(sourcePageId, targetPageId);
    },

    /** 删除页面图形 */
    removePageGraphics(pageId: string) {
      removePageGraphics(pageId);
    },

    /** 调整间距 */
    adjustSpacing(spacing: number, direction: 'horizontal' | 'vertical') {
      adjustSpacing(spacing, direction);
    },

    /** 批量编辑 */
    batchEdit(properties: Partial<IGraphic>) {
      batchEdit(properties);
    },

    /** 模板编辑 - 保存为模板 */
    saveAsTemplate(name: string) {
      return saveAsTemplate(name);
    },

    /** 模板编辑 - 应用模板 */
    applyTemplate(templateIndex: number) {
      applyTemplate(templateIndex);
    },

    // ========== 剪贴板操作 (委托到 graphic-clipboard.ts) ==========

    /** 复制选中的图形到剪贴板 */
    copy() {
      copyHelper(this as any);
    },

    /** 剪切选中的图形到剪贴板 */
    cut() {
      cutHelper(this as any);
    },

    /** 从剪贴板粘贴图形到当前页面 */
    paste(offsetX: number = 20, offsetY: number = 20): IGraphic[] {
      return pasteHelper(this as any, offsetX, offsetY);
    },

    /** 复制图形（支持单个图元和组合） */
    duplicateGraphic(id: string) {
      return duplicateGraphicHelper(id);
    },

    /** 复制整个组合（createGroupCopy） */
    duplicateGroup(groupId: string): { groupId: string; memberIds: string[] } | null {
      return duplicateGroupHelper(groupId);
    },

    // ========== 样式操作 (委托到 graphic-style.ts) ==========

    /** 样式管理 - 应用样式 */
    applyStyle(graphicId: string, style: Record<string, any>) {
      applyStyleHelper(graphicId, style);
    },

    /** 样式管理 - 复制样式 */
    copyStyle(sourceGraphicId: string) {
      return copyStyleHelper(this, sourceGraphicId);
    },

    /** 样式管理 - 粘贴样式 */
    pasteStyle(targetGraphicId: string) {
      return pasteStyleHelper(this, targetGraphicId);
    },

    /** 样式管理 - 重置样式 */
    resetStyle(graphicId: string) {
      return resetStyleHelper(graphicId);
    },

    /** 应用属性到图元 */
    applyProperty(graphicId: string, propertyPath: string, value: any) {
      applyPropertyHelper(graphicId, propertyPath, value);
    },

    /** 应用质量指示器 */
    applyQualityIndicator(graphicId: string, quality: string) {
      applyQualityIndicatorHelper(graphicId, quality);
    },

    // ========== 数据绑定 + 事件 + 动画 (委托到 graphic-binding.ts) ==========

    /** 数据绑定 - 绑定数据 */
    bindData(graphicId: string, dataSource: string, dataField: string) {
      bindDataHelper(graphicId, dataSource, dataField);
    },

    /** 数据绑定 - 解除绑定 */
    unbindData(graphicId: string) {
      unbindDataHelper(graphicId);
    },

    /** 数据绑定 - 应用数据 */
    applyData(data: Record<string, any>) {
      applyDataHelper(data);
    },

    /** 事件交互 - 添加事件 */
    addEvent(graphicId: string, eventType: string) {
      addEventHandlerHelper(graphicId, eventType);
    },

    /** 事件交互 - 删除事件 */
    removeEvent(graphicId: string, eventId: string) {
      removeEventHandlerHelper(graphicId, eventId);
    },

    /** 事件交互 - 添加动作 */
    addAction(graphicId: string, eventId: string, actionType: string) {
      addActionHelper(graphicId, eventId, actionType);
    },

    /** 事件交互 - 删除动作 */
    removeAction(graphicId: string, eventId: string, actionId: string) {
      removeActionHelper(graphicId, eventId, actionId);
    },

    /** 事件交互 - 触发事件 */
    triggerEvent(graphicId: string, eventType: string, eventData?: any) {
      triggerEventHandlerHelper(graphicId, eventType, eventData);
    },

    /** 事件交互 - 执行动作 */
    executeAction(action: any, _graphicId?: string, _eventData?: any) {
      executeActionHelper(action, _graphicId, _eventData);
    },

    /** 动画效果 - 添加动画 */
    addAnimation(graphicId: string, animation: any) {
      addAnimationHelper(graphicId, animation);
    },

    /** 动画效果 - 移除动画 */
    removeAnimation(graphicId: string, animationIndex: number) {
      removeAnimationHelper(graphicId, animationIndex);
    },

    // ========== 组操作 ==========

    // 从组合中移除图形
    removeFromGroup(graphicId: string) {
      const currentPage = this.getCurrentPage();
      if (!currentPage || typeof currentPage.removeFromGroup !== 'function')
        return;
      currentPage.removeFromGroup(graphicId);
      currentPage.selectGraphic(graphicId);
    },

    // 添加图形到组合
    addToGroup(graphicId: string, groupId: string) {
      const currentPage = this.getCurrentPage();
      if (!currentPage || typeof currentPage.addToGroup !== 'function') return;
      currentPage.addToGroup(graphicId, groupId);
    },

    // 更新组合边界
    updateGroupBounds(groupId: string) {
      const currentPage = this.getCurrentPage();
      if (!currentPage || typeof currentPage.updateGroupBounds !== 'function')
        return;
      currentPage.updateGroupBounds(groupId);
    },

    // 选择组合中的所有图形
    selectGroupMembers(groupId: string) {
      const currentPage = this.getCurrentPage();
      if (!currentPage || typeof currentPage.selectGroupMembers !== 'function')
        return;
      currentPage.selectGroupMembers(groupId);
    },

    // ========== 批量操作 ==========

    // 开始批量操作（支持嵌套）
    startBatchOperation(): void {
      this.batchDepth++;
      if (this.batchDepth === 1) {
        this.isBatchOperating = true;
      }
    },

    // 结束批量操作
    endBatchOperation(): void {
      this.batchDepth = Math.max(0, this.batchDepth - 1);
      if (this.batchDepth === 0) {
        this.isBatchOperating = false;
        // 批量操作结束，失效缓存触发重建
        graphicCache.invalidate();
      }
    },

    /**
     * 批量更新包装器 - 将多个操作合并为单次响应式通知
     * @param fn 要执行的函数，内部所有 store 变更会被延迟到 fn 完成后统一触发
     */
    async batchUpdate<T>(fn: () => T | Promise<T>): Promise<T> {
      this.startBatchOperation();
      try {
        const result = await fn();
        return result;
      } finally {
        this.endBatchOperation();
      }
    },

    /**
     * 同步版本的 batchUpdate（适用于同步操作）
     */
    batchUpdateSync<T>(fn: () => T): T {
      this.startBatchOperation();
      try {
        return fn();
      } finally {
        this.endBatchOperation();
      }
    },

    // ========== 组合分组 ==========

    // 组合分组 - 委托给 BasePage.groupGraphics() 以记录历史
    groupGraphics(ids: string[]) {
      const currentPage = this.getCurrentPage();
      if (currentPage) {
        currentPage.groupGraphics(ids);
      }
    },

    ungroupGraphics(groupId: string) {
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;
      if (!currentPage) return;

      const groupManager = currentPage.getGroupManager();
      if (groupManager) {
        const isGroup = groupManager.isGroup(groupId);
        if (isGroup) {
          // 使用 BasePage.ungroupGraphic() 以记录历史
          currentPage.ungroupGraphic(groupId);
        } else {
          const graphics = currentPage.graphics;
          const groupGraphic = graphics.find(
            (g) => g.id === groupId && g.type === 'group'
          );

          if (groupGraphic) {
            currentPage.graphics = graphics.filter((g) => g.id !== groupId);

            const childIds = (groupGraphic.config?.groupMembers ||
                             groupGraphic.children || []) as string[];
                            
            const childGraphics = childIds
              .map((childId) => graphics.find((g) => g.id === childId))
              .filter(Boolean) as IGraphic[];

            if (childGraphics.length > 0) {
              currentPage.selectMultipleGraphics(childGraphics.map(g => g.id));
            }
          }
        }
      }
    },

    // ========== 项目管理 ==========

    // 项目管理 - 保存项目
    saveProject(name: string) {
      return stateService.saveProject(name);
    },

    // 项目管理 - 加载项目
    loadProject(projectIndex: number) {
      return stateService.loadProject(projectIndex);
    },

    // 项目管理 - 删除项目
    deleteProject(projectIndex: number) {
      return stateService.deleteProject(projectIndex);
    },

    // ========== 导出发布 ==========

    // 导出发布 - 导出为JSON
    exportAsJSON() {
      const pageStore = usePageStore();
      const project = {
        pages: pageStore.pages,
        exportTime: new Date().toISOString(),
      };

      return JSON.stringify(project, null, 2);
    },

    // 导出发布 - 导出为HTML
    exportAsHTML() {
      const jsonData = this.exportAsJSON();
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>导出的组态</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    #canvas {
      width: 100%;
      height: 100vh;
      border: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    const projectData = JSON.parse('${jsonData.replace(/'/g, "\\'")}');
    // 在这里添加渲染逻辑

  </script>
</body>
</html>
      `;

      return html;
    },

    // 导出发布 - 下载文件
    downloadFile(content: string, filename: string, type: string) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // ========== 协作功能 ==========

    // 协作功能 - 生成分享链接
    generateShareLink() {
      const projectData = this.exportAsJSON();
      const encodedData = btoa(unescape(encodeURIComponent(projectData)));
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodedData}`;
      return shareUrl;
    },

    // 协作功能 - 加载分享的项目
    loadSharedProject() {
      const urlParams = new URLSearchParams(window.location.search);
      const shareData = urlParams.get('share');
      if (!shareData) return false;

      try {
        const decodedData = decodeURIComponent(escape(atob(shareData)));
        const project = JSON.parse(decodedData);

        const pageStore = usePageStore();
        // 确保创建 BasePage 实例
        pageStore.pages = project.pages.map((pageData: any) => {
          const page = new BasePage();
          page.fromJSON(pageData);
          return page;
        });

        pageStore.currentPageId = pageStore.pages[0]?.id;

        return true;
      } catch (error) {
        console.error('Error loading shared project:', error);
        return false;
      }
    },

    // ========== 性能优化 ==========

    // 性能优化 - 批量操作
    batchOperation(operations: Array<{ type: string; payload: any }>) {
      stateService.batchOperation(operations);
    },

    // 性能优化 - 图形缓存
    enableGraphicCache() {
      this.useGraphicCache = true;
    },

    disableGraphicCache() {
      this.useGraphicCache = false;
    },

    // ========== 扩展集成 ==========

    // 扩展集成 - 导入外部组件
    importExternalComponent(componentUrl: string) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = componentUrl;
        script.onload = () => {
          // 假设外部组件注册到全局变量
          const component = (window as any)['ExternalComponent'];
          if (component) {
            resolve(component);
          } else {
            reject(new Error('External component not found'));
          }
        };
        script.onerror = () => {
          reject(new Error('Failed to load external component'));
        };
        document.head.appendChild(script);
      });
    },

    // 扩展集成 - 注册自定义图元
    registerCustomPrimitive(type: string, primitiveClass: any) {
      if (!(window as any)['customPrimitives']) {
        (window as any)['customPrimitives'] = {};
      }
      (window as any)['customPrimitives'][type] = primitiveClass;
    },

    // ========== 高级功能 ==========

    // 高级功能 - 自动保存
    enableAutoSave(interval: number = 30000) {
      this.autoSaveInterval = setInterval(() => {
        this.saveProject('Auto Save');
      }, interval);
    },

    disableAutoSave() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
    },

    // 高级功能 - 画布快照
    takeCanvasSnapshot() {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (canvas) {
        return canvas.toDataURL('image/png');
      }
      return null;
    },
  },
});

/**
 * 便捷工具：获取当前页面实例
 * 替代图形操作中 38 处重复的 usePageStore().currentPage 模式
 */
export function useCurrentPage() {
  return usePageStore().currentPage;
}