// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic-editing/graphic/factory/GraphicFactory';
import { useGraphicStore, useCurrentPage } from '../../store/graphic.store';
import { usePageStore } from '../../store/page.store';

class TestShape extends BaseGraphic {
  static defaultWidth = 100;
  static defaultHeight = 80;
  constructor(x = 0, y = 0, width = 100, height = 80) {
    super('test-shape', x, y, width, height);
  }
  draw(): void {}
}

function createPage(id: string, name: string): BasePage {
  const page = new BasePage();
  page.init({ id, name, width: 1920, height: 1080 });
  return page;
}

function addGraphics(page: BasePage, count: number): TestShape[] {
  const graphics: TestShape[] = [];
  for (let i = 0; i < count; i++) {
    const g = new TestShape(i * 150, 100, 100, 80);
    g.id = `g-${i}`;
    page.addGraphic(g as any);
    graphics.push(g);
  }
  return graphics;
}

describe('graphic.store', () => {
  let pageStore: ReturnType<typeof usePageStore>;
  let graphicStore: ReturnType<typeof useGraphicStore>;

  beforeAll(() => {
    if (!GraphicFactory.hasGraphic('test-shape')) {
      GraphicFactory.registerGraphic('test-shape', TestShape, 'Test Shape', 'test');
    }
  });

  afterAll(() => {
    GraphicFactory.unregisterGraphic('test-shape');
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    pageStore = usePageStore();
    graphicStore = useGraphicStore();
  });

  describe('useCurrentPage 工具函数', () => {
    it('should return the current page from pageStore', () => {
      const currentPage = useCurrentPage();
      expect(currentPage).toBeDefined();
      expect(currentPage?.id).toBeDefined();
    });

    it('should reflect page switching', () => {
      const page = createPage('custom-p1', 'Custom Page');
      pageStore.pages = [...pageStore.pages, page];
      pageStore.currentPageId = 'custom-p1';
      const currentPage = useCurrentPage();
      expect(currentPage?.id).toBe('custom-p1');
      expect(currentPage?.name).toBe('Custom Page');
    });
  });

  describe('store getters', () => {
    it('graphics getter should delegate to currentPage', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      addGraphics(page, 3);
      expect(graphicStore.graphics.length).toBe(3);
    });

    it('selectedGraphicId getter should delegate to currentPage', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      addGraphics(page, 3);
      page.selectGraphic('g-1');
      expect(graphicStore.selectedGraphicId).toBe('g-1');
    });

    it('selectedGraphic getter should find graphic by selectedId', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      addGraphics(page, 3);
      page.selectGraphic('g-0');
      const selected = graphicStore.selectedGraphic;
      expect(selected?.id).toBe('g-0');
    });

    it('selectedGraphicIds getter should delegate to currentPage', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      addGraphics(page, 3);
      page.selectMultipleGraphics(['g-0', 'g-2']);
      expect(graphicStore.selectedGraphicIds).toEqual(['g-0', 'g-2']);
    });
  });

  describe('removePageGraphics', () => {
    it('should remove all graphics from page using removeGraphic', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      addGraphics(page, 5);
      expect(page.graphics.length).toBe(5);

      graphicStore.removePageGraphics('p1');
      expect(page.graphics.length).toBe(0);
    });
  });

  describe('GraphicLookupCache — sortedGraphics', () => {
    it('should return graphics sorted by zIndex', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      addGraphics(page, 3);
      const sorted = graphicStore.sortedGraphics;
      expect(sorted.length).toBe(3);
      expect(sorted[0].id).toBe('g-0');
      expect(sorted[1].id).toBe('g-1');
      expect(sorted[2].id).toBe('g-2');
    });

    it('should update when graphics change on page', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      addGraphics(page, 2);
      expect(graphicStore.sortedGraphics.length).toBe(2);

      const g = new TestShape(100, 100);
      g.id = 'g-new';
      page.addGraphic(g as any);
      expect(page.graphics.length).toBe(3);
    });
  });

  describe('batch operations', () => {
    it('startBatchOperation should set isBatchOperating', () => {
      graphicStore.startBatchOperation();
      expect(graphicStore.isBatchOperating).toBe(true);
      graphicStore.endBatchOperation();
      expect(graphicStore.isBatchOperating).toBe(false);
    });

    it('batchUpdate should wrap operations', async () => {
      const result = await graphicStore.batchUpdate(() => {
        return 'done';
      });
      expect(result).toBe('done');
      expect(graphicStore.isBatchOperating).toBe(false);
    });

    it('batchUpdateSync should wrap synchronous operations', () => {
      const result = graphicStore.batchUpdateSync(() => {
        return 42;
      });
      expect(result).toBe(42);
      expect(graphicStore.isBatchOperating).toBe(false);
    });
  });

  describe('addGraphic via store', () => {
    it('should add graphic and select it', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';

      const result = graphicStore.addGraphic('test-shape', 10, 20, 100, 80);
      expect(result).toBeDefined();
      expect(result?.id).toBeTruthy();
      expect(page.graphics.length).toBe(1);
      expect(graphicStore.selectedGraphicId).toBe(result?.id);
    });
  });
});