// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionManager } from '../../../graphic-editing/managers/SelectionManager';
import { SelectionMode } from '../../../types';

describe('SelectionManager - edge case supplementary tests', () => {
  let selectionManager: SelectionManager;

  beforeEach(() => {
    selectionManager = new SelectionManager();
  });

  describe('select() 不存在的图元', () => {
    it('selecting non-existent ID should have no side effects', () => {
      selectionManager.setMode(SelectionMode.SINGLE);
      const result = selectionManager.select('nonexistent-id');
      expect(result.selectedGraphicId).toBe('nonexistent-id');
      expect(result.selectedGraphicIds).toEqual(['nonexistent-id']);
    });

    it('ADDITIVE 模式下选择不存在的 ID 不改变已有选择', () => {
      selectionManager.setMode(SelectionMode.ADDITIVE);
      selectionManager.select('existing-1');
      selectionManager.select('existing-2');

      selectionManager.select('nonexistent');
      expect(selectionManager.getSelectedCount()).toBe(3);
    });
  });

  describe('空状态操作', () => {
    it('空选择时 clear() 无副作用', () => {
      expect(() => selectionManager.clear()).not.toThrow();
      expect(selectionManager.getSelectedGraphicIds()).toEqual([]);
    });

    it('removeFromSelection() on empty selection has no side effects', () => {
      expect(() => selectionManager.removeFromSelection('g1')).not.toThrow();
      expect(selectionManager.getSelectedGraphicIds()).toEqual([]);
    });

    it('isSelected() on empty selection should return false', () => {
      expect(selectionManager.isSelected('any-id')).toBe(false);
    });

    it('空选择时 getSelectedCount() 返回 0', () => {
      expect(selectionManager.getSelectedCount()).toBe(0);
    });
  });

  describe('state consistency on mode switch', () => {
    it('ADDITIVE→SINGLE switch should clear old selection', () => {
      selectionManager.setMode(SelectionMode.ADDITIVE);
      selectionManager.select('g1');
      selectionManager.select('g2');
      selectionManager.select('g3');
      expect(selectionManager.getSelectedCount()).toBe(3);

      selectionManager.setMode(SelectionMode.SINGLE);
      selectionManager.select('g5');

      expect(selectionManager.getSelectedCount()).toBe(1);
      expect(selectionManager.isSelected('g5')).toBe(true);
      expect(selectionManager.isSelected('g1')).toBe(false);
    });

    it('SINGLE 选中后切换 SUBTRACTIVE → select 已选中则减选', () => {
      selectionManager.setMode(SelectionMode.SINGLE);
      selectionManager.select('g1');
      expect(selectionManager.isSelected('g1')).toBe(true);

      selectionManager.setMode(SelectionMode.SUBTRACTIVE);
      selectionManager.select('g1');
      expect(selectionManager.isSelected('g1')).toBe(false);
    });
  });

  describe('selectMultiple edge cases', () => {
    it('empty array should not throw', () => {
      expect(() => selectionManager.selectMultiple([])).not.toThrow();
    });

    it('SUBTRACTIVE mode empty array should not change selection', () => {
      selectionManager.setMode(SelectionMode.SINGLE);
      selectionManager.select('g1');
      selectionManager.setMode(SelectionMode.SUBTRACTIVE);
      selectionManager.selectMultiple([]);
      expect(selectionManager.isSelected('g1')).toBe(true);
    });

    it('BOX 模式下空数组清空选择', () => {
      selectionManager.setMode(SelectionMode.SINGLE);
      selectionManager.select('g1');
      selectionManager.setMode(SelectionMode.BOX);
      selectionManager.selectMultiple([]);
      expect(selectionManager.getSelectedCount()).toBe(0);
    });
  });

  describe('selectBatch edge cases', () => {
    it('空操作数组不应报错', () => {
      expect(() => selectionManager.selectBatch([])).not.toThrow();
    });

    it('unknown action type should be ignored', () => {
      selectionManager.selectBatch([
        { id: 'g1', action: 'add' } as any,
        { id: 'g2', action: 'unknown' } as any,
        { id: 'g3', action: 'add' } as any,
      ]);
      expect(selectionManager.getSelectedCount()).toBe(2);
    });
  });

  describe('toggleSelection boundary conditions', () => {
    it('toggle non-existent ID should add to selection', () => {
      selectionManager.toggleSelection('new-id');
      expect(selectionManager.isSelected('new-id')).toBe(true);
    });

    it('toggle 已选中的 ID 应移除', () => {
      selectionManager.addToSelection('g1');
      selectionManager.toggleSelection('g1');
      expect(selectionManager.isSelected('g1')).toBe(false);
    });
  });

  describe('撤销/重做边界条件', () => {
    it('canUndo returns false after clearHistory', () => {
      selectionManager.select('g1');
      selectionManager.clearHistory();
      expect(selectionManager.canUndo()).toBe(false);
      expect(selectionManager.canRedo()).toBe(false);
    });

    it('连续撤销到边界返回 null', () => {
      selectionManager.select('g1');
      selectionManager.select('g2');
      selectionManager.undo();
      selectionManager.undo();
      expect(selectionManager.undo()).toBeNull();
    });

    it('连续重做到边界返回 null', () => {
      selectionManager.select('g1');
      selectionManager.select('g2');
      selectionManager.undo();
      selectionManager.redo();
      expect(selectionManager.redo()).toBeNull();
    });
  });

  describe('subscriber edge cases', () => {
    it('repeated unsubscribe should not throw', () => {
      const fn = () => {};
      const unsub = selectionManager.subscribe(fn);
      unsub();
      expect(() => unsub()).not.toThrow();
    });

    it('clearSubscriptions should stop all callbacks', () => {
      const cb = vi.fn();
      selectionManager.subscribe(cb);
      selectionManager.clearSubscriptions();
      selectionManager.select('test');
      expect(cb).not.toHaveBeenCalled();
    });

    it('subscriber returns unsubscribe object', () => {
      const result = selectionManager.subscribe(() => {});
      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });
  });

  describe('mixed operations', () => {
    it('frequent mode switching should keep state consistent', () => {
      selectionManager.setMode(SelectionMode.SINGLE);
      selectionManager.select('a');

      selectionManager.setMode(SelectionMode.ADDITIVE);
      selectionManager.select('b');

      selectionManager.setMode(SelectionMode.SUBTRACTIVE);
      selectionManager.select('a');

      selectionManager.setMode(SelectionMode.BOX);
      selectionManager.selectMultiple(['c', 'd']);

      expect(selectionManager.getSelectedGraphicIds()).toEqual(['c', 'd']);
    });

    it('removeFromSelection removes last element', () => {
      selectionManager.addToSelection('only-one');
      selectionManager.removeFromSelection('only-one');
      expect(selectionManager.hasSelection()).toBe(false);
      expect(selectionManager.getSelectedGraphicId()).toBeNull();
    });

    it('repeated clear has no side effects', () => {
      selectionManager.clear();
      selectionManager.clear();
      expect(selectionManager.getSelectedCount()).toBe(0);
    });
  });

  describe('performance related', () => {
    it('bulk selection (200+ IDs) should complete in reasonable time', () => {
      const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`);
      const start = performance.now();

      selectionManager.setMode(SelectionMode.BOX);
      selectionManager.selectMultiple(ids);

      const elapsed = performance.now() - start;
      expect(selectionManager.getSelectedCount()).toBe(200);
      expect(elapsed).toBeLessThan(100);
    });

    it('bulk selectBatch (100+ operations) should complete in reasonable time', () => {
      const batch = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        action: 'add' as const,
      }));
      const start = performance.now();

      selectionManager.selectBatch(batch);

      const elapsed = performance.now() - start;
      expect(selectionManager.getSelectedCount()).toBe(100);
      expect(elapsed).toBeLessThan(100);
    });
  });
});