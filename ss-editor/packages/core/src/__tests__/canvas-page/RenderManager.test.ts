// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderManager } from '../../canvas-page/renderer/RenderManager';
import type { IRendererV2, RenderManagerConfig, RenderMode, RenderStats } from '../../canvas-page/renderer/types';

const createMockBackend = (mode: RenderMode): IRendererV2 => {
  return {
    render: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn(),
    resize: vi.fn(),
    setScale: vi.fn(),
    setPan: vi.fn(),
    getContext: vi.fn(() => null),
    setViewport: vi.fn(),
    getViewport: vi.fn(() => null),
    setViewportCulling: vi.fn(),
    isViewportCullingEnabled: vi.fn(() => false),
    setCullingBuffer: vi.fn(),
    getMode: vi.fn(() => mode),
    getStats: vi.fn((): RenderStats => ({
      fps: 60,
      drawCalls: 0,
      graphicCount: 0,
      visibleCount: 0,
      cullingEnabled: false,
      cullingRatio: 0,
      gpuMemoryEstimate: 0,
      backend: mode,
    })),
  };
};

const createMockGraphic = (overrides: Partial<any> = {}) => {
  return {
    id: 'test-1',
    type: 'shape',
    getPosition: () => ({ x: 0, y: 0 }),
    getSize: () => ({ width: 100, height: 50 }),
    getRotation: () => 0,
    getVisible: () => true,
    getZIndex: () => 0,
    config: {
      id: 'test-1',
      type: 'shape',
      geometry: { x: 0, y: 0, width: 100, height: 50 },
      style: {},
      customProps: {},
    },
    draw: () => {},
    ...overrides,
  } as any;
};

describe('RenderManager', () => {
  let manager: RenderManager;
  let svgBackend: IRendererV2;
  let webglBackend: IRendererV2;
  let config: RenderManagerConfig;

  beforeEach(() => {
    svgBackend = createMockBackend('svg');
    webglBackend = createMockBackend('webgl');
    config = {
      defaultMode: 'svg',
      autoDetect: true,
      enableFallback: true,
      allowedModes: ['svg', 'webgl'],
    };
    manager = new RenderManager(config);
  });

  it('should register and get backends', () => {
    manager.registerBackend('svg', svgBackend);
    manager.registerBackend('webgl', webglBackend);

    expect(manager.getAllBackends().length).toBe(2);
    expect(manager.getBackend('svg')).toBe(svgBackend);
    expect(manager.getBackend('webgl')).toBe(webglBackend);
  });

  it('should set active mode and get active backend', () => {
    manager.registerBackend('svg', svgBackend);
    manager.registerBackend('webgl', webglBackend);

    manager.setActiveMode('svg');
    expect(manager.getActiveBackend()).toBe(svgBackend);

    manager.setActiveMode('webgl');
    expect(manager.getActiveBackend()).toBe(webglBackend);
  });

  it('should assign optimal backend based on renderHint', () => {
    const graphic = createMockGraphic({
      config: { customProps: { renderHint: 'static' } },
    });

    expect(manager.assignOptimalBackend(graphic)).toBe('svg');
  });

  it('should fallback to default mode when no hint', () => {
    const graphicWithoutHint = createMockGraphic();

    expect(manager.assignOptimalBackend(graphicWithoutHint)).toBe('svg');
  });

  it('should dispatch render to correct backend', () => {
    manager.registerBackend('svg', svgBackend);
    const graphic = createMockGraphic();
    manager.render(graphic);

    expect(svgBackend.render).toHaveBeenCalledWith(graphic);
  });

  it('should dispatch update to correct backend', () => {
    manager.registerBackend('svg', svgBackend);
    const graphic = createMockGraphic();
    manager.render(graphic);
    manager.update(graphic);

    expect(svgBackend.update).toHaveBeenCalledWith(graphic);
  });

  it('should dispatch remove to correct backend', () => {
    manager.registerBackend('svg', svgBackend);
    const graphic = createMockGraphic({ id: 'test-1' });
    manager.render(graphic);
    manager.remove('test-1');

    expect(svgBackend.remove).toHaveBeenCalledWith('test-1');
  });

  it('should clear all backends', () => {
    manager.registerBackend('svg', svgBackend);
    manager.registerBackend('webgl', webglBackend);
    manager.clear();

    expect(svgBackend.clear).toHaveBeenCalled();
    expect(webglBackend.clear).toHaveBeenCalled();
  });

  it('should destroy all backends', () => {
    manager.registerBackend('svg', svgBackend);
    manager.registerBackend('webgl', webglBackend);
    manager.destroy();

    expect(svgBackend.destroy).toHaveBeenCalled();
    expect(webglBackend.destroy).toHaveBeenCalled();
  });

  it('should aggregate stats from all backends', () => {
    manager.registerBackend('svg', svgBackend);
    manager.registerBackend('webgl', webglBackend);

    const stats = manager.getStats();
    expect(stats.has('svg')).toBe(true);
    expect(stats.has('webgl')).toBe(true);
  });

  it('should unregister backend', () => {
    manager.registerBackend('svg', svgBackend);
    expect(manager.getBackend('svg')).toBe(svgBackend);

    manager.unregisterBackend('svg');
    expect(manager.getBackend('svg')).toBeUndefined();
  });

  it('should not crash when active backend is undefined', () => {
    const graphic = createMockGraphic();
    expect(() => {
      manager.render(graphic);
      manager.update(graphic);
      manager.remove('test-1');
      manager.clear();
      manager.destroy();
    }).not.toThrow();
  });

  it('should enforce allowedModes whitelist', () => {
    manager.registerBackend('svg', svgBackend);
    manager.setActiveMode('webgl');

    expect(manager.getActiveBackend()).toBeUndefined();
  });
});