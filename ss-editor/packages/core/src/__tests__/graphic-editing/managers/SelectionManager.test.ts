// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionManager } from '../../../graphic-editing/managers/SelectionManager';
import { SelectionMode } from '../../../types';

describe('SelectionManager', () => {
  let manager: SelectionManager;

  beforeEach(() => {
    manager = new SelectionManager();
  });

  describe('select in SINGLE mode', () => {
    it('should replace previous selection', () => {
      manager.setMode(SelectionMode.SINGLE);
      manager.select('a');
      expect(manager.isSelected('a')).toBe(true);
      expect(manager.getSelectedCount()).toBe(1);

      manager.select('b');
      expect(manager.isSelected('a')).toBe(false);
      expect(manager.isSelected('b')).toBe(true);
      expect(manager.getSelectedCount()).toBe(1);
      expect(manager.getSelectedGraphicId()).toBe('b');
    });
  });

  describe('select in ADDITIVE mode', () => {
    it('should toggle off when selecting already-selected id', () => {
      manager.setMode(SelectionMode.ADDITIVE);
      manager.select('a');
      expect(manager.isSelected('a')).toBe(true);
      expect(manager.getSelectedCount()).toBe(1);

      manager.select('a');
      expect(manager.isSelected('a')).toBe(false);
      expect(manager.getSelectedCount()).toBe(0);
    });

    it('should add to set when selecting new id', () => {
      manager.setMode(SelectionMode.ADDITIVE);
      manager.select('a');
      manager.select('b');
      manager.select('c');
      expect(manager.getSelectedCount()).toBe(3);
      expect(manager.isSelected('a')).toBe(true);
      expect(manager.isSelected('b')).toBe(true);
      expect(manager.isSelected('c')).toBe(true);
    });
  });

  describe('select in SUBTRACTIVE mode', () => {
    it('should remove from selection set', () => {
      manager.setMode(SelectionMode.ADDITIVE);
      manager.select('a');
      manager.select('b');
      manager.select('c');
      expect(manager.getSelectedCount()).toBe(3);

      manager.setMode(SelectionMode.SUBTRACTIVE);
      manager.select('a');
      expect(manager.isSelected('a')).toBe(false);
      expect(manager.isSelected('b')).toBe(true);
      expect(manager.isSelected('c')).toBe(true);
      expect(manager.getSelectedCount()).toBe(2);
    });

    it('should not throw when removing non-selected id', () => {
      manager.setMode(SelectionMode.SUBTRACTIVE);
      expect(() => manager.select('nonexistent')).not.toThrow();
      expect(manager.getSelectedCount()).toBe(0);
    });
  });

  describe('selectMultiple in BOX mode', () => {
    it('should replace entire selection with new set', () => {
      manager.setMode(SelectionMode.SINGLE);
      manager.select('old');

      manager.setMode(SelectionMode.BOX);
      manager.selectMultiple(['x', 'y', 'z']);

      expect(manager.isSelected('old')).toBe(false);
      expect(manager.isSelected('x')).toBe(true);
      expect(manager.isSelected('y')).toBe(true);
      expect(manager.isSelected('z')).toBe(true);
      expect(manager.getSelectedCount()).toBe(3);
      expect(manager.getSelectedGraphicId()).toBe('x');
    });

    it('should handle empty array', () => {
      manager.setMode(SelectionMode.BOX);
      manager.selectMultiple([]);
      expect(manager.getSelectedCount()).toBe(0);
      expect(manager.getSelectedGraphicId()).toBeNull();
    });
  });

  describe('selectMultiple in SINGLE mode', () => {
    it('should only select the first element', () => {
      manager.setMode(SelectionMode.SINGLE);
      manager.selectMultiple(['a', 'b', 'c']);
      expect(manager.getSelectedCount()).toBe(1);
      expect(manager.isSelected('a')).toBe(true);
      expect(manager.isSelected('b')).toBe(false);
      expect(manager.isSelected('c')).toBe(false);
      expect(manager.getSelectedGraphicId()).toBe('a');
    });

    it('should clear selection for empty array', () => {
      manager.setMode(SelectionMode.SINGLE);
      manager.select('existing');
      manager.selectMultiple([]);
      expect(manager.getSelectedCount()).toBe(0);
      expect(manager.getSelectedGraphicId()).toBeNull();
    });
  });

  describe('selectMultiple in ADDITIVE mode', () => {
    it('should toggle each id', () => {
      manager.setMode(SelectionMode.ADDITIVE);
      manager.select('a');
      manager.select('c');

      manager.selectMultiple(['a', 'b']);
      expect(manager.isSelected('a')).toBe(false);
      expect(manager.isSelected('b')).toBe(true);
      expect(manager.isSelected('c')).toBe(true);
      expect(manager.getSelectedCount()).toBe(2);
    });

    it('should add when none exist', () => {
      manager.setMode(SelectionMode.ADDITIVE);
      manager.selectMultiple(['x', 'y']);
      expect(manager.getSelectedCount()).toBe(2);
    });
  });

  describe('selectBatch', () => {
    it('should add ids', () => {
      manager.selectBatch([
        { id: 'a', action: 'add' },
        { id: 'b', action: 'add' },
        { id: 'c', action: 'add' },
      ]);
      expect(manager.getSelectedCount()).toBe(3);
      expect(manager.getSelectedGraphicId()).toBe('c');
    });

    it('should remove ids', () => {
      manager.selectBatch([
        { id: 'a', action: 'add' },
        { id: 'b', action: 'add' },
        { id: 'c', action: 'add' },
      ]);
      manager.selectBatch([
        { id: 'a', action: 'remove' },
        { id: 'c', action: 'remove' },
      ]);
      expect(manager.getSelectedCount()).toBe(1);
      expect(manager.isSelected('b')).toBe(true);
    });

    it('should toggle ids', () => {
      manager.selectBatch([
        { id: 'a', action: 'add' },
        { id: 'b', action: 'add' },
      ]);
      manager.selectBatch([
        { id: 'a', action: 'toggle' },
        { id: 'c', action: 'toggle' },
      ]);
      expect(manager.isSelected('a')).toBe(false);
      expect(manager.isSelected('b')).toBe(true);
      expect(manager.isSelected('c')).toBe(true);
      expect(manager.getSelectedCount()).toBe(2);
    });

    it('should handle empty batch', () => {
      manager.selectBatch([]);
      expect(manager.getSelectedCount()).toBe(0);
    });
  });

  describe('addToSelection', () => {
    it('should add id and update selectedGraphicId', () => {
      manager.addToSelection('a');
      expect(manager.isSelected('a')).toBe(true);
      expect(manager.getSelectedGraphicId()).toBe('a');

      manager.addToSelection('b');
      expect(manager.isSelected('b')).toBe(true);
      expect(manager.getSelectedGraphicId()).toBe('b');
      expect(manager.getSelectedCount()).toBe(2);
    });

    it('should be no-op when already selected, no history entry', () => {
      manager.addToSelection('a');
      expect(manager.getSelectedCount()).toBe(1);

      manager.addToSelection('a');
      expect(manager.getSelectedCount()).toBe(1);

      expect(manager.canUndo()).toBe(true);
      manager.undo();
      expect(manager.getSelectedCount()).toBe(0);
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe('removeFromSelection', () => {
    it('should remove id and update selectedGraphicId to last remaining', () => {
      manager.addToSelection('a');
      manager.addToSelection('b');
      manager.addToSelection('c');

      manager.removeFromSelection('c');
      expect(manager.isSelected('c')).toBe(false);
      expect(manager.getSelectedGraphicId()).toBe('b');

      manager.removeFromSelection('b');
      expect(manager.isSelected('b')).toBe(false);
      expect(manager.getSelectedGraphicId()).toBe('a');
    });

    it('should set selectedGraphicId to null when removing last', () => {
      manager.addToSelection('a');
      manager.removeFromSelection('a');
      expect(manager.getSelectedGraphicId()).toBeNull();
    });

    it('should be no-op when id not selected', () => {
      manager.addToSelection('a');
      const countBefore = manager.getSelectedCount();
      manager.removeFromSelection('nonexistent');
      expect(manager.getSelectedCount()).toBe(countBefore);
    });
  });

  describe('toggleSelection', () => {
    it('should toggle presence in set', () => {
      expect(manager.isSelected('a')).toBe(false);
      manager.toggleSelection('a');
      expect(manager.isSelected('a')).toBe(true);

      manager.toggleSelection('a');
      expect(manager.isSelected('a')).toBe(false);
    });

    it('should update selectedGraphicId', () => {
      manager.addToSelection('a');
      manager.addToSelection('b');

      manager.toggleSelection('b');
      expect(manager.getSelectedGraphicId()).toBe('a');

      manager.toggleSelection('b');
      expect(manager.getSelectedGraphicId()).toBe('b');
    });
  });

  describe('clear', () => {
    it('should be no-op when nothing selected, no history entry', () => {
      manager.clear();
      expect(manager.getSelectedCount()).toBe(0);
      expect(manager.canUndo()).toBe(false);
    });

    it('should clear all and save history', () => {
      manager.addToSelection('a');
      manager.addToSelection('b');
      expect(manager.getSelectedCount()).toBe(2);

      manager.clear();
      expect(manager.getSelectedCount()).toBe(0);
      expect(manager.hasSelection()).toBe(false);
      expect(manager.getSelectedGraphicId()).toBeNull();
      expect(manager.canUndo()).toBe(true);
    });
  });

  describe('undo', () => {
    it('should undo last selection change back to initial', () => {
      manager.select('a');
      expect(manager.isSelected('a')).toBe(true);

      const result = manager.undo();
      expect(result).not.toBeNull();
      expect(manager.isSelected('a')).toBe(false);
      expect(manager.getSelectedCount()).toBe(0);
    });

    it('should return null and be no-op when cannot undo', () => {
      expect(manager.undo()).toBeNull();
      expect(manager.getSelectedCount()).toBe(0);
    });

    it('should track canUndo correctly at history start', () => {
      expect(manager.canUndo()).toBe(false);
      manager.select('a');
      expect(manager.canUndo()).toBe(true);
      manager.undo();
      expect(manager.canUndo()).toBe(false);
    });

    it('should allow undo chain through multiple operations', () => {
      manager.addToSelection('a');
      manager.addToSelection('b');
      manager.addToSelection('c');
      expect(manager.getSelectedCount()).toBe(3);

      manager.undo();
      expect(manager.getSelectedCount()).toBe(2);
      expect(manager.isSelected('c')).toBe(false);

      manager.undo();
      expect(manager.getSelectedCount()).toBe(1);
      expect(manager.isSelected('b')).toBe(false);

      manager.undo();
      expect(manager.getSelectedCount()).toBe(0);
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe('redo', () => {
    it('should restore state after undo', () => {
      manager.select('a');
      manager.select('b');
      manager.undo();

      expect(manager.canRedo()).toBe(true);
      const result = manager.redo();
      expect(result).not.toBeNull();
      expect(result!.selectedGraphicId).toBe('b');
    });

    it('should return null when cannot redo', () => {
      expect(manager.redo()).toBeNull();
    });

    it('should return null when at end of redo stack', () => {
      manager.select('a');
      manager.undo();
      manager.redo();
      expect(manager.redo()).toBeNull();
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('history truncation', () => {
    it('should truncate redo history on new action after undo', () => {
      manager.select('a');
      manager.select('b');
      manager.select('c');
      expect(manager.getSelectedGraphicId()).toBe('c');

      manager.undo();
      expect(manager.getSelectedGraphicId()).toBe('b');
      expect(manager.canRedo()).toBe(true);

      manager.select('x');
      expect(manager.getSelectedGraphicId()).toBe('x');
      expect(manager.canRedo()).toBe(false);
    });

    it('should verify redo state c is unreachable after truncation', () => {
      manager.select('a');
      manager.select('b');
      manager.select('c');

      manager.undo();
      manager.undo();
      expect(manager.getSelectedGraphicId()).toBe('a');

      manager.select('replacement');
      expect(manager.getSelectedGraphicId()).toBe('replacement');
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('max history length', () => {
    it('should keep only last 50 entries', () => {
      for (let i = 1; i <= 55; i++) {
        manager.addToSelection(`id-${i}`);
      }
      expect(manager.getSelectedCount()).toBe(55);

      for (let i = 0; i < 49; i++) {
        expect(manager.canUndo()).toBe(true);
        manager.undo();
      }
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe('subscribe callback', () => {
    it('should call callback on state change', () => {
      const cb = vi.fn();
      manager.subscribe(cb);

      manager.select('a');
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ selectedGraphicId: 'a' })
      );
    });

    it('should auto-unsubscribe with once option', () => {
      const cb = vi.fn();
      manager.subscribe(cb, 0, true);

      manager.select('a');
      manager.select('b');

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should fire higher priority callbacks first', () => {
      const order: string[] = [];
      manager.subscribe(() => order.push('low'), 10);
      manager.subscribe(() => order.push('high'), 30);
      manager.subscribe(() => order.push('medium'), 20);

      manager.select('a');
      expect(order).toEqual(['high', 'medium', 'low']);
    });

    it('should stop receiving updates after unsubscribe', () => {
      const cb = vi.fn();
      const unsubscribe = manager.subscribe(cb);

      manager.select('a');
      expect(cb).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.select('b');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should call constructor onChange callback', () => {
      const cb = vi.fn();
      const mgr = new SelectionManager(cb);

      mgr.select('x');
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('setMode', () => {
    it('should change mode and notify subscribers', () => {
      const cb = vi.fn();
      manager.subscribe(cb);

      manager.setMode(SelectionMode.ADDITIVE);
      expect(manager.getMode()).toBe(SelectionMode.ADDITIVE);
      expect(cb).toHaveBeenCalled();

      manager.setMode(SelectionMode.BOX);
      expect(manager.getMode()).toBe(SelectionMode.BOX);
    });
  });

  describe('setIsSelecting and setSelectionRect', () => {
    it('should update box selection state', () => {
      manager.setIsSelecting(true);
      expect(manager.getState().isSelecting).toBe(true);

      manager.setSelectionRect({ left: 10, top: 20, width: 100, height: 200 });
      const state = manager.getState();
      expect(state.selectionRect).toEqual({ left: 10, top: 20, width: 100, height: 200 });
    });

    it('should notify subscribers on box state changes', () => {
      const cb = vi.fn();
      manager.subscribe(cb);

      manager.setIsSelecting(true);
      expect(cb).toHaveBeenCalled();

      manager.setSelectionRect({ left: 0, top: 0, width: 50, height: 50 });
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('empty selection state', () => {
    it('should return empty set on fresh manager', () => {
      const state = manager.getState();
      expect(state.selectedGraphicId).toBeNull();
      expect(state.selectedGraphicIds).toEqual([]);
      expect(state.mode).toBe(SelectionMode.SINGLE);
      expect(state.isSelecting).toBe(false);
      expect(state.selectionRect).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    });
  });

  describe('cross-page selection simulation', () => {
    it('should support ids from different pages', () => {
      manager.setMode(SelectionMode.BOX);
      manager.selectMultiple([
        'page1-graphic1',
        'page1-graphic2',
        'page2-graphic1',
        'page3-graphic1',
      ]);

      expect(manager.getSelectedCount()).toBe(4);
      expect(manager.isSelected('page1-graphic1')).toBe(true);
      expect(manager.isSelected('page2-graphic1')).toBe(true);
      expect(manager.isSelected('page3-graphic1')).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear undo/redo history and save current state', () => {
      manager.select('a');
      manager.select('b');
      expect(manager.canUndo()).toBe(true);

      manager.clearHistory();
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
      expect(manager.getSelectedGraphicId()).toBe('b');
    });
  });

  describe('hasSelection and getSelectedCount', () => {
    it('should reflect correct selection state', () => {
      expect(manager.hasSelection()).toBe(false);
      expect(manager.getSelectedCount()).toBe(0);

      manager.addToSelection('a');
      expect(manager.hasSelection()).toBe(true);
      expect(manager.getSelectedCount()).toBe(1);

      manager.clear();
      expect(manager.hasSelection()).toBe(false);
      expect(manager.getSelectedCount()).toBe(0);
    });
  });
});