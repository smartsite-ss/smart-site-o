// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { GroupManager } from '../../../graphic-editing/managers/GroupManager';

class TestGraphic {
  id: string;
  _x: number;
  _y: number;
  _width: number;
  _height: number;
  _locked: boolean = false;
  _visible: boolean = true;
  _rotation: number = 0;

  constructor(x: number, y: number, w: number, h: number) {
    this.id = `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._x = x;
    this._y = y;
    this._width = w;
    this._height = h;
  }

  getPosition() { return { x: this._x, y: this._y }; }
  setPosition(x: number, y: number) { this._x = x; this._y = y; }
  getSize() { return { width: this._width, height: this._height }; }
  setSize(w: number, h: number) { this._width = w; this._height = h; }
  setLocked(v: boolean) { this._locked = v; }
  setVisible(v: boolean) { this._visible = v; }
  toJSON() { return { id: this.id, x: this._x, y: this._y, width: this._width, height: this._height }; }
  get config() {
    const self = this;
    return {
      geometry: {
        get rotation() { return self._rotation; },
        set rotation(v: number) { self._rotation = v; },
        get x() { return self._x; },
        set x(v: number) { self._x = v; },
        get y() { return self._y; },
        set y(v: number) { self._y = v; },
        get width() { return self._width; },
        set width(v: number) { self._width = v; },
        get height() { return self._height; },
        set height(v: number) { self._height = v; },
      }
    };
  }
}

function makeGraphics(count: number): TestGraphic[] {
  return Array.from({ length: count }, (_, i) => new TestGraphic(i * 60, 100, 50, 50));
}

function makeGraphicMap(graphics: TestGraphic[]): Map<string, TestGraphic> {
  return new Map(graphics.map(g => [g.id, g as unknown as TestGraphic]));
}

function setupManager() {
  const mgr = new GroupManager();
  const graphics = makeGraphics(4);
  const map = makeGraphicMap(graphics);
  mgr.updateReferences(graphics as any, map as any);
  return { mgr, graphics, map };
}

describe('GroupManager', () => { let mgr: GroupManager; let graphics: TestGraphic[]; beforeEach(() => { const s = setupManager(); mgr = s.mgr; graphics = s.graphics; }); /* ============ Create & Delete ============ */ describe('createGroup', () => {
    it('should create a group with valid graphic IDs', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id]);
      expect(group).not.toBeNull();
      expect(group!.children).toEqual([graphics[0].id, graphics[1].id]);
    });

    it('should return null for empty IDs', () => {
      const group = mgr.createGroup([]);
      expect(group).toBeNull();
    });

    it('should return null when all IDs are invalid', () => {
      const group = mgr.createGroup(['nonexistent-1', 'nonexistent-2']);
      expect(group).toBeNull();
    });

    it('should filter out invalid IDs and still create group', () => {
      const group = mgr.createGroup([graphics[0].id, 'nonexistent']);
      expect(group).not.toBeNull();
      expect(group!.children).toEqual([graphics[0].id]);
    });

    it('should auto-generate name when not provided', () => {
      const group = mgr.createGroup([graphics[0].id]);
      expect(group!.name).toContain('Group');
    });

    it('should use provided name', () => {
      const group = mgr.createGroup([graphics[0].id], 'TestGroup');
      expect(group!.name).toBe('TestGroup');
    });

    it('should support parentId for nested groups', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent');
      expect(parent).not.toBeNull();
      const child = mgr.createGroup([graphics[1].id], 'Child', parent!.id);
      expect(child).not.toBeNull();
      expect(child!.parentId).toBe(parent!.id);

      const parentData = mgr.getGroup(parent!.id);
      expect(parentData!.children).toContain(child!.id);
    });

    it('should initialize transform values', () => {
      const group = mgr.createGroup([graphics[0].id]);
      expect(group!.transform).toEqual({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
      expect(group!.expanded).toBe(true);
      expect(group!.locked).toBe(false);
      expect(group!.visible).toBe(true);
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group by default keepGraphics=true', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      const removed = mgr.deleteGroup(group.id);
      expect(removed).toBe(true);
      expect(mgr.getGroup(group.id)).toBeUndefined();
    });

    it('should return false for non-existent group', () => {
      expect(mgr.deleteGroup('no-such-group')).toBe(false);
    });

    it('should handle child groups when deleting parent', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      const child = mgr.createGroup([graphics[1].id], 'Child', parent.id)!;
      
      mgr.deleteGroup(parent.id);
      expect(mgr.getGroup(parent.id)).toBeUndefined();
      expect(mgr.getGroup(child.id)).toBeUndefined();
    });

    it('should remove from parent children list when deleting child', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      const child = mgr.createGroup([graphics[1].id], 'Child', parent.id)!; mgr.deleteGroup(child.id); const p = mgr.getGroup(parent.id)!; expect(p.children).not.toContain(child.id); }); }); /* ============ Add/Remove Members ============ */ describe('addGraphicsToGroup / removeGraphicsFromGroup', () => {
    it('should add graphics to existing group', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      const ok = mgr.addGraphicsToGroup(group.id, [graphics[1].id, graphics[2].id]);
      expect(ok).toBe(true);
      expect(mgr.getGroup(group.id)!.children).toHaveLength(3);
    });

    it('should return false for non-existent group', () => {
      expect(mgr.addGraphicsToGroup('no-group', [graphics[0].id])).toBe(false);
    });

    it('should skip already-present graphics', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      mgr.addGraphicsToGroup(group.id, [graphics[0].id, graphics[2].id]);
      expect(mgr.getGroup(group.id)!.children).toHaveLength(3);
    });

    it('should remove graphic from old group when adding to new group', () => {
      const g1 = mgr.createGroup([graphics[0].id, graphics[3].id])!;
      const g2 = mgr.createGroup([graphics[1].id])!;
      mgr.addGraphicsToGroup(g2.id, [graphics[0].id]);
      expect(mgr.getGroup(g1.id)!.children).not.toContain(graphics[0].id);
      expect(mgr.getGroup(g2.id)!.children).toContain(graphics[0].id);
    });

    it('should remove graphics from group', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id, graphics[2].id])!;
      mgr.removeGraphicsFromGroup(group.id, [graphics[0].id, graphics[2].id]);
      expect(mgr.getGroup(group.id)!.children).toEqual([graphics[1].id]);
    });

    it('should auto-delete group when last member removed', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      mgr.removeGraphicsFromGroup(group.id, [graphics[0].id]);
      expect(mgr.getGroup(group.id)).toBeUndefined();
    });

    it('should return false when removing from non-existent group', () => {
      expect(mgr.removeGraphicsFromGroup('no-group', [graphics[0].id])).toBe(false); }); }); /* ============ Property Operations ============ */ describe('renameGroup', () => {
    it('should rename existing group', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      mgr.renameGroup(group.id, 'NewName');
      expect(mgr.getGroup(group.id)!.name).toBe('NewName');
    });

    it('should return false for non-existent group', () => {
      expect(mgr.renameGroup('no-group', 'X')).toBe(false);
    });
  });

  describe('toggleGroup', () => {
    it('should toggle expanded state', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      expect(group.expanded).toBe(true);
      mgr.toggleGroup(group.id);
      expect(mgr.getGroup(group.id)!.expanded).toBe(false);
      mgr.toggleGroup(group.id);
      expect(mgr.getGroup(group.id)!.expanded).toBe(true);
    });

    it('should not throw for non-existent group', () => {
      expect(() => mgr.toggleGroup('no-group')).not.toThrow();
    });
  });

  describe('setGroupLocked', () => {
    it('should lock group and its members', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      mgr.setGroupLocked(group.id, true);
      expect(mgr.getGroup(group.id)!.locked).toBe(true);
      expect(graphics[0]._locked).toBe(true);
      expect(graphics[1]._locked).toBe(true);
    });

    it('should cascade lock to nested child groups', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      const child = mgr.createGroup([graphics[1].id], 'Child', parent.id)!;
      
      mgr.setGroupLocked(parent.id, true);
      expect(mgr.getGroup(parent.id)!.locked).toBe(true);
      expect(mgr.getGroup(child.id)!.locked).toBe(true);
      expect(graphics[1]._locked).toBe(true);
    });
  });

  describe('setGroupVisible', () => {
    it('should set group visibility and its members', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      mgr.setGroupVisible(group.id, false);
      expect(mgr.getGroup(group.id)!.visible).toBe(false);
      expect(graphics[0]._visible).toBe(false);
      expect(graphics[1]._visible).toBe(false);
    });

    it('should cascade visibility to nested child groups', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      const child = mgr.createGroup([graphics[1].id], 'Child', parent.id)!;
      
      mgr.setGroupVisible(parent.id, false);
      expect(mgr.getGroup(parent.id)!.visible).toBe(false);
      expect(mgr.getGroup(child.id)!.visible).toBe(false);
    });

    it('should not throw for non-existent group', () => {
      expect(() => mgr.setGroupVisible('no-group', true)).not.toThrow();
    });
  });

  describe('transformGroup', () => {
    it('should apply transform to group', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      mgr.transformGroup(group.id, { x: 10, y: 20 });
      expect(mgr.getGroup(group.id)!.transform).toMatchObject({ x: 10, y: 20, scaleX: 1, scaleY: 1, rotation: 0 });
    });

    it('should cascade transform to nested child groups', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      const child = mgr.createGroup([graphics[1].id], 'Child', parent.id)!;
      
      mgr.transformGroup(parent.id, { scaleX: 2, scaleY: 2 });
      expect(mgr.getGroup(child.id)!.transform).toMatchObject({ scaleX: 2, scaleY: 2 });
    });

    it('should not throw for non-existent group', () => {
      expect(() => mgr.transformGroup('no-group', { x: 1 })).not.toThrow(); }); }); /* ============ Query Methods ============ */ describe('getGroup', () => {
    it('should return group by ID', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      expect(mgr.getGroup(group.id)).toBeDefined();
      expect(mgr.getGroup(group.id)!.id).toBe(group.id);
    });

    it('should return undefined for non-existent group', () => {
      expect(mgr.getGroup('no-group')).toBeUndefined();
    });
  });

  describe('getAllGroups', () => {
    it('should return all groups', () => {
      mgr.createGroup([graphics[0].id]);
      mgr.createGroup([graphics[1].id]);
      expect(mgr.getAllGroups()).toHaveLength(2);
    });

    it('should return empty array when no groups', () => {
      expect(mgr.getAllGroups()).toEqual([]);
    });
  });

  describe('getGroupsByParent', () => {
    it('should return root groups (parentId=null)', () => {
      mgr.createGroup([graphics[0].id]);
      mgr.createGroup([graphics[1].id]);
      const rootGroups = mgr.getGroupsByParent(null);
      expect(rootGroups).toHaveLength(2);
    });

    it('should return child groups of specific parent', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      mgr.createGroup([graphics[1].id], 'Child', parent.id);
      const children = mgr.getGroupsByParent(parent.id);
      expect(children).toHaveLength(1);
    });

    it('should return empty array when no children', () => {
      expect(mgr.getGroupsByParent('no-parent')).toEqual([]);
    });
  });

  describe('getGroupForGraphic', () => {
    it('should find group containing graphic', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      const found = mgr.getGroupForGraphic(graphics[0].id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(group.id);
    });

    it('should return undefined for ungrouped graphic', () => {
      expect(mgr.getGroupForGraphic(graphics[3].id)).toBeUndefined();
    });
  });

  describe('getChildGroups', () => {
    it('should return child group IDs', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      const child = mgr.createGroup([graphics[1].id], 'Child', parent.id)!;
      
      const childIds = mgr.getChildGroups(parent.id);
      expect(childIds).toContain(child.id);
      expect(childIds).toHaveLength(1);
    });

    it('should return empty array for leaf group', () => {
      const leaf = mgr.createGroup([graphics[0].id])!;
      expect(mgr.getChildGroups(leaf.id)).toEqual([]);
    });
  });

  describe('isGraphicInGroup', () => {
    it('should return true for grouped graphic', () => {
      mgr.createGroup([graphics[0].id]);
      expect(mgr.isGraphicInGroup(graphics[0].id)).toBe(true);
    });

    it('should return false for ungrouped graphic', () => {
      expect(mgr.isGraphicInGroup(graphics[0].id)).toBe(false);
    });

    it('should return false for non-existent graphic', () => {
      expect(mgr.isGraphicInGroup('no-graphic')).toBe(false);
    });
  });

  describe('isGroup', () => {
    it('should return true for existing group ID', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      expect(mgr.isGroup(group.id)).toBe(true);
    });

    it('should return false for graphic ID', () => {
      expect(mgr.isGroup(graphics[0].id)).toBe(false);
    });

    it('should return false for non-existent ID', () => {
      expect(mgr.isGroup('nothing')).toBe(false);
    });
  });

  describe('getGroupChildrenRecursive', () => {
    it('should return all child IDs including nested groups', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      mgr.createGroup([graphics[1].id], 'ChildL1', parent.id);
      const grandchild = mgr.createGroup([graphics[2].id], 'ChildL2', parent.id);
      
      const allChildren = mgr.getGroupChildrenRecursive(parent.id);
      expect(allChildren).toContain(graphics[0].id);
      expect(allChildren).toContain(grandchild!.id); // nested group ID
    });

    it('should return empty array for non-existent group', () => {
      expect(mgr.getGroupChildrenRecursive('no-group')).toEqual([]);
    });
  });

  describe('getGroupHierarchy', () => {
    it('should return hierarchy tree', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      const child = mgr.createGroup([graphics[1].id], 'Child', parent.id)!;
      
      const hierarchy = mgr.getGroupHierarchy();
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe(parent.id);
      const childInHierarchy = hierarchy[0].children.find(
        (c: any) => typeof c !== 'string' && c.id === child.id
      );
      expect(childInHierarchy).toBeDefined();
    });

    it('should return empty array when no groups', () => { expect(mgr.getGroupHierarchy()).toEqual([]); }); }); /* ============ Transform Operations ============ */ describe('getGroupBounds', () => {
    it('should calculate bounding box of group members', () => {
      mgr.createGroup([graphics[0].id, graphics[1].id]);
      const bounds = mgr.getGroupBounds(
        mgr.getGroupForGraphic(graphics[0].id)!.id
      );
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
    });

    it('should return zero bounds for non-existent group', () => {
      const bounds = mgr.getGroupBounds('no-group');
      expect(bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });

  describe('moveGroup', () => {
    it('should move all group members', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      const x0 = graphics[0]._x, y0 = graphics[0]._y;
      const x1 = graphics[1]._x, y1 = graphics[1]._y;

      mgr.moveGroup(group.id, 10, 20);
      expect(graphics[0]._x).toBe(x0 + 10);
      expect(graphics[0]._y).toBe(y0 + 20);
      expect(graphics[1]._x).toBe(x1 + 10);
      expect(graphics[1]._y).toBe(y1 + 20);
    });

    it('should not throw for non-existent group', () => {
      expect(() => mgr.moveGroup('no-group', 1, 1)).not.toThrow();
    });
  });

  describe('scaleGroup', () => {
    it('should scale all members around group center', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      const w0 = graphics[0]._width;
      const h0 = graphics[0]._height;
      const w1 = graphics[1]._width;
      const h1 = graphics[1]._height;

      mgr.scaleGroup(group.id, 2, 2);
      expect(graphics[0]._width).toBe(w0 * 2);
      expect(graphics[0]._height).toBe(h0 * 2);
      expect(graphics[1]._width).toBe(w1 * 2);
      expect(graphics[1]._height).toBe(h1 * 2);
    });

    it('should use provided center point', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      mgr.scaleGroup(group.id, 2, 2, 0, 0);
      expect(graphics[0]._width).toBe(100);
      expect(graphics[0]._height).toBe(100);
    });

    it('should not throw for non-existent group', () => {
      expect(() => mgr.scaleGroup('no-group', 1, 1)).not.toThrow();
    });
  });

  describe('rotateGroup', () => {
    it('should rotate all members around group center', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      const x0 = graphics[0]._x;

      mgr.rotateGroup(group.id, 90);
      // Rotation changes position
      expect(graphics[0]._x).not.toBe(x0);
      expect(graphics[0]._rotation).toBe(90);
    });

    it('should not throw for non-existent group', () => {
      expect(() => mgr.rotateGroup('no-group', 45)).not.toThrow(); }); }); /* ============ 序列化 ============ */ describe('toJSON / fromJSON / clear', () => {
    it('should serialize groups to JSON', () => {
      mgr.createGroup([graphics[0].id]);
      mgr.createGroup([graphics[1].id]);
      const json = mgr.toJSON();
      expect(json).toHaveLength(2);
    });

    it('should deserialize groups from JSON', () => {
      const data = [{
        id: 'imported-1',
        name: 'ImportedGroup',
        expanded: false,
        locked: true,
        visible: false,
        children: [graphics[0].id],
        parentId: null,
        transform: { x: 5, y: 10, scaleX: 2, scaleY: 2, rotation: 45 },
      }];
      mgr.fromJSON(data);
      const imported = mgr.getGroup('imported-1');
      expect(imported).toBeDefined();
      expect(imported!.name).toBe('ImportedGroup');
      expect(imported!.expanded).toBe(false);
      expect(imported!.locked).toBe(true);
      expect(imported!.visible).toBe(false);
      expect(imported!.transform.rotation).toBe(45);
    });

    it('should clear all groups', () => { mgr.createGroup([graphics[0].id]); mgr.createGroup([graphics[1].id]); mgr.clear(); expect(mgr.getAllGroups()).toEqual([]); }); }); /* ============ Legacy API Compatibility ============ */ describe('addToGroup / removeFromGroup (compat)', () => {
    it('addToGroup should add single graphic', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      mgr.addToGroup(graphics[1].id, group.id);
      expect(mgr.getGroupMembers(group.id)).toHaveLength(2);
    });

    it('removeFromGroup should remove single graphic', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      mgr.removeFromGroup(graphics[0].id);
      expect(mgr.getGroupMembers(group.id)).toHaveLength(1);
    });

    it('removeFromGroup should not throw for ungrouped graphic', () => {
      expect(() => mgr.removeFromGroup(graphics[3].id)).not.toThrow();
    });
  });

  describe('getGroupMembers', () => {
    it('should return IGraphic members for direct children', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      const members = mgr.getGroupMembers(group.id);
      expect(members).toHaveLength(2);
    });

    it('should include nested group members recursively', () => {
      const parent = mgr.createGroup([graphics[0].id], 'Parent')!;
      mgr.createGroup([graphics[1].id, graphics[2].id], 'Child', parent.id);
      const members = mgr.getGroupMembers(parent.id);
      expect(members.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array for non-existent group', () => {
      expect(mgr.getGroupMembers('no-group')).toEqual([]);
    });

    it('should return empty array for empty group', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      mgr.removeGraphicsFromGroup(group.id, [graphics[0].id]);
      expect(mgr.getGroupMembers(group.id)).toEqual([]);
    });
  });

  describe('ungroup', () => {
    it('should ungroup and return members', () => {
      const group = mgr.createGroup([graphics[0].id, graphics[1].id])!;
      const members = mgr.ungroup(group.id);
      expect(members).toHaveLength(2);
      expect(mgr.getGroup(group.id)).toBeUndefined();
      expect(mgr.isGraphicInGroup(graphics[0].id)).toBe(false);
    });

    it('should return empty array for non-existent group', () => {
      expect(mgr.ungroup('no-group')).toEqual([]);
    });
  });

  describe('updateGroupBounds (compat)', () => {
    it('should not throw (no-op method)', () => {
      const group = mgr.createGroup([graphics[0].id])!;
      expect(() => mgr.updateGroupBounds(group.id)).not.toThrow();
    });
  });
});