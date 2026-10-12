// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartAlignManager, AlignTarget } from '../../../graphic-editing/managers/SmartAlignManager';

function makeRect(id: string, x: number, y: number, w: number, h: number) {
  const graphic: any = {
    id,
    config: {
      geometry: { x, y, width: w, height: h, rotation: 0, scale: 1 },
    },
    getPosition: function () {
      return { x: this.config.geometry.x, y: this.config.geometry.y };
    },
    setPosition: function (nx: number, ny: number) {
      this.config.geometry.x = nx;
      this.config.geometry.y = ny;
    },
    getSize: function () {
      return { width: this.config.geometry.width, height: this.config.geometry.height };
    },
    setSize: function (nw: number, nh: number) {
      this.config.geometry.width = nw;
      this.config.geometry.height = nh;
    },
    getStyle: () => ({}),
    setStyle: vi.fn(),
  };
  return graphic;
}

describe('SmartAlignManager', () => {
  let manager: SmartAlignManager;

  beforeEach(() => {
    manager = new SmartAlignManager();
  });

  describe('detectAlignTargets', () => {
    it('should detect left alignment', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 0, 200, 80, 60);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      const hasLeft = targets.some((t: AlignTarget) => t.type === 'left');
      expect(hasLeft).toBe(true);
    });

    it('should detect top alignment', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 200, 0, 80, 60);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      const hasTop = targets.some((t: AlignTarget) => t.type === 'top');
      expect(hasTop).toBe(true);
    });

    it('should detect right alignment', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 0, 200, 100, 60);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      const hasRight = targets.some((t: AlignTarget) => t.type === 'right');
      expect(hasRight).toBe(true);
    });

    it('should detect bottom alignment', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 200, 0, 100, 100);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      const hasBottom = targets.some((t: AlignTarget) => t.type === 'bottom');
      expect(hasBottom).toBe(true);
    });

    it('should detect center alignment', () => {
      const g1 = makeRect('g1', 0, 0, 200, 100);
      const g2 = makeRect('g2', 50, 200, 100, 60);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      const hasCenter = targets.some((t: AlignTarget) => t.type === 'centerX');
      expect(hasCenter).toBe(true);
    });

    it('should not detect alignment beyond snap distance', () => {
      manager.setAlignDistance(2);
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 20, 300, 100, 100);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      expect(targets.length).toBe(0);
    });

    it('should exclude self from targets', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const targets = manager.detectAlignTargets(g1, [g1]);
      expect(targets.length).toBe(0);
    });

    it('should handle graphic with null config gracefully', () => {
      const badGraphic: any = { id: 'bad', config: null };
      const targets = manager.detectAlignTargets(badGraphic, [badGraphic]);
      expect(targets).toEqual([]);
    });

    it('should handle graphic with missing geometry gracefully', () => {
      const badGraphic: any = {
        id: 'bad',
        config: {} as any,
      };
      const targets = manager.detectAlignTargets(badGraphic, [badGraphic]);
      expect(targets).toEqual([]);
    });

    it('should handle empty otherGraphics array', () => {
      const g = makeRect('g1', 100, 100, 100, 100);
      const targets = manager.detectAlignTargets(g, []);
      expect(targets.length).toBe(0);
    });
  });

  describe('applyAlignment', () => {
    it('should apply left alignment', () => {
      const g = makeRect('g1', 50, 100, 100, 80);
      manager.applyAlignment(g, { type: 'left', value: 0 });
      const pos = g.getPosition();
      expect(pos.x).toBe(0);
    });

    it('should apply right alignment', () => {
      const g = makeRect('g1', 50, 100, 100, 80);
      manager.applyAlignment(g, { type: 'right', value: 300 });
      const pos = g.getPosition();
      expect(pos.x).toBe(200);
    });

    it('should apply top alignment', () => {
      const g = makeRect('g1', 100, 50, 100, 80);
      manager.applyAlignment(g, { type: 'top', value: 0 });
      const pos = g.getPosition();
      expect(pos.y).toBe(0);
    });

    it('should apply bottom alignment', () => {
      const g = makeRect('g1', 100, 50, 100, 80);
      manager.applyAlignment(g, { type: 'bottom', value: 200 });
      const pos = g.getPosition();
      expect(pos.y).toBe(120);
    });

    it('should apply centerX alignment', () => {
      const g = makeRect('g1', 100, 50, 100, 100);
      manager.applyAlignment(g, { type: 'centerX', value: 200 });
      const pos = g.getPosition();
      expect(pos.x).toBe(150);
    });

    it('should apply centerY alignment', () => {
      const g = makeRect('g1', 100, 100, 100, 100);
      manager.applyAlignment(g, { type: 'centerY', value: 200 });
      const pos = g.getPosition();
      expect(pos.y).toBe(150);
    });

    it('should not throw with null graphic in applyAlignment', () => {
      expect(() => manager.applyAlignment(null as any, { type: 'left', value: 0 })).not.toThrow();
    });

    it('should not throw with graphic missing config in applyAlignment', () => {
      const badGraphic: any = { id: 'bad', config: null };
      expect(() => manager.applyAlignment(badGraphic, { type: 'left', value: 0 })).not.toThrow();
    });
  });

  describe('guide line management', () => {
    it('should add a guide line', () => {
      const id = manager.addGuideLine(100, 'vertical');
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('should remove a guide line', () => {
      const id = manager.addGuideLine(100, 'vertical');
      manager.removeGuideLine(id);
      expect(manager.getGuideLine(id)).toBeNull();
    });

    it('should not throw when removing non-existent guide line', () => {
      expect(() => manager.removeGuideLine('non-existent')).not.toThrow();
    });

    it('should clear all guide lines', () => {
      manager.addGuideLine(100, 'vertical');
      manager.addGuideLine(200, 'horizontal');
      manager.clearAllGuideLines();
      expect(manager.getAllGuideLines().length).toBe(0);
    });

    it('should update guide line position', () => {
      const id = manager.addGuideLine(100, 'vertical');
      manager.updateGuideLinePosition(id, 300);
      expect(manager.getGuideLine(id)?.position).toBe(300);
    });

    it('should not throw when updating non-existent guide line position', () => {
      expect(() => manager.updateGuideLinePosition('non-existent', 500)).not.toThrow();
    });

    it('should detect alignment with guide lines', () => {
      manager.setAlignDistance(8);
      manager.addGuideLine(200, 'vertical');
      const g = makeRect('g1', 200, 0, 100, 100);
      const targets = manager.detectAlignTargets(g, [g]);
      const hasLineTarget = targets.some((t: AlignTarget) => t.referenceLineId);
      expect(hasLineTarget).toBe(true);
    });

    it('should detect horizontal guide line alignment', () => {
      manager.setAlignDistance(8);
      manager.addGuideLine(150, 'horizontal');
      const g = makeRect('g1', 0, 150, 100, 100);
      const targets = manager.detectAlignTargets(g, [g]);
      expect(targets.length).toBeGreaterThan(0);
    });

    it('should detect multiple alignment targets simultaneously', () => {
      manager.setAlignDistance(8);
      manager.addGuideLine(100, 'vertical');

      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 100, 0, 100, 100);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      expect(targets.length).toBeGreaterThan(1);
    });

    it('should serialize and deserialize', () => {
      manager.addGuideLine(100, 'vertical');
      manager.addGuideLine(200, 'horizontal');
      const json = manager.toJSON();
      expect(json.length).toBe(2);

      const newManager = new SmartAlignManager();
      newManager.fromJSON(json);
      expect(newManager.getAllGuideLines().length).toBe(2);
    });

    it('should deserialize empty data gracefully', () => {
      const man = new SmartAlignManager();
      expect(() => man.fromJSON([])).not.toThrow();
      expect(man.getAllGuideLines().length).toBe(0);
    });

    it('should get all guide lines as a copy', () => {
      manager.addGuideLine(100, 'vertical');
      const lines = manager.getAllGuideLines();
      expect(lines.length).toBe(1);

      lines.push({ id: 'fake', position: 999, direction: 'horizontal' });
      expect(manager.getAllGuideLines().length).toBe(1);
    });
  });

  describe('makeSameSize', () => {
    it('should make all graphics same width and height', () => {
      const g1 = makeRect('g1', 0, 0, 50, 30);
      const g2 = makeRect('g2', 100, 100, 200, 180);
      manager.makeSameSize([g1, g2]);
      expect(g1.getSize().width).toBe(200);
      expect(g1.getSize().height).toBe(180);
      expect(g2.getSize().width).toBe(200);
      expect(g2.getSize().height).toBe(180);
    });

    it('should not crash with single graphic or empty array', () => {
      const g = makeRect('g1', 0, 0, 100, 100);
      expect(() => manager.makeSameSize([g])).not.toThrow();
      expect(() => manager.makeSameSize([])).not.toThrow();
    });
  });

  describe('makeSameWidth', () => {
    it('should make same width only', () => {
      const g1 = makeRect('g1', 0, 0, 50, 30);
      const g2 = makeRect('g2', 100, 100, 200, 100);
      manager.makeSameWidth([g1, g2]);
      expect(g1.getSize().width).toBe(200);
      expect(g2.getSize().width).toBe(200);
      expect(g1.getSize().height).toBe(30);
    });
  });

  describe('makeSameHeight', () => {
    it('should make same height only', () => {
      const g1 = makeRect('g1', 0, 0, 100, 30);
      const g2 = makeRect('g2', 100, 100, 80, 120);
      manager.makeSameHeight([g1, g2]);
      expect(g1.getSize().height).toBe(120);
      expect(g2.getSize().height).toBe(120);
    });
  });

  describe('alignToPageEdge', () => {
    it('should align to all page edges', () => {
      const g = makeRect('g1', 100, 100, 80, 60);
      manager.alignToPageEdge([g], 'left', 1920, 1080);
      expect(g.config.geometry.x).toBe(0);

      g.setPosition(100, 100);
      manager.alignToPageEdge([g], 'right', 1920, 1080);
      expect(g.config.geometry.x).toBe(1920 - 80);

      g.setPosition(100, 100);
      manager.alignToPageEdge([g], 'top', 1920, 1080);
      expect(g.config.geometry.y).toBe(0);

      g.setPosition(100, 100);
      manager.alignToPageEdge([g], 'bottom', 1920, 1080);
      expect(g.config.geometry.y).toBe(1080 - 60);
    });

    it('should respect margin', () => {
      const g = makeRect('g1', 100, 100, 80, 60);
      manager.alignToPageEdge([g], 'left', 1920, 1080, 10);
      expect(g.config.geometry.x).toBe(10);
    });
  });

  describe('centerOnPage', () => {
    it('should center both directions (default)', () => {
      const g = makeRect('g1', 100, 100, 200, 100);
      manager.centerOnPage([g], 1920, 1080);
      expect(g.config.geometry.x).toBe((1920 - 200) / 2);
      expect(g.config.geometry.y).toBe((1080 - 100) / 2);
    });

    it('should center horizontally only', () => {
      const g = makeRect('g1', 100, 100, 200, 100);
      manager.centerOnPage([g], 1920, 1080, 'horizontal');
      expect(g.config.geometry.x).toBe((1920 - 200) / 2);
      expect(g.config.geometry.y).toBe(100);
    });

    it('should center vertically only', () => {
      const g = makeRect('g1', 100, 100, 200, 100);
      manager.centerOnPage([g], 1920, 1080, 'vertical');
      expect(g.config.geometry.x).toBe(100);
      expect(g.config.geometry.y).toBe((1080 - 100) / 2);
    });

    it('should not throw with empty array in centerOnPage', () => {
      expect(() => manager.centerOnPage([], 1920, 1080)).not.toThrow();
    });

    it('should not throw with null config graphic in centerOnPage', () => {
      const badGraphic: any = {
        id: 'bad',
        config: null,
        getPosition: () => ({ x: 0, y: 0 }),
        getSize: () => ({ width: 0, height: 0 }),
        setPosition: vi.fn(),
      };
      expect(() => manager.centerOnPage([badGraphic], 1920, 1080)).not.toThrow();
    });
  });

  describe('setAlignDistance', () => {
    it('should update snap distance and affect detection', () => {
      manager.setAlignDistance(50);
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 20, 300, 100, 100);
      const targets = manager.detectAlignTargets(g2, [g1, g2]);
      expect(targets.length).toBeGreaterThan(0);

      manager.setAlignDistance(5);
      const targets2 = manager.detectAlignTargets(g2, [g1, g2]);
      expect(targets2.length).toBe(0);
    });
  });
});