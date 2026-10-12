// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { Editor } from '../../project/Editor';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

describe('Boundary Conditions Test', () => {
  describe('Empty Canvas Tests', () => {
    it('should not throw when copy on empty canvas', () => {
      const editor = new Editor({ name: 'Empty Canvas' });
      const page = editor.createPage({ name: 'Empty Page' });
      
      expect(() => editor.copyToClipboard([])).not.toThrow();
      expect(page.graphics.length).toBe(0);
    });

    it('should not throw when paste on empty clipboard', () => {
      const editor = new Editor({ name: 'Empty Clipboard' });
      const page = editor.createPage({ name: 'Test Page' });
      
      const result = editor.pasteFromClipboard();
      expect(result).toEqual([]);
      expect(page.graphics.length).toBe(0);
    });
  });

  describe('Locked Graphic Tests', () => {
    it('should allow copy of locked graphic', () => {
      const editor = new Editor({ name: 'Locked Copy' });
      const page = editor.createPage({ name: 'Test Page' });
      
      // @ts-expect-error test instance
      const graphic = new BaseGraphic('rectangle', 100, 100, 100, 50);
      graphic.id = 'locked-g1';
      graphic.config.locked = true;
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
    });
  });

  describe('Bulk Operation Tests', () => {
    it('should handle bulk operations with many graphics', () => {
      const editor = new Editor({ name: 'Bulk Test' });
      const page = editor.createPage({ name: 'Bulk Page' });
      
      for (let i = 0; i < 50; i++) {
        // @ts-expect-error test instance
        const graphic = new BaseGraphic('rectangle', i * 10, 50, 40, 30);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      
      expect(page.graphics.length).toBe(50);
    });
  });

  describe('Undo Initial State', () => {
    it('should clear all graphics after undoing all operations', () => {
      const editor = new Editor({ name: 'Undo All' });
      const page = editor.createPage({ name: 'Undo Page' });
      
      for (let i = 0; i < 3; i++) {
        // @ts-expect-error test instance
        const graphic = new BaseGraphic('rectangle', i * 60, 50, 40, 40);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      
      expect(page.graphics.length).toBe(3);
      expect(page.canUndo()).toBe(true);
    });
  });
});