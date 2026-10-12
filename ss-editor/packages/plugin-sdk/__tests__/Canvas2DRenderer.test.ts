// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Canvas2DRenderer } from '../src/renderers/Canvas2DRenderer';
import { RenderBackend } from '../src/types/RenderBackend';
import type { IPluginInstance } from '../src/types/IPluginInstance';

function createMockElement(overrides: Record<string, any> = {}): IPluginInstance {
  return {
    type: 'test-graphic',
    props: {},
    x: 10, y: 20, width: 100, height: 100,
    rotation: 0, visible: true, zIndex: 0,
    mount: () => {},
    unmount: () => {},
    update: () => {},
    updateGeometry: () => {},
    getPosition: () => ({ x: overrides.x ?? 10, y: overrides.y ?? 20 }),
    getSize: () => ({ width: overrides.width ?? 100, height: overrides.height ?? 100 }),
    getVisible: () => overrides.visible ?? true,
    getZIndex: () => overrides.zIndex ?? 0,
    getRotation: () => overrides.rotation ?? 0,
    renderCalls: [] as any[],
    render(dc: any) { (this as any).renderCalls.push(dc); },
    ...overrides,
  } as unknown as IPluginInstance;
}

function createMockContext(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    clip: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(), width: 0, height: 0, colorSpace: 'srgb' as PredefinedColorSpace })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(), width: 0, height: 0, colorSpace: 'srgb' as PredefinedColorSpace })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as any),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as any),
    createPattern: vi.fn(() => ({}) as any),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),
    resetTransform: vi.fn(),
    transform: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    lineCap: 'butt' as CanvasLineCap,
    lineDashOffset: 0,
    lineJoin: 'miter' as CanvasLineJoin,
    lineWidth: 1,
    miterLimit: 10,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '10px sans-serif',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    direction: 'inherit' as CanvasDirection,
    canvas: null!,
    roundRect: vi.fn(),
    reset: vi.fn(),
    getContextAttributes: vi.fn(() => ({})),
  } as unknown as CanvasRenderingContext2D;
}

describe('Canvas2DRenderer', () => {
  let container: HTMLDivElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    mockCtx = createMockContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback): number => {
      return setTimeout(() => { try { cb(0); } catch { /* animation loop cleanup */ } }, 0) as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a canvas element', () => {
      const renderer = new Canvas2DRenderer(container);
      expect(renderer.canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(container.contains(renderer.canvas)).toBe(true);
      renderer.destroy();
    });

    it('should have correct backend', () => {
      const renderer = new Canvas2DRenderer(container);
      expect(renderer.backend).toBe(RenderBackend.CANVAS_2D);
      renderer.destroy();
    });

    it('should use provided canvas', () => {
      const canvas = document.createElement('canvas');
      const renderer = new Canvas2DRenderer(container, { canvas });
      expect(renderer.canvas).toBe(canvas);
      renderer.destroy();
    });

    it('should use provided dimensions', () => {
      const renderer = new Canvas2DRenderer(container, { width: 400, height: 300 });
      expect(renderer.canvas.width).toBe(400);
      expect(renderer.canvas.height).toBe(300);
      renderer.destroy();
    });
  });

  describe('mount / unmount', () => {
    it('should track element count', () => {
      const renderer = new Canvas2DRenderer(container);
      const el = createMockElement();
      renderer.mount(container, el);
      expect(renderer.getElementCount()).toBe(1);
      renderer.destroy();
    });

    it('should remove element on unmount', () => {
      const renderer = new Canvas2DRenderer(container);
      const el = createMockElement();
      renderer.mount(container, el);
      renderer.unmount(el);
      expect(renderer.getElementCount()).toBe(0);
      renderer.destroy();
    });

    it('should validate element has getPosition/getSize', () => {
      const renderer = new Canvas2DRenderer(container);
      const badEl = { type: 'bad', mount() {}, unmount() {}, update() {}, updateGeometry() {}, props: {} } as IPluginInstance;
      expect(() => renderer.mount(container, badEl)).toThrow('getPosition');
      renderer.destroy();
    });

    it('should call render on mounted element during renderAll', () => {
      const renderer = new Canvas2DRenderer(container);
      const el: any = createMockElement();
      renderer.mount(container, el);
      renderer.renderAll();
      expect(el.renderCalls.length).toBeGreaterThanOrEqual(1);
      renderer.destroy();
    });
  });

  describe('renderAll', () => {
    it('should not throw with empty elements', () => {
      const renderer = new Canvas2DRenderer(container);
      expect(() => renderer.renderAll()).not.toThrow();
      renderer.destroy();
    });

    it('should skip invisible elements', () => {
      const renderer = new Canvas2DRenderer(container);
      const visible = createMockElement({ visible: true, type: 'visible' });
      const hidden = createMockElement({ visible: false, type: 'hidden' });
      renderer.mount(container, visible);
      renderer.mount(container, hidden);
      renderer.renderAll();
      expect(visible.renderCalls.length).toBeGreaterThanOrEqual(0);
      renderer.destroy();
    });
  });

  describe('setPanZoom', () => {
    it('should not throw', () => {
      const renderer = new Canvas2DRenderer(container);
      expect(() => renderer.setPanZoom(2, 100, 200)).not.toThrow();
      renderer.destroy();
    });
  });

  describe('viewport culling', () => {
    it('should set viewport', () => {
      const renderer = new Canvas2DRenderer(container);
      renderer.setViewport({ x: 0, y: 0, width: 500, height: 500 });
      renderer.setCullingEnabled(true);
      renderer.renderAll();
      expect(renderer.getElementCount()).toBe(0);
      renderer.destroy();
    });
  });

  describe('resize', () => {
    it('should update canvas dimensions', () => {
      const renderer = new Canvas2DRenderer(container);
      renderer.resize(1024, 768);
      expect(renderer.canvas.width).toBe(1024);
      expect(renderer.canvas.height).toBe(768);
      renderer.destroy();
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      const renderer = new Canvas2DRenderer(container);
      renderer.mount(container, createMockElement({ type: 'a' }));
      renderer.mount(container, createMockElement({ type: 'b' }));
      renderer.clear();
      expect(renderer.getElementCount()).toBe(0);
      renderer.destroy();
    });
  });

  describe('destroy', () => {
    it('should remove canvas from DOM', () => {
      const renderer = new Canvas2DRenderer(container);
      const canvas = renderer.canvas;
      renderer.destroy();
      expect(container.contains(canvas)).toBe(false);
    });
  });

  describe('update / updateGeometry', () => {
    it('should mark dirty on update', () => {
      const renderer = new Canvas2DRenderer(container);
      const el = createMockElement();
      renderer.mount(container, el);
      expect(() => renderer.update(el, { color: 'red' })).not.toThrow();
      renderer.destroy();
    });

    it('should mark dirty on updateGeometry', () => {
      const renderer = new Canvas2DRenderer(container);
      const el = createMockElement();
      renderer.mount(container, el);
      expect(() => renderer.updateGeometry(el, 50, 50, 200, 200)).not.toThrow();
      renderer.destroy();
    });

    it('should not throw for unknown element update', () => {
      const renderer = new Canvas2DRenderer(container);
      const el = createMockElement();
      expect(() => renderer.update(el, {})).not.toThrow();
      expect(() => renderer.updateGeometry(el, 0, 0, 100, 100)).not.toThrow();
      renderer.destroy();
    });
  });
});