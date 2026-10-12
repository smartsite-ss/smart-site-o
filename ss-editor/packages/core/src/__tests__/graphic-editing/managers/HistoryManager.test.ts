// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HistoryManager,
  AddGraphicChange,
  RemoveGraphicChange,
  UpdateGraphicChange,
  TransformGraphicChange,
  UpdatePageChange,
  GroupGraphicChange,
  ReorderGraphicChange,
  DuplicateGraphicChange,
} from '../../../graphic-editing/managers/HistoryManager';
import { BasePage } from '../../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic, GraphicFactory } from '@scada-editor/plugin-sdk';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height);
  }
  draw(_ctx: CanvasRenderingContext2D): void {
    /* Empty implementation for testing */
  }
}

/**
 * Helper: 添加图元到页面但不记录历史
 */
function addGraphicNoHistory(page: BasePage, graphic: any): void {
  // 直接操作 graphics 数组，绕过历史记录
  (page as any).graphics.push(graphic);
}

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(5);
    page = new BasePage();
  });

  it('should initialize with empty history', () => {
    expect(historyManager.canUndo()).toBe(false);
    expect(historyManager.canRedo()).toBe(false);
    expect(historyManager.getHistoryLength()).toBe(0);
  });

  it('should save and undo change', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'test-1';
    addGraphicNoHistory(page, graphic);

    const change = new AddGraphicChange(page, graphic as any);
    historyManager.saveChange(change);

    expect(historyManager.canUndo()).toBe(true);
    expect(historyManager.canRedo()).toBe(false);

    historyManager.undo();
    expect(page.getGraphicById('test-1')).toBeNull();
    expect(historyManager.canUndo()).toBe(false);
    expect(historyManager.canRedo()).toBe(true);
  });

  it('should redo after undo', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'test-2';
    addGraphicNoHistory(page, graphic);

    const change = new AddGraphicChange(page, graphic as any);
    historyManager.saveChange(change);
    historyManager.undo();
    historyManager.redo();

    expect(page.getGraphicById('test-2')).not.toBeNull();
    expect(historyManager.canUndo()).toBe(true);
    expect(historyManager.canRedo()).toBe(false);
  });

  it('should handle multiple changes', () => {
    for (let i = 0; i < 3; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `test-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    expect(historyManager.getHistoryLength()).toBe(3);
    expect(historyManager.canUndo()).toBe(true);
    expect(historyManager.canRedo()).toBe(false);

    historyManager.undo();
    historyManager.undo();
    historyManager.undo();

    expect(historyManager.canUndo()).toBe(false);
    expect(historyManager.canRedo()).toBe(true);
  });

  it('should respect max history limit', () => {
    for (let i = 0; i < 10; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `test-limit-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    expect(historyManager.getHistoryLength()).toBeLessThanOrEqual(5);
  });

  it('should clear history', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'test-clear';
    addGraphicNoHistory(page, graphic);

    const change = new AddGraphicChange(page, graphic as any);
    historyManager.saveChange(change);
    historyManager.clearHistory();

    expect(historyManager.getHistoryLength()).toBe(0);
    expect(historyManager.canUndo()).toBe(false);
    expect(historyManager.canRedo()).toBe(false);
  });

  it('should get undo and redo descriptions', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'test-desc';
    addGraphicNoHistory(page, graphic);

    const change = new AddGraphicChange(page, graphic as any);
    historyManager.saveChange(change);

    expect(historyManager.getUndoDescription()).toBe('history.addGraphic');
    expect(historyManager.getRedoDescription()).toBeNull();

    historyManager.undo();

    expect(historyManager.getUndoDescription()).toBeNull();
    expect(historyManager.getRedoDescription()).toBe('history.addGraphic');
  });

  it('should get stats', () => {
    for (let i = 0; i < 3; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `test-stats-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    const stats = historyManager.getStats();
    expect(stats.totalChanges).toBe(3);
    expect(stats.undoableChanges).toBe(3);
    expect(stats.redoableChanges).toBe(0);
    expect(stats.maxLength).toBe(5);
  });

  it('should set max history length', () => {
    for (let i = 0; i < 5; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `test-max-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    historyManager.setMaxHistoryLength(3);

    expect(historyManager.getHistoryLength()).toBe(3);
  });

  it('should truncate redo stack when new change is saved after undo', () => {
    const g1 = new TestShape(100, 100, 200, 100);
    g1.id = 'trunc-1';
    addGraphicNoHistory(page, g1);
    historyManager.saveChange(new AddGraphicChange(page, g1 as any));

    const g2 = new TestShape(200, 100, 200, 100);
    g2.id = 'trunc-2';
    addGraphicNoHistory(page, g2);
    historyManager.saveChange(new AddGraphicChange(page, g2 as any));

    expect(historyManager.getHistoryLength()).toBe(2);

    historyManager.undo();
    expect(historyManager.canRedo()).toBe(true);

    const g3 = new TestShape(300, 100, 200, 100);
    g3.id = 'trunc-3';
    addGraphicNoHistory(page, g3);
    historyManager.saveChange(new AddGraphicChange(page, g3 as any));

    expect(historyManager.canRedo()).toBe(false);
    expect(historyManager.getHistoryLength()).toBe(2);
  });

  it('should not record extra history when AddGraphicChange undoes/redoes', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'no-extra';
    addGraphicNoHistory(page, graphic);

    const change = new AddGraphicChange(page, graphic as any);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    // undo: AddGraphicChange.undo() calls removeGraphic(id, false) → no extra history
    historyManager.undo();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(page.getGraphicById('no-extra')).toBeNull();

    // redo: AddGraphicChange.redo() calls addGraphic(graphic, true, false) → no extra history
    historyManager.redo();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(page.getGraphicById('no-extra')).not.toBeNull();
  });

  it('should not record extra history when RemoveGraphicChange undoes/redoes', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'rm-no-extra';
    addGraphicNoHistory(page, graphic);

    // 先移除图元（不记录历史），然后保存变更
    page.removeGraphic('rm-no-extra', false);
    const change = new RemoveGraphicChange(page, graphic as any);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(page.getGraphicById('rm-no-extra')).toBeNull();

    // undo: RemoveGraphicChange.undo() calls addGraphic(graphic, true, false) → no extra history
    historyManager.undo();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(page.getGraphicById('rm-no-extra')).not.toBeNull();

    // redo: RemoveGraphicChange.redo() calls removeGraphic(id, false) → no extra history
    historyManager.redo();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(page.getGraphicById('rm-no-extra')).toBeNull();
  });
});

