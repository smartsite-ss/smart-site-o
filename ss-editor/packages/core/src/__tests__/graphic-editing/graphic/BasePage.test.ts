// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { BasePage } from '../../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';
import { SelectionMode } from '../../../types';

class TestShape extends BaseGraphic {
  static defaultWidth = 100;
  static defaultHeight = 80;

  constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 80) {
    super('test-shape', x, y, width, height);
  }

  draw(_ctx: CanvasRenderingContext2D): void {}
}

function createPage(): BasePage {
  const page = new BasePage();
  page.init({ id: 'test-page', name: 'Test Page', width: 1920, height: 1080 });
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

function setBoxMode(page: BasePage): void {
  (page as any).selectionManager.setMode(SelectionMode.BOX);
}

describe('BasePage', () => {
  let page: BasePage;

  beforeAll(() => {
    if (!GraphicFactory.hasGraphic('test-shape')) {
      GraphicFactory.registerGraphic('test-shape', TestShape, 'Test Shape', 'test');
    }
  });

  afterAll(() => {
    GraphicFactory.unregisterGraphic('test-shape');
  });

  beforeEach(() => {
    page = createPage();
  });

  describe('init', () => {
    it('should initialize with default values', () => {
      const p = new BasePage();
      expect(p.id).toBeTruthy();
      expect(p.name).toBe('New Page');
      expect(p.width).toBe(1920);
      expect(p.height).toBe(1080);
      expect(p.scale).toBe(100);
    });

    it('should initialize with custom options', () => {
      expect(page.id).toBe('test-page');
      expect(page.name).toBe('Test Page');
      expect(page.width).toBe(1920);
      expect(page.height).toBe(1080);
    });

    it('should clamp scale to valid range', () => {
      page.init({ scale: 5 });
      expect(page.scale).toBe(10);
      page.init({ scale: 300 });
      expect(page.scale).toBe(200);
    });
  });

  describe('addGraphic / removeGraphic / findGraphicById', () => {
    it('should add graphic to page', () => {
      const g = new TestShape(0, 0, 100, 80);
      g.id = 'g1';
      page.addGraphic(g as any);
      expect(page.graphics.length).toBe(1);
      expect(page.findGraphicById('g1')).toBe(g);
    });

    it('should auto-assign zIndex when adding', () => {
      addGraphics(page, 3);
      expect(page.graphics[0].config.zIndex).toBe(0);
      expect(page.graphics[1].config.zIndex).toBe(1);
      expect(page.graphics[2].config.zIndex).toBe(2);
    });

    it('should remove graphic by id', () => {
      addGraphics(page, 3);
      page.removeGraphic('g-1');
      expect(page.graphics.length).toBe(2);
      expect(page.findGraphicById('g-1')).toBeNull();
    });

    it('should handle removing non-existent graphic gracefully', () => {
      addGraphics(page, 2);
      page.removeGraphic('nonexistent');
      expect(page.graphics.length).toBe(2);
    });

    it('should get graphics via getGraphics (return copy)', () => {
      addGraphics(page, 2);
      const graphics = page.getGraphics();
      expect(graphics.length).toBe(2);
      graphics.push(new TestShape(0, 0) as any);
      expect(page.graphics.length).toBe(2);
    });

    it('should find graphic by id or return null', () => {
      addGraphics(page, 2);
      expect(page.findGraphicById('nonexistent')).toBeNull();
    });
  });

  describe('lock / unlock / toggleLock', () => {
    it('should lock and unlock a graphic', () => {
      addGraphics(page, 1);
      page.lockGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.locked).toBe(true);
      page.unlockGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.locked).toBe(false);
    });

    it('should toggle lock state', () => {
      addGraphics(page, 1);
      page.toggleGraphicLock('g-0');
      expect(page.findGraphicById('g-0')?.config.locked).toBe(true);
      page.toggleGraphicLock('g-0');
      expect(page.findGraphicById('g-0')?.config.locked).toBe(false);
    });
  });

  describe('show / hide / toggleVisibility', () => {
    it('should show and hide a graphic', () => {
      addGraphics(page, 1);
      page.hideGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.visible).toBe(false);
      page.showGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.visible).toBe(true);
    });

    it('should toggle visibility', () => {
      addGraphics(page, 1);
      page.toggleGraphicVisibility('g-0');
      expect(page.findGraphicById('g-0')?.config.visible).toBe(false);
      page.toggleGraphicVisibility('g-0');
      expect(page.findGraphicById('g-0')?.config.visible).toBe(true);
    });
  });

  describe('selection', () => {
    it('should select single graphic', () => {
      addGraphics(page, 5);
      page.selectGraphic('g-2');
      expect(page.selectedGraphicId).toBe('g-2');
      expect(page.selectedGraphicIds).toEqual(['g-2']);
    });

    it('should clear selection', () => {
      addGraphics(page, 5);
      page.selectGraphic('g-2');
      page.clearSelection();
      expect(page.selectedGraphicId).toBeNull();
      expect(page.selectedGraphicIds).toEqual([]);
    });

    it('should add and remove from selection', () => {
      addGraphics(page, 5);
      page.selectGraphic('g-0');
      page.addToSelection('g-1');
      expect(page.selectedGraphicIds).toContain('g-0');
      expect(page.selectedGraphicIds).toContain('g-1');
      page.removeFromSelection('g-0');
      expect(page.selectedGraphicIds).not.toContain('g-0');
    });

    it('should select multiple graphics in BOX mode', () => {
      addGraphics(page, 5);
      setBoxMode(page);
      page.selectMultipleGraphics(['g-0', 'g-2', 'g-4']);
      expect(page.selectedGraphicIds.length).toBe(3);
    });
  });

  describe('moveGraphic', () => {
    it('should move graphic to new position', () => {
      addGraphics(page, 1);
      page.moveGraphic('g-0', 500, 600);
      const g = page.findGraphicById('g-0') as any;
      expect(g.config.geometry.x).toBe(500);
      expect(g.config.geometry.y).toBe(600);
    });

    it('should not move locked graphic', () => {
      addGraphics(page, 1);
      page.lockGraphic('g-0');
      page.moveGraphic('g-0', 500, 600);
      const g = page.findGraphicById('g-0') as any;
      expect(g.config.geometry.x).toBe(0);
    });
  });

  describe('resizeGraphic', () => {
    it('should resize graphic', () => {
      addGraphics(page, 1);
      page.resizeGraphic('g-0', 200, 150);
      const g = page.findGraphicById('g-0') as any;
      expect(g.config.geometry.width).toBe(200);
      expect(g.config.geometry.height).toBe(150);
    });

    it('should not resize locked graphic', () => {
      addGraphics(page, 1);
      page.lockGraphic('g-0');
      page.resizeGraphic('g-0', 200, 150);
      const g = page.findGraphicById('g-0') as any;
      expect(g.config.geometry.width).toBe(100);
    });
  });

  describe('duplicateGraphic', () => {
    it('should duplicate a graphic with offset', () => {
      addGraphics(page, 1);
      const original = page.findGraphicById('g-0') as any;
      const originalX = original.config.geometry.x;
      const originalY = original.config.geometry.y;

      const duplicate = page.duplicateGraphic('g-0');
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).not.toBe('g-0');

      const dupPos = (duplicate as any).config.geometry;
      expect(dupPos.x).toBe(originalX + 20);
      expect(dupPos.y).toBe(originalY + 20);
    });

    it('should return null for non-existent graphic', () => {
      const result = page.duplicateGraphic('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('duplicateGroup', () => {
    it('should duplicate a group with all members', () => {
      addGraphics(page, 3);
      const group = page.groupGraphics(['g-0', 'g-1', 'g-2']);
      expect(group).not.toBeNull();

      const result = page.duplicateGroup(group.id);
      expect(result).not.toBeNull();
      expect(result!.groupId).toBeTruthy();
      expect(result!.groupId).not.toBe(group.id);
      expect(result!.memberIds).toHaveLength(3);
      expect(result!.memberIds).not.toContain('g-0');
      expect(result!.memberIds).not.toContain('g-1');
      expect(result!.memberIds).not.toContain('g-2');
    });

    it('should offset all members by DUPLICATE_OFFSET (20px)', () => {
      addGraphics(page, 2);
      const g0 = page.findGraphicById('g-0') as any;
      const origX0 = g0.config.geometry.x;
      const origY0 = g0.config.geometry.y;

      const group = page.groupGraphics(['g-0', 'g-1']);
      const result = page.duplicateGroup(group.id);
      expect(result).not.toBeNull();

      const newG0 = page.findGraphicById(result!.memberIds[0]) as any;
      expect(newG0.config.geometry.x).toBe(origX0 + 20);
      expect(newG0.config.geometry.y).toBe(origY0 + 20);
    });

    it('should create new group with name "Copy" suffix', () => {
      addGraphics(page, 2);
      const group = page.groupGraphics(['g-0', 'g-1']);
      expect(group).not.toBeNull();

      const result = page.duplicateGroup(group.id);
      expect(result).not.toBeNull();

      const groupManager = page.getGroupManager();
      const newGroup = groupManager.getGroup(result!.groupId);
      expect(newGroup).toBeDefined();
      expect(newGroup!.name).toContain('Copy');
    });

    it('should return null for non-existent group', () => {
      const result = page.duplicateGroup('no-such-group');
      expect(result).toBeNull();
    });

    it('should support nested group duplication', () => {
      addGraphics(page, 4);
      const parent = page.groupGraphics(['g-0', 'g-1']);
      const groupManager = page.getGroupManager();
      const child = groupManager.createGroup(['g-2', 'g-3'], 'Child', parent.id);
      expect(parent).not.toBeNull();
      expect(child).not.toBeNull();

      const result = page.duplicateGroup(parent.id);
      expect(result).not.toBeNull();
      expect(result!.memberIds.length).toBeGreaterThanOrEqual(2);
    });

    it('should support undo duplicateGroup', () => {
      addGraphics(page, 2);
      const group = page.groupGraphics(['g-0', 'g-1']);
      const groupsBefore = page.groups.length;

      const result = page.duplicateGroup(group.id);
      expect(result).not.toBeNull();
      expect(page.groups.length).toBe(groupsBefore + 1);

      page.undo();
      expect(page.groups.length).toBe(groupsBefore);
      expect(page.graphics.length).toBeGreaterThanOrEqual(2);
    });

    it('should support redo after undo duplicateGroup', () => {
      addGraphics(page, 2);
      const group = page.groupGraphics(['g-0', 'g-1']);
      page.duplicateGroup(group.id);
      const countAfterDuplicate = page.graphics.length;

      page.undo();
      page.redo();
      expect(page.graphics.length).toBe(countAfterDuplicate);
    });

    it('should duplicate empty group gracefully', () => {
      addGraphics(page, 1);
      const group = page.groupGraphics(['g-0']);
      expect(group).not.toBeNull();
      page.ungroupGraphic(group.id);

      const result = page.duplicateGroup(group.id);
      expect(result).toBeNull();
    });

    it('should clear old groupId on cloned graphics', () => {
      addGraphics(page, 2);
      const group = page.groupGraphics(['g-0', 'g-1']);
      const result = page.duplicateGroup(group.id);
      expect(result).not.toBeNull();

      const newGraphic = page.findGraphicById(result!.memberIds[0]) as any;
      expect(newGraphic.config.groupId).toBe(result!.groupId);
      expect(newGraphic.config.groupId).not.toBe(group.id);
      expect(newGraphic.config.isGroup).toBe(false);
      expect(newGraphic.config.groupMembers).toEqual([]);
    });

    it('should have correct GroupManager state after duplicate', () => {
      addGraphics(page, 2);
      const group = page.groupGraphics(['g-0', 'g-1']);
      const groupManager = page.getGroupManager();
      const allGroupsBefore = groupManager.getAllGroups().length;

      const result = page.duplicateGroup(group.id);
      expect(result).not.toBeNull();

      const allGroupsAfter = groupManager.getAllGroups().length;
      expect(allGroupsAfter).toBe(allGroupsBefore + 1);

      const newGroup = groupManager.getGroup(result!.groupId);
      expect(newGroup).toBeDefined();
      expect(newGroup!.children.length).toBe(2);
      for (const memberId of result!.memberIds) {
        expect(newGroup!.children).toContain(memberId);
      }
      for (const memberId of result!.memberIds) {
        const foundGroup = groupManager.getGroupForGraphic(memberId);
        expect(foundGroup).toBeDefined();
        expect(foundGroup!.id).toBe(result!.groupId);
      }
    });
  });

  describe('undo / redo', () => {
    it('should undo graphic addition', () => {
      addGraphics(page, 1);
      expect(page.graphics.length).toBe(1);
      expect(page.canUndo()).toBe(true);

      page.undo();
      expect(page.graphics.length).toBe(0);
      expect(page.canRedo()).toBe(true);
    });
  });

  describe('layer management', () => {
    it('should bring graphic to front', () => {
      addGraphics(page, 3);
      page.bringToFront('g-0');
      expect(page.graphics[0].config.zIndex).toBe(3);
    });

    it('should send graphic to back', () => {
      addGraphics(page, 3);
      page.sendToBack('g-2');
      expect(page.graphics[2].config.zIndex).toBe(-1);
    });

    it('should bring graphic forward', () => {
      addGraphics(page, 3);
      page.bringForward('g-0');
      expect(page.graphics[0].config.zIndex).toBe(1);
    });

    it('should send graphic backward', () => {
      addGraphics(page, 3);
      page.sendBackward('g-2');
      expect(page.graphics[2].config.zIndex).toBe(1);
    });

    it('should get sorted graphics', () => {
      addGraphics(page, 3);
      const sorted = page.getSortedGraphics();
      expect(sorted.length).toBe(3);
    });
  });

  describe('importGraphics / exportGraphics', () => {
    it('should export graphics as JSON array', () => {
      addGraphics(page, 3);
      const exported = page.exportGraphics();
      expect(exported.length).toBe(3);
      expect(exported[0]).toHaveProperty('id');
      expect(exported[0]).toHaveProperty('config');
    });

    it('should import graphics from JSON array', () => {
      const g = new TestShape(10, 20, 100, 80);
      g.id = 'import-g';
      page.addGraphic(g as any);
      const exported = page.exportGraphics();

      const p2 = createPage();
      p2.importGraphics(exported);
      expect(p2.graphics.length).toBe(1);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should serialize to JSON', () => {
      addGraphics(page, 2);
      const json = page.toJSON();
      expect(json.id).toBe('test-page');
      expect(json.name).toBe('Test Page');
      expect(json.width).toBe(1920);
      expect(json.graphics.length).toBe(2);
    });

    it('should deserialize from JSON', () => {
      addGraphics(page, 2);
      const json = page.toJSON();

      const p2 = createPage();
      p2.fromJSON(json);
      expect(p2.graphics.length).toBe(2);
      expect(json.graphics[0].config.geometry.x).toBe(0);
    });

    it('should serialize fitMode in toJSON', () => {
      page.setFitMode('stretch');
      const json = page.toJSON();
      expect(json.fitMode).toBe('stretch');
    });

    it('should deserialize fitMode in fromJSON', () => {
      page.setFitMode('fitHeight');
      const json = page.toJSON();

      const p2 = createPage();
      p2.fromJSON(json);
      expect(p2.getFitMode()).toBe('fitHeight');
    });

    it('should default fitMode to auto when not present in JSON', () => {
      const json = page.toJSON();
      delete (json as any).fitMode;

      const p2 = createPage();
      p2.fromJSON(json);
      expect(p2.getFitMode()).toBe('auto');
    });
  });

  describe('clone', () => {
    it('should clone page with all graphics', () => {
      addGraphics(page, 3);
      const cloned = page.clone();
      expect(cloned.id).not.toBe(page.id);
      expect(cloned.name).toContain('Copy');
      expect(cloned.graphics.length).toBe(3);
    });
  });

  describe('groupGraphics / ungroupGraphic', () => {
    it('should group multiple graphics', () => {
      addGraphics(page, 3);
      const group = page.groupGraphics(['g-0', 'g-1']);
      expect(group).not.toBeNull();
      expect(page.groups.length).toBe(1);
    });

    it('should ungroup graphics', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1']);
      page.ungroupGraphic(page.groups[0].id);
      expect(page.groups.length).toBe(0);
    });

    it('should select all members after grouping', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1', 'g-2']);
      expect(page.selectedGraphicIds).toHaveLength(3);
      expect(page.selectedGraphicIds).toContain('g-0');
      expect(page.selectedGraphicIds).toContain('g-1');
      expect(page.selectedGraphicIds).toContain('g-2');
    });

    it('should select all members after ungroup', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1', 'g-2']);
      page.ungroupGraphic(page.groups[0].id);
      expect(page.selectedGraphicIds).toHaveLength(3);
    });

    it('should return non-null when grouping a single graphic', () => {
      addGraphics(page, 1);
      const group = page.groupGraphics(['g-0']);
      expect(group).not.toBeNull();
    });

    it('should support undo groupGraphics', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1']);
      expect(page.groups.length).toBe(1);
      page.undo();
      expect(page.groups.length).toBe(0);
    });

    it('should support undo ungroupGraphic', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1', 'g-2']);
      page.ungroupGraphic(page.groups[0].id);
      expect(page.groups.length).toBe(0);
      page.undo();
      expect(page.groups.length).toBe(1);
    });

    it('should support nested grouping', () => {
      addGraphics(page, 4);
      const parent = page.groupGraphics(['g-0', 'g-1']);
      const child = page.groupGraphics(['g-2', 'g-3']);
      expect(parent).not.toBeNull();
      expect(child).not.toBeNull();
      expect(page.groups.length).toBe(2);
    });
  });

  describe('selectGroupMembers', () => {
    it('should select all members of a group', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1', 'g-2']);
      page.clearSelection();
      expect(page.selectedGraphicIds).toHaveLength(0);

      page.selectGroupMembers(page.groups[0].id);
      expect(page.selectedGraphicIds).toHaveLength(3);
    });
  });

  describe('removeFromGroup / addToGroup (page-level)', () => {
    it('should remove graphic from group via page', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1', 'g-2']);
      page.removeFromGroup('g-0');
      const members = page.getGroupManager().getGroupMembers(page.groups[0].id);
      expect(members.map((m: any) => m.id)).not.toContain('g-0');
    });

    it('should add graphic to existing group via page', () => {
      addGraphics(page, 3);
      page.groupGraphics(['g-0', 'g-1']);
      page.addToGroup('g-2', page.groups[0].id);
      const members = page.getGroupManager().getGroupMembers(page.groups[0].id);
      expect(members.map((m: any) => m.id)).toContain('g-2');
    });
  });

  describe('alignGraphics / distributeGraphics', () => {
    it('should align graphics left in BOX mode', () => {
      addGraphics(page, 3);
      setBoxMode(page);
      page.selectMultipleGraphics(['g-0', 'g-1', 'g-2']);
      page.alignGraphics('left');
      const x0 = (page.findGraphicById('g-0') as any).config.geometry.x;
      const x2 = (page.findGraphicById('g-2') as any).config.geometry.x;
      expect(x0).toBe(x2);
    });

    it('should distribute graphics horizontally', () => {
      addGraphics(page, 4);
      setBoxMode(page);
      page.selectMultipleGraphics(['g-0', 'g-1', 'g-2', 'g-3']);
      page.distributeGraphics('horizontal');
      const positions = ['g-0', 'g-1', 'g-2', 'g-3'].map(id =>
        (page.findGraphicById(id) as any).config.geometry.x
      );
      positions.forEach(pos => expect(pos).toBeGreaterThanOrEqual(0));
    });
  });

  describe('grid snap', () => {
    it('should set grid snap config', () => {
      page.setGridSnapConfig({ enabled: true, gridSize: 50 });
      const config = page.getGridSnapConfig();
      expect(config.gridSize).toBe(50);
    });

    it('should snap position to grid', () => {
      page.setGridSnapConfig({ enabled: true, gridSize: 20 });
      const result = page.snapPosition(33, 47);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });
  });

  describe('smart align', () => {
    it('should set align distance', () => {
      page.setAlignDistance(10);
      expect(page.getSmartAlignManager()).toBeDefined();
    });

    it('should align to page edge', () => {
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0') as any;
      g.config.geometry.x = 100;
      page.alignToPageEdge([g as any], 'left');
      expect(g.config.geometry.x).toBe(0);
    });

    it('should center on page', () => {
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0') as any;
      g.config.geometry.width = 200;
      page.centerOnPage([g as any], 'both');
      expect(g.config.geometry.x).toBe((1920 - 200) / 2);
    });
  });

  describe('timer management', () => {
    it('should add timer', () => {
      const timer = page.addTimer({
        name: 'Test Timer',
        type: 'interval',
        interval: 1000,
        script: 'console.log("test")',
        enabled: true,
      });
      expect(timer.id).toBeTruthy();
    });

    it('should get timer by id', () => {
      const timer = page.addTimer({
        name: 'Test', type: 'interval', interval: 1000, script: '', enabled: true,
      });
      const found = page.getTimer(timer.id);
      expect(found).not.toBeNull();
    });

    it('should remove timer', () => {
      const timer = page.addTimer({
        name: 'Test', type: 'interval', interval: 1000, script: '', enabled: true,
      });
      page.removeTimer(timer.id);
      expect(page.getTimer(timer.id)).toBeNull();
    });

    it('should enable and disable timer', () => {
      const timer = page.addTimer({
        name: 'Test', type: 'interval', interval: 1000, script: '', enabled: true,
      });
      page.disableTimer(timer.id);
      expect(page.getTimer(timer.id)?.enabled).toBe(false);
      page.enableTimer(timer.id);
      expect(page.getTimer(timer.id)?.enabled).toBe(true);
    });

    it('should get all timers', () => {
      page.addTimer({ name: 'T1', type: 'interval', interval: 1000, script: '', enabled: true });
      page.addTimer({ name: 'T2', type: 'interval', interval: 2000, script: '', enabled: false });
      const all = page.getAllTimers();
      expect(all.length).toBe(2);
    });
  });

  describe('fit mode', () => {
    it('should set and get fit mode', () => {
      page.setFitMode('contain');
      expect(page.getFitMode()).toBe('contain');
    });

    it('should auto fit based on viewport and content', () => {
      page.autoFit(1920, 1080);
      expect(page.scale).toBeGreaterThan(0);
    });

    it('should auto fit to graphics bounds', () => {
      addGraphics(page, 2);
      page.autoFitToGraphics(1920, 1080);
      expect(page.scale).toBeGreaterThan(0);
    });

    it('should reset fit mode to default', () => {
      page.setFitMode('stretch');
      page.resetFitMode();
      expect(page.getFitMode()).toBe('contain');
    });
  });

  describe('deleteSelectedGraphics', () => {
    it('should delete all selected graphics in BOX mode', () => {
      addGraphics(page, 5);
      setBoxMode(page);
      page.selectMultipleGraphics(['g-0', 'g-2', 'g-4']);
      page.deleteSelectedGraphics();
      expect(page.graphics.length).toBe(2);
      expect(page.findGraphicById('g-0')).toBeNull();
      expect(page.findGraphicById('g-1')).not.toBeNull();
    });

    it('should do nothing when nothing is selected', () => {
      addGraphics(page, 3);
      page.deleteSelectedGraphics();
      expect(page.graphics.length).toBe(3);
    });
  });

  describe('cutSelectedGraphics', () => {
    it('should cut selected graphics', () => {
      addGraphics(page, 5);
      setBoxMode(page);
      page.selectMultipleGraphics(['g-0', 'g-1']);
      const cut = page.cutSelectedGraphics();
      expect(cut.length).toBe(2);
      expect(page.graphics.length).toBe(3);
    });
  });

  describe('batch operations', () => {
    it('should batch move selected graphics', () => {
      addGraphics(page, 3);
      setBoxMode(page);
      page.selectMultipleGraphics(['g-0', 'g-1', 'g-2']);
      page.batchMove(50, 30);
      const g0 = page.findGraphicById('g-0') as any;
      expect(g0.config.geometry.x).toBe(50);
      expect(g0.config.geometry.y).toBe(130);
    });

    it('should batch apply style to selected graphics', () => {
      addGraphics(page, 3);
      setBoxMode(page);
      page.selectMultipleGraphics(['g-0', 'g-1']);
      page.batchApplyStyle({ backgroundColor: '#FF0000' });
      const g0 = page.findGraphicById('g-0') as any;
      expect(g0.config.style.backgroundColor).toBe('#FF0000');
    });
  });

  describe('guide lines', () => {
    it('should add and remove guide line', () => {
      const id = page.addGuideLine(500, 'horizontal');
      expect(id).toBeTruthy();
      expect(page.guideLines.length).toBe(1);
      page.removeGuideLine(id);
      expect(page.getAllGuideLines().length).toBe(0);
    });

    it('should clear all guide lines', () => {
      page.addGuideLine(100, 'horizontal');
      page.addGuideLine(200, 'vertical');
      page.addGuideLine(300, 'horizontal');
      page.clearAllGuideLines();
      expect(page.getAllGuideLines().length).toBe(0);
    });
  });

  describe('hasSelectedGraphics / hasMultipleSelectedGraphics', () => {
    it('should detect selection state', () => {
      addGraphics(page, 3);
      expect(page.hasSelectedGraphics()).toBe(false);
      expect(page.hasMultipleSelectedGraphics()).toBe(false);
      page.selectGraphic('g-0');
      expect(page.hasSelectedGraphics()).toBe(true);
      expect(page.hasMultipleSelectedGraphics()).toBe(false);
      page.addToSelection('g-1');
      expect(page.hasMultipleSelectedGraphics()).toBe(true);
    });
  });

  describe('SSOT: Manager single source of truth', () => {
    it('timers getter should delegate to TimerManager', () => {
      const timer = page.addTimer({
        name: 'SSOT Timer',
        type: 'interval',
        interval: 1000,
        script: 'test',
        enabled: true,
      });
      const timers = page.timers;
      expect(timers).toBeDefined();
      expect(timers.find((t: any) => t.id === timer.id)).toBeTruthy();
    });

    it('groups getter should delegate to GroupManager', () => {
      addGraphics(page, 3);
      const group = page.groupGraphics(['g-0', 'g-1', 'g-2']);
      const groups = page.groups;
      expect(groups).toBeDefined();
      expect(groups.find((g: any) => g.id === group.id)).toBeTruthy();
    });

    it('guideLines getter should delegate to SmartAlignManager', () => {
      page.addGuideLine(100, 'horizontal');
      page.addGuideLine(200, 'vertical');
      const guideLines = page.guideLines;
      expect(guideLines.length).toBe(2);
    });

    it('manager accessors should return the same instance', () => {
      const tm1 = page.getTimerManager();
      const tm2 = page.getTimerManager();
      expect(tm1).toBe(tm2);

      const gm1 = page.getGroupManager();
      const gm2 = page.getGroupManager();
      expect(gm1).toBe(gm2);

      const sm1 = page.getSmartAlignManager();
      const sm2 = page.getSmartAlignManager();
      expect(sm1).toBe(sm2);
    });

    it('_setGraphicFlag should correctly set lock flag', () => {
      addGraphics(page, 1);
      page.lockGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.locked).toBe(true);
      page.unlockGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.locked).toBe(false);
    });

    it('_setGraphicFlag should correctly set visible flag', () => {
      addGraphics(page, 1);
      page.hideGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.visible).toBe(false);
      page.showGraphic('g-0');
      expect(page.findGraphicById('g-0')?.config.visible).toBe(true);
    });

    it('addGraphic should trigger events via Manager (SSOT)', () => {
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0');
      expect(g?.config.zIndex).toBe(0);
    });

    it('removeGraphic should correctly clean up via Manager', () => {
      addGraphics(page, 3);
      const initialCount = page.graphics.length;
      page.removeGraphic('g-1');
      expect(page.graphics.length).toBe(initialCount - 1);
      expect(page.findGraphicById('g-1')).toBeNull();
    });
  });

  describe('lifecycle hooks', () => {
    it('onMounted should be called after addGraphic', () => {
      const mounted = vi.fn();
      const g = new TestShape(0, 0) as any;
      g.id = 'g-hook';
      g.onMounted = mounted;
      page.addGraphic(g);
      expect(mounted).toHaveBeenCalledTimes(1);
    });

    it('onUnmounted should be called before removeGraphic with pageContext available', () => {
      const unmounted = vi.fn();
      const g = new TestShape(0, 0) as any;
      g.id = 'g-unhook';
      g.onUnmounted = unmounted;
      page.addGraphic(g);
      page.removeGraphic('g-unhook');
      expect(unmounted).toHaveBeenCalledTimes(1);
    });

    it('onPropertyChanged should be called after moveGraphic', () => {
      const changed = vi.fn();
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0') as any;
      g.onPropertyChanged = changed;
      page.moveGraphic('g-0', 50, 60);
      expect(changed).toHaveBeenCalledTimes(1);
      expect(changed).toHaveBeenCalledWith(expect.objectContaining({ geometry: { x: 50, y: 60 } }));
    });

    it('onResize should be called after resizeGraphic', () => {
      const resized = vi.fn();
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0') as any;
      g.onResize = resized;
      page.resizeGraphic('g-0', 200, 100);
      expect(resized).toHaveBeenCalledWith(200, 100);
    });

    it('onVisibilityChanged should be called on hideGraphic/showGraphic', () => {
      const visibilityChanged = vi.fn();
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0') as any;
      g.onVisibilityChanged = visibilityChanged;

      page.hideGraphic('g-0');
      expect(visibilityChanged).toHaveBeenCalledWith(false);

      page.showGraphic('g-0');
      expect(visibilityChanged).toHaveBeenCalledWith(true);
    });

    it('locking graphic should trigger onPropertyChanged({locked})', () => {
      const changed = vi.fn();
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0') as any;
      g.onPropertyChanged = changed;

      page.lockGraphic('g-0');
      expect(changed).toHaveBeenCalledWith({ locked: true });

      page.unlockGraphic('g-0');
      expect(changed).toHaveBeenCalledWith({ locked: false });
    });

    it('updateGraphic should trigger onPropertyChanged with customProps', () => {
      const changed = vi.fn();
      addGraphics(page, 1);
      const g = page.findGraphicById('g-0') as any;
      g.onPropertyChanged = changed;

      page.updateGraphic('g-0', { status: 'running' });
      expect(changed).toHaveBeenCalledTimes(1);
    });

    it('missing hooks should not throw errors (optional hooks)', () => {
      addGraphics(page, 1);
      page.moveGraphic('g-0', 10, 20);
      page.removeGraphic('g-0');
      expect(true).toBe(true);
    });
  });
});