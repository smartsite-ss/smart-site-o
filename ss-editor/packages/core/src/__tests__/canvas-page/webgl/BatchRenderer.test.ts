// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { BatchRenderer } from '../../../canvas-page/renderer/webgl/BatchRenderer';
import { ShaderProgramPool } from '../../../canvas-page/renderer/webgl/ShaderProgramPool';

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

describe('BatchRenderer', () => {
  it('should create BatchRenderer with null gl context - constructor succeeds with fallback', () => {
    const pool = new ShaderProgramPool(null as any);
    const renderer = new BatchRenderer(null as any, pool);
    expect(renderer).toBeDefined();
  });

  it('should build batch groups from graphics array - 5 shape graphics to 1 batch group', () => {
    const pool = new ShaderProgramPool(null as any);
    const renderer = new BatchRenderer(null as any, pool);
    const graphics = [
      createMockGraphic({ id: 'g1', type: 'shape' }),
      createMockGraphic({ id: 'g2', type: 'shape' }),
      createMockGraphic({ id: 'g3', type: 'shape' }),
      createMockGraphic({ id: 'g4', type: 'shape' }),
      createMockGraphic({ id: 'g5', type: 'shape' }),
    ];
    const groups = renderer.buildBatches(graphics);
    expect(groups.length).toBe(1);
    expect(groups[0].shaderName).toBe('solid-color');
    expect(groups[0].instanceCount).toBe(5);
  });

  it('should group graphics by type - mixed shape and label to 2 batch groups', () => {
    const pool = new ShaderProgramPool(null as any);
    const renderer = new BatchRenderer(null as any, pool);
    const graphics = [
      createMockGraphic({ id: 'g1', type: 'shape' }),
      createMockGraphic({ id: 'g2', type: 'shape' }),
      createMockGraphic({ id: 'g3', type: 'label' }),
      createMockGraphic({ id: 'g4', type: 'label' }),
    ];
    const groups = renderer.buildBatches(graphics);
    expect(groups.length).toBe(2);
    const shaderNames = groups.map((g) => g.shaderName).sort();
    expect(shaderNames).toContain('solid-color');
    expect(shaderNames).toContain('textured');
  });

  it('should detect when batching is beneficial - shouldBatch returns true for graphics', () => {
    const pool = new ShaderProgramPool(null as any);
    const renderer = new BatchRenderer(null as any, pool);
    const graphic = createMockGraphic({ id: 'g1', type: 'shape' });
    expect(renderer.shouldBatch(graphic)).toBe(true);
  });

  it('should provide stats after building batches - getStats returns correct counts', () => {
    const pool = new ShaderProgramPool(null as any);
    const renderer = new BatchRenderer(null as any, pool);
    const graphics = [
      createMockGraphic({ id: 'g1', type: 'shape' }),
      createMockGraphic({ id: 'g2', type: 'shape' }),
      createMockGraphic({ id: 'g3', type: 'shape' }),
      createMockGraphic({ id: 'g4', type: 'label' }),
    ];
    renderer.buildBatches(graphics);
    const stats = renderer.getStats();
    expect(stats.totalBatches).toBe(2);
    expect(stats.totalInstances).toBe(4);
  });

  it('should clear batches correctly', () => {
    const pool = new ShaderProgramPool(null as any);
    const renderer = new BatchRenderer(null as any, pool);
    const graphics = [createMockGraphic({ id: 'g1', type: 'shape' })];
    renderer.buildBatches(graphics);
    expect(renderer.getStats().totalBatches).toBe(1);
    renderer.clear();
    expect(renderer.getStats().totalBatches).toBe(0);
    expect(renderer.getStats().totalInstances).toBe(0);
  });

  it('should handle empty graphics array - no crash, empty batches', () => {
    const pool = new ShaderProgramPool(null as any);
    const renderer = new BatchRenderer(null as any, pool);
    const groups = renderer.buildBatches([]);
    expect(groups).toEqual([]);
    expect(renderer.getStats().totalBatches).toBe(0);
  });
});