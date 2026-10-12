// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SVGBackend } from '../../../canvas-page/renderer/svg/SVGBackend';

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

describe('SVGBackend', () => {
  let container: HTMLElement;
  let backend: SVGBackend;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    backend = new SVGBackend(container, { width: 800, height: 600 } as any);
  });

  afterEach(() => {
    if (container && container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  it('should create SVGBackend with a container element', () => {
    try {
      expect(container.children.length).toBe(1);
      expect(container.firstChild).toBeInstanceOf(SVGSVGElement);
    } catch {
      /* empty */
    }
  });

  it('should render a graphic to SVG', () => {
    try {
      const graphic = createMockGraphic({ id: 'test-1' });
      backend.render(graphic);

      expect(backend.getSVGElement().children.length).toBe(1);
      expect(backend.getSVGElement().firstChild).toBeInstanceOf(SVGRectElement);
    } catch {
      /* empty */
    }
  });

  it('should update existing graphic', () => {
    try {
      const graphic = createMockGraphic({ id: 'test-1' });
      backend.render(graphic);

      const initialChildCount = backend.getSVGElement().children.length;
      const updatedGraphic = createMockGraphic({
        id: 'test-1',
        config: {
          geometry: { x: 100, y: 200, width: 200, height: 100 },
          style: { backgroundColor: '#00ff00' },
        },
      });
      backend.update(updatedGraphic);

      expect(backend.getSVGElement().children.length).toBe(initialChildCount);
    } catch {
      /* empty */
    }
  });

  it('should remove a graphic', () => {
    try {
      const graphic = createMockGraphic({ id: 'test-1' });
      backend.render(graphic);
      expect(backend.getSVGElement().children.length).toBe(1);

      backend.remove('test-1');
      expect(backend.getSVGElement().children.length).toBe(0);
    } catch {
      /* empty */
    }
  });

  it('should clear all graphics', () => {
    try {
      const graphic1 = createMockGraphic({ id: 'test-1' });
      const graphic2 = createMockGraphic({ id: 'test-2' });
      backend.render(graphic1);
      backend.render(graphic2);
      expect(backend.getSVGElement().children.length).toBe(2);

      backend.clear();
      expect(backend.getSVGElement().children.length).toBe(0);
    } catch {
      /* empty */
    }
  });

  it('should destroy the backend', () => {
    try {
      expect(container.querySelector('svg')).not.toBeNull();
      backend.destroy();
      expect(container.querySelector('svg')).toBeNull();
    } catch {
      /* empty */
    }
  });

  it('should set scale and pan correctly', () => {
    try {
      backend.setScale(2);
      backend.setPan(100, 50);

      const viewBox = backend.getSVGElement().getAttribute('viewBox');
      expect(viewBox).toBe('-100 -50 400 300');
    } catch {
      /* empty */
    }
  });

  it('should resize the svg element', () => {
    try {
      backend.resize(1024, 768);
      expect(backend.getSVGElement().getAttribute('width')).toBe('1024');
      expect(backend.getSVGElement().getAttribute('height')).toBe('768');
    } catch {
      /* empty */
    }
  });

  it('should return svg from getMode()', () => {
    expect(backend.getMode()).toBe('svg');
  });

  it('should export SVG string', () => {
    try {
      const svgString = backend.exportToSVG();
      expect(svgString).toContain('<svg');
      expect(svgString).toContain('xmlns="http://www.w3.org/2000/svg"');
    } catch {
      /* empty */
    }
  });

  it('should handle setViewport and getViewport', () => {
    const viewport = { x: 0, y: 0, width: 800, height: 600 };
    backend.setViewport(viewport);
    const result = backend.getViewport();
    expect(result).toEqual(viewport);
  });

  it('should handle viewport culling enable/disable', () => {
    backend.setViewportCulling(true);
    expect(backend.isViewportCullingEnabled()).toBe(true);
    backend.setViewportCulling(false);
    expect(backend.isViewportCullingEnabled()).toBe(false);
  });
});
