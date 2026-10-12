// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutManager, GridLayoutConfig } from '../../../canvas-page/managers/LayoutManager';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height); } draw(_ctx: CanvasRenderingContext2D): void { /* 测试用的空实 */ } } describe('LayoutManager', () => {
  let layoutManager: LayoutManager;

  beforeEach(() => {
    layoutManager = new LayoutManager();
  });

  const createTestGraphics = (count: number = 6): BaseGraphic[] => {
    const graphics: BaseGraphic[] = [];
    for (let i = 0; i < count; i++) {
      const graphic = new TestShape(100 + i * 20, 100 + i * 20, 100, 100);
      graphic.id = `g${i}`;
      graphics.push(graphic);
    }
    return graphics;
  };

  it('should initialize with free layout', () => {
    expect(layoutManager.getCurrentLayout()).toBe('free');
  });

  it('should set and get layout type', () => {
    layoutManager.setLayout('grid');
    expect(layoutManager.getCurrentLayout()).toBe('grid');

    layoutManager.setLayout('flow');
    expect(layoutManager.getCurrentLayout()).toBe('flow');

    layoutManager.setLayout('circle');
    expect(layoutManager.getCurrentLayout()).toBe('circle');

    layoutManager.setLayout('free');
    expect(layoutManager.getCurrentLayout()).toBe('free');
  });

  it('should apply grid layout', () => {
    const graphics = createTestGraphics(6);
    
    const config: GridLayoutConfig = {
      columns: 3,
      gap: 10,
      startX: 0,
      startY: 0
    };

    layoutManager.gridLayout(graphics, config);

    // 检查第一个图形在 (0, 0)
    expect(graphics[0].config.geometry.x).toBe(0);
    expect(graphics[0].config.geometry.y).toBe(0);

    // 检查第二列第一个图形的位置
    expect(graphics[1].config.geometry.x).toBe(110); // 0 + 100 + 10
    expect(graphics[1].config.geometry.y).toBe(0);

    // 检查第二行第一个图形的位置
    expect(graphics[3].config.geometry.x).toBe(0);
    expect(graphics[3].config.geometry.y).toBe(110); // 0 + 100 + 10
  });
});
