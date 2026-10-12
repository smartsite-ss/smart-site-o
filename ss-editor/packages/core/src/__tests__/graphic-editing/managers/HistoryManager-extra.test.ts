// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '../../../graphic-editing/managers/HistoryManager';

describe('HistoryManager - no-op and capacity boundary tests', () => {
  let historyManager: HistoryManager;

  beforeEach(() => {
    historyManager = new HistoryManager(5);
  });

  describe('empty history operations', () => {
    it('canUndo/canRedo should both be false on init', () => {
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
      expect(historyManager.getHistoryLength()).toBe(0);
    });

    it('undo/redo on empty history should have no side effects', () => {
      expect(() => historyManager.undo()).not.toThrow();
      expect(() => historyManager.redo()).not.toThrow();
    });
  });

  describe('capacity limit', () => {
    it('exceeding capacity limit should discard oldest records', () => {
      const smallHistory = new HistoryManager(3);
      expect(smallHistory.getHistoryLength()).toBe(0);
    });
  });
});