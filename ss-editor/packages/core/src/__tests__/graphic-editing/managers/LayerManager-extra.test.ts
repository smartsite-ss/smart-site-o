// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { LayerManager } from '../../../canvas-page/managers/LayerManager';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { eventBus, Events } from '../../../utils/event/eventBus';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height);
  }
  draw(_ctx: CanvasRenderingContext2D): void {}
  containsPoint(_x: number, _y: number): boolean { return false; }
  intersectsRegion(): boolean { return false; }
}

describe('LayerManager - boundary and event supplementary tests', () => {
  let layerManager: LayerManager;
  const testPageId = 'test-page-1';

  const createGraphics = (count: number = 4): BaseGraphic[] => {
    const graphics: BaseGraphic[] = [];
    for (let i = 0; i < count; i++) {
      const g = new TestShape(0, 0, 100, 100);
      g.id = `g${i}`;
      g.config.zIndex = i;
      graphics.push(g);
    }
    return graphics;
  };

  beforeEach(() => {
    layerManager = new LayerManager();
  });

  describe('empty array operations', () => {
    it('bringToFront on empty array should not throw', () => {
      expect(() => layerManager.bringToFront([], 'g1', testPageId)).not.toThrow();
    });

    it('sendToBack on empty array should not throw', () => {
      expect(() => layerManager.sendToBack([], 'g1', testPageId)).not.toThrow();
    });

    it('bringForward on empty array should not throw', () => {
      expect(() => layerManager.bringForward([], 'g1', testPageId)).not.toThrow();
    });

    it('sendBackward on empty array should not throw', () => {
      expect(() => layerManager.sendBackward([], 'g1', testPageId)).not.toThrow();
    });
  });

  describe('non-existent graphic', () => {
    it('bringToFront with non-existent ID should not change zIndex', () => {
      const graphics = createGraphics(3);
      expect(() => layerManager.bringToFront(graphics, 'nonexist', testPageId)).not.toThrow();
      expect(graphics[0].config.zIndex).toBe(0);
      expect(graphics[1].config.zIndex).toBe(1);
      expect(graphics[2].config.zIndex).toBe(2);
    });
  });

  describe('single element array', () => {
    it('bringToFront on single graphic sets zIndex to max', () => {
      const graphics = createGraphics(1);
      layerManager.bringToFront(graphics, 'g0', testPageId);
      expect(graphics[0].config.zIndex).toBe(1);
    });

    it('bringForward on single graphic has no change', () => {
      const graphics = createGraphics(1);
      layerManager.bringForward(graphics, 'g0', testPageId);
      expect(graphics[0].config.zIndex).toBe(0);
    });
  });

  describe('boundary position operations', () => {
    it('bringForward on topmost graphic has no change', () => {
      const graphics = createGraphics(3);
      const originalZIndices = graphics.map(g => g.config.zIndex);
      layerManager.bringForward(graphics, 'g2', testPageId);
      expect(graphics[2].config.zIndex).toBe(originalZIndices[2]);
    });

    it('sendBackward on bottommost graphic has no change', () => {
      const graphics = createGraphics(3);
      layerManager.sendBackward(graphics, 'g0', testPageId);
      expect(graphics[0].config.zIndex).toBe(0);
    });
  });

  describe('event emission verification', () => {
    it('bringToFront should emit GRAPHIC_UPDATED event', () => {
      const graphics = createGraphics(3);
      const events: any[] = [];
      const listener = (payload: any) => { events.push(payload); };
      eventBus.on(Events.GRAPHIC_UPDATED, listener);

      layerManager.bringToFront(graphics, 'g0', testPageId);

      eventBus.off(Events.GRAPHIC_UPDATED, listener);

      expect(events.length).toBeGreaterThanOrEqual(1);
      const lastEvent = events[events.length - 1];
      expect(lastEvent.graphicId).toBe('g0');
    });

    it('bringForward should emit events for both swapped graphics', () => {
      const graphics = createGraphics(3);
      const events: any[] = [];
      const listener = (payload: any) => { events.push(payload); };
      eventBus.on(Events.GRAPHIC_UPDATED, listener);

      layerManager.bringForward(graphics, 'g0', testPageId);

      eventBus.off(Events.GRAPHIC_UPDATED, listener);

      const uniqueIds = new Set(events.map((e: any) => e.graphicId));
      expect(uniqueIds.size).toBe(2);
      expect(uniqueIds.has('g0')).toBe(true);
      expect(uniqueIds.has('g1')).toBe(true);
    });

    it('sendBackward should emit events for both swapped graphics', () => {
      const graphics = createGraphics(3);
      const events: any[] = [];
      const listener = (payload: any) => { events.push(payload); };
      eventBus.on(Events.GRAPHIC_UPDATED, listener);

      layerManager.sendBackward(graphics, 'g2', testPageId);

      eventBus.off(Events.GRAPHIC_UPDATED, listener);

      const uniqueIds = new Set(events.map((e: any) => e.graphicId));
      expect(uniqueIds.size).toBe(2);
      expect(uniqueIds.has('g1')).toBe(true);
      expect(uniqueIds.has('g2')).toBe(true);
    });
  });
});