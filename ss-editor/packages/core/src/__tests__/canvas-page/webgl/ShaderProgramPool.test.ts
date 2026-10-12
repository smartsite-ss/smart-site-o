// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { ShaderProgramPool } from '../../../canvas-page/renderer/webgl/ShaderProgramPool';

describe('ShaderProgramPool', () => {
  it('should have SOLID_COLOR_VS and SOLID_COLOR_FS as strings', () => {
    expect(typeof ShaderProgramPool.SOLID_COLOR_VS).toBe('string');
    expect(ShaderProgramPool.SOLID_COLOR_VS.length).toBeGreaterThan(0);
    expect(typeof ShaderProgramPool.SOLID_COLOR_FS).toBe('string');
    expect(ShaderProgramPool.SOLID_COLOR_FS.length).toBeGreaterThan(0);
  });

  it('should have GRADIENT_VS and GRADIENT_FS shader source strings', () => {
    expect(typeof ShaderProgramPool.GRADIENT_VS).toBe('string');
    expect(ShaderProgramPool.GRADIENT_VS.length).toBeGreaterThan(0);
    expect(typeof ShaderProgramPool.GRADIENT_FS).toBe('string');
    expect(ShaderProgramPool.GRADIENT_FS.length).toBeGreaterThan(0);
  });

  it('should have ROUNDED_RECT_VS and ROUNDED_RECT_FS shader source strings', () => {
    expect(typeof ShaderProgramPool.ROUNDED_RECT_VS).toBe('string');
    expect(ShaderProgramPool.ROUNDED_RECT_VS.length).toBeGreaterThan(0);
    expect(typeof ShaderProgramPool.ROUNDED_RECT_FS).toBe('string');
    expect(ShaderProgramPool.ROUNDED_RECT_FS.length).toBeGreaterThan(0);
  });

  it('should have TEXTURED_VS and TEXTURED_FS shader source strings', () => {
    expect(typeof ShaderProgramPool.TEXTURED_VS).toBe('string');
    expect(ShaderProgramPool.TEXTURED_VS.length).toBeGreaterThan(0);
    expect(typeof ShaderProgramPool.TEXTURED_FS).toBe('string');
    expect(ShaderProgramPool.TEXTURED_FS.length).toBeGreaterThan(0);
  });

  it('should throw when constructed with null gl context and methods are called', () => {
    const pool = new ShaderProgramPool(null as any);
    expect(() => pool.compileShader('test', ShaderProgramPool.SOLID_COLOR_VS, ShaderProgramPool.SOLID_COLOR_FS)).toThrow();
  });

  it('should return compiled count of 0 when no context', () => {
    const pool = new ShaderProgramPool(null as any);
    expect(pool.getCompiledCount()).toBe(0);
  });

  it('should have valid GLSL syntax markers in shaders - contains void main() and gl_Position', () => {
    const vsShaders = [
      ShaderProgramPool.SOLID_COLOR_VS,
      ShaderProgramPool.GRADIENT_VS,
      ShaderProgramPool.ROUNDED_RECT_VS,
      ShaderProgramPool.TEXTURED_VS,
    ];

    const fsShaders = [
      ShaderProgramPool.SOLID_COLOR_FS,
      ShaderProgramPool.GRADIENT_FS,
      ShaderProgramPool.ROUNDED_RECT_FS,
      ShaderProgramPool.TEXTURED_FS,
    ];

    for (const vs of vsShaders) {
      expect(vs).toContain('void main()');
      expect(vs).toContain('gl_Position');
    }

    for (const fs of fsShaders) {
      expect(fs).toContain('void main()');
    }
  });
});