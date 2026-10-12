// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

class TestShape extends BaseGraphic {
  constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 100) {
    super('test-shape', x, y, width, height);
  }

  draw(_ctx: CanvasRenderingContext2D): void {
  }
}

describe('BaseGraphic', () => {
  let graphic: TestShape;

  beforeEach(() => {
    graphic = new TestShape(100, 200, 300, 150);
    graphic.id = 'test-graphic-1';
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const g = new TestShape();
      expect(g.type).toBe('test-shape');
      expect(g.config.geometry.x).toBe(0);
      expect(g.config.geometry.y).toBe(0);
      expect(g.config.geometry.width).toBe(100);
      expect(g.config.geometry.height).toBe(100);
    });

    it('should initialize with custom position and size', () => {
      expect(graphic.config.geometry.x).toBe(100);
      expect(graphic.config.geometry.y).toBe(200);
      expect(graphic.config.geometry.width).toBe(300);
      expect(graphic.config.geometry.height).toBe(150);
    });

    it('should generate unique id for each instance', () => {
      const g2 = new TestShape();
      expect(g2.id).not.toBe(graphic.id);
    });

    it('should set default properties', () => {
      expect(graphic.config.locked).toBe(false);
      expect(graphic.config.visible).toBe(true);
      expect(graphic.config.zIndex).toBe(0);
      expect(graphic.config.isGroup).toBe(false);
    });
  });

  describe('getPosition / setPosition', () => {
    it('should get current position', () => {
      const pos = graphic.getPosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('should set position', () => {
      graphic.setPosition(500, 600);
      const pos = graphic.getPosition();
      expect(pos.x).toBe(500);
      expect(pos.y).toBe(600);
    });
  });

  describe('getSize / setSize', () => {
    it('should get current size', () => {
      const size = graphic.getSize();
      expect(size.width).toBe(300);
      expect(size.height).toBe(150);
    });

    it('should set size', () => {
      graphic.setSize(400, 250);
      const size = graphic.getSize();
      expect(size.width).toBe(400);
      expect(size.height).toBe(250);
    });
  });

  describe('getZIndex / setZIndex', () => {
    it('should get default zIndex', () => {
      expect(graphic.getZIndex()).toBe(0);
    });

    it('should set zIndex', () => {
      graphic.setZIndex(5);
      expect(graphic.getZIndex()).toBe(5);
    });
  });

  describe('getVisible / setVisible', () => {
    it('should get default visibility', () => {
      expect(graphic.getVisible()).toBe(true);
    });

    it('should set visibility', () => {
      graphic.setVisible(false);
      expect(graphic.getVisible()).toBe(false);
    });
  });

  describe('getLocked / setLocked', () => {
    it('should get default locked state', () => {
      expect(graphic.getLocked()).toBe(false);
    });

    it('should set locked state', () => {
      graphic.setLocked(true);
      expect(graphic.getLocked()).toBe(true);
      graphic.setLocked(false);
      expect(graphic.getLocked()).toBe(false);
    });
  });

  describe('getDisabled / setDisabled', () => {
    it('should get default disabled state', () => {
      expect(graphic.getDisabled()).toBe(false);
    });

    it('should set disabled state', () => {
      graphic.setDisabled(true);
      expect(graphic.getDisabled()).toBe(true);
    });
  });

  describe('containsPoint', () => {
    it('should return true when point is inside', () => {
      expect(graphic.containsPoint(150, 250)).toBe(true);
    });

    it('should return true for boundary points', () => {
      expect(graphic.containsPoint(100, 200)).toBe(true);
      expect(graphic.containsPoint(400, 350)).toBe(true);
    });

    it('should return false when point is outside', () => {
      expect(graphic.containsPoint(50, 50)).toBe(false);
      expect(graphic.containsPoint(500, 400)).toBe(false);
    });
  });

  describe('intersectsRegion', () => {
    it('should return true for overlapping region', () => {
      expect(graphic.intersectsRegion(150, 250, 100, 100)).toBe(true);
    });

    it('should return true for fully contained region', () => {
      expect(graphic.intersectsRegion(0, 0, 500, 500)).toBe(true);
    });

    it('should return false for non-overlapping region', () => {
      expect(graphic.intersectsRegion(1000, 1000, 100, 100)).toBe(false);
    });

    it('should return false when no geometry exists', () => {
      const g = new TestShape();
      g.config.geometry = undefined as any;
      expect(g.intersectsRegion(0, 0, 100, 100)).toBe(false);
    });
  });

  describe('getProperty / setProperty', () => {
    it('should get property with deep path', () => {
      const x = graphic.getProperty('config.geometry.x', 0);
      expect(x).toBe(100);
    });

    it('should return default value for non-existent property', () => {
      const val = graphic.getProperty('config.nonexistent.key', 'default');
      expect(val).toBe('default');
    });

    it('should set property with deep path', () => {
      graphic.setProperty('config.style.backgroundColor', '#FF0000');
      const color = graphic.getProperty('config.style.backgroundColor', '');
      expect(color).toBe('#FF0000');
    });

    it('should set property on events/dataSource/animation/children paths', () => {
      graphic.setProperty('events.type', 'click');
      expect(graphic.events.type).toBe('click');
      graphic.setProperty('dataSource.enabled', true);
      expect(graphic.dataSource.enabled).toBe(true);
    });
  });

  describe('getProps / setProps', () => {
    it('should get and set custom props', () => {
      graphic.setProps('text', 'Hello World');
      expect(graphic.getProps('text', '')).toBe('Hello World');
    });

    it('should return default for non-existent prop', () => {
      expect(graphic.getProps('nonexistent', 42)).toBe(42);
    });
  });

  describe('getStyle / setStyle', () => {
    it('should get style object', () => {
      const style = graphic.getStyle();
      expect(style).toBeDefined();
    });

    it('should set style and merge', () => {
      graphic.setStyle({ backgroundColor: '#3B82F6', fontColor: '#FFFFFF' });
      const style = graphic.getStyle();
      expect(style.backgroundColor).toBe('#3B82F6');
      expect(style.fontColor).toBe('#FFFFFF');
    });

    it('should preserve existing style when setting new', () => {
      graphic.setStyle({ backgroundColor: '#3B82F6' });
      graphic.setStyle({ fontColor: '#FFFFFF' });
      const style = graphic.getStyle();
      expect(style.backgroundColor).toBe('#3B82F6');
      expect(style.fontColor).toBe('#FFFFFF');
    });
  });

  describe('rotation', () => {
    it('should get default rotation', () => {
      expect(graphic.getRotation()).toBe(0);
    });
    it('should set absolute rotation', () => {
      graphic.setRotationAbsolute(90);
      expect(graphic.getRotation()).toBe(90);
    });

    it('should rotate relative to current', () => {
      graphic.rotate(90);
      expect(graphic.getRotation()).toBe(90);
      graphic.rotate(45);
      expect(graphic.getRotation()).toBe(135);
    });

    it('should normalize rotation to 0-359 range', () => {
      graphic.rotate(400);
      expect(graphic.getRotation()).toBe(40);
    });

    it('should handle negative rotation', () => {
      graphic.setRotationAbsolute(-90);
      expect(graphic.getRotation()).toBe(270);
    });

    it('should handle negative relative rotation', () => {
      graphic.setRotationAbsolute(45);
      graphic.rotate(-90);
      expect(graphic.getRotation()).toBe(315);
    });
  });

  describe('update', () => {
    it('should update geometry properties', () => {
      graphic.update({ geometry: { x: 200, y: 300 } });
      expect(graphic.config.geometry.x).toBe(200);
      expect(graphic.config.geometry.y).toBe(300);
    });

    it('should update visibility and lock', () => {
      graphic.update({ visible: false, locked: true });
      expect(graphic.config.visible).toBe(false);
      expect(graphic.config.locked).toBe(true);
    });

    it('should round geometry values to integers', () => {
      graphic.update({ geometry: { x: 100.7, y: 200.3 } });
      expect(graphic.config.geometry.x).toBe(101);
      expect(graphic.config.geometry.y).toBe(200);
    });

    it('should update custom props via properties field', () => {
      graphic.update({ properties: { customField: 'value' } });
      expect(graphic.config.customProps.customField).toBe('value');
    });
  });

  describe('validateProperties', () => {
    it('should throw on invalid x coordinate', () => {
      expect(() => graphic.validateProperties({ geometry: { x: 'abc' as any } }))
        .toThrow('Invalid position coordinates: x');
    });

    it('should throw on negative width', () => {
      expect(() => graphic.validateProperties({ geometry: { width: -1 } }))
        .toThrow('Size dimensions must be non-negative: width');
    });

    it('should throw on invalid scale', () => {
      expect(() => graphic.validateProperties({ geometry: { scale: 0 } }))
        .toThrow('Invalid scale value');
    });

    it('should throw on invalid zIndex', () => {
      expect(() => graphic.validateProperties({ zIndex: 'abc' as any }))
        .toThrow('Invalid zIndex value');
    });

    it('should not throw for valid properties', () => {
      expect(() => graphic.validateProperties({ geometry: { x: 100, y: 200, width: 300, height: 150 } }))
        .not.toThrow();
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should serialize to JSON with correct structure', () => {
      graphic.setPosition(200, 300);
      graphic.setProps('text', 'hello');
      const json = graphic.toJSON();

      expect(json.id).toBe('test-graphic-1');
      expect(json.type).toBe('test-shape');
      expect(json.config.geometry.x).toBe(200);
      expect(json.config.geometry.y).toBe(300);
      expect(json.config.customProps.text).toBe('hello');
    });

    it('should deserialize from JSON', () => {
      const json = graphic.toJSON();
      const restored = new TestShape();
      restored.id = graphic.id;
      restored.fromJSON(json);

      expect(restored.getPosition().x).toBe(graphic.getPosition().x);
      expect(restored.getPosition().y).toBe(graphic.getPosition().y);
      expect(restored.getSize().width).toBe(graphic.getSize().width);
    });

    it('should preserve type and version after round-trip', () => {
      graphic.config.name = 'Test Shape';
      graphic.version = '1.5';
      const json = graphic.toJSON();
      const restored = new TestShape();
      restored.id = graphic.id;
      restored.fromJSON(json);

      expect(restored.type).toBe('test-shape');
    });

    it('should exclude target field to avoid circular references', () => {
      const json = graphic.toJSON();
      expect(json.config.dataSource?.target).toBeUndefined();
    });

    it('should handle empty children gracefully', () => {
      graphic.children = undefined;
      const json = graphic.toJSON();
      expect(json.config.children).toBeUndefined();
    });
  });

  describe('font and border style', () => {
    it('should get and set font style', () => {
      graphic.setFontStyle({ fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold' });
      const font = graphic.getFontStyle();
      expect(font.fontSize).toBe(16);
      expect(font.fontFamily).toBe('Arial');
      expect(font.fontWeight).toBe('bold');
    });

    it('should get and set border style', () => {
      graphic.setBorderStyle({ borderColor: '#FF0000', borderWidth: 2, borderRadius: 5 });
      const border = graphic.getBorderStyle();
      expect(border.borderColor).toBe('#FF0000');
      expect(border.borderWidth).toBe(2);
      expect(border.borderRadius).toBe(5);
    });
  });
});