// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from 'vitest';
import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic-editing/graphic/factory/GraphicFactory';
import { eventBus, Events } from '../../utils/event/eventBus';
import { SelectionMode } from '../../types';

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

function createTestGraphic(page: BasePage, id: string, x = 0, y = 0): TestShape {
  const g = new TestShape(x, y, 100, 80);
  g.id = id;
  page.addGraphic(g as any);
  return g;
}

function setBoxMode(page: BasePage): void {
  (page as any).selectionManager.setMode(SelectionMode.BOX);
}

describe('Page switching interaction', () => {
  let pageA: BasePage;
  let pageB: BasePage;
  let pages: Map<string, BasePage>;
  let currentPageId: string;

  beforeAll(() => {
    if (!GraphicFactory.hasGraphic('test-shape')) {
      GraphicFactory.registerGraphic('test-shape', TestShape, 'Test Shape', 'test');
    }
  });

  afterAll(() => {
    GraphicFactory.unregisterGraphic('test-shape');
  });

  beforeEach(() => {
    pageA = createPage('page-a', 'Page A');
    pageB = createPage('page-b', 'Page B');
    pages = new Map([
      ['page-a', pageA],
      ['page-b', pageB],
    ]);
    currentPageId = 'page-a';
  });

  function switchToPage(targetPageId: string): BasePage | null {
    const target = pages.get(targetPageId);
    if (!target) return null;

    const oldPage = pages.get(currentPageId);
    if (oldPage) {
      oldPage.clearSelection();
    }

    currentPageId = targetPageId;

    eventBus.emit(Events.PAGE_SWITCHED, { from: oldPage?.id, to: targetPageId });
    eventBus.emit(Events.SELECTION_CHANGED, {
      selectedGraphicIds: target.selectedGraphicIds,
      oldSelectedGraphicIds: oldPage?.selectedGraphicIds || [],
      pageId: targetPageId,
    });
    eventBus.emit(Events.PAGE_UPDATED, { id: targetPageId, changes: { action: 'switch' } });

    return target;
  }

  function crossPagePaste(sourcePage: BasePage, sourceIds: string[], targetPage: BasePage): string[] {
    const pastedIds: string[] = [];
    for (const id of sourceIds) {
      const sourceGraphic = sourcePage.findGraphicById(id);
      if (!sourceGraphic) continue;

      const json = sourceGraphic.toJSON();
      const newGraphic = GraphicFactory.createGraphicFromJSON(json);
      const { x, y } = newGraphic.getPosition();
      newGraphic.setPosition(x + 20, y + 20);
      targetPage.addGraphic(newGraphic as any);

      sourcePage.selectGraphic(id);
      setBoxMode(sourcePage);

      pastedIds.push(newGraphic.id);
    }
    return pastedIds;
  }

  describe('LayerPanel interaction: clear selection on page switch', () => {
    it('should clear selection on old page after switch', () => {
      createTestGraphic(pageA, 'a-0', 0, 0);
      createTestGraphic(pageA, 'a-1', 200, 0);
      setBoxMode(pageA);
      pageA.selectMultipleGraphics(['a-0', 'a-1']);

      expect(pageA.selectedGraphicIds.length).toBe(2);

      switchToPage('page-b');

      expect(pageA.selectedGraphicIds.length).toBe(0);
      expect(pageA.selectedGraphicId).toBeNull();
    });

    it('should have empty selection on new page after switch', () => {
      createTestGraphic(pageB, 'b-0', 0, 0);

      switchToPage('page-b');

      expect(pageB.selectedGraphicIds.length).toBe(0);
      expect(pageB.selectedGraphicId).toBeNull();
    });
  });

  describe('Event coordination: correct events on page switch', () => {
    it('should emit SELECTION_CHANGED on page switch', () => {
      const listener = vi.fn();
      eventBus.on(Events.SELECTION_CHANGED, listener);

      createTestGraphic(pageA, 'a-0');
      setBoxMode(pageA);
      pageA.selectMultipleGraphics(['a-0']);

      switchToPage('page-b');

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toHaveProperty('selectedGraphicIds');
      expect(listener.mock.calls[0][0]).toHaveProperty('pageId');

      eventBus.off(Events.SELECTION_CHANGED, listener);
    });

    it('should emit PAGE_UPDATED on page switch', () => {
      const listener = vi.fn();
      eventBus.on(Events.PAGE_UPDATED, listener);

      switchToPage('page-b');

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toHaveProperty('id');
      eventBus.off(Events.PAGE_UPDATED, listener);
    });

    it('should emit PAGE_SWITCHED on page switch', () => {
      const listener = vi.fn();
      eventBus.on(Events.PAGE_SWITCHED, listener);

      switchToPage('page-b');

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toHaveProperty('from', 'page-a');
      expect(listener.mock.calls[0][0]).toHaveProperty('to', 'page-b');
      eventBus.off(Events.PAGE_SWITCHED, listener);
    });
  });

  describe('Current page association: currentPageId updates correctly', () => {
    it('currentPageId should correctly switch to target page', () => {
      expect(currentPageId).toBe('page-a');

      switchToPage('page-b');

      expect(currentPageId).toBe('page-b');
    });

    it('switching to empty page should yield empty graphics list', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      const countBefore = pageA.graphics.length;

      switchToPage('page-b');

      expect(pageB.graphics.length).toBe(0);
      expect(countBefore).toBe(2);
    });
  });

  describe('HistoryManager interaction: independent history stacks per page', () => {
    it('each page should maintain independent history stack', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      expect(pageA.graphics.length).toBe(2);

      switchToPage('page-b');
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      createTestGraphic(pageB, 'b-2');
      expect(pageB.graphics.length).toBe(3);

      pageB.undo();
      expect(pageB.graphics.length).toBe(2);
      expect(pageB.findGraphicById('b-2')).toBeNull();

      switchToPage('page-a');
      expect(pageA.graphics.length).toBe(2);
      expect(pageA.findGraphicById('a-0')).not.toBeNull();
      expect(pageA.findGraphicById('a-1')).not.toBeNull();

      pageA.undo();
      expect(pageA.graphics.length).toBe(1);
      expect(pageA.findGraphicById('a-1')).toBeNull();

      switchToPage('page-b');
      expect(pageB.graphics.length).toBe(2);
    });

    it('switching pages should not lose history records', () => {
      createTestGraphic(pageA, 'a-0');
      expect(pageA.canUndo()).toBe(true);

      switchToPage('page-b');
      createTestGraphic(pageB, 'b-0');
      expect(pageB.canUndo()).toBe(true);

      pageB.undo();
      expect(pageB.graphics.length).toBe(0);

      switchToPage('page-a');
      expect(pageA.graphics.length).toBe(1);
      expect(pageA.canUndo()).toBe(true);
      expect(pageA.canRedo()).toBe(false);
    });
  });

  describe('Cross-page graphic copy: Clipboard Bridge', () => {
    it('should copy graphics from source page to target page', () => {
      createTestGraphic(pageA, 'a-0', 100, 100);
      createTestGraphic(pageA, 'a-1', 300, 200);

      const pastedIds = crossPagePaste(pageA, ['a-0', 'a-1'], pageB);

      expect(pastedIds.length).toBe(2);
      expect(pageB.graphics.length).toBe(2);

      const pa0 = pageB.findGraphicById(pastedIds[0]);
      expect(pa0).not.toBeNull();
      expect(pa0?.id).not.toBe('a-0');
    });

    it('copied graphics should retain original position with offset', () => {
      createTestGraphic(pageA, 'a-0', 100, 100);

      const pastedIds = crossPagePaste(pageA, ['a-0'], pageB);
      const cloned = pageB.findGraphicById(pastedIds[0]) as any;

      expect(cloned.config.geometry.x).toBe(120);
      expect(cloned.config.geometry.y).toBe(120);
    });

    it('cross-page copy should not affect source page graphics', () => {
      createTestGraphic(pageA, 'a-0', 100, 100);
      createTestGraphic(pageA, 'a-1', 300, 200);

      const countBefore = pageA.graphics.length;

      crossPagePaste(pageA, ['a-0', 'a-1'], pageB);

      expect(pageA.graphics.length).toBe(countBefore);
      const src = pageA.findGraphicById('a-0') as any;
      expect(src.config.geometry.x).toBe(100);
    });

    it('should support multiple cross-page paste operations', () => {
      createTestGraphic(pageA, 'a-0', 100, 100);

      crossPagePaste(pageA, ['a-0'], pageB);
      expect(pageB.graphics.length).toBe(1);

      crossPagePaste(pageA, ['a-0'], pageB);
      expect(pageB.graphics.length).toBe(2);
    });

    it('target page existing graphics should not be affected by paste', () => {
      createTestGraphic(pageA, 'a-0', 100, 100);
      createTestGraphic(pageB, 'b-0', 500, 500);

      crossPagePaste(pageA, ['a-0'], pageB);

      expect(pageB.graphics.length).toBe(2);
      const existing = pageB.findGraphicById('b-0') as any;
      expect(existing.config.geometry.x).toBe(500);
    });
  });

  describe('Group structure preservation on switch', () => {
    it('target page group structure should remain intact after switch', () => {
      createTestGraphic(pageB, 'b-0', 0, 0);
      createTestGraphic(pageB, 'b-1', 200, 0);
      const group = pageB.groupGraphics(['b-0', 'b-1']);
      expect(pageB.groups.length).toBe(1);

      switchToPage('page-b');

      expect(pageB.groups.length).toBe(1);
      const gm = pageB.getGroupManager();
      const members = gm.getGroupMembers(group.id);
      expect(members.length).toBe(2);
    });

    it('switch back should preserve original page group structure', () => {
      createTestGraphic(pageA, 'a-0', 0, 0);
      createTestGraphic(pageA, 'a-1', 200, 0);
      const group = pageA.groupGraphics(['a-0', 'a-1']);
      expect(pageA.groups.length).toBe(1);

      switchToPage('page-b');

      createTestGraphic(pageB, 'b-0', 0, 0);
      createTestGraphic(pageB, 'b-1', 200, 0);
      pageB.groupGraphics(['b-0', 'b-1']);

      switchToPage('page-a');

      expect(pageA.groups.length).toBe(1);
      const gm = pageA.getGroupManager();
      const members = gm.getGroupMembers(group.id);
      expect(members.length).toBe(2);
    });
  });

  describe('Clipboard preservation on page switch', () => {
    it('cross-page paste should not affect existing selection/clipboard', () => {
      createTestGraphic(pageA, 'a-0', 100, 100);
      setBoxMode(pageA);
      pageA.selectMultipleGraphics(['a-0']);

      switchToPage('page-b');

      expect(pageA.selectedGraphicIds.length).toBe(0);
      expect(pageB.selectedGraphicIds.length).toBe(0);

      createTestGraphic(pageB, 'b-0', 0, 0);
      setBoxMode(pageB);
      pageB.selectMultipleGraphics(['b-0']);
      expect(pageB.selectedGraphicIds).toEqual(['b-0']);

      switchToPage('page-a');
      expect(pageA.selectedGraphicIds.length).toBe(0);
    });
  });
});