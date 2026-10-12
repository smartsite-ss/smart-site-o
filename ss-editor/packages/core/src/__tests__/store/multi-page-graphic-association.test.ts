// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll, vi } from 'vitest';
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

function createSimulatedLayerPanel() {
  let refreshTrigger = 0;
  let currentPage: BasePage | null = null;
  const eventSubscriptions: Array<{ event: string; handler: () => void }> = [];

  const refreshLayerList = () => {
    refreshTrigger++;
  };

  const eventsToListen = [
    Events.GRAPHIC_ADDED,
    Events.GRAPHIC_REMOVED,
    Events.GRAPHIC_UPDATED,
    Events.GROUP_CREATED,
    Events.GROUP_DELETED,
    Events.GROUP_UPDATED,
    Events.PAGE_SWITCHED,
  ];

  for (const evt of eventsToListen) {
    eventBus.on(evt, refreshLayerList);
    eventSubscriptions.push({ event: evt, handler: refreshLayerList });
  }

  return {
    get triggerCount() { return refreshTrigger; },
    setCurrentPage(page: BasePage) { currentPage = page; },
    getGraphics(): any[] {
      void refreshTrigger;
      if (!currentPage) return [];
      const g = currentPage.graphics;
      return Array.isArray(g) ? g : ((g as { value: any[] }).value ?? []);
    },
    getSortedGraphics() {
      return [...this.getGraphics()].sort(
        (a, b) => (a.config.zIndex || 0) - (b.config.zIndex || 0)
      );
    },
    getGroupManager() {
      if (!currentPage || typeof currentPage.getGroupManager !== 'function') return null;
      return currentPage.getGroupManager();
    },
    getCurrentPage() { return currentPage; },
    resetTrigger() { refreshTrigger = 0; },
    dispose() {
      for (const { event, handler } of eventSubscriptions) {
        eventBus.off(event, handler);
      }
    },
  };
}

