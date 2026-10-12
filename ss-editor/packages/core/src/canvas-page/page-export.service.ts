// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { usePageStore } from '../store/page.store';
import { ExportError, ImportError, errorService } from '../utils/core/errors';

/**
 * 统一的页面导出格式
 */
export interface PageExportData {
  version: string;
  page: {
    id: string;
    name: string;
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImage?: string;
    backgroundApplicationType?: string;
    backgroundFitMode?: string;
  };
  graphics: any[];
  timers: any[];
  groups: any[];
  dataSource?: any;
}

/**
 * 统一的页面导出服务
 * 提供三种导出模式：
 * 1. 导出单页 - 仅当前选中页面
 * 2. 导出场景 - 导出所有页面
 * 3. 导出面板 - JSON编辑器中的格式
 */
export class PageExportService {
  /**
   * 导出单个页面（完整格式）
   * @param pageId 页面ID，不传则导出当前页
   */
  static exportPage(pageId?: string): PageExportData {
    try {
      const pageStore = usePageStore();
      const page = pageId 
        ? pageStore.pages.find((p) => p.id === pageId)
        : pageStore.currentPage;

      if (!page) {
        throw new ExportError('JSON', 'Page not found');
      }

      const pageData = page.toJSON();

      return {
        version: '1.0',
        page: {
          id: pageData.id,
          name: pageData.name,
          width: pageData.width,
          height: pageData.height,
          backgroundColor: pageData.backgroundColor,
          backgroundImage: pageData.backgroundImage || '',
          backgroundApplicationType: (page as any).backgroundApplicationType || 'applicationColor',
          backgroundFitMode: (page as any).backgroundFitMode || 'stretch',
        },
        graphics: pageData.graphics,
        timers: pageData.timers,
        groups: pageData.groups,
        dataSource: pageData.dataSource,
      };
    } catch (error) {
      if (error instanceof ExportError) {
        throw error;
      }
      const err = new ExportError('JSON', error instanceof Error ? error.message : 'Unknown error');
      errorService.record(err, 'PageExportService.exportPage');
      throw err;
    }
  }

  /**
   * 导出场景（所有页面）
   */
  static exportScene(): {
    version: string;
    pages: PageExportData[];
  } {
    try {
      const pageStore = usePageStore();
      const pages = pageStore.pages;

      return {
        version: '1.0',
        pages: pages.map(p => {
          const pageData = p.toJSON();
          return {
            version: '1.0',
            page: {
              id: pageData.id,
              name: pageData.name,
              width: pageData.width,
              height: pageData.height,
              backgroundColor: pageData.backgroundColor,
              backgroundImage: pageData.backgroundImage || '',
              backgroundApplicationType: (p as any).backgroundApplicationType || 'applicationColor',
              backgroundFitMode: (p as any).backgroundFitMode || 'stretch',
            },
            graphics: pageData.graphics,
            timers: pageData.timers,
            groups: pageData.groups,
            dataSource: pageData.dataSource,
          };
        }),
      };
    } catch (error) {
      const err = new ExportError('JSON', error instanceof Error ? error.message : 'Unknown error');
      errorService.record(err, 'PageExportService.exportScene');
      throw err;
    }
  }

  /**
   * 导出单个页面（BasePage.toJSON格式）
   */
  static exportPageRaw(pageId?: string): any {
    try {
      const pageStore = usePageStore();
      const page = pageId 
        ? pageStore.pages.find((p) => p.id === pageId)
        : pageStore.currentPage;

      if (!page) {
        throw new ExportError('JSON', 'Page not found');
      }

      return page.toJSON();
    } catch (error) {
      if (error instanceof ExportError) {
        throw error;
      }
      const err = new ExportError('JSON', error instanceof Error ? error.message : 'Unknown error');
      errorService.record(err, 'PageExportService.exportPageRaw');
      throw err;
    }
  }

  /**
   * 下载JSON文件
   */
  static downloadJSON(data: any, filename: string): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const err = new ExportError('JSON', error instanceof Error ? error.message : 'Download failed');
      errorService.record(err, 'PageExportService.downloadJSON');
      throw err;
    }
  }

  /**
   * 从JSON字符串导入页面
   */
  static importPage(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);
      const pageStore = usePageStore();
      const currentPage = pageStore.currentPage;

      if (!currentPage) {
        throw new ImportError('No current page found');
      }

      // 检测数据格式：支持两种格式
      // 1. JSON面板格式：{ version, page, graphics, timers, groups }
      // 2. 直接 toJSON 格式：{ id, name, graphics, groups, timers, ... }
      let pageData = data;
      let graphicsData = data.graphics;
      let timersData = data.timers;
      let groupsData = data.groups;
      let dataSourceData = data.dataSource;

      // 如果是 JSON 面板格式，提取数据
      if (data.version && data.page) {
        pageData = data.page;
        graphicsData = data.graphics;
        timersData = data.timers;
        groupsData = data.groups;
        dataSourceData = data.dataSource;
      }

      if (!Array.isArray(graphicsData)) {
        throw new ImportError('Invalid JSON format: graphics array is required');
      }

      // 更新页面属性
      pageStore.updatePage(currentPage.id, {
        name: pageData.name,
        width: pageData.width,
        height: pageData.height,
        backgroundColor: pageData.backgroundColor,
        backgroundImage: pageData.backgroundImage,
      } as any);

      // 使用页面的 importGraphics 方法
      currentPage.importGraphics(graphicsData);

      // 导入 timers
      if (timersData && Array.isArray(timersData)) {
        const timerManager = (currentPage as any).timerManager;
        if (timerManager && timerManager.fromJSON) {
          timerManager.fromJSON(timersData);
        }
      }

      // 导入 groups
      if (groupsData && Array.isArray(groupsData)) {
        const groupManager = (currentPage as any).getGroupManager?.();
        if (groupManager && groupManager.fromJSON) {
          groupManager.fromJSON(groupsData);
          let graphics: any[];
          if ('value' in currentPage.graphics) {
            graphics = (currentPage.graphics as any).value;
          } else {
            graphics = currentPage.graphics as any[];
          }
          const graphicMap = new Map(graphics.map((g: any) => [g.id, g]));
          groupManager.updateReferences?.(graphics, graphicMap);
        }
      }

      if (dataSourceData) {
        (currentPage as any).dataSource = dataSourceData;
      }
    } catch (error) {
      if (error instanceof ImportError) {
        errorService.record(error, 'PageExportService.importPage');
        throw error;
      }
      const err = new ImportError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error }
      );
      errorService.record(err, 'PageExportService.importPage');
      throw err;
    }
  }
}
