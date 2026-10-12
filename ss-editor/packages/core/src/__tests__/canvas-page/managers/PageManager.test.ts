// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { PageManager } from '../../../canvas-page/managers/PageManager';
import { BasePage } from '../../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';
import { Graphic } from '@scada-editor/plugin-sdk';

@Graphic('test-shape', 'Test Shape', 'basic')
class TestShape extends BaseGraphic {
    static defaultWidth = 100;
    static defaultHeight = 100;
    
    constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 100) {
        super('test-shape', x, y, width, height);
    }

    draw(): void {}

    containsPoint(): boolean {
        return false;
    }

    intersectsRegion(): boolean {
        return false;
    }
}

const createTestGraphic = (id: string): any => {
    const graphic = new TestShape(100, 100, 200, 100);
    (graphic as any).type = 'test-shape';
    (graphic as any).id = id;
    (graphic as any).config.id = id;
    return graphic;
};

describe('PageManager', () => {
    let pageManager: PageManager;

    beforeAll(() => {
        if (!GraphicFactory.hasGraphic('test-shape')) {
            GraphicFactory.registerGraphic('test-shape', TestShape, 'Test Shape', 'basic');
        }
    });

    beforeEach(() => {
        pageManager = new PageManager();
    });

    describe('page management', () => {
        it('should create a new page', () => {
            const page = pageManager.createPage({ name: 'Test Page' });
            expect(page).toBeInstanceOf(BasePage);
            expect(page.name).toBe('Test Page');
            expect(pageManager.pageCount).toBe(1);
        });

        it('should set the first created page as active', () => {
            const page = pageManager.createPage();
            const activePage = pageManager.getActivePage();
            expect(activePage?.id).toBe(page.id);
        });

        it('should get a page by id', () => {
            const page = pageManager.createPage();
            const retrievedPage = pageManager.getPage(page.id);
            expect(retrievedPage?.id).toBe(page.id);
        });

        it('should get all pages', () => {
            pageManager.createPage();
            pageManager.createPage();
            pageManager.createPage();
            const allPages = pageManager.getAllPages();
            expect(allPages.length).toBe(3);
        });

        it('should set active page', () => {
            pageManager.createPage();
            const page2 = pageManager.createPage();
            pageManager.setActivePage(page2.id);
            expect(pageManager.getActivePage()?.id).toBe(page2.id);
        });

        it('should switch to other page after removing active page', () => {
            const page1 = pageManager.createPage();
            const page2 = pageManager.createPage();
            pageManager.removePage(page1.id);
            expect(pageManager.getActivePage()?.id).toBe(page2.id);
        });
    });

    describe('cross-page operations', () => {
        it('should copy graphics between pages', () => {
            const page1 = pageManager.createPage();
            const page2 = pageManager.createPage();
            
            const graphic = createTestGraphic('graphic-1');
            page1.addGraphic(graphic);
            
            const copied = pageManager.copyBetweenPages(['graphic-1'], page1.id, page2.id);
            
            expect(copied.length).toBe(1);
            expect(page2.getGraphics().length).toBe(1);
            expect(page1.getGraphics().length).toBe(1);
        });

        it('should move graphics between pages', () => {
            const page1 = pageManager.createPage();
            const page2 = pageManager.createPage();
            
            const graphic = createTestGraphic('graphic-1');
            page1.addGraphic(graphic);
            
            const moved = pageManager.moveBetweenPages(['graphic-1'], page1.id, page2.id);
            
            expect(moved.length).toBe(1);
            expect(page2.getGraphics().length).toBe(1);
            expect(page1.getGraphics().length).toBe(0);
        });
    });

    describe('clipboard', () => {
        it('should copy to clipboard', () => {
            const page = pageManager.createPage();
            const graphic = createTestGraphic('graphic-1');
            page.addGraphic(graphic);
            
            pageManager.copyToClipboard(page.id, ['graphic-1']);
            expect(pageManager.getClipboardManager().isEmpty()).toBe(false);
        });

        it('should paste from clipboard', () => {
            const page1 = pageManager.createPage();
            const page2 = pageManager.createPage();
            
            const graphic = createTestGraphic('graphic-1');
            page1.addGraphic(graphic);
            
            pageManager.copyToClipboard(page1.id, ['graphic-1']);
            const pasted = pageManager.pasteFromClipboard(page2.id);
            
            expect(pasted.length).toBe(1);
            expect(page2.getGraphics().length).toBe(1);
        });

        it('should clear clipboard after cut and paste', () => {
            const page1 = pageManager.createPage();
            const page2 = pageManager.createPage();
            
            const graphic = createTestGraphic('graphic-1');
            page1.addGraphic(graphic);
            
            pageManager.cutToClipboard(page1.id, ['graphic-1']);
            pageManager.pasteFromClipboard(page2.id);
            
            expect(pageManager.getClipboardManager().isEmpty()).toBe(true);
        });
    });
});