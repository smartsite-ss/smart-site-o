// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { PageManager } from '../../../canvas-page/managers/PageManager';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';

class TestShape extends BaseGraphic {
  constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 100) {
    super('test-shape', x, y, width, height);
  }
  draw(): void {}
}

beforeAll(() => {
  if (!GraphicFactory.hasGraphic('test-shape')) {
    GraphicFactory.registerGraphic('test-shape', TestShape, 'Test Shape', 'basic');
  }
});

const createTestGraphic = (id: string): any => {
  const graphic = new TestShape(100, 100, 200, 100);
  (graphic as any).id = id;
  (graphic as any).config.id = id;
  return graphic;
};

describe('PageManager - boundary condition supplementary tests', () => {
  let pageManager: PageManager;

  beforeEach(() => {
    pageManager = new PageManager();
  });

  describe('page operation boundary', () => {
    it('should return undefined when removing non-existent page', () => {
      const result = pageManager.removePage('nonexistent-page');
      expect(result).toBeUndefined();
    });

    it('pageCount should return 0 with no pages', () => {
      expect(pageManager.pageCount).toBe(0);
    });

    it('getActivePage should return null with no pages', () => {
      expect(pageManager.getActivePage()).toBeNull();
    });

    it('pageCount should increment correctly after adding pages', () => {
      pageManager.createPage({ name: 'A' });
      expect(pageManager.pageCount).toBe(1);
      pageManager.createPage({ name: 'B' });
      expect(pageManager.pageCount).toBe(2);
    });
  });

  describe('page selection isolation', () => {
    it('should have empty selection on target page after switching', () => {
      const page1 = pageManager.createPage({ name: 'Page 1' });
      const page2 = pageManager.createPage({ name: 'Page 2' });
      if (!page1 || !page2) return;

      page1.addGraphic(createTestGraphic('g-selected'));
      page1.getSelectionManager().select('g-selected');

      pageManager.setActivePage(page2.id);
      const activePage = pageManager.getActivePage();
      expect(activePage).not.toBeNull();
      if (activePage) {
        expect(activePage.getSelectionManager().getSelectedGraphicIds()).toEqual([]);
      }
    });

    it('should preserve graphics on original page after switching back', () => {
      const page1 = pageManager.createPage({ name: 'Page 1' });
      const page2 = pageManager.createPage({ name: 'Page 2' });
      if (!page1 || !page2) return;

      page1.addGraphic(createTestGraphic('g-sel'));
      pageManager.setActivePage(page2.id);
      pageManager.setActivePage(page1.id);
      expect(page1.getGraphics().length).toBe(1);
    });
  });
});