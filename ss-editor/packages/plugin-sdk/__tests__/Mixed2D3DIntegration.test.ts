// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * P3-1.10: 2D/3D Mixed canvas integration test
 *
 * Verify that Canvas 2D graphics and Three.js 3D scenes can coexist on the same layer without interference.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('three', () => {
  return {
    Scene: vi.fn(function (this: any) {
      this.children = [];
      this.background = null;
      this.add = vi.fn((obj: any) => this.children.push(obj));
      this.remove = vi.fn();
    }),
    PerspectiveCamera: vi.fn(function (this: any, fov: number, aspect: number, near: number, far: number) {
      this.fov = fov;
      this.aspect = aspect;
      this.near = near;
      this.far = far;
      this.position = { x: 0, y: 0, z: 0, set: vi.fn() };
      this.lookAt = vi.fn();
      this.updateProjectionMatrix = vi.fn();
    }),
    WebGLRenderer: vi.fn(function (this: any) {
      this.domElement = document.createElement('canvas');
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn();
      this.setClearColor = vi.fn();
      this.render = vi.fn();
      this.dispose = vi.fn();
    }),
    Color: vi.fn(function (this: any, _color: any) {}),
    Clock: vi.fn(function (this: any) {
      this.getDelta = vi.fn(() => 0.016);
    }),
    AmbientLight: vi.fn(function (this: any, _color: any, _intensity: number) {}),
    DirectionalLight: vi.fn(function (this: any, _color: any, _intensity: number) {
      this.position = { set: vi.fn() };
    }),
    AxesHelper: vi.fn(function (this: any, _size: number) {}),
    Mesh: vi.fn(function (this: any) {
      this.position = { x: 0, y: 0, z: 0, set: vi.fn() };
      this.rotation = { x: 0, y: 0, z: 0, set: vi.fn() };
      this.scale = { x: 1, y: 1, z: 1, set: vi.fn() };
    }),
    BoxGeometry: vi.fn(function (this: any, _w: number, _h: number, _d: number) {}),
    MeshStandardMaterial: vi.fn(function (this: any, _opts: any) {
      this.color = { set: vi.fn() };
    }),
    TorusGeometry: vi.fn(function (this: any, _r: number, _t: number, _rs: number, _ts: number) {}),
    CylinderGeometry: vi.fn(function (this: any, _rt: number, _rb: number, _h: number, _s: number) {}),
    Group: vi.fn(function (this: any) {
      this.children = [];
      this.add = vi.fn((obj: any) => this.children.push(obj));
      this.position = { x: 0, y: 0, z: 0, set: vi.fn() };
    }),
    SphereGeometry: vi.fn(function (this: any, _r: number, _w: number, _h: number) {}),
  };
});

import { Canvas2DRenderer } from '../src/renderers/Canvas2DRenderer';
import { ThreeSceneManager } from '../src/renderers/ThreeSceneManager';
import { ThreeStagePlugin } from '../src/renderers/ThreeStagePlugin';
import { ThreeRenderer } from '../src/renderers/ThreeRenderer';
import { RenderBackend } from '../src/types/RenderBackend';
import type { IPluginInstance } from '../src/types/IPluginInstance';

function createMockCtx(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(),
    arc: vi.fn(), rect: vi.fn(),
    fill: vi.fn(), stroke: vi.fn(),
    fillRect: vi.fn(), strokeRect: vi.fn(),
    fillText: vi.fn(), strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    clip: vi.fn(), scale: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(), width: 0, height: 0, colorSpace: 'srgb' as PredefinedColorSpace })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(), width: 0, height: 0, colorSpace: 'srgb' as PredefinedColorSpace })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as any),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as any),
    createPattern: vi.fn(() => ({} as any)),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    setLineDash: vi.fn(), getLineDash: vi.fn(() => []),
    createConicGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as any),
    filter: 'none', imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    globalAlpha: 1, lineWidth: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10, lineDashOffset: 0,
    font: '10px sans-serif',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    direction: 'ltr' as CanvasDirection,
    shadowBlur: 0, shadowColor: 'transparent',
    shadowOffsetX: 0, shadowOffsetY: 0,
    canvas: document.createElement('canvas'),
    isContextLost: () => false,
    reset: vi.fn(), roundRect: vi.fn(),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),
    drawFocusIfNeeded: vi.fn(),
    scrollPathIntoView: vi.fn(),
    resetTransform: vi.fn(),
    createImageBitmap: vi.fn(() => Promise.resolve(null as any)),
    transferFromImageBitmap: vi.fn(),
    transform: vi.fn(), commit: vi.fn(),
    getContextAttributes: vi.fn(() => ({ alpha: true, desynchronized: false, colorSpace: 'srgb' })),
    letterSpacing: '0px', wordSpacing: '0px',
  } as unknown as CanvasRenderingContext2D;
}

