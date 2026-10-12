// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Project } from './Project';
import { BasePage } from '../graphic-editing/graphic/base/BasePage';
import { IGraphic } from '@scada-editor/plugin-sdk';

/**
 * Editor 是项目的入口类，提供便捷的 API 访问
 */
export class Editor {
    private project: Project;

    constructor(projectConfig?: { id?: string; name?: string }) {
        this.project = new Project(projectConfig);
    }

    // ==================== 项目访问 ====================

    getProject(): Project {
        return this.project;
    }

    // ==================== 页面管理（快捷方法） ====================

    createPage(config?: { id?: string; name?: string; width?: number; height?: number }): BasePage {
        return this.project.createPage(config);
    }

    removePage(pageId: string): void {
        this.project.removePage(pageId);
    }

    getPage(pageId: string): BasePage | null {
        return this.project.getPage(pageId);
    }

    getActivePage(): BasePage | null {
        return this.project.getActivePage();
    }

    setActivePage(pageId: string): boolean {
        return this.project.setActivePage(pageId);
    }

    getAllPages(): BasePage[] {
        return this.project.getAllPages();
    }

    // ==================== 跨页面操作（快捷方法） ====================

    copyToPage(graphicIds: string[], targetPageId: string): IGraphic[] {
        const activePage = this.getActivePage();
        if (!activePage) return [];
        return this.project.copyBetweenPages(graphicIds, activePage.id, targetPageId);
    }

    moveToPage(graphicIds: string[], targetPageId: string): IGraphic[] {
        const activePage = this.getActivePage();
        if (!activePage) return [];
        return this.project.moveBetweenPages(graphicIds, activePage.id, targetPageId);
    }

    copyToClipboard(graphicIds: string[]): void {
        const activePage = this.getActivePage();
        if (activePage) {
            this.project.copyToClipboard(activePage.id, graphicIds);
        }
    }

    cutToClipboard(graphicIds: string[]): void {
        const activePage = this.getActivePage();
        if (activePage) {
            this.project.cutToClipboard(activePage.id, graphicIds);
        }
    }

    pasteFromClipboard(): IGraphic[] {
        const activePage = this.getActivePage();
        if (activePage) {
            return this.project.pasteFromClipboard(activePage.id);
        }
        return [];
    }
}
