// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchOperationManager } from '../../../graphic-editing/managers/BatchOperationManager';

function makeRect(id: string, x: number, y: number, w: number, h: number, rotation = 0) {
  const graphic: any = {
    id,
    config: {
      geometry: { x, y, width: w, height: h, rotation, scale: 1 },
      id,
      type: 'shape',
    },
    getPosition: () => ({ x: graphic.config.geometry.x, y: graphic.config.geometry.y }),
    setPosition: function (nx: number, ny: number) { this.config.geometry.x = nx; this.config.geometry.y = ny; },
    getSize: () => ({ width: graphic.config.geometry.width, height: graphic.config.geometry.height }),
    setSize: function (nw: number, nh: number) { this.config.geometry.width = nw; this.config.geometry.height = nh; },
    getStyle: () => ({ fillColor: '#FFF', strokeColor: '#000' }),
    setStyle: vi.fn(),
    setRotation: function (r: number) { this.config.geometry.rotation = r; },
    getRotation: () => graphic.config.geometry.rotation,
    setProperty: vi.fn(),
    clone: function () { return makeRect('clone-' + Math.random(), x, y, w, h); },
  };
  return graphic;
}

describe('BatchOperationManager', () => {
  let manager: BatchOperationManager;

  beforeEach(() => {
    manager = new BatchOperationManager();
  });

  describe('batchMove', () => {
    it('should move all graphics by delta', () => {
      const g1 = makeRect('g1', 0, 0, 100, 80);
      const g2 = makeRect('g2', 100, 100, 120, 90);

      manager.batchMove([g1, g2], 50, 30);

      expect(g1.config.geometry.x).toBe(50);
      expect(g1.config.geometry.y).toBe(30);
      expect(g2.config.geometry.x).toBe(150);
      expect(g2.config.geometry.y).toBe(130);
    });

    it('should handle empty array', () => {
      expect(() => manager.batchMove([], 10, 10)).not.toThrow();
    });

    it('should support negative delta', () => {
      const g = makeRect('g1', 100, 100, 50, 50);
      manager.batchMove([g], -20, -30);
      expect(g.config.geometry.x).toBe(80);
      expect(g.config.geometry.y).toBe(70);
    });
  });

  describe('batchScale', () => {
    it('should scale graphics around center', () => {
      const g = makeRect('g1', 0, 0, 100, 80);
      manager.batchScale([g], 2, 2);
      expect(g.config.geometry.width).toBe(200);
      expect(g.config.geometry.height).toBe(160);
    });

    it('should scale around specified origin', () => {
      const g = makeRect('g1', 100, 100, 100, 80);
      manager.batchScale([g], 2, 2, { x: 100, y: 100 });
      expect(g.config.geometry.width).toBe(200);
      expect(g.config.geometry.height).toBe(160);
    });

    it('should handle different scale factors for x and y', () => {
      const g = makeRect('g1', 0, 0, 100, 100);
      manager.batchScale([g], 2, 1, { x: 0, y: 0 });
      expect(g.config.geometry.width).toBe(200);
      expect(g.config.geometry.height).toBe(100);
    });
  });

  describe('batchRotate', () => {
    it('should rotate graphics by specified degrees', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 200, 0, 100, 100);
      manager.batchRotate([g1, g2], 90);
      expect(g1.getRotation()).toBe(90);
      expect(g2.getRotation()).toBe(90);
    });

    it('should rotate around specified origin', () => {
      const g = makeRect('g1', 0, 0, 100, 100);
      manager.batchRotate([g], 90, { x: 0, y: 0 });
      expect(g.getRotation()).toBe(90);
    });

    it('should accumulate rotations', () => {
      const g = makeRect('g1', 0, 0, 100, 100);
      manager.batchRotate([g], 45);
      manager.batchRotate([g], 45);
      expect(g.getRotation()).toBe(90);
    });
  });

  describe('batchApplyStyle', () => {
    it('should apply style to all graphics', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 200, 0, 100, 100);
      manager.batchApplyStyle([g1, g2], { fillColor: '#FF0000' });
      expect(g1.setStyle).toHaveBeenCalledWith(
        expect.objectContaining({ fillColor: '#FF0000' })
      );
      expect(g2.setStyle).toHaveBeenCalledWith(
        expect.objectContaining({ fillColor: '#FF0000' })
      );
    });
  });

  describe('batchSetProperty', () => {
    it('should set property on all graphics', () => {
      const g1 = makeRect('g1', 0, 0, 100, 100);
      const g2 = makeRect('g2', 200, 0, 100, 100);
      manager.batchSetProperty([g1, g2], 'locked', true);
      expect(g1.setProperty).toHaveBeenCalledWith('locked', true);
      expect(g2.setProperty).toHaveBeenCalledWith('locked', true);
    });
  });

  describe('spaceEvenlyHorizontal', () => {
    it('should distribute graphics evenly horizontally', () => {
      const g1 = makeRect('g1', 0, 0, 100, 80);
      const g2 = makeRect('g2', 200, 0, 120, 80);
      const g3 = makeRect('g3', 500, 0, 80, 80);

      manager.spaceEvenlyHorizontal([g1, g2, g3], 20);

      expect(g1.config.geometry.x).toBe(0);
      expect(g2.config.geometry.x).toBe(120);
      expect(g3.config.geometry.x).toBe(260);
    });

    it('should not crash with single graphic', () => {
      const g = makeRect('g1', 0, 0, 100, 100);
      expect(() => manager.spaceEvenlyHorizontal([g])).not.toThrow();
    });
  });

  describe('spaceEvenlyVertical', () => {
    it('should distribute graphics evenly vertically', () => {
      const g1 = makeRect('g1', 0, 0, 100, 80);
      const g2 = makeRect('g2', 0, 200, 100, 100);
      const g3 = makeRect('g3', 0, 500, 100, 60);

      manager.spaceEvenlyVertical([g1, g2, g3], 20);

      expect(g1.config.geometry.y).toBe(0);
      expect(g2.config.geometry.y).toBe(100);
      expect(g3.config.geometry.y).toBe(220);
    });
  });

  describe('smartPaste', () => {
    it('should paste graphic with horizontal spacing', () => {
      const g = makeRect('src', 0, 0, 100, 80);
      (g as any).clone = function () {
        return makeRect('pasted-' + Math.random(), 0, 0, 100, 80);
      };

      const result = manager.smartPaste([g], {
        direction: 'horizontal',
        spacing: 10,
        count: 2,
      });

      expect(result.length).toBe(2);
    });

    it('should paste graphic with vertical spacing', () => {
      const g = makeRect('src', 0, 0, 100, 80);
      const result = manager.smartPaste([g], {
        direction: 'vertical',
        spacing: 10,
        count: 2,
      });
      expect(result.length).toBe(2);
    });
  });
});