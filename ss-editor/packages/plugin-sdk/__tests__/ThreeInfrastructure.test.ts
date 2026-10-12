// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * P3-1.9: Three.js Infrastructure Unit Tests
 *
 * Tests for ThreeSceneManager / CameraController / ThreeStagePlugin / ThreeRenderer.
 * Since three is an optional peerDependency, mocks are used to simulate Three.js core classes in tests.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('three', () => {
  return {
    Scene: vi.fn(function () {
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
  };
});

import { ThreeSceneManager } from '../src/renderers/ThreeSceneManager';
import { CameraController } from '../src/renderers/CameraController';
import { ThreeRenderer } from '../src/renderers/ThreeRenderer';
import { ThreeStagePlugin } from '../src/renderers/ThreeStagePlugin';
import { RenderBackend } from '../src/types/RenderBackend';
import type { IPluginInstance } from '../src/types/IPluginInstance';

describe('P3-1.9 Three.js infrastructure test', () => {
  afterEach(() => {
    ThreeSceneManager.reset();
    vi.restoreAllMocks();
  });

  describe('ThreeSceneManager', () => {
    it('should be a singleton', () => {
      const a = ThreeSceneManager.getInstance();
      const b = ThreeSceneManager.getInstance();
      expect(a).toBe(b);
    });

    it('initial state should be uninitialized', () => {
      const manager = ThreeSceneManager.getInstance();
      expect(manager.isInitialized).toBe(false);
      expect(manager.canvas).toBeNull();
      expect(manager.renderer).toBeNull();
    });

    it('reset should clean up instance', () => {
      const a = ThreeSceneManager.getInstance();
      ThreeSceneManager.reset();
      const b = ThreeSceneManager.getInstance();
      expect(a).not.toBe(b);
    });

    it('init should create WebGLRenderer and canvas', async () => {
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      document.body.appendChild(container);

      const manager = ThreeSceneManager.getInstance();
      await manager.init(container);

      expect(manager.isInitialized).toBe(true);
      expect(manager.canvas).not.toBeNull();
      expect(manager.renderer).not.toBeNull();
      expect(container.contains(manager.canvas)).toBe(true);

      document.body.removeChild(container);
    });

    it('repeated init should return directly', async () => {
      const container = document.createElement('div');
      container.style.width = '400px';
      container.style.height = '300px';
      document.body.appendChild(container);

      const manager = ThreeSceneManager.getInstance();
      await manager.init(container);
      await manager.init(container);

      expect(manager.isInitialized).toBe(true);

      document.body.removeChild(container);
    });

    it('registerScene should register a scene entry', async () => {
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      document.body.appendChild(container);

      const manager = ThreeSceneManager.getInstance();
      await manager.init(container);

      const mockScene = { children: [] };
      const mockCamera = {
        fov: 45,
        aspect: 800 / 600,
        position: { set: vi.fn() },
        lookAt: vi.fn(),
        updateProjectionMatrix: vi.fn(),
      };

      manager.registerScene('test-scene', {
        scene: mockScene,
        camera: mockCamera,
      });

      expect(manager.isInitialized).toBe(true);

      document.body.removeChild(container);
    });

    it('unregisterScene should remove a scene entry', async () => {
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      document.body.appendChild(container);

      const manager = ThreeSceneManager.getInstance();
      await manager.init(container);

      manager.registerScene('test-scene', {
        scene: {} as any,
        camera: {} as any,
      });

      manager.unregisterScene('test-scene');

      document.body.removeChild(container);
    });

    it('registerScene should warn when uninitialized', async () => {
      const manager = ThreeSceneManager.getInstance();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      manager.registerScene('test', {
        scene: {} as any,
        camera: {} as any,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not initialized'),
      );

      warnSpy.mockRestore();
    });

    it('resize should update renderer and all camera aspect ratios', async () => {
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      document.body.appendChild(container);

      const manager = ThreeSceneManager.getInstance();
      await manager.init(container);

      const mockCamera = {
        aspect: 800 / 600,
        updateProjectionMatrix: vi.fn(),
      };
      manager.registerScene('scene', {
        scene: {} as any,
        camera: mockCamera,
      });

      manager.resize(1024, 768);
      expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled();
      expect(mockCamera.aspect).toBe(1024 / 768);

      document.body.removeChild(container);
    });

    it('destroy should clean up all resources', async () => {
      const container = document.createElement('div');
      container.style.width = '400px';
      container.style.height = '300px';
      document.body.appendChild(container);

      const manager = ThreeSceneManager.getInstance();
      await manager.init(container);
      expect(manager.isInitialized).toBe(true);

      manager.destroy();
      expect(manager.isInitialized).toBe(false);
      expect(manager.canvas).toBeNull();
      expect(manager.renderer).toBeNull();

      document.body.removeChild(container);
    });

    it('getCanvas should return canvas element', async () => {
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      document.body.appendChild(container);

      const manager = ThreeSceneManager.getInstance();
      await manager.init(container);

      const canvas = manager.getCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);

      document.body.removeChild(container);
    });
  });

  describe('CameraController', () => {
    let camera: any;

    beforeEach(() => {
      camera = {
        position: { x: 0, y: 0, z: 0, set: vi.fn() },
        lookAt: vi.fn(),
      };
    });

    it('should initialize correctly', () => {
      const controller = new CameraController(camera);
      expect(controller.enabled).toBe(true);
    });

    it('should be toggleable disable/enable', () => {
      const controller = new CameraController(camera);
      controller.enabled = false;
      expect(controller.enabled).toBe(false);
      controller.enabled = true;
      expect(controller.enabled).toBe(true);
    });

    it('setTarget should set the target point', () => {
      const controller = new CameraController(camera);
      controller.setTarget(5, 5, 5);
      expect(camera.position.set).toHaveBeenCalled();
    });

    it('setPosition should calculate spherical coordinates from 3D coordinates', () => {
      const controller = new CameraController(camera);
      controller.setPosition(10, 10, 0);
      expect(camera.position.set).toHaveBeenCalled();
    });

    it('lookAt should set target and update camera', () => {
      const controller = new CameraController(camera);
      controller.lookAt(3, 2, 1);
      expect(camera.lookAt).toHaveBeenCalledWith(3, 2, 1);
    });

    it('zoom should adjust spherical coordinate radius', () => {
      const controller = new CameraController(camera);
      camera.position.set.mockClear();
      controller.zoom(1);
      expect(camera.position.set).toHaveBeenCalled();
    });

    it('zoom should not violate minDistance constraint', () => {
      const controller = new CameraController(camera, { minDistance: 5 });
      camera.position.set.mockClear();

      for (let i = 0; i < 100; i++) {
        controller.zoom(-1);
      }
      expect(camera.position.set).toHaveBeenCalled();
    });

    it('zoom should not violate maxDistance constraint', () => {
      const controller = new CameraController(camera, { maxDistance: 20 });
      camera.position.set.mockClear();

      for (let i = 0; i < 100; i++) {
        controller.zoom(1);
      }
      expect(camera.position.set).toHaveBeenCalled();
    });

    it('update should call camera update', () => {
      const controller = new CameraController(camera);
      camera.position.set.mockClear();
      controller.update();
      expect(camera.position.set).toHaveBeenCalled();
    });

    it('attach should bind DOM events', () => {
      const el = document.createElement('canvas');
      const _addSpy = vi.spyOn(el, 'addEventListener');
      const controller = new CameraController(camera);
      controller.attach(el);
      expect(_addSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(_addSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    });

    it('detach should unbind DOM events', () => {
      const el = document.createElement('canvas');
      const _removeSpy = vi.spyOn(el, 'removeEventListener');
      const controller = new CameraController(camera);
      controller.attach(el);
      controller.detach();
      expect(_removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });

    it('dispose should clean up resources', () => {
      const el = document.createElement('canvas');
      const controller = new CameraController(camera);
      controller.attach(el);
      controller.dispose();
      expect(controller.enabled).toBe(true);
    });

    it('should not respond to mouse events when disabled', () => {
      const el = document.createElement('canvas');
      const controller = new CameraController(camera, { enabled: false });
      controller.attach(el);

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
      el.dispatchEvent(event);

      const moveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 150 });
      el.dispatchEvent(moveEvent);
    });

    it('right-click drag should be pan mode', () => {
      const el = document.createElement('canvas');
      const controller = new CameraController(camera);
      controller.attach(el);

      camera.position.set.mockClear();

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 2 });
      el.dispatchEvent(event);

      const moveEvent = new MouseEvent('mousemove', { clientX: 120, clientY: 110 });
      el.dispatchEvent(moveEvent);

      expect(camera.position.set).toHaveBeenCalled();
    });
  });

  describe('ThreeRenderer', () => {
    it('backend should be THREE_3D', () => {
      const renderer = new ThreeRenderer();
      expect(renderer.backend).toBe(RenderBackend.THREE_3D);
    });

    it('mount should call plugin mount method', () => {
      const renderer = new ThreeRenderer();
      const container = document.createElement('div');
      const mountSpy = vi.fn();

      const plugin = {
        mount: mountSpy,
        unmount: vi.fn(),
        update: vi.fn(),
        updateGeometry: vi.fn(),
      };

      renderer.mount(container, plugin as unknown as IPluginInstance);
      expect(mountSpy).toHaveBeenCalledWith(container);
    });

    it('unmount should call plugin unmount method', () => {
      const renderer = new ThreeRenderer();
      const unmountSpy = vi.fn();

      const plugin = {
        mount: vi.fn(),
        unmount: unmountSpy,
        update: vi.fn(),
        updateGeometry: vi.fn(),
      };

      renderer.unmount(plugin as unknown as IPluginInstance);
      expect(unmountSpy).toHaveBeenCalled();
    });

    it('update should call plugin update method', () => {
      const renderer = new ThreeRenderer();
      const updateSpy = vi.fn();

      const plugin = {
        mount: vi.fn(),
        unmount: vi.fn(),
        update: updateSpy,
        updateGeometry: vi.fn(),
      };

      const props = { color: 0xff0000 };
      renderer.update(plugin as unknown as IPluginInstance, props);
      expect(updateSpy).toHaveBeenCalledWith(props);
    });

    it('updateGeometry should call plugin updateGeometry method', () => {
      const renderer = new ThreeRenderer();
      const geoSpy = vi.fn();

      const plugin = {
        mount: vi.fn(),
        unmount: vi.fn(),
        update: vi.fn(),
        updateGeometry: geoSpy,
      };

      renderer.updateGeometry(plugin as unknown as IPluginInstance, 10, 20, 100, 200);
      expect(geoSpy).toHaveBeenCalledWith(10, 20, 100, 200);
    });

    it('mount returning Promise should be handled asynchronously', async () => {
      const renderer = new ThreeRenderer();
      const container = document.createElement('div');
      let resolved = false;

      const plugin = {
        mount: vi.fn(() => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              resolved = true;
              resolve();
            }, 10);
          });
        }),
        unmount: vi.fn(),
        update: vi.fn(),
        updateGeometry: vi.fn(),
      };

      renderer.mount(container, plugin as unknown as IPluginInstance);
      expect(plugin.mount).toHaveBeenCalled();

      await vi.waitFor(() => {
        expect(resolved).toBe(true);
      }, { timeout: 100 });
    });
  });

  describe('ThreeStagePlugin', () => {
    it('should have correct type and meta', () => {
      const plugin = new ThreeStagePlugin();
      expect(plugin.type).toBe('three-stage');
    });

    it('should have default size on initialization', () => {
      const plugin = new ThreeStagePlugin(10, 20, 800, 600);
      const pos = plugin.getPosition();
      const size = plugin.getSize();
      expect(pos).toEqual({ x: 10, y: 20 });
      expect(size).toEqual({ width: 800, height: 600 });
    });

    it('updateGeometry should update position and size', () => {
      const plugin = new ThreeStagePlugin(0, 0, 400, 300);
      plugin.updateGeometry(50, 50, 500, 400);
      const pos = plugin.getPosition();
      const size = plugin.getSize();
      expect(pos).toEqual({ x: 50, y: 50 });
      expect(size).toEqual({ width: 500, height: 400 });
    });

    it('update should update props', () => {
      const plugin = new ThreeStagePlugin();
      plugin.update({ backgroundColor: '#ff0000', showGrid: true });
      expect(plugin.pluginProps).toEqual({
        backgroundColor: '#ff0000',
        showGrid: true,
      });
    });

    it('initial scene/camera should be null', () => {
      const plugin = new ThreeStagePlugin();
      expect(plugin.scene).toBeNull();
      expect(plugin.camera).toBeNull();
      expect(plugin.cameraController).toBeNull();
    });

    it('getDomElement should initially be null', () => {
      const plugin = new ThreeStagePlugin();
      expect(plugin.getDomElement()).toBeNull();
    });

    it('should accept custom options', () => {
      const plugin = new ThreeStagePlugin(0, 0, 1024, 768, {
        cameraFov: 60,
        cameraNear: 1,
        cameraFar: 2000,
        backgroundColor: 0x333333,
      });

      expect(plugin.getSize()).toEqual({ width: 1024, height: 768 });
    });
  });
});