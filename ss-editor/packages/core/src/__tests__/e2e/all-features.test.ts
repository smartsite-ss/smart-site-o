// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '../../project/Editor';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic-editing/graphic/factory/GraphicFactory';
import { SelectionMode } from '../../types';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height); } draw(_ctx: CanvasRenderingContext2D): void { /* Empty implementation for testing */ } } describe('Graphic operation feature tests', () => {
  beforeEach(() => {
    GraphicFactory.registerGraphic('test-shape', TestShape as any, 'Test shape', 'basic');
  });

  afterEach(() => {
    GraphicFactory.unregisterGraphic('test-shape');
  });

  describe('Undo', () => {
    it('should undo add operation', () => {
      const editor = new Editor({ name: 'Undo Test' });
      const page = editor.createPage({ name: 'Undo Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'undo-test-1';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.undo();
      expect(page.graphics.length).toBe(0);
    });

    it('should undo delete operation', () => {
      const editor = new Editor({ name: 'Undo Delete Test' });
      const page = editor.createPage({ name: 'Undo Delete Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'undo-delete-1';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.selectGraphic('undo-delete-1');
      page.deleteSelectedGraphics?.();
      
      expect(page.graphics.length).toBe(0);
      
      page.undo();
      expect(page.graphics.length).toBe(1);
    });

    it('should not throw when no history', () => {
      const editor = new Editor({ name: 'Empty Undo Test' });
      const page = editor.createPage({ name: 'Empty Undo Page' });
      
      expect(() => page.undo()).not.toThrow();
    });
  });

  describe('Redo', () => {
    it('should not throw when no redoable operations', () => {
      const editor = new Editor({ name: 'Empty Redo Test' });
      const page = editor.createPage({ name: 'Empty Redo Page' });
      
      expect(() => page.redo()).not.toThrow();
    });
  });

  describe('Delete', () => {
    it('should delete selected graphic', () => {
      const editor = new Editor({ name: 'Delete Test' });
      const page = editor.createPage({ name: 'Delete Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'delete-test-1';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.selectGraphic('delete-test-1');
      page.deleteSelectedGraphics?.();
      
      expect(page.graphics.length).toBe(0);
    });

    it('should clear selection after delete', () => {
      const editor = new Editor({ name: 'Delete Selection Test' });
      const page = editor.createPage({ name: 'Delete Selection Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'delete-selection-1';
      page.addGraphic(graphic as any);
      
      page.selectGraphic('delete-selection-1');
      expect(page.selectedGraphicIds).toEqual(['delete-selection-1']);
      
      page.deleteSelectedGraphics?.();
      
      expect(page.selectedGraphicIds).toEqual([]);
    });
  });

  describe('Copy', () => {
    it('should keep original graphic selected', () => {
      const editor = new Editor({ name: 'Copy Selection Test' });
      const page = editor.createPage({ name: 'Copy Selection Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'copy-selection-1';
      page.addGraphic(graphic as any);
      
      page.selectGraphic('copy-selection-1');
      expect(page.selectedGraphicIds).toEqual(['copy-selection-1']);
      
      editor.copyToClipboard(['copy-selection-1']);
      
      expect(page.selectedGraphicIds).toEqual(['copy-selection-1']);
    });

    it('should keep graphic count unchanged after copy', () => {
      const editor = new Editor({ name: 'Copy Count Test' });
      const page = editor.createPage({ name: 'Copy Count Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'copy-count-1';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.selectGraphic('copy-count-1');
      editor.copyToClipboard(['copy-count-1']);
      
      expect(page.graphics.length).toBe(1);
    });
  });

  describe('剪切 (Cut)', () => {
    it('剪切后应该保持图元数量不变（剪切功能由上层实现）', () => {
      const editor = new Editor({ name: 'Cut Test' });
      const page = editor.createPage({ name: 'Cut Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'cut-test-1';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.selectGraphic('cut-test-1');
      editor.cutToClipboard(['cut-test-1']);
      
      expect(page.graphics.length).toBe(1);
    });
  });

  describe('Paste', () => {
    it('should paste graphic from clipboard', () => {
      const editor = new Editor({ name: 'Paste Test' });
      const page = editor.createPage({ name: 'Paste Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'paste-source-1';
      page.addGraphic(graphic as any);
      
      editor.copyToClipboard(['paste-source-1']);
      const pasted = editor.pasteFromClipboard();
      
      expect(pasted.length).toBe(1);
      expect(page.graphics.length).toBe(2);
    });

    it('should select newly pasted graphic', () => {
      const editor = new Editor({ name: 'Paste Selection Test' });
      const page = editor.createPage({ name: 'Paste Selection Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'paste-selection-source';
      page.addGraphic(graphic as any);
      
      page.selectGraphic('paste-selection-source');
      editor.copyToClipboard(['paste-selection-source']);
      const pasted = editor.pasteFromClipboard();
      
      expect(pasted.length).toBe(1);
      expect(page.selectedGraphicIds.length).toBeGreaterThan(0);
    });

    it('should not throw when clipboard is empty', () => {
      const editor = new Editor({ name: 'Empty Paste Test' });
      editor.createPage({ name: 'Empty Paste Page' });
      
      expect(() => editor.pasteFromClipboard()).not.toThrow();
    });

    it('一次复制多次粘贴时，图元位置应该有累积偏移', () => {
      const editor = new Editor({ name: 'Multiple Paste Offset Test' });
      const page = editor.createPage({ name: 'Multiple Paste Offset Page'}); /* 创建原始图元 */ const originalGraphic = new TestShape(100, 100, 50, 50); originalGraphic.id ='original-graphic'; page.addGraphic(originalGraphic as any); /* 复制图元 */ editor.copyToClipboard(['original-graphic']); /* 第一次粘贴 - 位置应该偏移 20px */ const pasted1 = editor.pasteFromClipboard(); expect(pasted1.length).toBe(1); const pos1 = pasted1[0].getPosition(); expect(pos1.x).toBe(120); /* 100 + 20 */ expect(pos1.y).toBe(120); /* 100 + 20 */ /* 第二次粘贴 - 位置应该偏移 40px */ const pasted2 = editor.pasteFromClipboard(); expect(pasted2.length).toBe(1); const pos2 = pasted2[0].getPosition(); expect(pos2.x).toBe(140); /* 100 + 40 */ expect(pos2.y).toBe(140); /* 100 + 40 */ /* 第三次粘贴 - 位置应该偏移 60px */ const pasted3 = editor.pasteFromClipboard(); expect(pasted3.length).toBe(1); const pos3 = pasted3[0].getPosition(); expect(pos3.x).toBe(160); /* 100 + 60 */ expect(pos3.y).toBe(160); /* 100 + 60 */ /* 验证总共 4 个图元 */ expect(page.graphics.length).toBe(4); }); }); describe('Duplicate', () => {
    it('should create graphic duplicate', () => {
      const editor = new Editor({ name: 'Duplicate Test' });
      const page = editor.createPage({ name: 'Duplicate Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'duplicate-source';
      page.addGraphic(graphic as any);
      
      expect(page.graphics.length).toBe(1);
      
      page.selectGraphic('duplicate-source');
      const duplicated = page.duplicateGraphic?.('duplicate-source');
      
      expect(duplicated).not.toBeNull();
      expect(page.graphics.length).toBe(2);
    });

    it('复制后应该只选中新图元', () => {
      const editor = new Editor({ name: 'Duplicate Selection Test' });
      const page = editor.createPage({ name: 'Duplicate Selection Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'duplicate-selection-source';
      page.addGraphic(graphic as any);
      
      page.selectGraphic('duplicate-selection-source');
      const duplicated = page.duplicateGraphic?.('duplicate-selection-source'); expect(duplicated).not.toBeNull(); /* Simulate selection logic in store */ page.clearSelection(); page.selectGraphic(duplicated!.id); expect(page.selectedGraphicIds).not.toContain('duplicate-selection-source');
      expect(page.selectedGraphicIds).toContain(duplicated!.id);
    });
  });

  describe('Group', () => {
    it('should create a group from multiple graphics', () => {
      const editor = new Editor({ name: 'Group Test' });
      const page = editor.createPage({ name: 'Group Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'group-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'group-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      expect(page.graphics.length).toBe(2);
      expect(page.groups.length).toBe(0);
      
      const group = page.groupGraphics(['group-graphic-1', 'group-graphic-2']);
      
      expect(group).not.toBeNull();
      expect(page.groups.length).toBe(1);
      expect(page.isGroup(group!.id)).toBe(true);
    });

    it('should create group and graphics should be inside group', () => {
      const editor = new Editor({ name: 'Group Members Test' });
      const page = editor.createPage({ name: 'Group Members Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'group-member-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'group-member-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['group-member-1', 'group-member-2']);
      
      const members = page.getGroupMembers(group!.id);
      expect(members.length).toBe(2);
      expect(members.some(g => g.id === 'group-member-1')).toBe(true);
      expect(members.some(g => g.id === 'group-member-2')).toBe(true);
    });

    it('should not create group for zero graphics', () => {
      const editor = new Editor({ name: 'Empty Group Test' });
      const page = editor.createPage({ name: 'Empty Group Page' });
      
      const group = page.groupGraphics([]);
      
      expect(group).toBeNull();
      expect(page.groups.length).toBe(0);
    });

    it('should not create group for non-existent graphics', () => {
      const editor = new Editor({ name: 'Invalid Group Test' });
      const page = editor.createPage({ name: 'Invalid Group Page' });
      
      const group = page.groupGraphics(['non-existent-id']);
      
      expect(group).toBeNull();
      expect(page.groups.length).toBe(0);
    });
  });

  describe('Ungroup', () => {
    it('should ungroup and keep graphics', () => {
      const editor = new Editor({ name: 'Ungroup Test' });
      const page = editor.createPage({ name: 'Ungroup Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'ungroup-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'ungroup-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['ungroup-graphic-1', 'ungroup-graphic-2']);
      
      expect(page.groups.length).toBe(1);
      
      const members = page.ungroupGraphic(group!.id);
      
      expect(members.length).toBe(2);
      expect(page.groups.length).toBe(0);
      expect(page.graphics.length).toBe(2);
    });

    it('取消不存在的分组不应该报错', () => {
      const editor = new Editor({ name: 'Ungroup Non-existent Test' });
      const page = editor.createPage({ name: 'Ungroup Non-existent Page' });
      
      expect(() => page.ungroupGraphic('non-existent-group')).not.toThrow();
    });

    it('isGroup 应该正确识别分组', () => {
      const editor = new Editor({ name: 'Is Group Test' });
      const page = editor.createPage({ name: 'Is Group Page' });
      
      const graphic = new TestShape(100, 100, 50, 50);
      graphic.id = 'is-group-graphic';
      page.addGraphic(graphic as any);
      
      expect(page.isGroup('is-group-graphic')).toBe(false);
      
      const group = page.groupGraphics(['is-group-graphic']);
      
      expect(page.isGroup(group!.id)).toBe(true);
    });
  });

  describe('Group graphic spatial transformations', () => {
    it('moveGroup should move all graphics in group', () => {
      const editor = new Editor({ name: 'Move Group Test' });
      const page = editor.createPage({ name: 'Move Group Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'move-group-graphic-1';
      
      const graphic2 = new TestShape(200, 150, 50, 50);
      graphic2.id = 'move-group-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['move-group-graphic-1', 'move-group-graphic-2']);
      
      const pos1Before = graphic1.getPosition();
      const pos2Before = graphic2.getPosition();
      
      page.moveGroup(group!.id, 50, 30);
      
      const pos1After = graphic1.getPosition();
      const pos2After = graphic2.getPosition();
      
      expect(pos1After.x).toBe(pos1Before.x + 50);
      expect(pos1After.y).toBe(pos1Before.y + 30);
      expect(pos2After.x).toBe(pos2Before.x + 50);
      expect(pos2After.y).toBe(pos2Before.y + 30);
    });

    it('scaleGroup should scale all graphics in group', () => {
      const editor = new Editor({ name: 'Scale Group Test' });
      const page = editor.createPage({ name: 'Scale Group Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'scale-group-graphic-1';
      
      const graphic2 = new TestShape(200, 150, 50, 50);
      graphic2.id = 'scale-group-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['scale-group-graphic-1', 'scale-group-graphic-2']);
      
      const size1Before = graphic1.getSize();
      const size2Before = graphic2.getSize();
      
      page.scaleGroup(group!.id, 2, 2);
      
      const size1After = graphic1.getSize();
      const size2After = graphic2.getSize();
      
      expect(size1After.width).toBe(size1Before.width * 2);
      expect(size1After.height).toBe(size1Before.height * 2);
      expect(size2After.width).toBe(size2Before.width * 2);
      expect(size2After.height).toBe(size2Before.height * 2);
    });

    it('rotateGroup should rotate all graphics in group', () => {
      const editor = new Editor({ name: 'Rotate Group Test' });
      const page = editor.createPage({ name: 'Rotate Group Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'rotate-group-graphic-1';
      
      const graphic2 = new TestShape(200, 150, 50, 50);
      graphic2.id = 'rotate-group-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['rotate-group-graphic-1', 'rotate-group-graphic-2']);
      
      page.rotateGroup(group!.id, 90);
      
      expect(graphic1.config.geometry.rotation).toBe(90);
      expect(graphic2.config.geometry.rotation).toBe(90);
    });

    it('getGroupBounds 应该返回正确的组合边界框', () => {
      const editor = new Editor({ name: 'Get Group Bounds Test' });
      const page = editor.createPage({ name: 'Get Group Bounds Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'bounds-group-graphic-1';
      
      const graphic2 = new TestShape(200, 150, 50, 50);
      graphic2.id = 'bounds-group-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['bounds-group-graphic-1', 'bounds-group-graphic-2']);
      
      const bounds = page.getGroupBounds(group!.id);
      
      expect(bounds.x).toBe(100);
      expect(bounds.y).toBe(100);
      expect(bounds.width).toBe(150); // 200 + 50 - 100 = 150
      expect(bounds.height).toBe(100); // 150 + 50 - 100 = 100
    });
  });

  describe('组合图元选择行为', () => {
    it('组合后组内图元应该处于选中状态', () => {
      const editor = new Editor({ name: 'Group Select After Grouping Test' });
      const page = editor.createPage({ name: 'Group Select Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'group-after-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'group-after-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      page.groupGraphics(['group-after-graphic-1', 'group-after-graphic-2']);
      
      expect(page.selectedGraphicIds.length).toBe(2);
      expect(page.selectedGraphicIds).toContain('group-after-graphic-1');
      expect(page.selectedGraphicIds).toContain('group-after-graphic-2');
    });

    it('点击组内图元应该选中整个组', () => {
      const editor = new Editor({ name: 'Select Group Test' });
      const page = editor.createPage({ name: 'Select Group Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'select-group-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'select-group-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      page.groupGraphics(['select-group-graphic-1', 'select-group-graphic-2']);
      
      page.getSelectionManager().setMode(SelectionMode.BOX);
      page.selectGraphic('select-group-graphic-1');
      
      expect(page.selectedGraphicIds.length).toBe(2);
      expect(page.selectedGraphicIds).toContain('select-group-graphic-1');
      expect(page.selectedGraphicIds).toContain('select-group-graphic-2');
    });

    it('进入组编辑模式后应该可以选择单个图元', () => {
      const editor = new Editor({ name: 'Group Edit Mode Test' });
      const page = editor.createPage({ name: 'Group Edit Mode Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'edit-mode-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'edit-mode-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['edit-mode-graphic-1', 'edit-mode-graphic-2']);
      
      page.enterGroupEditMode(group!.id);
      
      expect(page.groupEditMode.active).toBe(true);
      expect(page.groupEditMode.groupId).toBe(group!.id);
      
      page.selectGraphic('edit-mode-graphic-1');
      
      expect(page.selectedGraphicIds.length).toBe(1);
      expect(page.selectedGraphicIds).toContain('edit-mode-graphic-1');
    });

    it('退出组编辑模式后应该恢复正常选择行为', () => {
      const editor = new Editor({ name: 'Exit Group Edit Mode Test' });
      const page = editor.createPage({ name: 'Exit Group Edit Mode Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'exit-edit-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'exit-edit-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['exit-edit-graphic-1', 'exit-edit-graphic-2']);
      
      page.enterGroupEditMode(group!.id);
      page.exitGroupEditMode();
      
      expect(page.groupEditMode.active).toBe(false);
      expect(page.groupEditMode.groupId).toBe(null);
      
      page.getSelectionManager().setMode(SelectionMode.BOX);
      page.selectGraphic('exit-edit-graphic-1');
      
      expect(page.selectedGraphicIds.length).toBe(2);
    });

    it('toggleGroupEditMode should toggle group edit mode', () => {
      const editor = new Editor({ name: 'Toggle Group Edit Mode Test' });
      const page = editor.createPage({ name: 'Toggle Group Edit Mode Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'toggle-edit-graphic-1';
      
      page.addGraphic(graphic1 as any);
      
      const group = page.groupGraphics(['toggle-edit-graphic-1']);
      
      expect(page.groupEditMode.active).toBe(false);
      
      page.toggleGroupEditMode(group!.id);
      expect(page.groupEditMode.active).toBe(true);
      
      page.toggleGroupEditMode();
      expect(page.groupEditMode.active).toBe(false);
    });
  });

  describe('组合图元增减成员', () => {
    it('addToGroup 应该将图元添加到组合', () => {
      const editor = new Editor({ name: 'Add To Group Test' });
      const page = editor.createPage({ name: 'Add To Group Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'add-to-group-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'add-to-group-graphic-2';
      
      const graphic3 = new TestShape(300, 100, 50, 50);
      graphic3.id = 'add-to-group-graphic-3';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      page.addGraphic(graphic3 as any);
      
      const group = page.groupGraphics(['add-to-group-graphic-1', 'add-to-group-graphic-2']);
      
      expect(page.getGroupMembers(group!.id).length).toBe(2);
      
      page.addToGroup('add-to-group-graphic-3', group!.id);
      
      expect(page.getGroupMembers(group!.id).length).toBe(3);
    });

    it('removeFromGroup should remove graphic from group', () => {
      const editor = new Editor({ name: 'Remove From Group Test' });
      const page = editor.createPage({ name: 'Remove From Group Page' });
      
      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'remove-from-group-graphic-1';
      
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'remove-from-group-graphic-2';
      
      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      
      const group = page.groupGraphics(['remove-from-group-graphic-1', 'remove-from-group-graphic-2']);
      
      expect(page.getGroupMembers(group!.id).length).toBe(2);
      
      page.removeFromGroup('remove-from-group-graphic-1');
      
      expect(page.getGroupMembers(group!.id).length).toBe(1);
    });
  });

  describe('图元区选中 vs 编辑区选中', () => {
    it('在图元区（画布）点击组内图元时应选中整个组', () => {
      const editor = new Editor({ name: 'Canvas Select Group Test' });
      const page = editor.createPage({ name: 'Canvas Select Page' });

      const graphic1 = new TestShape(100, 100, 50, 50);
      graphic1.id = 'canvas-select-g1';
      const graphic2 = new TestShape(200, 100, 50, 50);
      graphic2.id = 'canvas-select-g2';
      const graphic3 = new TestShape(300, 100, 50, 50);
      graphic3.id = 'canvas-select-g3';

      page.addGraphic(graphic1 as any);
      page.addGraphic(graphic2 as any);
      page.addGraphic(graphic3 as any);

      page.groupGraphics(['canvas-select-g1', 'canvas-select-g2']);

      page.selectGraphic('canvas-select-g1');
      const selectedAfterClick = (page as any).selectionManager.getSelectedGraphicIds();
      expect(selectedAfterClick).toHaveLength(2);
      expect(selectedAfterClick).toContain('canvas-select-g1');
      expect(selectedAfterClick).toContain('canvas-select-g2');
      expect(selectedAfterClick).not.toContain('canvas-select-g3');

      page.selectGraphic(null as any);
      expect((page as any).selectionManager.getSelectedGraphicIds()).toHaveLength(0);

      page.selectGraphic('canvas-select-g2');
      const selectedAgain = (page as any).selectionManager.getSelectedGraphicIds();
      expect(selectedAgain).toHaveLength(2);
      expect(selectedAgain).toContain('canvas-select-g1');
      expect(selectedAgain).toContain('canvas-select-g2');
    });

    it('在编辑区（层叠面板）通过selectGroupMembers选中组成员', () => {
      const editor = new Editor({ name: 'Panel Select Test' });
      const page = editor.createPage({ name: 'Panel Select Page' });

      const g1 = new TestShape(50, 50, 30, 30);
      g1.id = 'panel-select-g1';
      const g2 = new TestShape(100, 50, 30, 30);
      g2.id = 'panel-select-g2';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const group = page.groupGraphics(['panel-select-g1', 'panel-select-g2']);

      (page as any).selectionManager.clear();

      page.selectGroupMembers(group!.id);
      const selected = (page as any).selectionManager.getSelectedGraphicIds();
      expect(selected).toHaveLength(2);
      expect(selected).toContain('panel-select-g1');
      expect(selected).toContain('panel-select-g2');
    });

    it('should keep original members selected after ungrouping via panel', () => {
      const editor = new Editor({ name: 'Ungroup Select Test' });
      const page = editor.createPage({ name: 'Ungroup Select Page' });

      const g1 = new TestShape(50, 50, 30, 30);
      g1.id = 'ungroup-select-g1';
      const g2 = new TestShape(100, 50, 30, 30);
      g2.id = 'ungroup-select-g2';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const group = page.groupGraphics(['ungroup-select-g1', 'ungroup-select-g2']);
      expect((page as any).selectionManager.getSelectedGraphicIds()).toHaveLength(2);

      page.ungroupGraphic(group!.id);

      const selected = (page as any).selectionManager.getSelectedGraphicIds();
      expect(selected).toHaveLength(2);
      expect(selected).toContain('ungroup-select-g1');
      expect(selected).toContain('ungroup-select-g2');
    });
  });

  describe('Move and transform in group edit mode', () => {
    it('moving a single member in group edit mode should not affect other members', () => {
      const editor = new Editor({ name: 'Edit Move Test' });
      const page = editor.createPage({ name: 'Edit Move Page' });

      const g1 = new TestShape(100, 100, 50, 50);
      g1.id = 'edit-move-g1';
      const g2 = new TestShape(200, 100, 50, 50);
      g2.id = 'edit-move-g2';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const group = page.groupGraphics(['edit-move-g1', 'edit-move-g2']);

      const xBefore = g1.config.geometry.x;
      const yBefore = g1.config.geometry.y;
      const x2Before = g2.config.geometry.x;
      const y2Before = g2.config.geometry.y;

      page.enterGroupEditMode(group!.id);
      expect((page as any).selectionManager.getSelectedGraphicIds()).toHaveLength(1);

      g1.config.geometry.x = xBefore + 10;
      g1.config.geometry.y = yBefore + 20;

      expect(g2.config.geometry.x).toBe(x2Before);
      expect(g2.config.geometry.y).toBe(y2Before);
    });

    it('退出组编辑模式后恢复全组选中', () => {
      const editor = new Editor({ name: 'Edit Exit Test' });
      const page = editor.createPage({ name: 'Edit Exit Page' });

      const g1 = new TestShape(100, 100, 50, 50);
      g1.id = 'edit-exit-g1';
      const g2 = new TestShape(200, 100, 50, 50);
      g2.id = 'edit-exit-g2';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const group2 = page.groupGraphics(['edit-exit-g1', 'edit-exit-g2']);
      page.enterGroupEditMode(group2!.id);
      expect((page as any).selectionManager.getSelectedGraphicIds()).toHaveLength(1);

      page.exitGroupEditMode();
      expect((page as any)._groupEditMode.active).toBe(false);
      const selected = (page as any).selectionManager.getSelectedGraphicIds();
      expect(selected).toHaveLength(2);
      expect(selected).toContain('edit-exit-g1');
      expect(selected).toContain('edit-exit-g2');
    });

    it('整体移动组合应保持成员相对位置', () => {
      const editor = new Editor({ name: 'Group Move Test' });
      const page = editor.createPage({ name: 'Group Move Page' });

      const g1 = new TestShape(100, 100, 50, 50);
      g1.id = 'move-group-g1';
      const g2 = new TestShape(200, 150, 50, 50);
      g2.id = 'move-group-g2';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const group = page.groupGraphics(['move-group-g1', 'move-group-g2']);

      const x1Before = g1.config.geometry.x;
      const y1Before = g1.config.geometry.y;
      const x2Before = g2.config.geometry.x;
      const y2Before = g2.config.geometry.y;

      const dx0 = x2Before - x1Before;
      const dy0 = y2Before - y1Before;

      page.moveGroup(group!.id, 30, 40);

      const x1After = g1.config.geometry.x;
      const y1After = g1.config.geometry.y;
      const x2After = g2.config.geometry.x;
      const y2After = g2.config.geometry.y;

      expect(x1After).toBeCloseTo(x1Before + 30, 0);
      expect(y1After).toBeCloseTo(y1Before + 40, 0);
      expect(x2After).toBeCloseTo(x2Before + 30, 0);
      expect(y2After).toBeCloseTo(y2Before + 40, 0);

      expect(x2After - x1After).toBeCloseTo(dx0, 0);
      expect(y2After - y1After).toBeCloseTo(dy0, 0);

      expect((page as any).selectionManager.getSelectedGraphicIds()).toHaveLength(2);
    });

    it('缩放组合后成员尺寸和位置应相对于组中心变化', () => {
      const editor = new Editor({ name: 'Scale Group Test' });
      const page = editor.createPage({ name: 'Scale Group Page' });

      const g1 = new TestShape(100, 100, 50, 50);
      g1.id = 'scale-group-g1';
      const g2 = new TestShape(200, 100, 50, 50);
      g2.id = 'scale-group-g2';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const group = page.groupGraphics(['scale-group-g1', 'scale-group-g2']);

      const w1Before = g1.config.geometry.width;
      const h1Before = g1.config.geometry.height;
      const w2Before = g2.config.geometry.width;
      const h2Before = g2.config.geometry.height;

      page.scaleGroup(group!.id, 2, 2);

      const w1After = g1.config.geometry.width;
      const h1After = g1.config.geometry.height;
      const w2After = g2.config.geometry.width;
      const h2After = g2.config.geometry.height;

      expect(w1After).toBeCloseTo(w1Before * 2, 0);
      expect(h1After).toBeCloseTo(h1Before * 2, 0);
      expect(w2After).toBeCloseTo(w2Before * 2, 0);
      expect(h2After).toBeCloseTo(h2Before * 2, 0);

      expect((page as any).selectionManager.getSelectedGraphicIds()).toHaveLength(2);
    });

    it('旋转组合后成员位置应围绕组中心旋转', () => {
      const editor = new Editor({ name: 'Rotate Group Test' });
      const page = editor.createPage({ name: 'Rotate Group Page' });

      const g1 = new TestShape(150, 100, 40, 40);
      g1.id = 'rotate-group-g1';
      const g2 = new TestShape(160, 160, 40, 40);
      g2.id = 'rotate-group-g2';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);

      const group = page.groupGraphics(['rotate-group-g1', 'rotate-group-g2']);

      const x1Before = g1.config.geometry.x;
      const y1Before = g1.config.geometry.y;

      page.rotateGroup(group!.id, 180);

      const x1After = g1.config.geometry.x;
      const y1After = g1.config.geometry.y;
      expect(Math.abs(x1After - x1Before)).toBeGreaterThan(0);
      expect(Math.abs(y1After - y1Before)).toBeGreaterThan(0);

      expect((page as any).selectionManager.getSelectedGraphicIds()).toHaveLength(2);
    });
  });

  describe('Nested group selection and transformation', () => {
    it('clicking the deepest graphic in a nested group should select all members of its group', () => {
      const editor = new Editor({ name: 'Nested Select Test' });
      const page = editor.createPage({ name: 'Nested Select Page' });

      const g1 = new TestShape(100, 100, 40, 40);
      g1.id = 'nested-select-g1';
      const g2 = new TestShape(160, 100, 40, 40);
      g2.id = 'nested-select-g2';
      const g3 = new TestShape(130, 160, 40, 40);
      g3.id = 'nested-select-g3';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);
      page.addGraphic(g3 as any);

      page.groupGraphics(['nested-select-g1', 'nested-select-g2']);
      page.groupGraphics(['nested-select-g3']);

      page.selectGraphic('nested-select-g1');

      const selected = (page as any).selectionManager.getSelectedGraphicIds();
      expect(selected).toHaveLength(2);
      expect(selected).toContain('nested-select-g1');
      expect(selected).toContain('nested-select-g2');
    });

    it('parent group with child groups should move all members when moved', () => {
      const editor = new Editor({ name: 'Nested Move Test' });
      const page = editor.createPage({ name: 'Nested Move Page' });

      const g1 = new TestShape(100, 100, 40, 40);
      g1.id = 'nested-move-g1';
      const g2 = new TestShape(160, 100, 40, 40);
      g2.id = 'nested-move-g2';
      const g3 = new TestShape(130, 160, 40, 40);
      g3.id = 'nested-move-g3';

      page.addGraphic(g1 as any);
      page.addGraphic(g2 as any);
      page.addGraphic(g3 as any);

      (page as any).updateGroupManagerReferences();
      const childGroup = (page as any).groupManager.createGroup(['nested-move-g1', 'nested-move-g2'], 'Child')!;
      (page as any).groupManager.createGroup(['nested-move-g3'], 'Parent', childGroup.id);

      const x1B = g1.config.geometry.x;
      const x3B = g3.config.geometry.x;

      page.moveGroup(childGroup.id, 25, 35);

      expect(g1.config.geometry.x).toBeCloseTo(x1B + 25, 0);
      expect(g3.config.geometry.x).toBeCloseTo(x3B + 25, 0);
    });
  });
});