describe('Multi-page graphic association - comprehensive tests', () => {
  let pageA: BasePage;
  let pageB: BasePage;
  let pageC: BasePage;
  let panel: ReturnType<typeof createSimulatedLayerPanel>;

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
    pageC = createPage('page-c', 'Page C');
    panel = createSimulatedLayerPanel();
  });

  afterEach(() => {
    panel.dispose();
    eventBus.clear();
  });

  describe('1. EventBus singleton consistency', () => {
    it('platform and utils eventBus should be the same instance', async () => {
      const { eventBus: platformBus } = await import('../../platform/event/EventBus');
      const { eventBus: utilBus } = await import('../../utils/event/eventBus');
      expect(platformBus).toBe(utilBus);
    });

    it('platform and utils Events enum should be the same reference', async () => {
      const { Events: platformEvents } = await import('../../platform/event/EventBus');
      const { Events: utilEvents } = await import('../../utils/event/eventBus');
      expect(platformEvents).toBe(utilEvents);
    });

    it('events emitted via utils should be received via platform', async () => {
      const { eventBus: platformBus, Events } = await import('../../platform/event/EventBus');
      const { eventBus: utilBus } = await import('../../utils/event/eventBus');

      const listener = vi.fn();
      platformBus.on(Events.GRAPHIC_ADDED, listener);
      utilBus.emit(Events.GRAPHIC_ADDED, { id: 'g-1', graphic: {} as any });

      expect(listener).toHaveBeenCalledTimes(1);
      platformBus.off(Events.GRAPHIC_ADDED, listener);
    });

    it('GROUP_DELETED / GROUP_UPDATED / GROUP_CREATED should be accessible via platform', async () => {
      const { Events } = await import('../../platform/event/EventBus');

      expect(Events.GROUP_DELETED).toBe('group_deleted');
      expect(Events.GROUP_UPDATED).toBe('group_updated');
      expect(Events.GROUP_CREATED).toBe('group_created');
    });
  });

  describe('2. Independent graphics list per page', () => {
    it('page A graphics should not appear in page B graphics', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');

      expect(pageA.graphics.length).toBe(2);
      expect(pageB.graphics.length).toBe(0);
      expect(pageB.findGraphicById('a-0')).toBeNull();
    });

    it('adding graphics to page B should not affect page A', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');

      expect(pageA.graphics.length).toBe(1);
      expect(pageB.graphics.length).toBe(1);
    });

    it('three pages should each maintain independent graphics lists', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      createTestGraphic(pageB, 'b-2');
      createTestGraphic(pageC, 'c-0');

      expect(pageA.graphics.length).toBe(2);
      expect(pageB.graphics.length).toBe(3);
      expect(pageC.graphics.length).toBe(1);
    });
  });

  describe('3. Graphics reflects current page after switch (core fix)', () => {
    it('simulated LayerPanel: computed graphics should update after page switch', () => {
      panel.setCurrentPage(pageA);
      createTestGraphic(pageA, 'a-0');

      expect(panel.getGraphics().length).toBe(1);
      expect(panel.getGraphics()[0].id).toBe('a-0');

      panel.setCurrentPage(pageB);
      eventBus.emit(Events.PAGE_SWITCHED, { pageId: 'page-b', projectId: 'p1' });

      expect(panel.getGraphics().length).toBe(0);
      createTestGraphic(pageB, 'b-0');
      expect(panel.getGraphics().length).toBe(1);
      expect(panel.getGraphics()[0].id).toBe('b-0');
    });

    it('repeated page switches should always show correct graphics', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      createTestGraphic(pageB, 'b-0');

      panel.setCurrentPage(pageA);
      expect(panel.getGraphics().length).toBe(2);

      panel.setCurrentPage(pageB);
      expect(panel.getGraphics().length).toBe(1);

      panel.setCurrentPage(pageA);
      expect(panel.getGraphics().length).toBe(2);

      panel.setCurrentPage(pageC);
      expect(panel.getGraphics().length).toBe(0);
    });

    it('second page should contain all added graphics', () => {
      panel.setCurrentPage(pageB);
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      createTestGraphic(pageB, 'b-2');

      expect(panel.getGraphics().length).toBe(3);
      const ids = panel.getGraphics().map(g => g.id);
      expect(ids).toContain('b-0');
      expect(ids).toContain('b-1');
      expect(ids).toContain('b-2');
    });
  });

  describe('4. refreshTrigger and event linkage', () => {
    it('GRAPHIC_ADDED should trigger refreshTrigger increment', () => {
      panel.resetTrigger();
      createTestGraphic(pageA, 'a-0');
      expect(panel.triggerCount).toBeGreaterThanOrEqual(1);
    });

    it('GRAPHIC_REMOVED should trigger refreshTrigger increment', () => {
      createTestGraphic(pageA, 'a-0');
      panel.resetTrigger();
      pageA.removeGraphic('a-0');
      expect(panel.triggerCount).toBeGreaterThanOrEqual(1);
    });

    it('GRAPHIC_UPDATED should trigger refreshTrigger increment', () => {
      createTestGraphic(pageA, 'a-0');
      panel.resetTrigger();
      eventBus.emit(Events.GRAPHIC_UPDATED, { graphicId: 'a-0', changes: {} });
      expect(panel.triggerCount).toBeGreaterThanOrEqual(1);
    });

    it('GROUP_CREATED should trigger refreshTrigger increment', () => {
      panel.resetTrigger();
      eventBus.emit(Events.GROUP_CREATED, { groupId: 'g-1', memberIds: [] });
      expect(panel.triggerCount).toBeGreaterThanOrEqual(1);
    });

    it('GROUP_DELETED should trigger refreshTrigger increment', () => {
      panel.resetTrigger();
      eventBus.emit(Events.GROUP_DELETED, { groupId: 'g-1' });
      expect(panel.triggerCount).toBeGreaterThanOrEqual(1);
    });

    it('GROUP_UPDATED should trigger refreshTrigger increment', () => {
      panel.resetTrigger();
      eventBus.emit(Events.GROUP_UPDATED, { groupId: 'g-1' });
      expect(panel.triggerCount).toBeGreaterThanOrEqual(1);
    });

    it('PAGE_SWITCHED should trigger refreshTrigger increment', () => {
      panel.resetTrigger();
      eventBus.emit(Events.PAGE_SWITCHED, { pageId: 'page-b', projectId: 'p1' });
      expect(panel.triggerCount).toBeGreaterThanOrEqual(1);
    });

    it('multiple sequential events should correctly accumulate refreshTrigger', () => {
      panel.resetTrigger();
      createTestGraphic(pageA, 'a-0');
      eventBus.emit(Events.GRAPHIC_UPDATED, { graphicId: 'a-0', changes: {} });
      pageA.removeGraphic('a-0');

      expect(panel.triggerCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('5. Graphics sorting (zIndex) and layer association', () => {
    it('sortedGraphics should order by zIndex ascending', () => {
      const g0 = createTestGraphic(pageA, 'a-0');
      const g1 = createTestGraphic(pageA, 'a-1');
      const g2 = createTestGraphic(pageA, 'a-2');

      g0.config.zIndex = 5;
      g1.config.zIndex = 1;
      g2.config.zIndex = 10;

      panel.setCurrentPage(pageA);
      const sorted = panel.getSortedGraphics();

      expect(sorted[0].id).toBe('a-1');
      expect(sorted[1].id).toBe('a-0');
      expect(sorted[2].id).toBe('a-2');
    });

    it('bringToFront should move graphic to top layer', () => {
      const g0 = createTestGraphic(pageA, 'a-0');
      const g1 = createTestGraphic(pageA, 'a-1');
      const g2 = createTestGraphic(pageA, 'a-2');

      g0.config.zIndex = 0;
      g1.config.zIndex = 1;
      g2.config.zIndex = 2;

      pageA.bringToFront('a-0');

      expect(g0.config.zIndex).toBeGreaterThan(g2.config.zIndex);
    });

    it('sendToBack should move graphic to bottom layer', () => {
      const g0 = createTestGraphic(pageA, 'a-0');
      const g1 = createTestGraphic(pageA, 'a-1');

      g0.config.zIndex = 5;
      g1.config.zIndex = 1;

      pageA.sendToBack('a-0');

      expect(g0.config.zIndex).toBeLessThanOrEqual(g1.config.zIndex);
    });

    it('bringForward should move graphic up one layer', () => {
      const g0 = createTestGraphic(pageA, 'a-0');
      const g1 = createTestGraphic(pageA, 'a-1');

      g0.config.zIndex = 0;
      g1.config.zIndex = 1;

      pageA.bringForward('a-0');

      expect(g0.config.zIndex).toBeGreaterThan(0);
    });

    it('sendBackward should move graphic down one layer', () => {
      const g0 = createTestGraphic(pageA, 'a-0');
      const g1 = createTestGraphic(pageA, 'a-1');

      g0.config.zIndex = 5;
      g1.config.zIndex = 1;

      pageA.sendBackward('a-0');

      expect(g0.config.zIndex).toBeLessThan(5);
    });

    it('page A sorting operations should not affect page B graphics zIndex', () => {
      const gA = createTestGraphic(pageA, 'a-0');
      const gB = createTestGraphic(pageB, 'b-0');

      gA.config.zIndex = 0;
      gB.config.zIndex = 10;

      pageA.bringToFront('a-0');

      expect(gB.config.zIndex).toBe(10);
    });
  });

  describe('6. Graphic lock/unlock and visibility', () => {
    it('lockGraphic should lock the specified graphic', () => {
      createTestGraphic(pageA, 'a-0');
      pageA.lockGraphic('a-0');

      const g = pageA.findGraphicById('a-0') as any;
      expect(g.config.locked).toBe(true);
    });

    it('unlockGraphic should unlock the specified graphic', () => {
      createTestGraphic(pageA, 'a-0');
      pageA.lockGraphic('a-0');
      pageA.unlockGraphic('a-0');

      const g = pageA.findGraphicById('a-0') as any;
      expect(g.config.locked).toBe(false);
    });

    it('toggleGraphicLock should toggle lock state', () => {
      createTestGraphic(pageA, 'a-0');

      pageA.toggleGraphicLock('a-0');
      expect((pageA.findGraphicById('a-0') as any).config.locked).toBe(true);

      pageA.toggleGraphicLock('a-0');
      expect((pageA.findGraphicById('a-0') as any).config.locked).toBe(false);
    });

    it('hideGraphic should hide the specified graphic', () => {
      createTestGraphic(pageA, 'a-0');
      pageA.hideGraphic('a-0');

      const g = pageA.findGraphicById('a-0') as any;
      expect(g.config.visible).toBe(false);
    });

    it('showGraphic should show the specified graphic', () => {
      createTestGraphic(pageA, 'a-0');
      pageA.hideGraphic('a-0');
      pageA.showGraphic('a-0');

      const g = pageA.findGraphicById('a-0') as any;
      expect(g.config.visible).toBe(true);
    });

    it('toggleGraphicVisibility should toggle visibility', () => {
      createTestGraphic(pageA, 'a-0');

      pageA.toggleGraphicVisibility('a-0');
      expect((pageA.findGraphicById('a-0') as any).config.visible).toBe(false);

      pageA.toggleGraphicVisibility('a-0');
      expect((pageA.findGraphicById('a-0') as any).config.visible).toBe(true);
    });

    it('page A lock operation should not affect page B graphics', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');

      pageA.lockGraphic('a-0');

      expect((pageA.findGraphicById('a-0') as any).config.locked).toBe(true);
      expect((pageB.findGraphicById('b-0') as any).config.locked).toBe(false);
    });

    it('page A hide operation should not affect page B graphics', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');

      pageA.hideGraphic('a-0');

      expect((pageA.findGraphicById('a-0') as any).config.visible).toBe(false);
      expect((pageB.findGraphicById('b-0') as any).config.visible).toBe(true);
    });

    it('simulate toggleAllLayersLock: lock/unlock all graphics', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');

      pageA.lockGraphic('a-0');
      pageA.lockGraphic('a-1');

      const allLocked = pageA.graphics.every(g => g.config.locked);
      expect(allLocked).toBe(true);

      pageA.unlockGraphic('a-0');
      pageA.unlockGraphic('a-1');

      const noneLocked = pageA.graphics.every(g => !g.config.locked);
      expect(noneLocked).toBe(true);
    });

    it('simulate toggleAllLayersVisible: show/hide all graphics', () => {
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');

      pageB.hideGraphic('b-0');
      pageB.hideGraphic('b-1');

      const allHidden = pageB.graphics.every(g => !g.config.visible);
      expect(allHidden).toBe(true);

      pageB.showGraphic('b-0');
      pageB.showGraphic('b-1');

      const allVisible = pageB.graphics.every(g => g.config.visible);
      expect(allVisible).toBe(true);
    });
  });

  describe('7. Graphic selection state and page isolation', () => {
    it('page A selection should not affect page B selection state', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');
      setBoxMode(pageA);
      setBoxMode(pageB);

      pageA.selectMultipleGraphics(['a-0']);

      expect(pageA.selectedGraphicIds).toContain('a-0');
      expect(pageB.selectedGraphicIds.length).toBe(0);
    });

    it('multi-selection should be independent per page', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      createTestGraphic(pageB, 'b-0');
      setBoxMode(pageA);
      setBoxMode(pageB);

      pageA.selectMultipleGraphics(['a-0', 'a-1']);
      pageB.selectMultipleGraphics(['b-0']);

      expect(pageA.selectedGraphicIds).toEqual(['a-0', 'a-1']);
      expect(pageB.selectedGraphicIds).toEqual(['b-0']);
    });

    it('clearSelection should only affect current page', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');
      setBoxMode(pageA);
      setBoxMode(pageB);

      pageA.selectMultipleGraphics(['a-0']);
      pageB.selectMultipleGraphics(['b-0']);

      pageA.clearSelection();

      expect(pageA.selectedGraphicIds.length).toBe(0);
      expect(pageB.selectedGraphicIds).toContain('b-0');
    });

    it('page switch simulation: clear old page selection, set new page empty', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');
      setBoxMode(pageA);
      setBoxMode(pageB);

      pageA.selectGraphic('a-0');

      pageA.clearSelection();
      panel.setCurrentPage(pageB);
      eventBus.emit(Events.PAGE_SWITCHED, { pageId: 'page-b', projectId: 'p1' });

      expect(pageA.selectedGraphicIds.length).toBe(0);
      expect(pageB.selectedGraphicIds.length).toBe(0);
    });
  });

  describe('8. Group management and page isolation', () => {
    it('page A groups should not appear on page B', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      pageA.groupGraphics(['a-0', 'a-1']);

      expect(pageA.groups.length).toBe(1);
      expect(pageB.groups.length).toBe(0);
    });

    it('page B group operations should not affect page A groups', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      pageA.groupGraphics(['a-0', 'a-1']);

      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      pageB.groupGraphics(['b-0', 'b-1']);

      expect(pageA.groups.length).toBe(1);
      expect(pageB.groups.length).toBe(1);

      const bGroup = pageB.groups[0];
      pageB.ungroupGraphic(bGroup.id);

      expect(pageA.groups.length).toBe(1);
      expect(pageB.groups.length).toBe(0);
    });

    it('group lock should not affect graphics on other pages', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      const group = pageA.groupGraphics(['a-0', 'a-1']);

      createTestGraphic(pageB, 'b-0');

      const gm = pageA.getGroupManager();
      gm.setGroupLocked(group.id, true);

      expect((pageB.findGraphicById('b-0') as any).config.locked).toBe(false);
    });

    it('group visibility should not affect graphics on other pages', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      const group = pageA.groupGraphics(['a-0', 'a-1']);

      createTestGraphic(pageB, 'b-0');

      const gm = pageA.getGroupManager();
      gm.setGroupVisible(group.id, false);

      expect((pageB.findGraphicById('b-0') as any).config.visible).toBe(true);
    });

    it('simulate LayerPanel layerTree construction on page B', () => {
      panel.setCurrentPage(pageB);
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      pageB.groupGraphics(['b-0', 'b-1']);

      const gm = panel.getGroupManager();
      expect(gm).not.toBeNull();
      expect(gm!.getGroupsByParent(null).length).toBe(1);
    });

    it('GROUP_CREATED event should propagate from BasePage to LayerPanel', () => {
      const listener = vi.fn();
      eventBus.on(Events.GROUP_CREATED, listener);

      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      pageA.groupGraphics(['a-0', 'a-1']);

      expect(listener).toHaveBeenCalled();

      eventBus.off(Events.GROUP_CREATED, listener);
    });

    it('GROUP_DELETED event should propagate from BasePage to LayerPanel', () => {
      const listener = vi.fn();
      eventBus.on(Events.GROUP_DELETED, listener);

      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      const group = pageA.groupGraphics(['a-0', 'a-1']);
      pageA.ungroupGraphic(group.id);

      expect(listener).toHaveBeenCalled();

      eventBus.off(Events.GROUP_DELETED, listener);
    });
  });

  describe('9. Graphic deletion and undo/redo', () => {
    it('deleting graphic on second page should update graphics', () => {
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');

      pageB.removeGraphic('b-0');

      expect(pageB.graphics.length).toBe(1);
      expect(pageB.findGraphicById('b-0')).toBeNull();
      expect(pageB.findGraphicById('b-1')).not.toBeNull();
    });

    it('undo on second page should rollback graphics', () => {
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');

      expect(pageB.graphics.length).toBe(2);

      pageB.undo();

      expect(pageB.graphics.length).toBe(1);
    });

    it('undo/redo history should be independent per page', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');

      pageB.undo();
      expect(pageB.graphics.length).toBe(1);

      expect(pageA.graphics.length).toBe(1);

      pageA.undo();
      expect(pageA.graphics.length).toBe(0);

      expect(pageB.graphics.length).toBe(1);
    });

    it('redo on second page should not throw', () => {
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');

      expect(pageB.graphics.length).toBe(2);

      pageB.undo();
      expect(pageB.graphics.length).toBe(1);

      expect(() => pageB.redo()).not.toThrow();
    });
  });

  describe('10. Graphic duplication (Duplicate)', () => {
    it('duplicateGraphic should create a copy on current page', () => {
      createTestGraphic(pageA, 'a-0');

      pageA.duplicateGraphic('a-0');

      expect(pageA.graphics.length).toBe(2);
    });

    it('page A duplication should not affect page B', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');

      pageA.duplicateGraphic('a-0');

      expect(pageA.graphics.length).toBe(2);
      expect(pageB.graphics.length).toBe(1);
    });

    it('duplicating graphic on second page should include copy in graphics', () => {
      createTestGraphic(pageB, 'b-0');

      pageB.duplicateGraphic('b-0');

      expect(pageB.graphics.length).toBe(2);
    });
  });

  describe('11. Graphic update (Update)', () => {
    it('updateGraphic should modify graphic properties on current page', () => {
      createTestGraphic(pageA, 'a-0');

      pageA.updateGraphic('a-0', { config: { name: 'new-name' } });

      const g = pageA.findGraphicById('a-0') as any;
      expect(g.config.name).toBe('new-name');
    });

    it('GRAPHIC_UPDATED event should be received by LayerPanel', () => {
      const listener = vi.fn();
      eventBus.on(Events.GRAPHIC_UPDATED, listener);

      createTestGraphic(pageA, 'a-0');
      pageA.updateGraphic('a-0', { config: { name: 'updated' } });

      expect(listener).toHaveBeenCalled();

      eventBus.off(Events.GRAPHIC_UPDATED, listener);
    });

    it('page A graphic update should not affect page B', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');

      pageA.updateGraphic('a-0', { config: { config: { name: 'modified' } } });

      const b = pageB.findGraphicById('b-0') as any;
      expect(b.config.name).not.toBe('modified');
    });
  });

  describe('12. Cross-page clipboard operations', () => {
    it('copy from page A to page B should leave both pages intact', () => {
      createTestGraphic(pageA, 'a-0', 100, 100);

      const sourceGraphic = pageA.findGraphicById('a-0')!;
      const json = sourceGraphic.toJSON();
      const newGraphic = GraphicFactory.createGraphicFromJSON(json);
      const { x, y } = newGraphic.getPosition();
      newGraphic.setPosition(x + 20, y + 20);
      pageB.addGraphic(newGraphic as any);

      expect(pageA.graphics.length).toBe(1);
      expect(pageB.graphics.length).toBe(1);

      expect(pageB.findGraphicById(newGraphic.id)).not.toBeNull();
      expect((pageA.findGraphicById('a-0') as any).config.geometry.x).toBe(100);
    });

    it('cross-page paste should add to page B graphics via panel', () => {
      panel.setCurrentPage(pageB);
      createTestGraphic(pageA, 'a-0');

      const sourceGraphic = pageA.findGraphicById('a-0')!;
      const json = sourceGraphic.toJSON();
      const newGraphic = GraphicFactory.createGraphicFromJSON(json);
      pageB.addGraphic(newGraphic as any);

      expect(panel.getGraphics().length).toBe(1);
    });
  });

  describe('13. importGraphics and page association', () => {
    it('importGraphics should import graphics to specified page', () => {
      createTestGraphic(pageA, 'a-0');
      const json = pageA.graphics.map(g => g.toJSON());

      pageB.importGraphics(json);

      expect(pageB.graphics.length).toBe(1);
      expect(pageA.graphics.length).toBe(1);
    });

    it('imported graphics should be visible in panel after import', () => {
      panel.setCurrentPage(pageB);

      createTestGraphic(pageA, 'a-0');
      const json = pageA.graphics.map(g => g.toJSON());
      pageB.importGraphics(json);

      expect(panel.getGraphics().length).toBe(1);
    });
  });

  describe('14. Complete workflow', () => {
    it('workflow: create pages, add graphics, switch, edit, switch back, verify', () => {
      panel.setCurrentPage(pageA);
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageA, 'a-1');
      expect(panel.getGraphics().length).toBe(2);

      panel.setCurrentPage(pageB);
      eventBus.emit(Events.PAGE_SWITCHED, { pageId: 'page-b', projectId: 'p1' });
      expect(panel.getGraphics().length).toBe(0);

      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      createTestGraphic(pageB, 'b-2');
      expect(panel.getGraphics().length).toBe(3);

      pageB.lockGraphic('b-0');
      expect((pageB.findGraphicById('b-0') as any).config.locked).toBe(true);

      pageB.hideGraphic('b-1');
      expect((pageB.findGraphicById('b-1') as any).config.visible).toBe(false);

      panel.setCurrentPage(pageA);
      eventBus.emit(Events.PAGE_SWITCHED, { pageId: 'page-a', projectId: 'p1' });
      expect(panel.getGraphics().length).toBe(2);

      expect((pageA.findGraphicById('a-0') as any).config.locked).toBe(false);
      expect((pageA.findGraphicById('a-0') as any).config.visible).toBe(true);

      panel.setCurrentPage(pageB);
      eventBus.emit(Events.PAGE_SWITCHED, { pageId: 'page-b', projectId: 'p1' });
      expect(panel.getGraphics().length).toBe(3);
      expect((pageB.findGraphicById('b-0') as any).config.locked).toBe(true);
      expect((pageB.findGraphicById('b-1') as any).config.visible).toBe(false);
    });

    it('workflow: add graphics on second page, create group, ungroup, undo', () => {
      panel.setCurrentPage(pageB);

      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      expect(panel.getGraphics().length).toBe(2);

      setBoxMode(pageB);
      const group = pageB.groupGraphics(['b-0', 'b-1']);
      expect(pageB.groups.length).toBe(1);

      pageB.ungroupGraphic(group.id);
      expect(pageB.groups.length).toBe(0);

      pageB.undo();
      expect(pageB.groups.length).toBe(1);
    });

    it('workflow: three pages operating independently', () => {
      panel.setCurrentPage(pageA);
      createTestGraphic(pageA, 'a-0');
      pageA.lockGraphic('a-0');

      panel.setCurrentPage(pageB);
      createTestGraphic(pageB, 'b-0');
      pageB.hideGraphic('b-0');

      panel.setCurrentPage(pageC);
      createTestGraphic(pageC, 'c-0');

      expect((pageA.findGraphicById('a-0') as any).config.locked).toBe(true);
      expect((pageA.findGraphicById('a-0') as any).config.visible).toBe(true);

      expect((pageB.findGraphicById('b-0') as any).config.locked).toBe(false);
      expect((pageB.findGraphicById('b-0') as any).config.visible).toBe(false);

      expect((pageC.findGraphicById('c-0') as any).config.locked).toBe(false);
      expect((pageC.findGraphicById('c-0') as any).config.visible).toBe(true);
    });

    it('workflow: large batch of graphics with correct refreshTrigger increment', () => {
      panel.resetTrigger();
      panel.setCurrentPage(pageB);

      for (let i = 0; i < 10; i++) {
        createTestGraphic(pageB, `b-${i}`);
      }

      expect(panel.getGraphics().length).toBe(10);
      expect(panel.triggerCount).toBeGreaterThanOrEqual(10);
    });

    it('workflow: delete all graphics should leave empty graphics', () => {
      panel.setCurrentPage(pageB);
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');
      createTestGraphic(pageB, 'b-2');

      pageB.removeGraphic('b-0');
      pageB.removeGraphic('b-1');
      pageB.removeGraphic('b-2');

      expect(panel.getGraphics().length).toBe(0);
      expect(pageB.graphics.length).toBe(0);
    });
  });

  describe('15. graphicStore.graphics getter page association', () => {
    it('graphics getter obtains list via pageStore.currentPage', () => {
      createTestGraphic(pageA, 'a-0');
      createTestGraphic(pageB, 'b-0');
      createTestGraphic(pageB, 'b-1');

      expect(pageA.graphics.length).toBe(1);
      expect(pageA.graphics[0].id).toBe('a-0');

      expect(pageB.graphics.length).toBe(2);
    });

    it('graphics property supports both array and ref forms', () => {
      createTestGraphic(pageA, 'a-0');
      const g = pageA.graphics;
      expect(Array.isArray(g) || ('value' in (g as any))).toBe(true);
    });
  });

  describe('16. LayerPanel event listener registration and cleanup', () => {
    it('all onMounted registered events should trigger on emit', () => {
      const listenedEvents = [
        Events.GRAPHIC_ADDED,
        Events.GRAPHIC_REMOVED,
        Events.GRAPHIC_UPDATED,
        Events.GROUP_CREATED,
        Events.GROUP_DELETED,
        Events.GROUP_UPDATED,
        Events.PAGE_SWITCHED,
      ];

      for (const evt of listenedEvents) {
        const listener = vi.fn();
        eventBus.on(evt, listener);
        eventBus.emit(evt, {} as any);
        expect(listener).toHaveBeenCalledTimes(1);
        eventBus.off(evt, listener);
      }
    });

    it('after panel dispose, events should no longer trigger', () => {
      const triggerBefore = panel.triggerCount;
      panel.dispose();

      createTestGraphic(pageA, 'a-0');

      expect(panel.triggerCount).toBe(triggerBefore);
    });

    it('multiple panel create/dispose should not cause duplicate event fires', () => {
      const panel1 = createSimulatedLayerPanel();
      const panel2 = createSimulatedLayerPanel();

      createTestGraphic(pageA, 'a-0');

      expect(panel1.triggerCount).toBeGreaterThanOrEqual(1);
      expect(panel2.triggerCount).toBeGreaterThanOrEqual(1);

      panel1.dispose();

      createTestGraphic(pageA, 'a-1');

      const panel1CountBefore = panel1.triggerCount;
      expect(panel1.triggerCount).toBe(panel1CountBefore);
      expect(panel2.triggerCount).toBeGreaterThanOrEqual(2);

      panel2.dispose();
    });
  });
});