// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { WebGLContextManager } from '../../../canvas-page/renderer/webgl/WebGLContextManager';

describe('WebGLContextManager', () => {
  it('should create WebGLContextManager - constructor succeeds even without WebGL', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(manager).toBeDefined();
  });

  it('should report WebGL as unavailable in jsdom - isAvailable() returns false', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(manager.isAvailable()).toBe(false);
  });

  it('should return null context when unavailable - getContext() returns null', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(manager.getContext()).toBeNull();
  });

  it('should detect context as not lost when no context was ever available - isContextLost() returns false', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(manager.isContextLost()).toBe(false);
  });

  it('should not throw on destroy when context is null', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(() => manager.destroy()).not.toThrow();
  });

  it('should not throw on resize when context is null', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(() => manager.resize(800, 600)).not.toThrow();
  });

  it('should return null GPU info when unavailable - getGPUInfo() returns default/dummy values', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    const info = manager.getGPUInfo();
    expect(info.renderer).toBe('N/A');
    expect(info.vendor).toBe('N/A');
    expect(info.version).toBe('N/A');
    expect(info.maxTextureSize).toBe(0);
    expect(info.supportedExtensions).toEqual([]);
    expect(info.features).toEqual([]);
  });

  it('should check GPU features with null context - checkFeature returns false', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(manager.checkFeature('gradient')).toBe(false);
    expect(manager.checkFeature('shadow')).toBe(false);
    expect(manager.checkFeature('blur')).toBe(false);
    expect(manager.checkFeature('particle')).toBe(false);
  });

  it('should expose static isWebGLAvailable() - returns false in jsdom', () => {
    expect(WebGLContextManager.isWebGLAvailable()).toBe(false);
  });

  it('should not crash on getExtension with null context', () => {
    const canvas = document.createElement('canvas');
    const manager = new WebGLContextManager(canvas);
    expect(() => {
      const ext = manager.getExtension('WEBGL_debug_renderer_info');
      expect(ext).toBeNull();
    }).not.toThrow();
  });
});
