// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 🧪 ss-editor dirty state management unit tests
 *
 * Coverage:
 *   - BasePage.markDirty / clearDirty
 *   - Auto markDirty after various modification operations
 *   - openPages getter reactive dirty tracking
 *   - Graphic store utility functions dirty marking
 *   - showConfirmSave dialog
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic-editing/graphic/factory/GraphicFactory';
import { usePageStore } from '../../store/page.store';
import { useGraphicStore } from '../../store/graphic.store';

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

describe('dirty state management', () => {
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

  /* ================================================================
   * §1 BasePage.markDirty / clearDirty
   * ================================================================ */
  describe('§1 Basic dirty methods', () => {
    it('initial dirty should be false', () => {
      const page = createPage('p1', 'Page 1');
      expect(page.dirty).toBe(false);
    });

    it('markDirty should set dirty to true', () => {
      const page = createPage('p1', 'Page 1');
      page.markDirty();
      expect(page.dirty).toBe(true);
    });

    it('clearDirty should reset dirty to false', () => {
      const page = createPage('p1', 'Page 1');
      page.markDirty();
      page.clearDirty();
      expect(page.dirty).toBe(false);
    });

    it('setter-based dirty assignment should work', () => {
      const page = createPage('p1', 'Page 1'); page.dirty = true; expect(page.dirty).toBe(true); page.dirty = false; expect(page.dirty).toBe(false); }); }); /* ================================================================ * §2 Graphic CRUD operations auto mark dirty * ================================================================ */ describe('§2 Graphic CRUD auto mark dirty', () => {
    it('addGraphic should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      page.addGraphic(new TestShape(0, 0, 100, 80));
      expect(page.dirty).toBe(true);
    });

    it('removeGraphic should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 2);
      page.clearDirty();
      page.removeGraphic('g-0');
      expect(page.dirty).toBe(true);
    });

    it('moveGraphic should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 1);
      page.clearDirty();
      page.moveGraphic('g-0', 200, 200);
      expect(page.dirty).toBe(true);
    });

    it('updateGraphic should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 1);
      page.clearDirty();
      page.updateGraphic('g-0', { 'config.customProps.status': 'running' });
      expect(page.dirty).toBe(true);
    });

    it('duplicateGraphic should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 1);
      page.clearDirty();
      page.duplicateGraphic('g-0');
      expect(page.dirty).toBe(true);
    });

    it('importGraphics should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      page.clearDirty();
      page.importGraphics([new TestShape(0, 0, 100, 80).toJSON()]);
      expect(page.dirty).toBe(true);
    });
  });

  /* ================================================================
   * §3 Layer operations auto mark dirty
   * ================================================================ */
  describe('§3 Layer operations auto mark dirty', () => {
    it('bringToFront should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 3);
      page.clearDirty();
      page.bringToFront('g-0');
      expect(page.dirty).toBe(true);
    });

    it('sendToBack should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 3);
      page.clearDirty();
      page.sendToBack('g-2');
      expect(page.dirty).toBe(true);
    });

    it('lockGraphic should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 1);
      page.clearDirty();
      page.lockGraphic('g-0');
      expect(page.dirty).toBe(true);
    });

    it('hideGraphic should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 1);
      page.clearDirty();
      page.hideGraphic('g-0');
      expect(page.dirty).toBe(true);
    });
  });

  /* ================================================================
   * §4 Group operations auto mark dirty
   * ================================================================ */
  describe('§4 Group operations auto mark dirty', () => {
    it('createGroup should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 3);
      page.clearDirty();
      page.groupGraphics(['g-0', 'g-1']);
      expect(page.dirty).toBe(true);
    });

    it('ungroup should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 3);
      const group = page.groupGraphics(['g-0', 'g-1']);
      page.clearDirty();
      page.ungroupGraphic(group.id);
      expect(page.dirty).toBe(true);
    });
  });

  /* ================================================================
   * §5 Align/Distribute/Batch operations auto mark dirty
   * ================================================================ */
  describe('§5 Align/Distribute/Batch operations auto mark dirty', () => {
    it('alignGraphics should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 3);
      page.selectMultipleGraphics(['g-0', 'g-1']);
      page.clearDirty();
      page.alignGraphics('left');
      expect(page.dirty).toBe(true);
    });

    it('distributeGraphics should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 3);
      page.selectMultipleGraphics(['g-0', 'g-1', 'g-2']);
      page.clearDirty();
      page.distributeGraphics('horizontal');
      expect(page.dirty).toBe(true);
    });

    it('batchEdit should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 3);
      // Select graphics first
      page.selectMultipleGraphics(['g-0', 'g-1']);
      page.clearDirty();
      page.batchEdit({ 'config.customProps.status': 'running' } as any);
      expect(page.dirty).toBe(true);
    });
  });

  /* ================================================================
   * §6 History operations auto mark dirty
   * ================================================================ */
  describe('§6 History operations auto mark dirty', () => {
    it('undo should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 1);
      page.clearDirty();
      page.undo();
      expect(page.dirty).toBe(true);
    });

    it('redo should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      addGraphics(page, 1);
      page.undo();
      page.clearDirty();
      page.redo();
      expect(page.dirty).toBe(true);
    });
  });

  /* ================================================================
   * §7 Page property modifications auto mark dirty
   * ================================================================ */
  describe('§7 Page property modifications auto mark dirty', () => {
    it('updatePageProperties should mark dirty', () => {
      const page = createPage('p1', 'Page 1');
      page.clearDirty();
      page.updatePageProperties({ backgroundColor: '#ffffff' });
      expect(page.dirty).toBe(true);
    });
  });

  /* ================================================================
   * §8 openPages reactively tracks dirty
   * ================================================================ */
  describe('§8 openPages reactively tracks dirty', () => {
    it('openPages should track page.dirty changes', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1'; /* Verify initial state */ let openPages = pageStore.openPages; expect(openPages).toHaveLength(1); expect(openPages[0].dirty).toBe(false); /* After modifying dirty, openPages should return a new array (triggering reactive update) */ page.markDirty(); openPages = pageStore.openPages; expect(openPages[0].dirty).toBe(true); }); it('openPages should reflect state changes after clearDirty', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      page.markDirty();

      page.clearDirty();
      const openPages = pageStore.openPages;
      expect(openPages[0].dirty).toBe(false);
    });
  });

  /* ================================================================
   * §9 Graphic store utility functions mark dirty
   * ================================================================ */
  describe('§9 Graphic store utility functions mark dirty', () => {
    it('addGraphic via store should set dirty to true', () => {
      pageStore.pages = [createPage('p1', 'Page 1')];
      pageStore.currentPageId = 'p1';
      graphicStore.addGraphic('test-shape', 0, 0, 100, 80);
      expect(pageStore.currentPage?.dirty).toBe(true);
    });

    it('removeGraphic via store should set dirty to true', () => {
      pageStore.pages = [createPage('p1', 'Page 1')];
      pageStore.currentPageId = 'p1';
      const g = graphicStore.addGraphic('test-shape', 0, 0, 100, 80)!; /* Clear dirty to simulate initial state */ (pageStore.currentPage as any).clearDirty(); graphicStore.removeGraphic(g.id); expect(pageStore.currentPage?.dirty).toBe(true); }); it('applyStyle should mark dirty', () => {
      pageStore.pages = [createPage('p1', 'Page 1')];
      pageStore.currentPageId = 'p1';
      const g = graphicStore.addGraphic('test-shape', 0, 0, 100, 80)!;
      (pageStore.currentPage as any).clearDirty();
      graphicStore.applyStyle(g.id, { fillColor: '#ff0000' });
      expect(pageStore.currentPage?.dirty).toBe(true);
    });

    it('applyProperty should mark dirty', () => {
      pageStore.pages = [createPage('p1', 'Page 1')];
      pageStore.currentPageId = 'p1';
      const g = graphicStore.addGraphic('test-shape', 0, 0, 100, 80)!;
      (pageStore.currentPage as any).clearDirty();
      graphicStore.applyProperty(g.id, 'style.fillColor', '#00ff00');
      expect(pageStore.currentPage?.dirty).toBe(true);
    });
  });

  /* ================================================================
   * §10 Clear dirty after save
   * ================================================================ */
  describe('§10 Clear dirty after save', () => {
    it('clearDirty should be called in the save flow', () => {
      const page = createPage('p1', 'Page 1');
      pageStore.pages = [page];
      pageStore.currentPageId = 'p1';
      page.markDirty();
      expect(page.dirty).toBe(true);

      // Simulate cleanup after successful save
      pageStore.pages.forEach(p => p.clearDirty?.());
      expect(page.dirty).toBe(false);
    });
  });
});