// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { VueRenderer } from '../src/renderers/VueRenderer';
import { SvgDomRenderer } from '../src/renderers/SvgDomRenderer';
import { CssDomRenderer } from '../src/renderers/CssDomRenderer';
import { ThreeRenderer } from '../src/renderers/ThreeRenderer';
import { RenderBackend } from '../src/types/RenderBackend';

describe('VueRenderer', () => {
  it('should have correct backend', () => {
    const renderer = new VueRenderer();
    expect(renderer.backend).toBe(RenderBackend.VUE_COMPONENT);
  });

  it('should handle mount with noop plugin', () => {
    const renderer = new VueRenderer();
    const container = document.createElement('div');
    expect(() => renderer.mount(container, {} as any)).not.toThrow();
  });

  it('should handle unmount with noop plugin', () => {
    const renderer = new VueRenderer();
    expect(() => renderer.unmount({} as any)).not.toThrow();
  });

  it('should handle update with noop plugin', () => {
    const renderer = new VueRenderer();
    expect(() => renderer.update({} as any, {})).not.toThrow();
  });

  it('should handle updateGeometry with noop plugin', () => {
    const renderer = new VueRenderer();
    expect(() => renderer.updateGeometry({} as any, 0, 0, 100, 100)).not.toThrow();
  });

  it('should call mount on plugin that has mount method', () => {
    const renderer = new VueRenderer();
    let mounted = false;
    const plugin = {
      mount: () => { mounted = true; },
      unmount: () => {},
      update: () => {},
      updateGeometry: () => {},
    };
    const container = document.createElement('div');
    renderer.mount(container, plugin as any);
    expect(mounted).toBe(true);
  });
});

describe('SvgDomRenderer', () => {
  it('should have correct backend', () => {
    const renderer = new SvgDomRenderer();
    expect(renderer.backend).toBe(RenderBackend.SVG_DOM);
  });

  it('should call methods on plugin', () => {
    const renderer = new SvgDomRenderer();
    const calls: string[] = [];
    const plugin = {
      mount: () => { calls.push('mount'); },
      unmount: () => { calls.push('unmount'); },
      update: () => { calls.push('update'); },
      updateGeometry: () => { calls.push('updateGeometry'); },
    };
    const container = document.createElement('div');
    renderer.mount(container, plugin as any);
    renderer.update(plugin as any, {});
    renderer.updateGeometry(plugin as any, 10, 20, 200, 300);
    renderer.unmount(plugin as any);
    expect(calls).toEqual(['mount', 'update', 'updateGeometry', 'unmount']);
  });
});

describe('CssDomRenderer', () => {
  it('should have correct backend', () => {
    const renderer = new CssDomRenderer();
    expect(renderer.backend).toBe(RenderBackend.CSS_DOM);
  });

  it('should call methods on plugin', () => {
    const renderer = new CssDomRenderer();
    const calls: string[] = [];
    const plugin = {
      mount: () => { calls.push('mount'); },
      unmount: () => { calls.push('unmount'); },
      update: () => { calls.push('update'); },
      updateGeometry: () => { calls.push('updateGeometry'); },
    };
    const container = document.createElement('div');
    renderer.mount(container, plugin as any);
    renderer.update(plugin as any, {});
    renderer.updateGeometry(plugin as any, 0, 0, 100, 100);
    renderer.unmount(plugin as any);
    expect(calls).toEqual(['mount', 'update', 'updateGeometry', 'unmount']);
  });
});

describe('ThreeRenderer', () => {
  it('should have correct backend', () => {
    const renderer = new ThreeRenderer();
    expect(renderer.backend).toBe(RenderBackend.THREE_3D);
  });

  it('should call methods on plugin', () => {
    const renderer = new ThreeRenderer();
    const calls: string[] = [];
    const plugin = {
      mount: () => { calls.push('mount'); },
      unmount: () => { calls.push('unmount'); },
      update: () => { calls.push('update'); },
      updateGeometry: () => { calls.push('updateGeometry'); },
    };
    const container = document.createElement('div');
    renderer.mount(container, plugin as any);
    renderer.update(plugin as any, {});
    renderer.updateGeometry(plugin as any, 0, 0, 400, 300);
    renderer.unmount(plugin as any);
    expect(calls).toEqual(['mount', 'update', 'updateGeometry', 'unmount']);
  });
});