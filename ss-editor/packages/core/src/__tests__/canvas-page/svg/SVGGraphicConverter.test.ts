// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGGraphicConverter } from '../../../canvas-page/renderer/svg/SVGGraphicConverter';
import { SVGElementPool } from '../../../canvas-page/renderer/svg/SVGElementPool';

const createMockGraphic = (overrides = {}) => {
  return {
    id: 'test-1',
    type: 'shape',
    getPosition: () => ({ x: 10, y: 20 }),
    getSize: () => ({ width: 100, height: 50 }),
    getRotation: () => 0,
    getVisible: () => true,
    getZIndex: () => 0,
    config: {
      id: 'test-1',
      type: 'shape',
      geometry: { x: 10, y: 20, width: 100, height: 50 },
      style: { backgroundColor: '#ff0000', borderColor: '#000000', borderWidth: 2, borderRadius: 4 },
    },
    draw: () => {},
    ...overrides,
  } as any;
};

describe('SVGGraphicConverter', () => {
  let converter: SVGGraphicConverter;
  let pool: SVGElementPool;

  beforeEach(() => {
    pool = new SVGElementPool();
    converter = new SVGGraphicConverter(pool);
  });

  it('should convert shape type to SVG rect element', () => {
    const graphic = createMockGraphic({ type: 'shape' });
    const element = converter.convert(graphic);

    expect(element.tagName).toBe('rect');
    expect(element.getAttribute('x')).toBe('10');
    expect(element.getAttribute('y')).toBe('20');
    expect(element.getAttribute('width')).toBe('100');
    expect(element.getAttribute('height')).toBe('50');
    expect(element.getAttribute('fill')).toBe('#ff0000');
    expect(element.getAttribute('stroke')).toBe('#000000');
    expect(element.getAttribute('stroke-width')).toBe('2');
    expect(element.getAttribute('rx')).toBe('4');
  });

  it('should convert label type to SVG text element', () => {
    const graphic = createMockGraphic({
      type: 'label',
      config: {
        geometry: { x: 10, y: 20, width: 100, height: 20 },
        style: { color: '#000000', fontSize: 16 },
        customProps: { text: 'Hello World' },
      },
    });
    const element = converter.convert(graphic);

    expect(element.tagName).toBe('text');
    expect(element.getAttribute('x')).toBe('10');
    expect(element.getAttribute('y')).toBe('36');
    expect(element.getAttribute('font-size')).toBe('16');
    expect(element.getAttribute('fill')).toBe('#000000');
    expect(element.textContent).toBe('Hello World');
  });

  it('should convert image type to SVG image element', () => {
    const graphic = createMockGraphic({
      type: 'image',
      config: {
        geometry: { x: 5, y: 5, width: 200, height: 150 },
        style: {},
        customProps: { src: 'https://example.com/image.png' },
      },
    });
    const element = converter.convert(graphic);

    expect(element.tagName).toBe('image');
    expect(element.getAttribute('x')).toBe('5');
    expect(element.getAttribute('y')).toBe('5');
    expect(element.getAttribute('width')).toBe('200');
    expect(element.getAttribute('height')).toBe('150');
    expect(element.getAttribute('href')).toBe('https://example.com/image.png');
  });

  it('should convert line type to SVG line element', () => {
    const graphic = createMockGraphic({
      type: 'line',
      config: {
        geometry: { x: 0, y: 0, width: 100, height: 100 },
        style: { borderColor: '#ff0000', borderWidth: 2 },
      },
    });
    const element = converter.convert(graphic);

    expect(element.tagName).toBe('line');
    expect(element.getAttribute('x1')).toBe('0');
    expect(element.getAttribute('y1')).toBe('0');
    expect(element.getAttribute('x2')).toBe('100');
    expect(element.getAttribute('y2')).toBe('100');
    expect(element.getAttribute('stroke')).toBe('#ff0000');
    expect(element.getAttribute('stroke-width')).toBe('2');
  });

  it('should fallback to foreignObject for unknown graphic types', () => {
    const graphic = createMockGraphic({ type: 'unknown-type' });
    const element = converter.convert(graphic);

    expect(element.tagName).toBe('foreignObject');
  });

  it('should update existing element attributes', () => {
    const graphic = createMockGraphic({ type: 'shape' });
    const element = converter.convert(graphic);

    const updatedGraphic = createMockGraphic({
      type: 'shape',
      config: {
        geometry: { x: 100, y: 200, width: 200, height: 100 },
        style: { backgroundColor: '#00ff00', borderColor: '#0000ff', borderWidth: 4 },
      },
    });

    converter.updateElement(element, updatedGraphic);

    expect(element.getAttribute('x')).toBe('100');
    expect(element.getAttribute('y')).toBe('200');
    expect(element.getAttribute('width')).toBe('200');
    expect(element.getAttribute('height')).toBe('100');
    expect(element.getAttribute('fill')).toBe('#00ff00');
    expect(element.getAttribute('stroke')).toBe('#0000ff');
    expect(element.getAttribute('stroke-width')).toBe('4');
  });

  it('should handle graphic without style gracefully', () => {
    const graphic = createMockGraphic({
      type: 'shape',
      config: { geometry: { x: 10, y: 20, width: 100, height: 50 }, style: undefined },
    });

    expect(() => {
      const element = converter.convert(graphic);
      expect(element).toBeInstanceOf(SVGElement);
    }).not.toThrow();
  });
});
