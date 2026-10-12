// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { GridSnapManager } from '../../../../src/graphic-editing/managers/GridSnapManager';

describe('GridSnapManager', () => {
  let manager: GridSnapManager;

  beforeEach(() => {
    manager = new GridSnapManager();
  });

  it('should be defined', () => {
    expect(manager).toBeDefined();
  });

  it('should have grid config', () => {
    const config = manager.getConfig();
    expect(config).toBeDefined();
    expect(typeof config.gridSize).toBe('number');
    expect(typeof config.snapToGrid).toBe('boolean');
  });

  it('should set config', () => {
    manager.setConfig({ snapToGrid: false });
    const config = manager.getConfig();
    expect(config.snapToGrid).toBe(false);
  });

  it('should snap value to nearest grid point', () => {
    // @ts-expect-error - snapToGrid is private
    const snapped = manager.snapToGrid(23, 10);
    expect(snapped.x).toBe(20);
    expect(snapped.targets.length).toBeGreaterThan(0);
  });

  it('should return exact grid point if already aligned', () => {
    // @ts-expect-error - snapToGrid is private
    const snapped = manager.snapToGrid(30, 10);
    expect(snapped.x).toBe(30);
    expect(snapped.targets.length).toBe(0);
  });
});