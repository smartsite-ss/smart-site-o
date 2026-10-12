// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com


import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { IGraphic } from '@scada-editor/plugin-sdk';
import { InterpageTransferService, ITransferableData } from '../../services/InterpageTransferService';
import { ClipboardManager } from '../../graphic-editing/managers/ClipboardManager';

export interface PageConfig {
    id?: string;
    name?: string;
    width?: number;
    height?: number;
}

export class PageManager {
    private pages: Map<string, BasePage> = new Map();
    private activePageId: string | null = null;
    private transferService: InterpageTransferService;
    private clipboardManager: ClipboardManager;

    constructor() {
        this.transferService = new InterpageTransferService();
        this.clipboardManager = new ClipboardManager();
    }

    // ==================== 页面管理 ====================
    
    /**
     * 创建页面
     */
    createPage(config: PageConfig = {}): BasePage {
        const id = config.id || `page-${Date.now()}-${this.pages.size}`;
        const page = new BasePage();
        page.init({
            id,
            name: config.name || `Page${this.pages.size + 1}`,
            width: config.width || 1920,
            height: config.height || 1080,
        });
        
        this.pages.set(id, page);
        
        // 如果没有活动页面，设置为第一个
        if (!this.activePageId) {
            this.activePageId = id;
        }
        
        return page;
    }

    /**
     * 移除页面
     */
    removePage(pageId: string): void {
        if (this.pages.has(pageId)) {
            this.pages.delete(pageId);
            
            // 如果移除的是活动页面，切换到其他页面
            if (this.activePageId === pageId) {
                const remainingPages = Array.from(this.pages.keys());
                this.activePageId = remainingPages.length > 0 ? remainingPages[0] : null;
            }
        }
    }

    /**
     * 获取页面
     */
    getPage(pageId: string): BasePage | null {
        return this.pages.get(pageId) || null;
    }

    /**
     * 获取活动页面
     */
    getActivePage(): BasePage | null {
        return this.activePageId ? this.getPage(this.activePageId) : null;
    }

    /**
     * 设置活动页面
     */
    setActivePage(pageId: string): boolean {
        if (this.pages.has(pageId)) {
            this.activePageId = pageId;
            return true;
        }
        return false;
    }

    /**
     * 获取所有页面
     */
    getAllPages(): BasePage[] {
        return Array.from(this.pages.values());
    }

    /**
     * 获取页面数量
     */
    get pageCount(): number {
        return this.pages.size;
    }

    // ==================== 图元跨页面操作 ====================
    
    /**
     * 在页面间复制图元
     */
    copyBetweenPages(
        graphicIds: string[], 
        fromPageId: string, 
        toPageId: string
    ): IGraphic[] {
        const fromPage = this.getPage(fromPageId);
        const toPage = this.getPage(toPageId);
        
        if (!fromPage || !toPage) {
            return [];
        }

        // 获取源图元列表
        const sourceGraphics = graphicIds
            .map(id => fromPage.getGraphicById(id))
            .filter(g => g !== null) as IGraphic[];

        if (sourceGraphics.length === 0) {
            return [];
        }

        // 序列化和转换
        const serialized = this.transferService.serializeGraphics(sourceGraphics);
        
        // 获取目标页面现有 ID
        const existingIds = toPage.getGraphics().map(g => g.id);
        
        // 重建并添加到目标页面
        const newGraphics = serialized.map(data => {
            data.id = this.transferService.generateNewId(existingIds);
            existingIds.push(data.id);
            return this.transferService.deserializeGraphic(data);
        });

        // 添加到目标页面
        newGraphics.forEach(g => toPage.addGraphic(g));

        return newGraphics;
    }

    /**
     * 在页面间移动图元
     */
    moveBetweenPages(
        graphicIds: string[], 
        fromPageId: string, 
        toPageId: string
    ): IGraphic[] {
        // 1. 复制到目标页面
        const copiedGraphics = this.copyBetweenPages(graphicIds, fromPageId, toPageId);
        
        // 2. 从源页面移除
        const fromPage = this.getPage(fromPageId);
        if (fromPage) {
            graphicIds.forEach(id => fromPage.removeGraphic(id));
        }

        return copiedGraphics;
    }

    // ==================== 剪贴板功能 ====================
    
    /**
     * 复制到剪贴板
     */
    copyToClipboard(pageId: string, graphicIds: string[]): void {
        const page = this.getPage(pageId);
        if (!page) return;

        const graphics = graphicIds
            .map(id => page.getGraphicById(id))
            .filter(g => g !== null) as IGraphic[];

        const serialized = this.transferService.serializeGraphics(graphics);
        this.clipboardManager.setData(serialized, 'copy', pageId);
    }

    /**
     * 剪切到剪贴板
     */
    cutToClipboard(pageId: string, graphicIds: string[]): void {
        const page = this.getPage(pageId);
        if (!page) return;

        const graphics = graphicIds
            .map(id => page.getGraphicById(id))
            .filter(g => g !== null) as IGraphic[];

        const serialized = this.transferService.serializeGraphics(graphics);
        this.clipboardManager.setData(serialized, 'cut', pageId);
    }

    /**
     * 从剪贴板粘贴
     */
    pasteFromClipboard(pageId: string): IGraphic[] {
        const page = this.getPage(pageId);
        if (!page) return [];

        const data = this.clipboardManager.getData();
        if (data.length === 0) return [];

        const existingIds = page.getGraphics().map(g => g.id);
        const pasteCount = this.clipboardManager.getPasteCount();
        
        // 重建并重新分配 ID
        const newGraphics = data.map((d: ITransferableData) => {
            d.id = this.transferService.generateNewId(existingIds);
            existingIds.push(d.id);
            return this.transferService.deserializeGraphic(d);
        });

        // 计算累积偏移位置（每次粘贴都增加 20px）
        const totalOffsetX = 20 * (pasteCount + 1);
        const totalOffsetY = 20 * (pasteCount + 1);
        
        // 对粘贴的图形进行偏移
        newGraphics.forEach((g, index) => {
            this.transferService.transformCoordinates(g, totalOffsetX + index * 5, totalOffsetY + index * 5);
        });

        // 添加到页面
        newGraphics.forEach(g => page.addGraphic(g));

        // 先清空原选择，再选择新粘贴的图形
        page.clearSelection();
        const newIds = newGraphics.map((g) => g.id);
        page.selectMultipleGraphics(newIds);

        // 增加粘贴计数
        this.clipboardManager.incrementPasteCount();

        // 如果是剪切，清空剪贴板
        if (this.clipboardManager.getClipboardMode() === 'cut') {
            this.clipboardManager.clearData();
        }

        return newGraphics;
    }

    /**
     * 清空剪贴板
     */
    clearClipboard(): void {
        this.clipboardManager.clearData();
    }

    /**
     * 获取剪贴板管理器
     */
    getClipboardManager(): ClipboardManager {
        return this.clipboardManager;
    }

    /**
     * 获取传输服务
     */
    getTransferService(): InterpageTransferService {
        return this.transferService;
    }
}
