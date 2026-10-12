// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { AnimationTimer } from '../src/utils/AnimationTimer';

describe('AnimationTimer', () => {
  it('should be inactive initially', () => {
    const timer = new AnimationTimer();
    expect(timer.active).toBe(false);
  });

  it('should return 0 tick when inactive', () => {
    const timer = new AnimationTimer();
    expect(timer.tick()).toBe(0);
  });

  it('should return 0 on first tick after start', () => {
    const timer = new AnimationTimer();
    timer.start();
    expect(timer.active).toBe(true);
    expect(timer.tick()).toBe(0);
  });

  it('should return positive delta on subsequent ticks', async () => {
    const timer = new AnimationTimer();
    timer.start();
    timer.tick();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const dt = timer.tick();
    expect(dt).toBeGreaterThan(0);
  });

  it('should stop and reset', () => {
    const timer = new AnimationTimer();
    timer.start();
    timer.tick();
    timer.stop();
    expect(timer.active).toBe(false);
    expect(timer.tick()).toBe(0);
  });

  it('checkElapsed should work with ms threshold', async () => {
    const timer = new AnimationTimer();
    timer.start();
    expect(timer.checkElapsed(100)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(timer.checkElapsed(100)).toBe(true);
  });
});