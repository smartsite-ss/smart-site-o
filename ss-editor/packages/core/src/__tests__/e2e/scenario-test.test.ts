// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { Editor } from '../../project/Editor';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height); } draw(_ctx: CanvasRenderingContext2D): void { /* Empty implementation for testing */ } } describe('Scenario integration tests', () => {
  describe('Graphic operation scenarios', () => {
    it('should handle create and delete workflow', () => {
      const editor = new Editor({ name: 'Create Delete Workflow' });
      const page = editor.createPage({ name: 'Workflow Page' });
      
      const graphic = new TestShape(100, 100, 100, 50);
      graphic.id = 'test-graphic';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.selectGraphic('test-graphic');
      page.deleteSelectedGraphics?.();
      
      expect(page.graphics.length).toBe(0);
    });

    it('should handle multi-graphic workflow', () => {
      const editor = new Editor({ name: 'Multi Graphic Workflow' });
      const page = editor.createPage({ name: 'Multi Page' });
      
      for (let i = 0; i < 3; i++) {
        const g = new TestShape(100 + i * 70, 100, 50, 50);
        g.id = `g-${i}`;
        page.addGraphic(g as any);
      }
      
      expect(page.graphics.length).toBe(3);
    });
  });

  describe('Exception scenario tests', () => {
    it('should handle null graphic gracefully', () => {
      const editor = new Editor({ name: 'Null Graphic Test' });
      const page = editor.createPage({ name: 'Null Test Page' });
      
      expect(() => {
        // @ts-expect-error Testing null handling
        page.addGraphic(null);
      }).not.toThrow();
      
      expect(page.graphics.length).toBe(0);
    });

    it('should handle non-existent graphic id', () => {
      const editor = new Editor({ name: 'Non-existent Test' });
      const page = editor.createPage({ name: 'Non-existent Page' });
      
      expect(() => {
        page.selectGraphic('non-existent-id');
      }).not.toThrow();
      
      expect(page.selectedGraphicIds).toEqual([]);
    });

    it('should handle duplicate non-existent graphic', () => {
      const editor = new Editor({ name: 'Duplicate Non-existent' });
      const page = editor.createPage({ name: 'Duplicate Page' });
      
      const result = page.duplicateGraphic?.('non-existent');
      expect(result).toBeNull();
      expect(page.graphics.length).toBe(0);
    });
  });

  describe('选择管理场景', () => {
    it('should manage selection correctly', () => {
      const editor = new Editor({ name: 'Selection Management' });
      const page = editor.createPage({ name: 'Selection Page' });
      
      const g1 = new TestShape(100, 100, 50, 50);
      g1.id = 'sel-g1';
      
      page.addGraphic(g1 as any);
      
      page.selectGraphic('sel-g1');
      expect(page.selectedGraphicIds).toEqual(['sel-g1']);
      
      page.clearSelection();
      expect(page.selectedGraphicIds).toEqual([]);
    });

    it('should handle select multiple graphics', () => {
      const editor = new Editor({ name: 'Multi Selection' });
      const page = editor.createPage({ name: 'Multi Selection Page' });
      
      const g1 = new TestShape(100, 100, 50, 50);
      g1.id = 'multi-g1';
      const g2 = new TestShape(160, 100, 50, 50);
      g2.id = 'multi-g2'; page.addGraphic(g1 as any); page.addGraphic(g2 as any); const selectionManager = page.getSelectionManager(); selectionManager.setMode(2 as any); selectionManager.select('multi-g1');
      selectionManager.addToSelection('multi-g2');
      
      expect(page.selectedGraphicIds.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('集成测试场景', () => {
    it('should handle basic workflow', () => {
      const editor = new Editor({ name: 'Basic Workflow' });
      const page = editor.createPage({ name: 'Workflow Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'workflow-g1';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.selectGraphic('workflow-g1');
      expect(page.selectedGraphicIds).toEqual(['workflow-g1']);
    });
  });
});
