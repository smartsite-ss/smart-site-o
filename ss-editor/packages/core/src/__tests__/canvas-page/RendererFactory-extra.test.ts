// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { RendererFactory } from '../../canvas-page/renderer/RendererFactory';
import type { IRenderer } from '../../canvas-page/renderer/types';

describe('RendererFactory - svg/webgl', () => {
  beforeEach(() => {
    const renderers = (RendererFactory as any)['renderers'];
    if (renderers) {
      renderers.clear();
    }
  });

  it('should register SVG renderer constructor', () => {
    const mockConstructor = class MockSVGRenderer implements IRenderer {
      render() {}
      update() {}
      remove() {}
      clear() {}
      destroy() {}
      resize() {}
      setScale() {}
      setPan() {}
      getContext() { return null }
      setViewport() {}
      getViewport() { return null }
      setViewportCulling() {}
      isViewportCullingEnabled() { return false }
      setCullingBuffer() {}
    };

    RendererFactory.registerRenderer('svg', mockConstructor);
    expect(RendererFactory.isRendererAvailable('svg')).toBe(true);
    expect(RendererFactory.getAvailableRenderers()).toContain('svg');
  });

  it('should register WebGL renderer constructor', () => {
    const mockConstructor = class MockWebGLRenderer implements IRenderer {
      render() {}
      update() {}
      remove() {}
      clear() {}
      destroy() {}
      resize() {}
      setScale() {}
      setPan() {}
      getContext() { return null }
      setViewport() {}
      getViewport() { return null }
      setViewportCulling() {}
      isViewportCullingEnabled() { return false }
      setCullingBuffer() {}
    };

    RendererFactory.registerRenderer('webgl', mockConstructor);
    expect(RendererFactory.isRendererAvailable('webgl')).toBe(true);
    expect(RendererFactory.getAvailableRenderers()).toContain('webgl');
  });

  it('should create SVG renderer from registered constructor', () => {
    const mockConstructor = class MockSVGRenderer implements IRenderer {
      render() {}
      update() {}
      remove() {}
      clear() {}
      destroy() {}
      resize() {}
      setScale() {}
      setPan() {}
      getContext() { return null }
      setViewport() {}
      getViewport() { return null }
      setViewportCulling() {}
      isViewportCullingEnabled() { return false }
      setCullingBuffer() {}
    };

    RendererFactory.registerRenderer('svg', mockConstructor as any);
    const mockContainer = {} as HTMLElement;
    const renderer = RendererFactory.create('svg', mockContainer);

    expect(renderer).toBeInstanceOf(mockConstructor);
  });

  it('should create WebGL renderer from registered constructor', () => {
    const mockConstructor = class MockWebGLRenderer implements IRenderer {
      render() {}
      update() {}
      remove() {}
      clear() {}
      destroy() {}
      resize() {}
      setScale() {}
      setPan() {}
      getContext() { return null }
      setViewport() {}
      getViewport() { return null }
      setViewportCulling() {}
      isViewportCullingEnabled() { return false }
      setCullingBuffer() {}
    };

    RendererFactory.registerRenderer('webgl', mockConstructor as any);
    const mockContainer = {} as HTMLElement;
    const renderer = RendererFactory.create('webgl', mockContainer);

    expect(renderer).toBeInstanceOf(mockConstructor);
  });

  it('should list all registered renderer types', () => {
    const mockSvg = class MockSVGRenderer implements IRenderer {
      render() {} update() {} remove() {} clear() {} destroy() {}
      resize() {} setScale() {} setPan() {} getContext() { return null }
      setViewport() {} getViewport() { return null }
      setViewportCulling() {} isViewportCullingEnabled() { return false }
      setCullingBuffer() {}
    };
    const mockWebGL = class MockWebGLRenderer implements IRenderer {
      render() {} update() {} remove() {} clear() {} destroy() {}
      resize() {} setScale() {} setPan() {} getContext() { return null }
      setViewport() {} getViewport() { return null }
      setViewportCulling() {} isViewportCullingEnabled() { return false }
      setCullingBuffer() {}
    };

    RendererFactory.registerRenderer('svg', mockSvg as any);
    RendererFactory.registerRenderer('webgl', mockWebGL as any);

    const available = RendererFactory.getAvailableRenderers();
    expect(available.length).toBe(2);
    expect(available).toContain('svg');
    expect(available).toContain('webgl');
  });

  it('should throw when creating unregistered type', () => {
    const mockContainer = {} as HTMLElement;

    expect(() => {
      RendererFactory.create('canvas', mockContainer);
    }).toThrow('Renderer type "canvas" not registered');
  });
});