describe('CompositeChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
  });

  it('should group multiple changes into single undo step', () => {
    historyManager.startBatch('Batch add graphics');

    for (let i = 0; i < 3; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `batch-test-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    historyManager.endBatch();

    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);

    historyManager.undo();

    expect(page.getGraphicById('batch-test-0')).toBeNull();
    expect(page.getGraphicById('batch-test-1')).toBeNull();
    expect(page.getGraphicById('batch-test-2')).toBeNull();
  });

  it('should redo composite change', () => {
    historyManager.startBatch('Batch add');

    for (let i = 0; i < 2; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `batch-redo-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    historyManager.endBatch();
    historyManager.undo();
    historyManager.redo();

    expect(page.getGraphicById('batch-redo-0')).not.toBeNull();
    expect(page.getGraphicById('batch-redo-1')).not.toBeNull();
  });

  it('should handle empty batch gracefully', () => {
    historyManager.startBatch('Empty batch operation');
    historyManager.endBatch();

    expect(historyManager.getHistoryLength()).toBe(0);
  });

  it('should check if in batch mode', () => {
    expect(historyManager.isInBatch()).toBe(false);

    historyManager.startBatch('Test batch');
    expect(historyManager.isInBatch()).toBe(true);

    historyManager.endBatch();
    expect(historyManager.isInBatch()).toBe(false);
  });

  it('should get composite change description', () => {
    historyManager.startBatch('Custom description');

    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'batch-desc';
    addGraphicNoHistory(page, graphic);
    const change = new AddGraphicChange(page, graphic as any);
    historyManager.saveChange(change);

    historyManager.endBatch();

    expect(historyManager.getUndoDescription()).toBe('Custom description');
  });

  it('should nest batch operations correctly', () => {
    historyManager.startBatch('Outer batch');

    for (let i = 0; i < 2; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `nested-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    historyManager.endBatch();

    expect(historyManager.getHistoryLength()).toBe(1);

    historyManager.undo();

    expect(page.getGraphicById('nested-0')).toBeNull();
    expect(page.getGraphicById('nested-1')).toBeNull();
  });

  it('should redo nested batch operations', () => {
    historyManager.startBatch('Outer batch');

    for (let i = 0; i < 2; i++) {
      const graphic = new TestShape(100 + i * 50, 100, 200, 100);
      graphic.id = `redo-nested-${i}`;
      addGraphicNoHistory(page, graphic);
      const change = new AddGraphicChange(page, graphic as any);
      historyManager.saveChange(change);
    }

    historyManager.endBatch();

    historyManager.undo();
    expect(page.getGraphicById('redo-nested-0')).toBeNull();
    expect(page.getGraphicById('redo-nested-1')).toBeNull();

    historyManager.redo();
    expect(page.getGraphicById('redo-nested-0')).not.toBeNull();
    expect(page.getGraphicById('redo-nested-1')).not.toBeNull();
    expect(historyManager.getHistoryLength()).toBe(1);
  });

  it('should undo/redo withBatch wrapper correctly', () => {
    const result = historyManager.withBatch('Wrapper batch', () => {
      for (let i = 0; i < 2; i++) {
        const graphic = new TestShape(100 + i * 50, 100, 200, 100);
        graphic.id = `wrapper-${i}`;
        addGraphicNoHistory(page, graphic);
        const change = new AddGraphicChange(page, graphic as any);
        historyManager.saveChange(change);
      }
      return 'done';
    });

    expect(result).toBe('done');
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.getUndoDescription()).toBe('Wrapper batch');

    historyManager.undo();
    expect(page.getGraphicById('wrapper-0')).toBeNull();
    expect(page.getGraphicById('wrapper-1')).toBeNull();

    historyManager.redo();
    expect(page.getGraphicById('wrapper-0')).not.toBeNull();
    expect(page.getGraphicById('wrapper-1')).not.toBeNull();
  });
});

describe('UpdateGraphicChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
  });

  it('should undo and redo update changes with history integrity', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'update-test';
    graphic.config.style = { fill: 'red' };
    addGraphicNoHistory(page, graphic);

    const oldProperties = { geometry: { x: 100, y: 100 }, style: { fill: 'red' } };
    const newProperties = { geometry: { x: 150, y: 150 }, style: { fill: 'blue' } };

    const change = new UpdateGraphicChange(page, 'update-test', oldProperties, newProperties);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    historyManager.undo();
    expect(graphic.config.style.fill).toBe('red');
    expect(graphic.config.geometry.x).toBe(100);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canRedo()).toBe(true);

    historyManager.redo();
    expect(graphic.config.style.fill).toBe('blue');
    expect(graphic.config.geometry.x).toBe(150);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);
  });

  it('should support multiple undo/redo cycles for update', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'update-cycle';
    graphic.config.style = { fill: 'red' };
    addGraphicNoHistory(page, graphic);

    const oldProperties = { style: { fill: 'red' } };
    const newProperties = { style: { fill: 'blue' } };

    const change = new UpdateGraphicChange(page, 'update-cycle', oldProperties, newProperties);
    historyManager.saveChange(change);

    for (let i = 0; i < 3; i++) {
      historyManager.undo();
      expect(graphic.config.style.fill).toBe('red');
      expect(historyManager.getHistoryLength()).toBe(1);
      historyManager.redo();
      expect(graphic.config.style.fill).toBe('blue');
      expect(historyManager.getHistoryLength()).toBe(1);
    }
  });
});

describe('RemoveGraphicChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
  });

  it('should undo (restore) and redo (remove) graphic', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'remove-test';
    addGraphicNoHistory(page, graphic);

    // 先移除图元（不记录历史），再保存 RemoveGraphicChange 代表此次移除
    page.removeGraphic('remove-test', false);
    expect(page.getGraphicById('remove-test')).toBeNull();

    const change = new RemoveGraphicChange(page, graphic as any);
    historyManager.saveChange(change);

    // undo: 恢复被移除的图元
    historyManager.undo();
    expect(page.getGraphicById('remove-test')).not.toBeNull();

    // redo: 再次移除
    historyManager.redo();
    expect(page.getGraphicById('remove-test')).toBeNull();
  });
});

describe('TransformGraphicChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
  });

  it('should undo and redo geometry transform with history integrity', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'transform-test';
    addGraphicNoHistory(page, graphic);

    const oldTransform = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };
    const newTransform = { x: 200, y: 200, width: 300, height: 150, rotation: 45 };

    const change = new TransformGraphicChange(page, 'transform-test', oldTransform, newTransform);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    const g = page.getGraphicById('transform-test');

    historyManager.undo();
    expect(g!.config.geometry.x).toBe(100);
    expect(g!.config.geometry.y).toBe(100);
    expect(g!.config.geometry.width).toBe(200);
    expect(g!.config.geometry.rotation).toBe(0);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canRedo()).toBe(true);

    historyManager.redo();
    expect(g!.config.geometry.x).toBe(200);
    expect(g!.config.geometry.y).toBe(200);
    expect(g!.config.geometry.width).toBe(300);
    expect(g!.config.geometry.rotation).toBe(45);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);
  });

  it('should support multiple undo/redo cycles for transform', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'transform-cycle';
    addGraphicNoHistory(page, graphic);

    const oldTransform = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };
    const newTransform = { x: 200, y: 200, width: 300, height: 150, rotation: 45 };

    const change = new TransformGraphicChange(page, 'transform-cycle', oldTransform, newTransform);
    historyManager.saveChange(change);

    const g = page.getGraphicById('transform-cycle');

    for (let i = 0; i < 3; i++) {
      historyManager.undo();
      expect(g!.config.geometry.x).toBe(100);
      expect(g!.config.geometry.rotation).toBe(0);
      expect(historyManager.getHistoryLength()).toBe(1);

      historyManager.redo();
      expect(g!.config.geometry.x).toBe(200);
      expect(g!.config.geometry.rotation).toBe(45);
      expect(historyManager.getHistoryLength()).toBe(1);
    }
  });

  it('should undo/redo moveGraphic via page API with history integrity', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'move-api-test';
    addGraphicNoHistory(page, graphic);

    const hm = page.getHistoryManager();

    page.moveGraphic('move-api-test', 300, 400);
    expect(hm.getHistoryLength()).toBe(1);

    hm.undo();
    expect(graphic.config.geometry.x).toBe(100);
    expect(graphic.config.geometry.y).toBe(100);
    expect(hm.getHistoryLength()).toBe(1);
    expect(hm.canRedo()).toBe(true);

    hm.redo();
    expect(graphic.config.geometry.x).toBe(300);
    expect(graphic.config.geometry.y).toBe(400);
    expect(hm.getHistoryLength()).toBe(1);
  });

  it('should undo/redo resizeGraphic via page API with history integrity', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'resize-api-test';
    addGraphicNoHistory(page, graphic);

    const hm = page.getHistoryManager();

    page.resizeGraphic('resize-api-test', 400, 300);
    expect(hm.getHistoryLength()).toBe(1);

    hm.undo();
    expect(graphic.config.geometry.width).toBe(200);
    expect(graphic.config.geometry.height).toBe(100);
    expect(hm.getHistoryLength()).toBe(1);
    expect(hm.canRedo()).toBe(true);

    hm.redo();
    expect(graphic.config.geometry.width).toBe(400);
    expect(graphic.config.geometry.height).toBe(300);
    expect(hm.getHistoryLength()).toBe(1);
  });

  it('should support multiple cycles of moveGraphic undo/redo via page API', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'move-cycle-api';
    addGraphicNoHistory(page, graphic);

    const hm = page.getHistoryManager();

    page.moveGraphic('move-cycle-api', 500, 600);

    for (let i = 0; i < 3; i++) {
      hm.undo();
      expect(graphic.config.geometry.x).toBe(100);
      expect(graphic.config.geometry.y).toBe(100);
      expect(hm.getHistoryLength()).toBe(1);

      hm.redo();
      expect(graphic.config.geometry.x).toBe(500);
      expect(graphic.config.geometry.y).toBe(600);
      expect(hm.getHistoryLength()).toBe(1);
    }
  });
});

describe('UpdatePageChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
  });

  it('should undo and redo page property changes with history integrity', () => {
    const oldProps = { width: 1920, height: 1080, backgroundColor: '#ffffff' };
    const newProps = { width: 1280, height: 720, backgroundColor: '#000000' };

    const change = new UpdatePageChange(page, oldProps, newProps);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    historyManager.undo();
    expect(page.width).toBe(1920);
    expect(page.height).toBe(1080);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canRedo()).toBe(true);

    historyManager.redo();
    expect(page.width).toBe(1280);
    expect(page.height).toBe(720);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);
  });
});

describe('GroupGraphicChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
  });

  it('should undo grouping (ungroup) and redo (regroup) with history integrity', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'group-test';
    addGraphicNoHistory(page, graphic);

    const change = new GroupGraphicChange(page, 'group-1', ['group-test'], true);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    // undo: ungroup (isGrouping=true → ungroup)
    historyManager.undo();
    expect(page.getGraphicById('group-test')).not.toBeNull();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canRedo()).toBe(true);
    expect(historyManager.canUndo()).toBe(false); // only one change, undone

    // redo: regroup (isGrouping=true → group)
    historyManager.redo();
    expect(page.getGraphicById('group-test')).not.toBeNull();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);
    expect(historyManager.canRedo()).toBe(false);
  });

  it('should undo ungrouping (regroup) and redo (ungroup) with history integrity', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'ungroup-test';
    addGraphicNoHistory(page, graphic);

    const change = new GroupGraphicChange(page, 'group-2', ['ungroup-test'], false);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    // undo: regroup (isGrouping=false → group)
    historyManager.undo();
    expect(page.getGraphicById('ungroup-test')).not.toBeNull();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canRedo()).toBe(true);

    // redo: ungroup (isGrouping=false → ungroup)
    historyManager.redo();
    expect(page.getGraphicById('ungroup-test')).not.toBeNull();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);
  });

  it('should support multiple undo/redo cycles for grouping', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'cycle-test';
    addGraphicNoHistory(page, graphic);

    const change = new GroupGraphicChange(page, 'group-3', ['cycle-test'], true);
    historyManager.saveChange(change);

    // Cycle 1
    historyManager.undo();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canRedo()).toBe(true);

    historyManager.redo();
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);

    // Cycle 2
    historyManager.undo();
    expect(historyManager.getHistoryLength()).toBe(1);

    historyManager.redo();
    expect(historyManager.getHistoryLength()).toBe(1);
  });
});

describe('ReorderGraphicChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
  });

  it('should undo and redo graphic reorder with correct zIndex', () => {
    const g1 = new TestShape(100, 100, 200, 100);
    g1.id = 'reorder-1';
    g1.config.zIndex = 0;
    addGraphicNoHistory(page, g1);
    const g2 = new TestShape(200, 100, 200, 100);
    g2.id = 'reorder-2';
    g2.config.zIndex = 1;
    addGraphicNoHistory(page, g2);

    // Initial: g1.zIndex=0, g2.zIndex=1
    expect(g1.config.zIndex).toBe(0);
    expect(g2.config.zIndex).toBe(1);

    const change = new ReorderGraphicChange(page, 'reorder-1', 0, 1);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    // undo: g1 should go back to index 0
    historyManager.undo();
    expect(g1.config.zIndex).toBe(0);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canRedo()).toBe(true);

    // redo: g1 should go to index 1
    historyManager.redo();
    expect(g1.config.zIndex).toBe(1);
    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);
  });

  it('should support multiple undo/redo cycles for reorder', () => {
    const g1 = new TestShape(100, 100, 200, 100);
    g1.id = 'reorder-cycle-1';
    g1.config.zIndex = 0;
    addGraphicNoHistory(page, g1);
    const g2 = new TestShape(200, 100, 200, 100);
    g2.id = 'reorder-cycle-2';
    g2.config.zIndex = 1;
    addGraphicNoHistory(page, g2);

    const change = new ReorderGraphicChange(page, 'reorder-cycle-1', 0, 1);
    historyManager.saveChange(change);

    // Cycle 1
    historyManager.undo();
    expect(g1.config.zIndex).toBe(0);
    historyManager.redo();
    expect(g1.config.zIndex).toBe(1);

    // Cycle 2
    historyManager.undo();
    expect(g1.config.zIndex).toBe(0);
    historyManager.redo();
    expect(g1.config.zIndex).toBe(1);
  });
});

describe('DuplicateGraphicChange', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    historyManager = new HistoryManager(10);
    page = new BasePage();
    // 注册 TestShape，使 duplicateGraphic 中 GraphicFactory.createGraphicFromJSON 能正确创建
    if (!GraphicFactory.hasGraphic('test-shape')) {
      GraphicFactory.registerGraphic('test-shape', TestShape as any, 'Test Shape', 'basic');
    }
  });

  it('should undo (remove duplicate) and redo (restore duplicate) via change class directly', () => {
    const original = new TestShape(100, 100, 200, 100);
    original.id = 'orig';
    addGraphicNoHistory(page, original);

    const duplicate = new TestShape(100, 100, 200, 100);
    duplicate.id = 'dup';

    const change = new DuplicateGraphicChange(page, original as any, duplicate as any);
    historyManager.saveChange(change);
    expect(historyManager.getHistoryLength()).toBe(1);

    // undo: remove duplicate (removeGraphic with recordHistory=false)
    historyManager.undo();
    expect(page.getGraphicById('dup')).toBeNull();
    expect(historyManager.getHistoryLength()).toBe(1);

    // redo: add duplicate back (addGraphic with recordHistory=false)
    historyManager.redo();
    expect(page.getGraphicById('dup')).not.toBeNull();
    expect(historyManager.getHistoryLength()).toBe(1);
  });

  it('should undo and redo correctly via BasePage.duplicateGraphic()', () => {
    const original = new TestShape(100, 100, 200, 100);
    original.id = 'orig';
    page.addGraphic(original as any, true, false);  // add without recording history

    // Duplicate via BasePage method
    const dupResult = page.duplicateGraphic('orig');
    expect(dupResult).not.toBeNull();
    const dupId = dupResult!.id;

    // History should have exactly 1 change (DuplicateGraphicChange)
    const hm = page.getHistoryManager();
    expect(hm.getHistoryLength()).toBe(1);

    // Undo: should remove the duplicate
    page.undo();
    expect(page.getGraphicById(dupId)).toBeNull();
    expect(hm.getHistoryLength()).toBe(1);
    expect(hm.canRedo()).toBe(true);

    // Redo: should restore the duplicate
    page.redo();
    expect(page.getGraphicById(dupId)).not.toBeNull();
    expect(hm.getHistoryLength()).toBe(1);
    expect(hm.canUndo()).toBe(true);

    // Undo again to verify history is not corrupted
    page.undo();
    expect(page.getGraphicById(dupId)).toBeNull();
    expect(hm.getHistoryLength()).toBe(1);

    // Redo again to verify redo still works
    page.redo();
    expect(page.getGraphicById(dupId)).not.toBeNull();
    expect(hm.getHistoryLength()).toBe(1);
  });

  it('should maintain correct history stack after multiple duplicate/undo/redo cycles', () => {
    const original = new TestShape(100, 100, 200, 100);
    original.id = 'orig';
    page.addGraphic(original as any, true, false);

    // First duplicate
    const dup1 = page.duplicateGraphic('orig');
    const dup1Id = dup1!.id;
    const hm = page.getHistoryManager();

    // Undo first duplicate
    page.undo();
    expect(page.getGraphicById(dup1Id)).toBeNull();

    // Redo first duplicate
    page.redo();
    expect(page.getGraphicById(dup1Id)).not.toBeNull();

    // Undo again
    page.undo();
    expect(page.getGraphicById(dup1Id)).toBeNull();
    expect(hm.getHistoryLength()).toBe(1);

    // Redo again
    page.redo();
    expect(page.getGraphicById(dup1Id)).not.toBeNull();
    expect(hm.getHistoryLength()).toBe(1);
  });
});

describe('TransformGraphicChange via batch (simulating drag operations)', () => {
  let historyManager: HistoryManager;
  let page: BasePage;

  beforeEach(() => {
    page = new BasePage();
    historyManager = page.getHistoryManager();
  });

  it('should merge single graphic drag-move into one CompositeChange', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'drag-move';
    addGraphicNoHistory(page, graphic);

    // 模拟拖拽移动：startBatch → 起始位置记录 → 鼠标松开 → 对比起始/终位 → endBatch
    page.startBatch('移动图元');

    const startPos = { x: graphic.config.geometry.x, y: graphic.config.geometry.y };
    // 拖拽结束后的最终位置
    graphic.setPosition(300, 400);

    const size = graphic.getSize();
    const rotation = graphic.config.geometry.rotation ?? 0;
    const change = new TransformGraphicChange(
      page as any,
      'drag-move',
      { x: startPos.x, y: startPos.y, width: size.width, height: size.height, rotation },
      { x: 300, y: 400, width: size.width, height: size.height, rotation },
    );
    historyManager.saveChange(change);
    page.endBatch();

    expect(historyManager.getHistoryLength()).toBe(1);
    expect(historyManager.canUndo()).toBe(true);

    // Undo: 回到起始位置
    historyManager.undo();
    expect(graphic.config.geometry.x).toBe(100);
    expect(graphic.config.geometry.y).toBe(100);
    expect(historyManager.canRedo()).toBe(true);

    // Redo: 回到拖拽后的位置
    historyManager.redo();
    expect(graphic.config.geometry.x).toBe(300);
    expect(graphic.config.geometry.y).toBe(400);
    expect(historyManager.canUndo()).toBe(true);
  });

  it('should merge multi-graphic drag-move into one CompositeChange', () => {
    const g1 = new TestShape(100, 100, 200, 100);
    g1.id = 'multi-move-1';
    addGraphicNoHistory(page, g1);
    const g2 = new TestShape(200, 200, 200, 100);
    g2.id = 'multi-move-2';
    addGraphicNoHistory(page, g2);

    page.startBatch('移动图元');

    // 记录起始位置
    const g1Start = { x: g1.config.geometry.x, y: g1.config.geometry.y };
    const g2Start = { x: g2.config.geometry.x, y: g2.config.geometry.y };

    // 拖拽结束后的最终位置
    g1.setPosition(500, 300);
    g2.setPosition(600, 400);

    for (const [g, start] of [[g1, g1Start], [g2, g2Start]] as const) {
      const s = g.getSize();
      const r = g.config.geometry?.rotation ?? 0;
      const change = new TransformGraphicChange(
        page as any,
        g.id,
        { x: start.x, y: start.y, width: s.width, height: s.height, rotation: r },
        { x: g.config.geometry.x, y: g.config.geometry.y, width: s.width, height: s.height, rotation: r },
      );
      historyManager.saveChange(change);
    }

    page.endBatch();

    expect(historyManager.getHistoryLength()).toBe(1);

    // Undo: 两个图元都回到起始位置
    historyManager.undo();
    expect(g1.config.geometry.x).toBe(100);
    expect(g1.config.geometry.y).toBe(100);
    expect(g2.config.geometry.x).toBe(200);
    expect(g2.config.geometry.y).toBe(200);
    expect(historyManager.canRedo()).toBe(true);

    // Redo: 两个图元都回到拖拽位置
    historyManager.redo();
    expect(g1.config.geometry.x).toBe(500);
    expect(g1.config.geometry.y).toBe(300);
    expect(g2.config.geometry.x).toBe(600);
    expect(g2.config.geometry.y).toBe(400);
    expect(historyManager.getHistoryLength()).toBe(1);
  });

  it('should merge drag-resize into one CompositeChange', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'drag-resize';
    addGraphicNoHistory(page, graphic);

    page.startBatch('缩放图元');

    const startGeo = {
      x: graphic.config.geometry.x,
      y: graphic.config.geometry.y,
      width: graphic.config.geometry.width,
      height: graphic.config.geometry.height,
      rotation: graphic.config.geometry.rotation ?? 0,
    };

    // 模拟缩放结束后的状态
    graphic.setSize(400, 200);
    graphic.setPosition(150, 150);

    const newGeo = {
      x: graphic.config.geometry.x,
      y: graphic.config.geometry.y,
      width: graphic.getSize().width,
      height: graphic.getSize().height,
      rotation: graphic.config.geometry.rotation ?? 0,
    };

    const change = new TransformGraphicChange(page as any, 'drag-resize', startGeo, newGeo);
    historyManager.saveChange(change);
    page.endBatch();

    expect(historyManager.getHistoryLength()).toBe(1);

    // Undo
    historyManager.undo();
    expect(graphic.config.geometry.x).toBe(100);
    expect(graphic.config.geometry.y).toBe(100);
    expect(graphic.config.geometry.width).toBe(200);
    expect(graphic.config.geometry.height).toBe(100);

    // Redo
    historyManager.redo();
    expect(graphic.config.geometry.x).toBe(150);
    expect(graphic.config.geometry.y).toBe(150);
    expect(graphic.config.geometry.width).toBe(400);
    expect(graphic.config.geometry.height).toBe(200);
  });

  it('should discard empty batch when drag has no actual movement', () => {
    // 模拟用户点击但未实际拖拽移动
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'no-move';
    addGraphicNoHistory(page, graphic);

    page.startBatch('移动图元');
    // 没有 saveChange 任何记录（因为位置未变）
    page.endBatch();

    expect(historyManager.getHistoryLength()).toBe(0);
    expect(historyManager.canUndo()).toBe(false);
  });

  it('should support multiple cycles of batch drag-move undo/redo', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'batch-cycle';
    addGraphicNoHistory(page, graphic);

    page.startBatch('移动图元');
    const startPos = { x: graphic.config.geometry.x, y: graphic.config.geometry.y };
    graphic.setPosition(400, 500);
    const s = graphic.getSize();
    const r = graphic.config.geometry.rotation ?? 0;
    historyManager.saveChange(new TransformGraphicChange(page as any, 'batch-cycle',
      { x: startPos.x, y: startPos.y, width: s.width, height: s.height, rotation: r },
      { x: 400, y: 500, width: s.width, height: s.height, rotation: r },
    ));
    page.endBatch();

    for (let i = 0; i < 3; i++) {
      historyManager.undo();
      expect(graphic.config.geometry.x).toBe(100);
      expect(graphic.config.geometry.y).toBe(100);
      expect(historyManager.getHistoryLength()).toBe(1);

      historyManager.redo();
      expect(graphic.config.geometry.x).toBe(400);
      expect(graphic.config.geometry.y).toBe(500);
      expect(historyManager.getHistoryLength()).toBe(1);
    }
  });

  it('should support jumpTo to any index within batch drag history', () => {
    const graphic = new TestShape(100, 100, 200, 100);
    graphic.id = 'jump-drag';
    addGraphicNoHistory(page, graphic);

    // 第一次拖拽: 移动到 (300, 300)
    page.startBatch('移动图元');
    graphic.setPosition(300, 300);
    const s = graphic.getSize();
    const r = graphic.config.geometry.rotation ?? 0;
    historyManager.saveChange(new TransformGraphicChange(page as any, 'jump-drag',
      { x: 100, y: 100, width: s.width, height: s.height, rotation: r },
      { x: 300, y: 300, width: s.width, height: s.height, rotation: r },
    ));
    page.endBatch();

    // 第二次拖拽: 移动到 (500, 500)
    page.startBatch('移动图元');
    graphic.setPosition(500, 500);
    historyManager.saveChange(new TransformGraphicChange(page as any, 'jump-drag',
      { x: 300, y: 300, width: s.width, height: s.height, rotation: r },
      { x: 500, y: 500, width: s.width, height: s.height, rotation: r },
    ));
    page.endBatch();

    expect(historyManager.getHistoryLength()).toBe(2);
    expect(historyManager.getCurrentIndex()).toBe(1);
    expect(graphic.config.geometry.x).toBe(500);

    // jumpTo 0 (回到第一次拖拽后的状态)
    historyManager.jumpTo(0);
    expect(historyManager.getCurrentIndex()).toBe(0);
    expect(graphic.config.geometry.x).toBe(300);

    // jumpTo -1 (回到所有拖拽之前)
    historyManager.jumpTo(-1);
    expect(historyManager.getCurrentIndex()).toBe(-1);
    expect(graphic.config.geometry.x).toBe(100);

    // jumpTo 1 (跳到第二次拖拽后)
    historyManager.jumpTo(1);
    expect(historyManager.getCurrentIndex()).toBe(1);
    expect(graphic.config.geometry.x).toBe(500);
  });
});