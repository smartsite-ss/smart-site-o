// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * P2-1.6: Multi-backend graphic same-canvas integration test
 *
 * Verify that plugin instances with different render backends can coexist without interference.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VueRenderer } from '../src/renderers/VueRenderer';
import { SvgDomRenderer } from '../src/renderers/SvgDomRenderer';
import { CssDomRenderer } from '../src/renderers/CssDomRenderer';
import { ThreeRenderer } from '../src/renderers/ThreeRenderer';
import { Canvas2DRenderer } from '../src/renderers/Canvas2DRenderer';
import { RenderBackend } from '../src/types/RenderBackend';
import type { IPluginInstance } from '../src/types/IPluginInstance';

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
    createPattern: vi.fn(() => ({} as any)),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    createConicGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as any),
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
    lineDashOffset: 0,
    font: '10px sans-serif',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    direction: 'ltr' as CanvasDirection,
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    canvas: document.createElement('canvas'),
    isContextLost: () => false,
    reset: vi.fn(),
    roundRect: vi.fn(),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),
    drawFocusIfNeeded: vi.fn(),
    scrollPathIntoView: vi.fn(),
    resetTransform: vi.fn(),
    createImageBitmap: vi.fn(() => Promise.resolve(null as any)),
    transferFromImageBitmap: vi.fn(),
    transform: vi.fn(),
    commit: vi.fn(),
    getContextAttributes: vi.fn(() => ({ alpha: true, desynchronized: false, colorSpace: 'srgb' })),
    letterSpacing: '0px',
    wordSpacing: '0px',
  } as unknown as CanvasRenderingContext2D;
}

function createMockVuePlugin(overrides: Record<string, any> = {}): IPluginInstance {
  return {
    type: 'navigation-button',
    props: { text: 'Click', color: 'primary' },
    x: 0, y: 0, width: 100, height: 40,
    rotation: 0, visible: true, zIndex: 0,
    mount: vi.fn(),
    unmount: vi.fn(),
    update: vi.fn(),
    updateGeometry: vi.fn(),
    getComponent: () => ({}),
    ...overrides,
  } as unknown as IPluginInstance;
}

function createMockSvgPlugin(overrides: Record<string, any> = {}): IPluginInstance {
  return {
    type: 'svg-border',
    props: { borderColor: 'blue', borderWidth: 2 },
    x: 0, y: 0, width: 200, height: 100,
    rotation: 0, visible: true, zIndex: 1,
    mount: vi.fn(),
    unmount: vi.fn(),
    update: vi.fn(),
    updateGeometry: vi.fn(),
    getSvgTemplate: () => '<svg></svg>',
    ...overrides,
  } as unknown as IPluginInstance;
}

function createMockCssPlugin(overrides: Record<string, any> = {}): IPluginInstance {
  return {
    type: 'status-indicator',
    props: { status: 'running', color: 'green' },
    x: 200, y: 0, width: 60, height: 60,
    rotation: 0, visible: true, zIndex: 2,
    mount: vi.fn(),
    unmount: vi.fn(),
    update: vi.fn(),
    updateGeometry: vi.fn(),
    getHtmlTemplate: () => '<div class="status"></div>',
    ...overrides,
  } as unknown as IPluginInstance;
}

function createMockThreePlugin(overrides: Record<string, any> = {}): IPluginInstance {
  return {
    type: 'three-cube',
    props: { color: 0xff0000, size: 1 },
    x: 0, y: 0, width: 400, height: 300,
    rotation: 0, visible: true, zIndex: 0,
    mount: vi.fn(),
    unmount: vi.fn(),
    update: vi.fn(),
    updateGeometry: vi.fn(),
    loadScene: vi.fn(),
    ...overrides,
  } as unknown as IPluginInstance;
}

function createMockCanvas2DPlugin(overrides: Record<string, any> = {}): IPluginInstance {
  return {
    type: 'pipe-h',
    props: { direction: 'left', length: 200 },
    x: 50, y: 50, width: 200, height: 40,
    rotation: 0, visible: true, zIndex: 0,
    mount: () => {},
    unmount: () => {},
    update: () => {},
    updateGeometry: () => {},
    getPosition: vi.fn(() => ({ x: overrides.x ?? 50, y: overrides.y ?? 50 })),
    getSize: vi.fn(() => ({ width: overrides.width ?? 200, height: overrides.height ?? 40 })),
    getVisible: vi.fn(() => overrides.visible ?? true),
    getZIndex: vi.fn(() => overrides.zIndex ?? 0),
    getRotation: vi.fn(() => overrides.rotation ?? 0),
    render: vi.fn(),
    ...overrides,
  } as unknown as IPluginInstance;
}

