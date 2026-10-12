// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height);
  }

  draw(_ctx: CanvasRenderingContext2D): void {
    
  }
}

describe('Graphic Rotation', () => {
  let graphic: TestShape;

  beforeEach(() => {
    graphic = new TestShape(100, 100, 100, 100);
  });

  it('should get initial rotation as 0', () => {
    expect(graphic.getRotation()).toBe(0);
  });

  it('should set absolute rotation', () => {
    graphic.setRotationAbsolute(45);
    expect(graphic.getRotation()).toBe(45);

    graphic.setRotationAbsolute(90);
    expect(graphic.getRotation()).toBe(90);
  });

  it('should wrap rotation angle to 0-359 degrees when setting absolute', () => {
    graphic.setRotationAbsolute(360);
    expect(graphic.getRotation()).toBe(0);

    graphic.setRotationAbsolute(450);
    expect(graphic.getRotation()).toBe(90);

    graphic.setRotationAbsolute(-45);
    expect(graphic.getRotation()).toBe(315);
  });

  it('should rotate by specified degrees', () => {
    graphic.rotate(45);
    expect(graphic.getRotation()).toBe(45);

    graphic.rotate(45);
    expect(graphic.getRotation()).toBe(90);

    graphic.rotate(-90);
    expect(graphic.getRotation()).toBe(0);
  });

  it('should wrap rotation angle when rotating', () => {
    graphic.rotate(360);
    expect(graphic.getRotation()).toBe(0);

    graphic.rotate(450);
    expect(graphic.getRotation()).toBe(90);
  });

  it('should set rotation directly', () => {
    graphic.setRotation(180);
    expect(graphic.getRotation()).toBe(180);
  });
});

describe('Batch Operation Manager - Rotation', () => {
  let graphics: TestShape[];

  beforeEach(() => {
    const g1 = new TestShape(100, 100, 100, 100);
    g1.id = 'g1';
    const g2 = new TestShape(300, 200, 100, 100);
    g2.id = 'g2';
    const g3 = new TestShape(500, 50, 100, 100);
    g3.id = 'g3';
    graphics = [g1, g2, g3];
  });

  it('should rotate each graphic individually', () => {
    graphics.forEach(g => {
      g.rotate(45);
    });

    graphics.forEach(g => {
      expect(g.getRotation()).toBe(45);
    });
  });

  it('should set absolute rotation for each graphic', () => {
    graphics.forEach((g, _index) => {
      g.setRotationAbsolute((_index + 1) * 30);
    });

    expect(graphics[0].getRotation()).toBe(30);
    expect(graphics[1].getRotation()).toBe(60);
    expect(graphics[2].getRotation()).toBe(90);
  });

  it('should not affect locked graphics when rotating', () => {
    graphics[0].config.locked = true;
    const originalRotation = graphics[0].getRotation();

    graphics.forEach((g, _index) => {
      if (!g.getLocked()) {
        g.rotate(45);
      }
    });

    expect(graphics[0].getRotation()).toBe(originalRotation);
    expect(graphics[1].getRotation()).toBe(45);
    expect(graphics[2].getRotation()).toBe(45);
  });
});

describe('History Manager - Rotation', () => {
  let graphic: TestShape;

  beforeEach(() => {
    graphic = new TestShape(100, 100, 100, 100);
  });

  it('should support rotation operations (concept test)', () => {
    
    graphic.rotate(45);
    expect(graphic.getRotation()).toBe(45);

    graphic.rotate(-45);
    expect(graphic.getRotation()).toBe(0);
  });
});