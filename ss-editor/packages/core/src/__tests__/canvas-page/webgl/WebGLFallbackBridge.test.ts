// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../canvas-page/renderer/CanvasRenderer', () => ({
  CanvasRenderer: vi.fn().mockImplementation((_container: HTMLElement, _options: any) => ({
    render: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn(),
  })),
}));

import { WebGLFallbackBridge } from '../../../canvas-page/renderer/webgl/WebGLFallbackBridge';
import { CanvasRenderer } from '../../../canvas-page/renderer/CanvasRenderer';

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

describe('WebGLFallbackBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create fallback bridge - constructor succeeds', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    expect(bridge).toBeDefined();
  });

  it('should report WebGL availability - isWebGLAvailable() works', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    expect(bridge.isWebGLAvailable()).toBe(false);
  });

  it('should create canvas renderer on demand - getCanvasRenderer() creates CanvasRenderer', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    const renderer = bridge.getCanvasRenderer();
    expect(renderer).toBeDefined();
    expect(CanvasRenderer).toHaveBeenCalledTimes(1);
  });

  it('should reuse canvas renderer instance - second call returns same instance', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    const renderer1 = bridge.getCanvasRenderer();
    const renderer2 = bridge.getCanvasRenderer();
    expect(renderer1).toBe(renderer2);
    expect(CanvasRenderer).toHaveBeenCalledTimes(1);
  });

  it('should render graphic using canvas fallback - renderWithFallback does not throw', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    const graphic = createMockGraphic();
    expect(() => bridge.renderWithFallback(graphic)).not.toThrow();
  });

  it('should support feature check - supportsFeature returns correct values', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    expect(bridge.supportsFeature('shadow')).toBe(false);
    expect(bridge.supportsFeature('clip-path')).toBe(false);
    expect(bridge.supportsFeature('gradient')).toBe(true);
    expect(bridge.supportsFeature('blur')).toBe(true);
  });

  it('should destroy cleanly', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    bridge.getCanvasRenderer();
    const destroySpy = vi.spyOn(bridge.getCanvasRenderer(), 'destroy');
    bridge.destroy();
    expect(destroySpy).toHaveBeenCalled();
  });

  it('should handle repeated destroy calls', () => {
    const container = document.createElement('div');
    const bridge = new WebGLFallbackBridge(container, 800, 600);
    bridge.destroy();
    expect(() => bridge.destroy()).not.toThrow();
  });
});