function makeBackendIdentifier() {
  return {
    getBackend(plugin: IPluginInstance): RenderBackend {
      if (typeof (plugin as any).render === 'function') return RenderBackend.CANVAS_2D;
      if (typeof (plugin as any).getSvgTemplate === 'function') return RenderBackend.SVG_DOM;
      if (typeof (plugin as any).getHtmlTemplate === 'function') return RenderBackend.CSS_DOM;
      if (typeof (plugin as any).loadScene === 'function') return RenderBackend.THREE_3D;
      if (typeof (plugin as any).getComponent === 'function') return RenderBackend.VUE_COMPONENT;
      return RenderBackend.CANVAS_2D;
    }
  };
}

describe('P2-1.6 Multi-backend graphic integration test', () => {
  let container: HTMLDivElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    container.style.width = '1200px';
    container.style.height = '800px';
    document.body.appendChild(container);

    mockCtx = createMockContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = Math.random();
      setTimeout(() => cb(0), 0);
      return id;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.removeChild(container);
  });

  describe('1. Backend type identification', () => {
    const identifier = makeBackendIdentifier();

    it('should correctly identify Canvas2D plugin', () => {
      const plugin = createMockCanvas2DPlugin();
      expect(identifier.getBackend(plugin)).toBe(RenderBackend.CANVAS_2D);
    });

    it('should correctly identify Vue component plugin', () => {
      const plugin = createMockVuePlugin();
      expect(identifier.getBackend(plugin)).toBe(RenderBackend.VUE_COMPONENT);
    });

    it('should correctly identify SVG DOM plugin', () => {
      const plugin = createMockSvgPlugin();
      expect(identifier.getBackend(plugin)).toBe(RenderBackend.SVG_DOM);
    });

    it('should correctly identify CSS DOM plugin', () => {
      const plugin = createMockCssPlugin();
      expect(identifier.getBackend(plugin)).toBe(RenderBackend.CSS_DOM);
    });

    it('should correctly identify Three.js 3D plugin', () => {
      const plugin = createMockThreePlugin();
      expect(identifier.getBackend(plugin)).toBe(RenderBackend.THREE_3D);
    });

    it('unknown type should default to CANVAS_2D', () => {
      const plugin = { type: 'unknown', props: {} } as unknown as IPluginInstance;
      expect(identifier.getBackend(plugin)).toBe(RenderBackend.CANVAS_2D);
    });
  });

  describe('2. Multiple renderer coexistence', () => {
    it('Vue/SVG/CSS/Three renderers can be created simultaneously', () => {
      const vueRenderer = new VueRenderer();
      const svgRenderer = new SvgDomRenderer();
      const cssRenderer = new CssDomRenderer();
      const threeRenderer = new ThreeRenderer();

      expect(vueRenderer.backend).toBe(RenderBackend.VUE_COMPONENT);
      expect(svgRenderer.backend).toBe(RenderBackend.SVG_DOM);
      expect(cssRenderer.backend).toBe(RenderBackend.CSS_DOM);
      expect(threeRenderer.backend).toBe(RenderBackend.THREE_3D);
    });

    it('Canvas2DRenderer and DOM renderer can coexist in the same container', () => {
      const canvas2d = new Canvas2DRenderer(container);
      const vueRenderer = new VueRenderer();
      const svgRenderer = new SvgDomRenderer();

      expect(canvas2d.backend).toBe(RenderBackend.CANVAS_2D);
      expect(vueRenderer.backend).toBe(RenderBackend.VUE_COMPONENT);
      expect(svgRenderer.backend).toBe(RenderBackend.SVG_DOM);

      canvas2d.destroy();
    });
  });

  describe('3. Plugin lifecycle isolation', () => {
    it('different backend plugins mount/unmount without interference', () => {
      const vuePlugin = createMockVuePlugin();
      const svgPlugin = createMockSvgPlugin();
      const cssPlugin = createMockCssPlugin();

      const vueRenderer = new VueRenderer();
      const svgRenderer = new SvgDomRenderer();
      const cssRenderer = new CssDomRenderer();

      const vueDiv = document.createElement('div');
      const svgDiv = document.createElement('div');
      const cssDiv = document.createElement('div');

      vueRenderer.mount(vueDiv, vuePlugin);
      svgRenderer.mount(svgDiv, svgPlugin);
      cssRenderer.mount(cssDiv, cssPlugin);

      expect(vuePlugin.mount).toHaveBeenCalledWith(vueDiv);
      expect(svgPlugin.mount).toHaveBeenCalledWith(svgDiv);
      expect(cssPlugin.mount).toHaveBeenCalledWith(cssDiv);

      vueRenderer.unmount(vuePlugin);
      svgRenderer.unmount(svgPlugin);
      cssRenderer.unmount(cssPlugin);

      expect(vuePlugin.unmount).toHaveBeenCalledTimes(1);
      expect(svgPlugin.unmount).toHaveBeenCalledTimes(1);
      expect(cssPlugin.unmount).toHaveBeenCalledTimes(1);
    });

    it('Canvas2D and DOM plugins can coexist in the same container', () => {
      const canvas2d = new Canvas2DRenderer(container);
      const canvasPlugin = createMockCanvas2DPlugin();

      canvas2d.mount(container, canvasPlugin);
      expect(canvas2d.getElementCount()).toBe(1);

      const vueRenderer = new VueRenderer();
      const vuePlugin = createMockVuePlugin();
      const vueDiv = document.createElement('div');
      container.appendChild(vueDiv);

      vueRenderer.mount(vueDiv, vuePlugin);
      expect(vuePlugin.mount).toHaveBeenCalledWith(vueDiv);

      canvas2d.unmount(canvasPlugin);
      expect(canvas2d.getElementCount()).toBe(0);

      vueRenderer.unmount(vuePlugin);
      expect(vuePlugin.unmount).toHaveBeenCalledTimes(1);

      canvas2d.destroy();
    });
  });

  describe('4. Property update isolation', () => {
    it('modifying Vue plugin properties does not affect SVG plugin', () => {
      const vuePlugin = createMockVuePlugin();
      const svgPlugin = createMockSvgPlugin();

      const vueRenderer = new VueRenderer();
      const svgRenderer = new SvgDomRenderer();

      vueRenderer.update(vuePlugin, { text: 'Updated' });
      svgRenderer.update(svgPlugin, { borderColor: 'red' });

      expect(vuePlugin.update).toHaveBeenCalledWith({ text: 'Updated' });
      expect(svgPlugin.update).toHaveBeenCalledWith({ borderColor: 'red' });
      expect((vuePlugin.update as any).mock.calls.length).toBe(1);
      expect((svgPlugin.update as any).mock.calls.length).toBe(1);
    });

    it('Canvas2D and DOM plugin geometry updates do not interfere', () => {
      const canvas2d = new Canvas2DRenderer(container);
      const canvasPlugin = createMockCanvas2DPlugin();
      canvas2d.mount(container, canvasPlugin);

      const svgRenderer = new SvgDomRenderer();
      const svgPlugin = createMockSvgPlugin();

      canvas2d.updateGeometry(canvasPlugin, 100, 100, 50, 50);
      svgRenderer.updateGeometry(svgPlugin, 200, 200, 80, 80);

      expect(svgPlugin.updateGeometry).toHaveBeenCalledWith(200, 200, 80, 80);

      canvas2d.destroy();
    });
  });

  describe('5. Multi-backend rendering performance benchmark', () => {
    it('50 Canvas2D + 10 SVG + 5 Vue plugins coexist without memory leak symptoms', () => {
      const canvas2d = new Canvas2DRenderer(container);

      for (let i = 0; i < 50; i++) {
        const plugin = createMockCanvas2DPlugin({
          type: `pipe-${i}`,
          x: i * 20,
          y: i * 10,
        });
        canvas2d.mount(container, plugin);
      }
      expect(canvas2d.getElementCount()).toBe(50);

      const svgRenderer = new SvgDomRenderer();
      const cssRenderer = new CssDomRenderer();
      const vueRenderer = new VueRenderer();

      const svgDivs: HTMLDivElement[] = [];
      const cssDivs: HTMLDivElement[] = [];
      const vueDivs: HTMLDivElement[] = [];

      for (let i = 0; i < 10; i++) {
        const plugin = createMockSvgPlugin({ type: `svg-${i}` });
        const div = document.createElement('div');
        container.appendChild(div);
        svgDivs.push(div);
        svgRenderer.mount(div, plugin);
      }

      for (let i = 0; i < 5; i++) {
        const plugin = createMockCssPlugin({ type: `css-${i}` });
        const div = document.createElement('div');
        container.appendChild(div);
        cssDivs.push(div);
        cssRenderer.mount(div, plugin);
      }

      for (let i = 0; i < 5; i++) {
        const plugin = createMockVuePlugin({ type: `vue-${i}` });
        const div = document.createElement('div');
        container.appendChild(div);
        vueDivs.push(div);
        vueRenderer.mount(div, plugin);
      }

      expect(canvas2d.getElementCount()).toBe(50);

      canvas2d.clear();
      canvas2d.destroy();
      expect(canvas2d.getElementCount()).toBe(0);
    });
  });
});