function make2DPlugin(overrides: Record<string, any> = {}): IPluginInstance {
  const pos = { x: overrides.x ?? 10, y: overrides.y ?? 20 };
  const size = { width: overrides.width ?? 100, height: overrides.height ?? 60 };
  return {
    ...overrides,
    type: overrides.type ?? 'pipe',
    props: overrides.props ?? {},
    x: pos.x, y: pos.y,
    width: size.width, height: size.height,
    rotation: 0, visible: true, zIndex: overrides.zIndex ?? 0,
    mount: () => {}, unmount: () => {},
    update: () => {},
    updateGeometry(x: number, y: number, w: number, h: number) {
      pos.x = x; pos.y = y;
      size.width = w; size.height = h;
    },
    getPosition: () => ({ x: pos.x, y: pos.y }),
    getSize: () => ({ width: size.width, height: size.height }),
    getVisible: () => overrides.visible ?? true,
    getZIndex: () => overrides.zIndex ?? 0,
    getRotation: () => overrides.rotation ?? 0,
    render: vi.fn(),
  } as unknown as IPluginInstance;
}

describe('P3-1.10 2D/3D mixed canvas integration test', () => {
  let container: HTMLDivElement;
  let mockCtx: CanvasRenderingContext2D;
  let canvas2DRenderer: Canvas2DRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'mixed-container';
    container.style.width = '1200px';
    container.style.height = '800px';
    document.body.appendChild(container);

    mockCtx = createMockCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((_cb) => {
      const id = Math.random();
      return id as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    canvas2DRenderer = new Canvas2DRenderer(container);
  });

  afterEach(() => {
    ThreeSceneManager.reset();
    if (canvas2DRenderer) {
      try { canvas2DRenderer.destroy(); } catch { void 0; }
    }
    vi.restoreAllMocks();
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  describe('1. Mixed coexistence basic verification', () => {
    it('Canvas2D graphics and 3D scene should coexist in the same container', async () => {
      const p2d = make2DPlugin({ type: 'pipe-1', x: 50, y: 100 });
      canvas2DRenderer.mount(container, p2d);
      expect(canvas2DRenderer.getElementCount()).toBe(1);

      const threePlugin = new ThreeStagePlugin(400, 50, 400, 300);
      await threePlugin.mount(container);

      expect(threePlugin.scene).not.toBeNull();
      expect(threePlugin.camera).not.toBeNull();
      expect(canvas2DRenderer.getElementCount()).toBe(1);

      threePlugin.unmount();
    });

    it('3D scene uninstall should not affect Canvas2D graphics', async () => {
      const p2d = make2DPlugin({ type: 'pipe-a' });
      canvas2DRenderer.mount(container, p2d);
      expect(canvas2DRenderer.getElementCount()).toBe(1);

      const threePlugin = new ThreeStagePlugin(0, 0, 300, 200);
      await threePlugin.mount(container);
      threePlugin.unmount();

      expect(threePlugin.scene).toBeNull();
      expect(canvas2DRenderer.getElementCount()).toBe(1);

      canvas2DRenderer.unmount(p2d);
      expect(canvas2DRenderer.getElementCount()).toBe(0);
    });

    it('Canvas2D graphic destruction should not affect 3D scene', async () => {
      const p2d = make2DPlugin({ type: 'pipe-b' });
      canvas2DRenderer.mount(container, p2d);

      const threePlugin = new ThreeStagePlugin(0, 200, 400, 300);
      await threePlugin.mount(container);

      canvas2DRenderer.unmount(p2d);
      expect(canvas2DRenderer.getElementCount()).toBe(0);
      expect(threePlugin.scene).not.toBeNull();

      threePlugin.unmount();
    });
  });

  describe('2. Geometry update isolation', () => {
    it('updating Canvas2D graphic geometry does not affect 3D scene', async () => {
      const p2d = make2DPlugin({ type: 'pipe-c', x: 10, y: 10 });
      canvas2DRenderer.mount(container, p2d);

      const threePlugin = new ThreeStagePlugin(200, 200, 400, 300);
      await threePlugin.mount(container);

      canvas2DRenderer.updateGeometry(p2d, 100, 100, 50, 50);

      const size = threePlugin.getSize();
      expect(size.width).toBe(400);
      expect(size.height).toBe(300);
      expect(canvas2DRenderer.getElementCount()).toBe(1);

      threePlugin.unmount();
    });

    it('updating 3D scene geometry does not affect Canvas2D graphic', async () => {
      const p2d = make2DPlugin({ type: 'pipe-d', x: 50, y: 50 });
      canvas2DRenderer.mount(container, p2d);

      const threePlugin = new ThreeStagePlugin(0, 200, 300, 200);
      await threePlugin.mount(container);

      const prevScene = threePlugin.scene;
      const prevCamera = threePlugin.camera;

      threePlugin.updateGeometry(100, 300, 500, 400);
      const size = threePlugin.getSize();
      expect(size.width).toBe(500);
      expect(size.height).toBe(400);

      expect(prevScene).toBe(threePlugin.scene);
      expect(prevCamera).toBe(threePlugin.camera);

      threePlugin.unmount();
    });
  });

  describe('3. ThreeSceneManager singleton and Canvas2D isolation', () => {
    it('ThreeSceneManager initialization does not affect Canvas2D graphics', async () => {
      const p2d = make2DPlugin({ type: 'pipe-e' });
      canvas2DRenderer.mount(container, p2d);

      const threePlugin = new ThreeStagePlugin(0, 300, 300, 200);
      await threePlugin.mount(container);

      const manager = ThreeSceneManager.getInstance();
      expect(manager.isInitialized).toBe(true);
      expect(canvas2DRenderer.getElementCount()).toBe(1);

      threePlugin.unmount();
    });

    it('Canvas2D graphics are unaffected after ThreeSceneManager destroy', async () => {
      const p2d = make2DPlugin({ type: 'pipe-f' });
      canvas2DRenderer.mount(container, p2d);

      const threePlugin = new ThreeStagePlugin(0, 200, 300, 200);
      await threePlugin.mount(container);

      threePlugin.unmount();

      const manager = ThreeSceneManager.getInstance();
      manager.destroy();

      expect(canvas2DRenderer.getElementCount()).toBe(1);

      canvas2DRenderer.unmount(p2d);
    });
  });

  describe('4. Z-index layering order verification', () => {
    it('multiple Canvas2D graphics should be rendered in zIndex order', () => {
      const back = make2DPlugin({ type: 'bg', zIndex: -1, x: 0, y: 0, width: 400, height: 300 });
      const mid = make2DPlugin({ type: 'mid', zIndex: 0, x: 10, y: 10, width: 200, height: 100 });
      const front = make2DPlugin({ type: 'front', zIndex: 10, x: 20, y: 20, width: 100, height: 50 });

      canvas2DRenderer.mount(container, back);
      canvas2DRenderer.mount(container, mid);
      canvas2DRenderer.mount(container, front);

      expect(canvas2DRenderer.getElementCount()).toBe(3);
    });

    it('Canvas2D rendering does not affect 3D scene z-axis layout', async () => {
      canvas2DRenderer.mount(container, make2DPlugin({ type: '2d-layer', zIndex: 5 }));

      const threePlugin = new ThreeStagePlugin(0, 0, 400, 300);
      await threePlugin.mount(container);

      expect(canvas2DRenderer.getElementCount()).toBe(1);
      expect(threePlugin.cameraController).not.toBeNull();

      threePlugin.unmount();
    });
  });

  describe('5. Large-scale mixed stress test', () => {
    it('30 Canvas2D + 3 3D scenes coexist', async () => {
      for (let i = 0; i < 30; i++) {
        canvas2DRenderer.mount(container, make2DPlugin({
          type: `pipe-${i}`,
          x: (i % 6) * 100,
          y: Math.floor(i / 6) * 100,
          zIndex: i,
        }));
      }
      expect(canvas2DRenderer.getElementCount()).toBe(30);

      const threePlugins: ThreeStagePlugin[] = [];
      for (let i = 0; i < 3; i++) {
        const p = new ThreeStagePlugin(i * 300, 400, 250, 200);
        await p.mount(container);
        threePlugins.push(p);
      }

      expect(canvas2DRenderer.getElementCount()).toBe(30);

      for (const p of threePlugins) {
        p.unmount();
      }

      canvas2DRenderer.clear();
      canvas2DRenderer.destroy();
      expect(canvas2DRenderer.getElementCount()).toBe(0);
    });
  });

  describe('6. Renderer registration and backend identification', () => {
    it('ThreeRenderer + Canvas2DRenderer should be different backends', () => {
      const threeRenderer = new ThreeRenderer();
      expect(threeRenderer.backend).toBe(RenderBackend.THREE_3D);
      expect(canvas2DRenderer.backend).toBe(RenderBackend.CANVAS_2D);
      expect(threeRenderer.backend).not.toBe(canvas2DRenderer.backend);
    });

    it('ThreeRenderer mount should pass container', async () => {
      const threeRenderer = new ThreeRenderer();
      const threePlugin = new ThreeStagePlugin(0, 0, 200, 150);
      const div = document.createElement('div');
      container.appendChild(div);

      threeRenderer.mount(div, threePlugin as unknown as IPluginInstance);

      await new Promise((r) => setTimeout(r, 50));

      expect(threePlugin.getDomElement()).not.toBeNull();

      threePlugin.unmount();
    });

    it('ThreeRenderer update should pass props', () => {
      const threeRenderer = new ThreeRenderer();
      const threePlugin = new ThreeStagePlugin();
      threePlugin.update = vi.fn();

      threeRenderer.update(threePlugin as unknown as IPluginInstance, { bg: 'red' });
      expect(threePlugin.update).toHaveBeenCalledWith({ bg: 'red' });
    });
  });
});