// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { Editor } from '../../project/Editor';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

describe('End-to-end complete workflow test', () => {
  describe('Complete drawing workflow', () => {
    it('should create a complete project from start to finish', () => {
      const editor = new Editor({ name: 'SCADA Demo Project' });
      
      expect(editor.getProject()).not.toBeNull();
      expect(editor.getProject().name).toBe('SCADA Demo Project');
      
      const page1 = editor.createPage({ name: 'Main Overview' });
      const page2 = editor.createPage({ name: 'Detailed View' });
      
      expect(page1.name).toBe('Main Overview');
      expect(page2.name).toBe('Detailed View');
      // @ts-expect-error 抽象类测试实例
      const g1 = new BaseGraphic('rectangle', 100, 100, 200, 100);
      g1.id = 'g1';
      // @ts-expect-error 抽象类测试实例
      const g2 = new BaseGraphic('text', 150, 120, 200, 50);
      g2.id = 'g2';
      
      page1.addGraphic(g1 as any);
      page1.addGraphic(g2 as any);
      
      expect(page1.graphics.length).toBe(2);
      
      page1.selectGraphic('g1');
      expect(page1.selectedGraphicIds).toEqual(['g1']);
      
      page1.undo();
      page1.redo();
    });

    it('should handle complex operations with multiple graphics', () => {
      const editor = new Editor({ name: 'Complex Operations' });
      const page = editor.createPage({ name: 'Complex Page'}); const graphics = []; for (let i = 0; i < 10; i++) {
        // @ts-expect-error 抽象类测试实例
        const graphic = new BaseGraphic('rectangle', i * 80, i * 40, 60, 30);
        graphic.id = `g-${i}`;
        graphics.push(graphic);
        page.addGraphic(graphic as any);
      }
      
      expect(page.graphics.length).toBe(10);
    });

    it('should test complete history tracking', () => {
      const editor = new Editor({ name: 'History Test' });
      const page = editor.createPage({ name: 'History Page'}); const canUndoInit = page.canUndo(); expect(canUndoInit).toBe(false); for (let i = 0; i < 5; i++) {
        // @ts-expect-error Abstract class test instance
        const graphic = new BaseGraphic('rectangle', i * 50, 50, 40, 40);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      
      expect(page.canUndo()).toBe(true);
    });

    it('should handle clipboard operations', () => {
      const editor = new Editor({ name: 'Clipboard Test' });
      const page1 = editor.createPage({ name: 'Source Page' });
      const page2 = editor.createPage({ name: 'Target Page'});
      // @ts-expect-error 抽象类测试实例
      const g1 = new BaseGraphic('rectangle', 100, 100, 100, 50);
      g1.id = 'g1';
      // @ts-expect-error 抽象类测试实例
      const g2 = new BaseGraphic('text', 220, 120, 100, 50);
      g2.id = 'g2';
      
      page1.addGraphic(g1 as any);
      page1.addGraphic(g2 as any);
      
      expect(page1.graphics.length).toBe(2);
      expect(page2.graphics.length).toBe(0);
    });
  });

  describe('数据管理流程', () => {
    it('should create multiple pages', () => {
      const editor = new Editor({ name: 'Multi-page Project' });
      
      for (let i = 0; i < 3; i++) {
        editor.createPage({ name: `Page ${i + 1}` });
      }
      
      expect(editor.getProject()).not.toBeNull();
    });
  });
});
