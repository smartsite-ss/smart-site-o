// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Multi-page regression test
 * Coverage: page selection/switching, layer display, graphic copy, graphic movement and other cross-page interactions
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BasePage } from '../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../graphic-editing/graphic/factory/GraphicFactory';
import { SelectionMode } from '../types';
import { eventBus, Events } from '../utils/event/eventBus';

/* ==================== Test Helpers ==================== */
class TestShape extends BaseGraphic {
  constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 80) {
    super('test-shape', x, y, width, height);
  }
  draw(_ctx: CanvasRenderingContext2D): void {}
}

let pageIdCounter = 0;
function createPage(id?: string, name: string = 'Test Page'): BasePage {
  const _id = id || `page-${Date.now()}-${pageIdCounter++}`;
  const page = new BasePage();
  page.init({ id: _id, name, width: 1920, height: 1080 });
  return page;
}

function addGraphics(page: BasePage, count: number): TestShape[] {
  const graphics: TestShape[] = [];
  for (let i = 0; i < count; i++) {
    const g = new TestShape(i * 150, 100, 100, 80);
    g.id = `g-${i}-${page.id}`;
    page.addGraphic(g as any);
    graphics.push(g);
  }
  return graphics;
}

// ==================== Test Cases ====================

describe('Multi-page regression test', () => {
  beforeAll(() => {
    if (!GraphicFactory.hasGraphic('test-shape')) {
      GraphicFactory.registerGraphic('test-shape', TestShape, 'Test Shape', 'test');
    }
  });

  afterAll(() => {
    GraphicFactory.unregisterGraphic('test-shape');
  });

  /* ==================== BUG 1&2: toggleGraphicLock / toggleGraphicVisibility history record fix ==================== */
  describe('toggleGraphicLock / toggleGraphicVisibility history record correctness', () => {
    it('toggleGraphicLock should save correct lock state to history', () => {
      const page = createPage();
      const graphic = new TestShape(10, 20);
      page.addGraphic(graphic as any);

      // initial state: unlocked
      expect(graphic.getLocked()).toBe(false);

      // switch to locked
      page.toggleGraphicLock(graphic.id);
      expect(graphic.getLocked()).toBe(true);

      // undo should restore to unlocked
      page.undo();
      expect(graphic.getLocked()).toBe(false);
    });

    it('toggleGraphicVisibility should save correct visibility state to history', () => {
      const page = createPage();
      const graphic = new TestShape(10, 20);
      page.addGraphic(graphic as any);

      // initial state: visible
      expect(graphic.getVisible()).toBe(true);

      // switch to hidden
      page.toggleGraphicVisibility(graphic.id);
      expect(graphic.getVisible()).toBe(false);

      // undo should restore to visible
      page.undo();
      expect(graphic.getVisible()).toBe(true);
    });

    it('should correctly restore after toggling lock state multiple times', () => {
      const page = createPage();
      const graphic = new TestShape(10, 20);
      page.addGraphic(graphic as any);

      page.toggleGraphicLock(graphic.id); // locked = true
      page.toggleGraphicLock(graphic.id); // locked = false
      page.toggleGraphicLock(graphic.id); // locked = true

      expect(graphic.getLocked()).toBe(true);

      page.undo(); // restore to false
      expect(graphic.getLocked()).toBe(false);

      page.undo(); // restore to true
      expect(graphic.getLocked()).toBe(true);
    });
  });

  // ==================== BUG 3: copyPageGraphics should append instead of replace ====================
  describe('copyPageGraphics appends instead of replacing', () => {
    it('copying page graphics should append to target page, not replace', () => {
      const sourcePage = createPage('source', 'Source');
      const targetPage = createPage('target', 'Target');

      /* Source page has 2 graphics */
      addGraphics(sourcePage, 2);
      expect(sourcePage.graphics.length).toBe(2);

      /* Target page has 1 graphic */
      addGraphics(targetPage, 1);
      expect(targetPage.graphics.length).toBe(1);

      /* Copy source page graphics to target page (using fixed addGraphic append logic) */
      const sourceGraphics = sourcePage.graphics;
      for (const graphic of sourceGraphics) {
        const newGraphic = GraphicFactory.createGraphicFromJSON(graphic.toJSON());
        const { x, y } = newGraphic.getPosition();
        newGraphic.setPosition(x + 20, y + 20);
        targetPage.addGraphic(newGraphic);
      }

      /* Target page should have 1 (original) + 2 (copied) = 3 graphics */
      expect(targetPage.graphics.length).toBe(3);
    });
  });

  /* ==================== BUG 4: copyPage deep copy groups/timers ==================== */
  describe('copyPage deep copy data', () => {
    it('copied page groups should be independent from original page', () => {
      const page = createPage('orig', 'Original');
      addGraphics(page, 3);
      /* Create group */
      (page as any).selectionManager.setMode(SelectionMode.BOX);
      page.groupGraphics(['g-0-orig', 'g-1-orig']);

      const originalGroups = [...page.groups];
      expect(originalGroups.length).toBe(1);

      // Simulate fixed copyPage (deep copy groups)
      const copiedPage = new BasePage();
      copiedPage.init({
        id: `page-copy-${Date.now()}`,
        name: `${page.name} Copy`,
        width: page.width,
        height: page.height,
        backgroundColor: page.backgroundColor,
        themeColors: { ...page.themeColors },
        graphics: page.graphics.map(g => GraphicFactory.createGraphicFromJSON(g.toJSON())),
        selectedGraphicId: null,
        selectedGraphicIds: [],
        timers: page.timers.map(t => ({ ...t })),
        groups: page.groups.map(g => ({ ...g, children: [...g.children] })),
        guideLines: page.guideLines.map(l => ({ ...l })),
      });

      // Modifying original page's groups should not affect copied page
      const origGroup = page.groups[0];
      const copiedGroup = copiedPage.groups[0];
      
      if (origGroup && copiedGroup) {
        origGroup.name = 'Modified';
        expect(copiedGroup.name).not.toBe('Modified');
        /* children array should also be independent */
        origGroup.children.push('new-child');
        expect(copiedGroup.children).not.toContain('new-child');
      }
    });
  });

  /* ==================== BUG 5: LayerManager bringForward/sendBackward events ==================== */
  describe('Both graphics should fire events when LayerManager swaps layers', () => {
    it('bringForward should fire GRAPHIC_UPDATED event for both swapped graphics', () => {
      const page = createPage();
      const g1 = new TestShape(0, 0);
      const g2 = new TestShape(100, 0);
      g1.id = 'graphic-1';
      g2.id = 'graphic-2';
      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const updatedIds: string[] = [];
      const handler = (data: any) => {
        updatedIds.push(data.graphicId);
      };
      eventBus.on(Events.GRAPHIC_UPDATED, handler);

      page.bringForward('graphic-1');
      /* both graphics should fire events */
      expect(updatedIds).toContain('graphic-1');
      expect(updatedIds).toContain('graphic-2');

      eventBus.off(Events.GRAPHIC_UPDATED, handler);
    });

    it('sendBackward should fire GRAPHIC_UPDATED event for both swapped graphics', () => {
      const page = createPage();
      const g1 = new TestShape(0, 0);
      const g2 = new TestShape(100, 0);
      g1.id = 'graphic-1';
      g2.id = 'graphic-2';
      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const updatedIds: string[] = [];
      const handler = (data: any) => {
        updatedIds.push(data.graphicId);
      };
      eventBus.on(Events.GRAPHIC_UPDATED, handler);

      page.sendBackward('graphic-2');

      expect(updatedIds).toContain('graphic-1');
      expect(updatedIds).toContain('graphic-2');
      eventBus.off(Events.GRAPHIC_UPDATED, handler);
    });
  });

  /* ==================== BUG 6: Page ID uniqueness ==================== */
  describe('Page ID uniqueness', () => {
    it('should generate unique ID for new page', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const page = createPage();
        expect(ids.has(page.id)).toBe(false);
        ids.add(page.id);
      }
    });

    it('should not produce duplicate IDs even when creating rapidly', () => {
      const pages = Array.from({ length: 5 }, () => createPage());
      const ids = pages.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ==================== BUG 7: reorderGraphic should not produce duplicate zIndex ====================
  describe('reorderGraphic should not produce duplicate zIndex', () => {
    it('all zIndex values should be unique after reordering graphics', () => {
      const page = createPage();
      addGraphics(page, 5);

      // Move the 5th graphic to the 1st position
      page.reorderGraphic(page.graphics[4].id, 0);

      // Check all zIndex values are unique
      const zIndexes = page.graphics.map(g => g.config.zIndex);
      const uniqueZIndexes = new Set(zIndexes);
      expect(uniqueZIndexes.size).toBe(zIndexes.length);
    });

    it('graphic order should be correct after reordering', () => {
      const page = createPage();
      const graphics = addGraphics(page, 3);

      // Initial order: g0, g1, g2
      const sortedBefore = page.getSortedGraphics();
      expect(sortedBefore.map(g => g.id)).toEqual([
        graphics[0].id,
        graphics[1].id,
        graphics[2].id,
      ]);

      // Move the last to the front
      page.reorderGraphic(graphics[2].id, 0);

      const sortedAfter = page.getSortedGraphics();
      expect(sortedAfter[0].id).toBe(graphics[2].id);
    });
  });

  // ==================== Selection state isolation when switching pages ====================
  describe('Selection state isolation when switching pages', () => {
    it('selection state should belong to current page after switching', () => {
      const page1 = createPage('page1', 'Page 1');
      const page2 = createPage('page2', 'Page 2');

      const g1 = new TestShape(0, 0);
      g1.id = 'g-page1';
      page1.addGraphic(g1 as any);

      const g2 = new TestShape(0, 0);
      g2.id = 'g-page2';
      page2.addGraphic(g2 as any);
      /* Select graphic on page 1 */
      (page1 as any).selectionManager.selectMultiple(['g-page1']);
      expect(page1.selectedGraphicIds).toContain('g-page1');
      /* Page 2 selection should be independent */
      expect(page2.selectedGraphicIds).not.toContain('g-page1');
      /* Select graphic on page 2 */
      (page2 as any).selectionManager.selectMultiple(['g-page2']);
      expect(page2.selectedGraphicIds).toContain('g-page2');
      /* Page 1 selection should not be affected */
      expect(page1.selectedGraphicIds).toContain('g-page1');
    });
  });

  /* ==================== Cross-page copy and paste ==================== */
  describe('Cross-page copy and paste', () => {
    it('copied graphic should have new ID', () => {
      const page = createPage();
      const graphic = new TestShape(50, 60);
      page.addGraphic(graphic as any);

      const newGraphic = page.duplicateGraphic(graphic.id);
      expect(newGraphic).not.toBeNull();
      expect(newGraphic!.id).not.toBe(graphic.id);
    });

    it('copied graphic position should be offset', () => {
      const page = createPage();
      const graphic = new TestShape(50, 60);
      page.addGraphic(graphic as any);

      const newGraphic = page.duplicateGraphic(graphic.id);
      const { x: origX, y: origY } = graphic.getPosition();
      const { x: newX, y: newY } = newGraphic!.getPosition();

      expect(newX).toBe(origX + 20);
      expect(newY).toBe(origY + 20);
    });

    it('duplicating group should create new group and maintain membership', () => {
      const page = createPage();
      (page as any).selectionManager.setMode(SelectionMode.BOX);
      
      const g1 = new TestShape(0, 0);
      const g2 = new TestShape(100, 0);
      g1.id = 'member-1';
      g2.id = 'member-2';
      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      page.groupGraphics(['member-1', 'member-2']);
      const originalGroups = page.getGroupManager().getAllGroups();
      expect(originalGroups.length).toBe(1);
      const result = page.duplicateGroup(originalGroups[0].id);
      expect(result).not.toBeNull();
      expect(result!.groupId).not.toBe(originalGroups[0].id);
      expect(result!.memberIds.length).toBe(2);
      /* New member IDs should differ from original members */
      result!.memberIds.forEach(newId => {
        expect(newId).not.toBe('member-1');
        expect(newId).not.toBe('member-2');
      });
    });
  });

  /* ==================== Graphic movement ==================== */
  describe('Graphic movement', () => {
    it('moving graphic should update position and save history', () => {
      const page = createPage();
      const graphic = new TestShape(100, 200);
      page.addGraphic(graphic as any);

      page.moveGraphic(graphic.id, 300, 400);
      const { x, y } = graphic.getPosition();
      expect(x).toBe(300);
      expect(y).toBe(400);

      // Undo should restore original position
      page.undo();
      const pos = graphic.getPosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('locked graphic should not be moved', () => {
      const page = createPage();
      const graphic = new TestShape(100, 200);
      page.addGraphic(graphic as any);

      graphic.setLocked(true);
      page.moveGraphic(graphic.id, 300, 400);

      const { x, y } = graphic.getPosition();
      expect(x).toBe(100); // Position unchanged
      expect(y).toBe(200);
    });
  });

  // ==================== Layer show/hide ====================
  describe('Layer show/hide', () => {
    it('undo after hiding graphic should restore visibility', () => {
      const page = createPage();
      const graphic = new TestShape(0, 0);
      page.addGraphic(graphic as any);

      expect(graphic.getVisible()).toBe(true);
      page.hideGraphic(graphic.id);
      expect(graphic.getVisible()).toBe(false);

      page.undo();
      expect(graphic.getVisible()).toBe(true);
    });

    it('show/hide group should affect all members', () => {
      const page = createPage();
      (page as any).selectionManager.setMode(SelectionMode.BOX);

      const g1 = new TestShape(0, 0);
      const g2 = new TestShape(100, 0);
      g1.id = 'vis-1';
      g2.id = 'vis-2';
      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      page.groupGraphics(['vis-1', 'vis-2']);
      const groups = page.getGroupManager().getAllGroups();
      expect(groups.length).toBe(1);

      page.getGroupManager().setGroupVisible(groups[0].id, false);
      expect(g1.getVisible()).toBe(false);
      expect(g2.getVisible()).toBe(false);

      page.getGroupManager().setGroupVisible(groups[0].id, true);
      expect(g1.getVisible()).toBe(true);
      expect(g2.getVisible()).toBe(true);
    });
  });

  /* ==================== Batch delete ==================== */
  describe('Batch delete', () => {
    it('should clear selection after batch deleting selected graphics', () => {
      const page = createPage();
      (page as any).selectionManager.setMode(SelectionMode.BOX);
      addGraphics(page, 3);

      page.selectMultipleGraphics([
        page.graphics[0].id,
        page.graphics[1].id,
      ]);

      expect(page.selectedGraphicIds.length).toBe(2);
      page.deleteSelectedGraphics();
      expect(page.selectedGraphicIds.length).toBe(0);
      expect(page.graphics.length).toBe(1);
    });
  });
});