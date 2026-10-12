// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePage } from '../graphic-editing/graphic/base/BasePage';
import { PageManager } from '../canvas-page/managers/PageManager';
import { IGraphic } from '@scada-editor/plugin-sdk';
import { eventBus } from '../utils/event/eventBus';
import type { IPage } from '../graphic-editing/graphic/base/IPage';

export interface IProject {
  id: string;
  name: string;
  pages: IPage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
    id?: string;
    name?: string;
}

export class Project implements IProject {
    public id: string;
    public name: string;
    private pageManager: PageManager;
    
    public createdAt: string;
    public updatedAt: string;

    constructor(config: ProjectConfig = {}) {
        this.id = config.id || `project-${Date.now()}`;
        this.name = config.name || 'New Project';
        this.pageManager = new PageManager();
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }
    
    public get pages(): IPage[] {
        return this.getAllPages();
    }

    // ==================== PageManager 代理方法 ====================

    createPage(config?: { id?: string; name?: string; width?: number; height?: number }): BasePage {
        const page = this.pageManager.createPage(config);
        eventBus.emit('page-created', { projectId: this.id, pageId: page.id });
        return page;
    }

    removePage(pageId: string): void {
        this.pageManager.removePage(pageId);
        eventBus.emit('page-removed', { projectId: this.id, pageId });
    }

    getPage(pageId: string): BasePage | null {
        return this.pageManager.getPage(pageId);
    }

    getActivePage(): BasePage | null {
        return this.pageManager.getActivePage();
    }

    setActivePage(pageId: string): boolean {
        const success = this.pageManager.setActivePage(pageId);
        if (success) {
            eventBus.emit('active-page-changed', { projectId: this.id, pageId });
        }
        return success;
    }

    getAllPages(): BasePage[] {
        return this.pageManager.getAllPages();
    }

    get pageCount(): number {
        return this.pageManager.pageCount;
    }

    // ==================== 跨页面图形操作代理方法 ====================

    copyBetweenPages(graphicIds: string[], fromPageId: string, toPageId: string): IGraphic[] {
        const graphics = this.pageManager.copyBetweenPages(graphicIds, fromPageId, toPageId);
        eventBus.emit('graphics-copied-between-pages', {
            projectId: this.id,
            fromPageId,
            toPageId,
            graphicIds: graphics.map(g => g.id)
        });
        return graphics;
    }

    moveBetweenPages(graphicIds: string[], fromPageId: string, toPageId: string): IGraphic[] {
        const graphics = this.pageManager.moveBetweenPages(graphicIds, fromPageId, toPageId);
        eventBus.emit('graphics-moved-between-pages', {
            projectId: this.id,
            fromPageId,
            toPageId,
            graphicIds: graphics.map(g => g.id)
        });
        return graphics;
    }

    // ==================== 剪贴板代理方法 ====================

    copyToClipboard(pageId: string, graphicIds: string[]): void {
        this.pageManager.copyToClipboard(pageId, graphicIds);
        eventBus.emit('graphics-copied-to-clipboard', {
            projectId: this.id,
            sourcePageId: pageId,
            graphicIds
        });
    }

    cutToClipboard(pageId: string, graphicIds: string[]): void {
        this.pageManager.cutToClipboard(pageId, graphicIds);
        eventBus.emit('graphics-cut-to-clipboard', {
            projectId: this.id,
            sourcePageId: pageId,
            graphicIds
        });
    }

    pasteFromClipboard(pageId: string): IGraphic[] {
        const graphics = this.pageManager.pasteFromClipboard(pageId);
        if (graphics.length > 0) {
            eventBus.emit('graphics-pasted-from-clipboard', {
                projectId: this.id,
                targetPageId: pageId,
                graphicIds: graphics.map(g => g.id)
            });
        }
        return graphics;
    }

    clearClipboard(): void {
        this.pageManager.clearClipboard();
    }

    // ==================== 管理器访问方法 ====================

    getPageManager(): PageManager {
        return this.pageManager;
    }

    // ==================== 项目序列化 ====================

    toJSON(): any {
        return {
            id: this.id,
            name: this.name,
            pages: this.getAllPages().map(page => page.toJSON()),
            activePageId: this.getActivePage()?.id || null
        };
    }
}
