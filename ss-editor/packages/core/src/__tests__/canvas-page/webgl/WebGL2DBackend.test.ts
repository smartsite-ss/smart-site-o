// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.stubGlobal('requestAnimationFrame', (_cb: any) => 42);
vi.stubGlobal('cancelAnimationFrame', (_id: any) => {});

import { WebGL2DBackend } from '../../../canvas-page/renderer/webgl/WebGL2DBackend';

function createMockGraphic(overrides: Record<string, any> = {}) {
  return {
    id: 'graphic-1',
    type: 'shape',
    getPosition: () => ({ x: 0, y: 0 }),
    getSize: () => ({ width: 100, height: 100 }),
    getRotation: () => 0,
    getVisible: () => true,
    getZIndex: () => 0,
    getStyle: () => ({ backgroundColor: '#ff0000' }),
    config: { id: 'graphic-1', type: 'shape', geometry: { x: 0, y: 0, width: 100, height: 100 }, style: {} },
    draw: () => {},
    ...overrides,
  } as any;
}

function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 800, writable: true });
  Object.defineProperty(container, 'clientHeight', { value: 600, writable: true });
  return container;
}

describe('WebGL2DBackend', () => {
  let backend: WebGL2DBackend | null = null;

  afterEach(() => {
    if (backend) {
      backend.destroy();
      backend = null;
    }
  });

  it('should create WebGL2DBackend with container - constructor succeeds', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(backend).toBeDefined();
  });

  it('should render a graphic via fallback - render(graphic) does not throw', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    const graphic = createMockGraphic({ id: 'test-g1' });
    expect(() => backend!.render(graphic)).not.toThrow();
  });

  it('should update a graphic - update(graphic) does not throw', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    const graphic = createMockGraphic({ id: 'test-g1' });
    expect(() => backend!.update(graphic)).not.toThrow();
  });

  it('should remove a graphic - remove(id) does not throw', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    const graphic = createMockGraphic({ id: 'test-g1' });
    backend!.render(graphic);
    expect(() => backend!.remove('test-g1')).not.toThrow();
  });

  it('should clear all graphics - clear() does not throw', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    const graphic = createMockGraphic({ id: 'test-g1' });
    backend!.render(graphic);
    expect(() => backend!.clear()).not.toThrow();
  });

  it('should destroy correctly - destroy() cleans up', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(() => backend!.destroy()).not.toThrow();
    backend = null;
  });

  it("should return 'webgl' from getMode()", () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(backend!.getMode()).toBe('webgl');
  });

  it('should return stats from getStats()', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    const stats = backend!.getStats();
    expect(stats).toBeDefined();
    expect(stats.backend).toBe('webgl');
  });

  it('should set scale without throwing', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(() => backend!.setScale(2)).not.toThrow();
  });

  it('should set pan without throwing', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(() => backend!.setPan(100, 200)).not.toThrow();
  });

  it('should handle resize', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(() => backend!.resize(1024, 768)).not.toThrow();
  });

  it('should enable/disable GPU features', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(() => backend!.enableGPUFeature('gradient')).not.toThrow();
    expect(() => backend!.disableGPUFeature('gradient')).not.toThrow();
  });

  it('should toggle viewport culling', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(() => backend!.setViewportCulling(true)).not.toThrow();
    expect(() => backend!.setViewportCulling(false)).not.toThrow();
  });

  it('should set/get viewport', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    const viewport = { x: 0, y: 0, width: 400, height: 300 };
    expect(() => backend!.setViewport(viewport)).not.toThrow();
    const result = backend!.getViewport();
    expect(result).toEqual(viewport);
  });

  it('should handle getContext - returns null when WebGL unavailable', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    expect(backend!.getContext()).toBeNull();
  });

  it('should not crash when rendering many graphics rapidly - stress test', () => {
    const container = createTestContainer();
    backend = new WebGL2DBackend(container);
    const graphics = Array.from({ length: 100 }, (_, i) =>
      createMockGraphic({
        id: `stress-g${i}`,
        type: i % 3 === 0 ? 'shape' : i % 3 === 1 ? 'label' : 'shape',
      }),
    );
    expect(() => {
      for (const g of graphics) {
        backend!.render(g);
      }
      backend!.renderAll();
    }).not.toThrow();
  });
});