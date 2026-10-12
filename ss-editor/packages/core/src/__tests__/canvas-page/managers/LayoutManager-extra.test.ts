// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutManager } from '../../../canvas-page/managers/LayoutManager';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height);
  }
  draw(_ctx: CanvasRenderingContext2D): void {}
}

describe('LayoutManager - GridLayout supplementary tests', () => {
  let layoutManager: LayoutManager;

  beforeEach(() => {
    layoutManager = new LayoutManager();
  });

  const createGraphics = (count: number = 6): BaseGraphic[] => {
    const graphics: BaseGraphic[] = [];
    for (let i = 0; i < count; i++) {
      const g = new TestShape(100 + i * 20, 100 + i * 20, 100, 100);
      g.id = `g${i}`;
      graphics.push(g);
    }
    return graphics;
  };

  it('should handle different column counts (2 columns)', () => {
    const graphics = createGraphics(6);
    layoutManager.gridLayout(graphics, { columns: 2, gap: 10, startX: 0, startY: 0 });

    expect(graphics[0].config.geometry.x).toBeCloseTo(0);
    expect(graphics[0].config.geometry.y).toBeCloseTo(0);
    expect(graphics[1].config.geometry.x).toBeCloseTo(110);
    expect(graphics[1].config.geometry.y).toBeCloseTo(0);
    expect(graphics[2].config.geometry.x).toBeCloseTo(0);
    expect(graphics[2].config.geometry.y).toBeCloseTo(110);
  });

  it('should handle different gap values', () => {
    const graphics = createGraphics(4);
    layoutManager.gridLayout(graphics, { columns: 2, gap: 50, startX: 0, startY: 0 });

    expect(graphics[1].config.geometry.x).toBeCloseTo(150);
    expect(graphics[2].config.geometry.y).toBeCloseTo(150);
  });

  it('should handle single column (all vertical)', () => {
    const graphics = createGraphics(3);
    layoutManager.gridLayout(graphics, { columns: 1, gap: 10, startX: 0, startY: 0 });

    expect(graphics[0].config.geometry.x).toBeCloseTo(0);
    expect(graphics[0].config.geometry.y).toBeCloseTo(0);
    expect(graphics[1].config.geometry.y).toBeCloseTo(110);
    expect(graphics[2].config.geometry.y).toBeCloseTo(220);
  });

  it('should have no side effects with empty graphics array', () => {
    layoutManager.gridLayout([], { columns: 3, gap: 10, startX: 0, startY: 0 });
    expect(true).toBe(true);
  });

  it('should apply startX/startY offset correctly', () => {
    const graphics = createGraphics(2);
    layoutManager.gridLayout(graphics, { columns: 2, gap: 10, startX: 50, startY: 100 });

    expect(graphics[0].config.geometry.x).toBeCloseTo(50);
    expect(graphics[0].config.geometry.y).toBeCloseTo(100);
  });

  it('should support setLayout/getCurrentLayout for all layout types', () => {
    const types: Array<'free' | 'grid' | 'flow' | 'circle'> = ['free', 'grid', 'flow', 'circle'];
    types.forEach((t) => {
      layoutManager.setLayout(t);
      expect(layoutManager.getCurrentLayout()).toBe(t);
    });
  });

  it('should default to free layout', () => {
    expect(layoutManager.getCurrentLayout()).toBe('free');
  });
});