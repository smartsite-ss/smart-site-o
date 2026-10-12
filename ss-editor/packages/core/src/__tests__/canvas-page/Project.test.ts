// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com


import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Project } from '../../project/Project';
import { Editor } from '../../project/Editor';
import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic-editing/graphic/factory/GraphicFactory';
import { Graphic } from '@scada-editor/plugin-sdk';
/* Create a simple test graphic */
@Graphic('test-shape', 'Test shape', 'basic')
class TestShape extends BaseGraphic {
    static defaultWidth = 100;
    static defaultHeight = 100;
    
    constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 100) {
        super('test-shape', x, y, width, height); } draw(): void { /* 简单的空实现，测试不需要实际绘 */ } containsPoint(): boolean { return false; } intersectsRegion(): boolean { return false; } } /* 创建测试图形的辅助函 */ const createTestGraphic = (id: string): any => { const graphic = new TestShape(100, 100, 200, 100); (graphic as any).id = id; (graphic as any).config.id = id; return graphic; }; describe('Project', () => {
    let project: Project;

    beforeAll(() => {
        if (!GraphicFactory.hasGraphic('test-shape')) {
            GraphicFactory.registerGraphic('test-shape', TestShape, 'Test shape', 'basic');
        }
    });

    beforeEach(() => {
        project = new Project({ name: 'Test Project' });
    });

    it('应该Create project', () => {
        expect(project.name).toBe('Test Project');
        expect(project.id).toBeDefined();
    });

    it('应该管理页面', () => {
        const page = project.createPage({ name: 'Page 1' });
        expect(page).toBeInstanceOf(BasePage);
        expect(project.pageCount).toBe(1);
    });

    it('should get active page', () => {
        const page = project.createPage();
        const activePage = project.getActivePage();
        expect(activePage?.id).toBe(page.id);
    });
});

describe('Editor', () => {
    let editor: Editor;

    beforeAll(() => {
        if (!GraphicFactory.hasGraphic('test-shape')) {
            GraphicFactory.registerGraphic('test-shape', TestShape, 'Test shape', 'basic');
        }
    });

    beforeEach(() => {
        editor = new Editor({ name: 'Test Editor' });
    });

    it('should create editor', () => {
        expect(editor.getProject().name).toBe('Test Editor');
    });

    it('should provide quick methods to manage pages', () => {
        editor.createPage({ name: 'Page 1' });
        const page2 = editor.createPage({ name: 'Page 2' });
        
        expect(editor.getAllPages().length).toBe(2);
        
        editor.setActivePage(page2.id);
        expect(editor.getActivePage()?.id).toBe(page2.id);
    });

    it('should provide quick methods for clipboard operations', () => {
        const page1 = editor.createPage();
        const page2 = editor.createPage();
        
        const graphic = createTestGraphic('graphic-1');
        page1.addGraphic(graphic);
        
        editor.setActivePage(page1.id);
        editor.copyToClipboard(['graphic-1']);
        
        editor.setActivePage(page2.id);
        const pasted = editor.pasteFromClipboard();
        
        expect(pasted.length).toBe(1);
    });
});

